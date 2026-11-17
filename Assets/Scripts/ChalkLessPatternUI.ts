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
import {offsetOutward, P2, PatternGeometry} from "./ChalkLessPattern"
import {applyTextRole} from "./ChalkLessStyleUI"

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
    const hx = Math.max(0, this.fabricSize.x / 2 - this.geometry.widthCm / 2 + 10)
    const hz = Math.max(0, this.fabricSize.y / 2 - this.geometry.lengthCm / 2 + 10)
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
    this.content.getTransform().setLocalPosition(new vec3(-g.widthCm / 2, 0.15, -g.lengthCm / 2))
    const shape = Shape.createBoxShape()
    shape.size = new vec3(g.widthCm, 2, g.lengthCm)
    this.collider.shape = shape

    g.steps.forEach((st, i) => {
      const root = global.scene.createSceneObject(`Line_${i}`)
      root.setParent(this.content)
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
        for (const mark of st.marks) {
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
      for (const mark of st.marks) this.addLabel(labels, mark.a, mark.b, mark.label)
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

  private addLabel(parent: SceneObject, a: P2, b: P2, label: string): void {
    const so = global.scene.createSceneObject("MarkLabel")
    so.setParent(parent)
    const vertical = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0])
    const mx = (a[0] + b[0]) / 2 + (vertical ? 1.5 : 0)
    const mz = (a[1] + b[1]) / 2 + (vertical ? 0 : 2.6)
    so.getTransform().setLocalPosition(new vec3(mx, 0.3, mz))
    so.getTransform().setLocalRotation(quat.fromEulerAngles(-Math.PI / 2, 0, 0))
    const t = so.createComponent("Component.Text") as Text
    t.text = label
    t.depthTest = true
    applyTextRole(t, "Headline1", 330)
    t.textFill.color = this.activeColor
    t.horizontalAlignment = vertical ? HorizontalAlignment.Left : HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.layoutRect = Rect.create(vertical ? 0 : -16, vertical ? 30 : 16, -1.6, 1.6)
  }

  /** -1 = aligning (whole outline shown); 0..n-1 = cutting; n = all done. */
  setCurrentStep(i: number): void {
    this.currentStep = i
    this.states = []
    this.visuals.forEach((v, k) => {
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
    const pts = st.lines[0]
    const mid: P2 =
      pts.length === 2 ? [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2] : pts[Math.floor(pts.length / 2)]
    let dx = mid[0] - st.centroid[0]
    let dz = mid[1] - st.centroid[1]
    const l = Math.sqrt(dx * dx + dz * dz) || 1
    const off = -8 // inward: the free fabric inside the piece, right beside the line
    let lx = mid[0] + (dx / l) * off - g.widthCm / 2
    let lz = mid[1] + (dz / l) * off - g.lengthCm / 2
    const isFold = st.id === "fold" || (st.id === undefined && i === 0)
    const foldVertical = isFold && Math.abs(pts[pts.length - 1][0] - pts[0][0]) < 0.01
    if (isFold) {
      // fold: lay the label inside the piece, beside the fold line
      if (foldVertical) {
        lx = pts[0][0] + 3 - g.widthCm / 2
        lz = mid[1] - g.lengthCm / 2
      } else {
        lx = mid[0] - g.widthCm / 2
        lz = pts[0][1] + 4 - g.lengthCm / 2
      }
    }
    so.getTransform().setLocalPosition(new vec3(lx, 0.4, lz))
    const t = this.activeLabel
    const side = foldVertical ? -1 : isFold ? 0 : Math.abs(dx / l) > 0.5 ? Math.sign(dx) : 0
    if (side > 0) {
      t.horizontalAlignment = HorizontalAlignment.Right
      t.layoutRect = Rect.create(-45, 0, -2, 2)
    } else if (side < 0) {
      t.horizontalAlignment = HorizontalAlignment.Left
      t.layoutRect = Rect.create(0, 45, -2, 2)
    } else {
      t.horizontalAlignment = HorizontalAlignment.Center
      t.layoutRect = Rect.create(-22, 22, -2, 2)
    }
    t.text = st.label
    so.enabled = true
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
    return new vec3(center.x - g.widthCm / 2 + sx / n, center.y, center.z - g.lengthCm / 2 + sz / n)
  }
}
