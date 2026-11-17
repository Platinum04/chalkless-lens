/**
 * ChalkLessPatternUI.ts — passive view of the full-size buba pattern lying on the fabric.
 * Owns: line meshes per step, state colours (current glows, finished grey, future faint),
 * direction arrows + dashed 1.5 cm seam allowance on the current cut, measure-mark labels,
 * and the pinch-drag (SIK Interactable + InteractableManipulation) constrained to the fabric plane.
 * Exposes: rebuild(geometry), setCurrentStep(i), setDraggable(bool), setVisible(bool),
 *          currentLineAnchorWorld(), patternCenterWorld, lineStates (for tests).
 * Must not: decide step order or own measurements.
 */
import {Interactable} from "InteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "InteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import {MeshAccumulator, tintedMaterial} from "./ChalkLessLines"
import {offsetOutward, P2, PatternGeometry, shownLaySize} from "./ChalkLessPattern"
import {applyTextRole} from "./ChalkLessStyleUI"

/** Text heights (cm) lying on the fabric; text size per cm calibrated in the preview. */
const ACTIVE_TEXT_H_CM = 3
const MARK_TEXT_H_CM = 2.2
const ACTIVE_LABEL_MAX_W_CM = 44
const SIZE_PER_CM = 55
const CHAR_W = 0.56 // average glyph width / text height (bold sans)
function textSizeForHeight(hCm: number): number {
  return hCm * SIZE_PER_CM
}
function textWidthCm(s: string, hCm: number): number {
  return s.length * hCm * CHAR_W
}

export type LineState = "align" | "active" | "done" | "future"

interface StepVisual {
  root: SceneObject
  line: RenderMeshVisual
  seam: RenderMeshVisual
  arrows: RenderMeshVisual
  labels: SceneObject
}

@component
export class ChalkLessPatternUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessPatternUI – pattern on the fabric</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit material cloned for every line colour")
  lineMaterial: Material
  @input
  @hint("Fabric SceneObject — the pattern is kept on its top surface while dragging")
  fabric: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Fabric size in cm (width along X, depth along Z)")
  fabricSize: vec2 = new vec2(150, 80)
  @input
  @hint("Seam allowance drawn outside each cut line (cm)")
  @widget(new SliderWidget(0.5, 3, 0.1))
  seamAllowanceCm: number = 1.5
  @input
  @hint("Width of the glowing current line (cm)")
  @widget(new SliderWidget(0.2, 1.5, 0.05))
  activeLineWidth: number = 0.7
  @input("vec4", "{0.1, 0.95, 1, 1}")
  @hint("Glow colour of the current line")
  @widget(new ColorWidget())
  activeColor: vec4 = new vec4(0.1, 0.95, 1, 1)
  @input("vec4", "{0.45, 0.45, 0.45, 1}")
  @hint("Colour of finished lines (grey)")
  @widget(new ColorWidget())
  doneColor: vec4 = new vec4(0.45, 0.45, 0.45, 1)
  @input("vec4", "{0.66, 0.64, 0.6, 1}")
  @hint("Colour of lines not reached yet (faint, just off the fabric colour)")
  @widget(new ColorWidget())
  futureColor: vec4 = new vec4(0.66, 0.64, 0.6, 1)
  @input("vec4", "{0.25, 0.55, 1, 1}")
  @hint("Outline colour while aligning the pattern")
  @widget(new ColorWidget())
  alignColor: vec4 = new vec4(0.25, 0.55, 1, 1)
  @input
  @hint("Show the drag collider as wireframe")
  debugColliders: boolean = false
  @ui.group_end

  private content: SceneObject
  private visuals: StepVisual[] = []
  private geometry: PatternGeometry
  private mats: Record<string, Material> = {}
  private collider: ColliderComponent
  private interactable: Interactable
  private manip: InteractableManipulation
  private draggable = false
  private currentStep = -1
  private states: LineState[] = []
  private activeLabel: Text

  /** Text of the label lying beside the glowing line ("" when none). */
  get activeLabelText(): string {
    return this.activeLabel && this.activeLabel.getSceneObject().enabled ? this.activeLabel.text : ""
  }

  /** Per-step line state, e.g. ["done","active","future",...] (for tests). */
  get lineStates(): LineState[] {
    return this.states.slice()
  }

  /** Pattern centre in world space (the drag handle). */
  get patternCenterWorld(): vec3 {
    return this.sceneObject.getTransform().getWorldPosition()
  }

  get isDraggable(): boolean {
    return this.draggable
  }

  /** Size (cm) of the lay shown on the fabric at once — the largest group for big styles split into groups. */
  get laySizeCm(): vec2 {
    if (!this.geometry) return vec2.zero()
    const s = shownLaySize(this.geometry)
    return new vec2(s[0], s[1])
  }

  /** Group shown now: the current step's group (first group while aligning, last group when done). */
  private activeGroup(): number {
    const g = this.geometry
    if (!g || !g.groups) return 0
    const i = this.currentStep
    if (i < 0) return 0
    if (i >= g.steps.length) return g.groups.length - 1
    return g.steps[i].group || 0
  }

  /** Size of the given step's group (or the whole lay). Step coords run 0..size. */
  private groupSize(stepIndex: number): P2 {
    const g = this.geometry
    if (g.groups) {
      const gr = g.groups[g.steps[stepIndex].group || 0]
      return [gr.widthCm, gr.lengthCm]
    }
    return [g.widthCm, g.lengthCm]
  }

  onAwake(): void {
    const c = (col: vec4) => tintedMaterial(this.lineMaterial, col)
    this.mats = {
      active: c(this.activeColor),
      done: c(this.doneColor),
      future: c(this.futureColor),
      align: c(this.alignColor),
      glow: c(new vec4(0.5 + this.activeColor.x * 0.5, 0.5 + this.activeColor.y * 0.5, 0.5 + this.activeColor.z * 0.5, 1)),
    }
    this.content = global.scene.createSceneObject("PatternContent")
    this.content.setParent(this.sceneObject)
    const lo = global.scene.createSceneObject("ActiveLineLabel")
    lo.setParent(this.sceneObject)
    lo.getTransform().setLocalRotation(quat.fromEulerAngles(-Math.PI / 2, 0, 0))
    this.activeLabel = lo.createComponent("Component.Text") as Text
    this.activeLabel.depthTest = true
    applyTextRole(this.activeLabel, "Title2", 300)
    this.activeLabel.textFill.color = this.activeColor
    this.activeLabel.horizontalAlignment = HorizontalAlignment.Center
    this.activeLabel.verticalAlignment = VerticalAlignment.Center
    this.activeLabel.horizontalOverflow = HorizontalOverflow.Overflow
    this.activeLabel.layoutRect = Rect.create(-20, 20, -2, 2)
    lo.enabled = false

    this.collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    this.collider.fitVisual = false
    this.collider.debugDrawEnabled = this.debugColliders
    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.manip = this.sceneObject.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    const m = this.manip as unknown as Record<string, unknown>
    m["enableRotation"] = false
    m["enableScale"] = false
    m["enableStretchZ"] = false
    this.manip.enableYTranslation = false
    this.setDraggable(false)

    this.createEvent("LateUpdateEvent").bind(() => this.constrainToFabric())
  }

  /** Fabric top surface in world space. */
  private fabricTopY(): number {
    return this.fabric.getTransform().getWorldPosition().y + 0.4
  }

  private constrainToFabric(): void {
    if (!this.fabric || !this.geometry) return
    const t = this.sceneObject.getTransform()
    const f = this.fabric.getTransform().getWorldPosition()
    const p = t.getWorldPosition()
    const lay = shownLaySize(this.geometry)
    const hx = Math.max(0, this.fabricSize.x / 2 - lay[0] / 2 + 10)
    const hz = Math.max(0, this.fabricSize.y / 2 - lay[1] / 2 + 10)
    const x = Math.min(f.x + hx, Math.max(f.x - hx, p.x))
    const z = Math.min(f.z + hz, Math.max(f.z - hz, p.z))
    const np = new vec3(x, this.fabricTopY(), z)
    if (!np.equal(p)) t.setWorldPosition(np)
    t.setWorldRotation(quat.quatIdentity())
    t.setLocalScale(vec3.one())
  }

  setDraggable(on: boolean): void {
    this.draggable = on
    this.interactable.enabled = on
    this.manip.enabled = on
    this.collider.enabled = on
  }

  setVisible(on: boolean): void {
    this.content.enabled = on
  }

  rebuild(g: PatternGeometry): void {
    this.geometry = g
    for (const v of this.visuals) v.root.destroy()
    this.visuals = []
    this.content.getTransform().setLocalPosition(new vec3(0, 0.15, 0))
    const lay = shownLaySize(g)
    const shape = Shape.createBoxShape()
    shape.size = new vec3(lay[0], 2, lay[1])
    this.collider.shape = shape

    g.steps.forEach((st, i) => {
      const root = global.scene.createSceneObject(`Line_${i}`)
      root.setParent(this.content)
      const gs = this.groupSize(i)
      root.getTransform().setLocalPosition(new vec3(-gs[0] / 2, 0, -gs[1] / 2))
      // Big styles: only the marks of this step's own lay group are drawn.
      const marks = st.marks.filter((mk) => mk.group === undefined || mk.group === (st.group || 0))
      const mk = (name: string, y: number, build: (a: MeshAccumulator) => void): RenderMeshVisual => {
        const so = global.scene.createSceneObject(name)
        so.setParent(root)
        const acc = new MeshAccumulator(y)
        build(acc)
        const r = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
        r.mesh = acc.build()
        r.mainMaterial = this.mats.future
        return r
      }
      const line = mk("Line", 0.08, (a) => {
        for (const l of st.lines) a.polyline(l, 0.4)
        for (const mark of marks) {
          a.segment(mark.a, mark.b, 0.3)
          this.ticks(a, mark.a, mark.b)
        }
      })
      const glow = mk("Glow", 0.0, (a) => {
        for (const l of st.lines) a.polyline(l, this.activeLineWidth * 2.2)
      })
      const seam = mk("SeamAllowance", 0.08, (a) => {
        if (st.marks.length > 0 || st.label.indexOf("Cut") !== 0) return
        for (const l of st.lines) a.dashed(offsetOutward(l, st.centroid, this.seamAllowanceCm), 0.25, 1.2, 0.9)
      })
      const arrows = mk("Arrows", 0.14, (a) => {
        if (st.label.indexOf("Cut") !== 0) return
        for (const l of st.lines) a.arrows(l, 8, 1.8, 0.35)
      })
      glow.sceneObject.setParent(root)
      const labels = global.scene.createSceneObject("MarkLabels")
      labels.setParent(root)
      this.addMarkLabels(labels, marks)
      this.visuals.push({root, line, seam, arrows, labels})
      ;(this.visuals[i] as StepVisual & {glow?: RenderMeshVisual}).glow = glow
    })
    this.setCurrentStep(this.currentStep)
  }

  private ticks(a: MeshAccumulator, p: P2, q: P2): void {
    const dx = q[0] - p[0]
    const dz = q[1] - p[1]
    const l = Math.sqrt(dx * dx + dz * dz) || 1
    const nx = (-dz / l) * 1.2
    const nz = (dx / l) * 1.2
    for (const e of [p, q]) a.segment([e[0] - nx, e[1] - nz], [e[0] + nx, e[1] + nz], 0.3)
  }

  /**
   * Measure-mark labels: one per mark, sized to fit, nudged apart so no two overlap,
   * and kept inside the lay (so they stay on the fabric).
   */
  private addMarkLabels(parent: SceneObject, marks: {a: P2; b: P2; label: string}[]): void {
    if (marks.length === 0) return
    const gs = this.groupSize(this.visuals.length)
    const H = MARK_TEXT_H_CM
    const boxes = marks.map((mk) => {
      const vertical = Math.abs(mk.b[1] - mk.a[1]) > Math.abs(mk.b[0] - mk.a[0])
      const w = textWidthCm(mk.label, H)
      const mx = (mk.a[0] + mk.b[0]) / 2 + (vertical ? 1.5 : 0)
      const mz = (mk.a[1] + mk.b[1]) / 2 + (vertical ? 0 : 2.6)
      // Vertical marks near the right edge get their label on the left of the line instead.
      const x0 = vertical ? (mx + w > gs[0] + 1 ? mx - 3 - w : mx) : mx - w / 2
      return {mk, vertical, w, x0, z: mz}
    })
    const pad = 0.6
    const clampBox = (bx: (typeof boxes)[0]): void => {
      bx.x0 = Math.min(gs[0] + 1 - bx.w, Math.max(-1, bx.x0))
      bx.z = Math.min(gs[1] + 1 - H / 2, Math.max(-1 + H / 2, bx.z))
    }
    boxes.forEach(clampBox)
    for (let pass = 0; pass < 30; pass++) {
      let moved = false
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const p = boxes[i]
          const q = boxes[j]
          const ox = Math.min(p.x0 + p.w, q.x0 + q.w) - Math.max(p.x0, q.x0)
          const oz = H + pad - Math.abs(p.z - q.z)
          if (ox <= 0 || oz <= 0) continue
          const dir = q.z >= p.z ? 1 : -1
          q.z += (dir * oz) / 2 + dir * 0.05
          p.z -= (dir * oz) / 2 + dir * 0.05
          clampBox(p)
          clampBox(q)
          moved = true
        }
      if (!moved) break
    }
    for (const bx of boxes) {
      const so = global.scene.createSceneObject("MarkLabel")
      so.setParent(parent)
      so.getTransform().setLocalPosition(new vec3(bx.x0, 0.3, bx.z))
      so.getTransform().setLocalRotation(quat.fromEulerAngles(-Math.PI / 2, 0, 0))
      const t = so.createComponent("Component.Text") as Text
      t.text = bx.mk.label
      t.depthTest = true
      t.size = textSizeForHeight(H)
      ;(t as Text & {weight?: number}).weight = 700
      t.textFill.color = this.activeColor
      t.horizontalAlignment = HorizontalAlignment.Left
      t.verticalAlignment = VerticalAlignment.Center
      t.horizontalOverflow = HorizontalOverflow.Overflow
      t.layoutRect = Rect.create(0, bx.w + 2, -H / 2, H / 2)
    }
  }

  /** -1 = aligning (whole outline shown); 0..n-1 = cutting; n = all done. */
  setCurrentStep(i: number): void {
    this.currentStep = i
    this.states = []
    const ag = this.activeGroup()
    this.visuals.forEach((v, k) => {
      v.root.enabled = !this.geometry || !this.geometry.groups || (this.geometry.steps[k].group || 0) === ag
      let s: LineState
      if (i < 0) s = "align"
      else if (k < i) s = "done"
      else if (k === i) s = "active"
      else s = "future"
      this.states.push(s)
      v.line.mainMaterial = this.mats[s]
      const glow = (v as StepVisual & {glow?: RenderMeshVisual}).glow
      if (glow) {
        glow.mainMaterial = this.mats.glow
        glow.sceneObject.enabled = s === "active"
      }
      v.seam.mainMaterial = this.mats.active
      v.arrows.mainMaterial = this.mats.active
      v.seam.sceneObject.enabled = s === "active"
      v.arrows.sceneObject.enabled = s === "active"
      v.labels.enabled = s === "active"
    })
    this.placeActiveLabel()
  }

  private placeActiveLabel(): void {
    const g = this.geometry
    const so = this.activeLabel.getSceneObject()
    const i = this.currentStep
    if (!g || i < 0 || i >= g.steps.length || g.steps[i].lines.length === 0) {
      so.enabled = false
      return
    }
    const st = g.steps[i]
    const gs = this.groupSize(i)
    const pts = st.lines[0]
    // Anchor at the middle of the line: the midpoint of its longest straight run (L-shaped edges, curves).
    let mid: P2 = pts[0]
    let best = -1
    let runX = 0
    let runZ = 0
    for (let k = 1; k < pts.length; k++) {
      const sl = Math.abs(pts[k][0] - pts[k - 1][0]) + Math.abs(pts[k][1] - pts[k - 1][1])
      if (sl > best) {
        best = sl
        runX = Math.abs(pts[k][0] - pts[k - 1][0])
        runZ = Math.abs(pts[k][1] - pts[k - 1][1])
        mid = [(pts[k][0] + pts[k - 1][0]) / 2, (pts[k][1] + pts[k - 1][1]) / 2]
      }
    }
    if (pts.length > 4) mid = pts[Math.floor(pts.length / 2)] // smooth curves: their middle point
    // Inside the piece: closed outlines get the label at the piece centre; open lines get it
    // on the piece side of the line — above/below a horizontal line, beside a vertical one.
    let ex = 0
    let ez = 0
    for (const p of pts) {
      ex = Math.max(ex, Math.abs(p[0] - pts[0][0]))
      ez = Math.max(ez, Math.abs(p[1] - pts[0][1]))
    }
    if (pts.length <= 4) {
      ex = runX
      ez = runZ
    }
    const inX = st.centroid[0] >= mid[0] ? 1 : -1
    const inZ = st.centroid[1] >= mid[1] ? 1 : -1
    const isFold = st.id === "fold" || (st.id === undefined && i === 0)
    const foldVertical = isFold && Math.abs(pts[pts.length - 1][0] - pts[0][0]) < 0.01
    let side = 0 // 0 = centred box, 1 = box ends at lx, -1 = box starts at lx
    let horizontalLine = false
    let lx = mid[0] - gs[0] / 2
    let lz = mid[1] - gs[1] / 2
    if (isFold) {
      if (foldVertical) {
        lx = pts[0][0] + 3 - gs[0] / 2
        side = -1
      } else {
        lz = pts[0][1] + 4 - gs[1] / 2
      }
    } else if (st.closed) {
      lx = st.centroid[0] - gs[0] / 2
      lz = st.centroid[1] - gs[1] / 2
    } else if (ex >= ez) {
      horizontalLine = true
    } else {
      lx = mid[0] + inX * 3 - gs[0] / 2
      side = inX > 0 ? -1 : 1
    }

    // Fit: one line at full size; long labels wrap to two lines; shrink only if still too wide.
    const t = this.activeLabel
    const fab = this.fabricLocalBounds()
    const maxW = Math.min(ACTIVE_LABEL_MAX_W_CM, fab.x1 - fab.x0 - 2)
    let h = ACTIVE_TEXT_H_CM
    let lines = 1
    let w = textWidthCm(st.label, h)
    if (w > maxW) {
      lines = 2
      w = textWidthCm(st.label, h) / 2 + h * 1.5 // wrapped halves, plus slack for word breaks
      if (w > maxW) {
        h = (h * maxW) / w
        w = maxW
      }
    }
    const boxH = h * 1.25 * lines
    // Label above/below the line: keep the whole (maybe two-line) box on the inner side of the line.
    if (horizontalLine) lz = mid[1] + inZ * (3 + boxH / 2) - gs[1] / 2
    // Box in pattern-local coords, then clamped inside the fabric.
    let x0 = side > 0 ? lx - w : side < 0 ? lx : lx - w / 2
    x0 = Math.min(fab.x1 - 1 - w, Math.max(fab.x0 + 1, x0))
    lz = Math.min(fab.z1 - 1 - boxH / 2, Math.max(fab.z0 + 1 + boxH / 2, lz))
    so.getTransform().setLocalPosition(new vec3(x0, 0.4, lz))
    t.size = textSizeForHeight(h)
    t.horizontalAlignment = side > 0 ? HorizontalAlignment.Right : side < 0 ? HorizontalAlignment.Left : HorizontalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Wrap
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(0, w, -boxH / 2, boxH / 2)
    t.text = st.label
    so.enabled = true
  }

  /** Fabric top-surface rectangle in this object's local XZ (pattern centre = 0,0). */
  private fabricLocalBounds(): {x0: number; x1: number; z0: number; z1: number} {
    const c = this.patternCenterWorld
    const f = this.fabric ? this.fabric.getTransform().getWorldPosition() : c
    const cx = f.x - c.x
    const cz = f.z - c.z
    return {x0: cx - this.fabricSize.x / 2, x1: cx + this.fabricSize.x / 2, z0: cz - this.fabricSize.y / 2, z1: cz + this.fabricSize.y / 2}
  }

  /** World point on the current line closest to `from` (leader-line target); null when no line. */
  currentLineNearestWorld(from: vec3): vec3 | null {
    const g = this.geometry
    const i = this.currentStep
    if (!g || i < 0 || i >= g.steps.length) return null
    const st = g.steps[i]
    const c = this.patternCenterWorld
    const gs = this.groupSize(i)
    const ox = c.x - gs[0] / 2
    const oz = c.z - gs[1] / 2
    const pts: P2[] = []
    for (const l of st.lines) for (const p of l) pts.push(p)
    if (st.lines.length === 0) for (const mk of st.marks) pts.push(mk.a, mk.b)
    let best: vec3 | null = null
    let bd = 1e12
    for (const p of pts) {
      const w = new vec3(ox + p[0], c.y + 0.3, oz + p[1])
      const d = (w.x - from.x) ** 2 + (w.z - from.z) ** 2
      if (d < bd) {
        bd = d
        best = w
      }
    }
    return best
  }

  /** World point beside the current line (its midpoint), for placing the step label. */
  currentLineAnchorWorld(): vec3 {
    const g = this.geometry
    const center = this.patternCenterWorld
    if (!g || this.currentStep < 0 || this.currentStep >= g.steps.length) return center
    const st = g.steps[this.currentStep]
    const pts: P2[] = st.lines.length > 0 ? st.lines[0] : st.marks.map((m) => m.a)
    let sx = 0
    let sz = 0
    for (const p of pts) {
      sx += p[0]
      sz += p[1]
    }
    const n = Math.max(1, pts.length)
    const gs = this.groupSize(this.currentStep)
    return new vec3(center.x - gs[0] / 2 + sx / n, center.y, center.z - gs[1] / 2 + sz / n)
  }
}
