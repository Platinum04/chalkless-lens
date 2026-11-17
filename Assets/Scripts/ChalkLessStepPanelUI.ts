/**
 * ChalkLessStepPanelUI.ts — passive view lying flat on the fabric beside the current line:
 * step title, "Step n of N · <length>" subline, one big pill action button ("Start cutting →" while
 * aligning, "Next step →" while cutting), a progress dot track beside the card, a thin glowing
 * leader line from the card to the active line, and (align stage only) a compact measurement
 * summary card with an "Edit measurements" button.
 * Exposes: showAlign(), showStep(label, index, total, title), showMeasureSummary(title, lines),
 *          setLeaderTarget(worldPoint | null), hide(), moveTo(worldPos), pressAction(), editMeasurements().
 * Emits: onStartCutting, onNext, onEditMeasurements.
 * Must not: decide which step comes next or hold measurement values.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, labeledButton, LabeledButton, textRow} from "./ChalkLessStyleUI"
import {MeshAccumulator, tintedMaterial} from "./ChalkLessLines"
import {P2} from "./ChalkLessPattern"
import {approachAngle, smoothK, wrapAngle, yawQuat} from "./ChalkLessViewer"

const DOT_R = 0.9
const DOT_GAP = 1.4

@component
export class ChalkLessStepPanelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessStepPanelUI – step card + Next</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(24, 60, 1))
  panelWidth: number = 44
  @input
  @hint("Viewing distance used to scale text (cm)")
  @widget(new SliderWidget(60, 250, 1))
  viewDistance: number = 150
  @input
  @hint("Instruction shown while aligning the pattern")
  alignText: string = "Pinch and drag the pattern to line the fold up with the fabric edge"
  @input("vec4", "{0.55, 1, 1, 1}")
  @hint("Step title colour (match the glowing line)")
  @widget(new ColorWidget())
  labelColor: vec4 = new vec4(0.55, 1, 1, 1)
  @input("vec4", "{0.1, 0.95, 1, 1}")
  @hint("Leader line + current progress dot colour")
  @widget(new ColorWidget())
  glowColor: vec4 = new vec4(0.1, 0.95, 1, 1)
  @ui.group_end

  private _onStartCutting = new Event<void>()
  private _onNext = new Event<void>()
  private _onEditMeasurements = new Event<void>()
  get onStartCutting(): PublicApi<void> {
    return this._onStartCutting.publicApi()
  }
  get onNext(): PublicApi<void> {
    return this._onNext.publicApi()
  }
  get onEditMeasurements(): PublicApi<void> {
    return this._onEditMeasurements.publicApi()
  }

  private mode: "align" | "step" = "align"
  private counter: Text
  private label: Text
  private action: LabeledButton
  private plateSize = new vec2(44, 20)
  private dots: RenderMeshVisual
  private leader: RenderMeshVisual
  private leaderTarget: vec3 | null = null
  private summaryCard: SceneObject
  private summaryTitle: Text
  private summaryLines: Text
  private mats: {dim: Material; glow: Material; done: Material}
  private dotState = {index: -1, total: 0}
  private titleSize = 100
  private summaryH = 22
  private baseRot: quat
  private yaw = 0
  private targetYaw = 0
  /** Turn needed before the card re-faces the tailor (hysteresis, deg). */
  private static readonly FACE_HYSTERESIS = (35 * Math.PI) / 180

  /** Yaw (deg) the card uses to read upright for the tailor (0 = authored, tailor at +Z). */
  get yawDeg(): number {
    return (this.yaw * 180) / Math.PI
  }

  /**
   * Turn the flat card about the vertical so it reads upright for the tailor. Small changes are ignored
   * (hysteresis); otherwise it eases there in ~200 ms, or at once when `immediate` (before placement).
   */
  faceYaw(yaw: number, immediate: boolean): void {
    if (Math.abs(wrapAngle(yaw - this.targetYaw)) > ChalkLessStepPanelUI.FACE_HYSTERESIS) this.targetYaw = wrapAngle(yaw)
    if (immediate) {
      this.yaw = this.targetYaw
      this.applyYaw()
    }
  }

  private applyYaw(): void {
    this.sceneObject.getTransform().setWorldRotation(yawQuat(this.yaw).multiply(this.baseRot))
  }

  /** Current step title text (for tests; never empty while cutting). */
  get labelText(): string {
    return this.label ? this.label.text : ""
  }

  /** Card footprint in its local plane incl. the progress dots: (xMin, yMin, xMax, yMax) cm. */
  get footprint(): vec4 {
    const hw = this.plateSize.x / 2
    const hh = this.plateSize.y / 2
    return new vec4(-hw, -hh, hw + (this.dotState.total > 0 ? 2.4 + DOT_R * 2 + 0.6 : 0), hh)
  }

  onAwake(): void {
    this.baseRot = this.sceneObject.getTransform().getWorldRotation()
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    const W = this.panelWidth
    const inner = W - 4
    const d = this.viewDistance
    const base = requireAsset("../ChalkLessUnlit.mat") as Material
    this.mats = {
      dim: tintedMaterial(base, new vec4(0.6, 0.7, 0.75, 1)),
      glow: tintedMaterial(base, this.glowColor),
      done: tintedMaterial(base, new vec4(0.85, 0.95, 1, 1)),
    }
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 1.0, 1.6)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
      this.plateSize = plate.size
      this.layoutSide()
    })
    this.label = textRow(content, "StepLabel", this.alignText, "Title2", d, inner, 6, this.labelColor)
    this.label.verticalOverflow = VerticalOverflow.Shrink
    this.counter = textRow(content, "StepCounter", "Align pattern", "Headline1", d, inner, 3.5, new vec4(0.85, 0.9, 0.95, 1))
    this.counter.horizontalOverflow = HorizontalOverflow.Shrink
    this.counter.size = this.counter.size * 1.3
    this.titleSize = this.label.size * 1.15
    this.action = labeledButton(content, "StepActionButton", "Start cutting →", inner * 0.7, 7, d, "Title2", undefined, true)
    this.action.button.onTriggerUp.add(() => this.pressAction())

    // Progress dot track (beside the card) and the leader line (to the active line); both flat in the card plane.
    this.dots = this.planeMesh("ProgressDots", this.mats.dim)
    this.leader = this.planeMesh("LeaderLine", this.mats.glow)
    this.buildSummaryCard(d)
    this.createEvent("LateUpdateEvent").bind(() => {
      if (this.yaw !== this.targetYaw) {
        this.yaw = approachAngle(this.yaw, this.targetYaw, smoothK(0.06))
        if (Math.abs(wrapAngle(this.targetYaw - this.yaw)) < 0.002) this.yaw = this.targetYaw
        this.applyYaw()
      }
      this.updateLeader()
    })
  }

  /** A RenderMeshVisual whose MeshAccumulator XZ maps to this card's local (x, -y). */
  private planeMesh(name: string, mat: Material): RenderMeshVisual {
    const so = child(this.sceneObject, name, new vec3(0, 0, CONTENT_Z + 0.1))
    so.getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI / 2, 0, 0))
    const r = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    r.mainMaterial = mat
    return r
  }

  private buildSummaryCard(d: number): void {
    const W = 30
    const inner = W - 3
    this.summaryCard = child(this.sceneObject, "MeasureSummaryCard")
    this.summaryCard.createComponent("Component.Canvas")
    const plate = this.summaryCard.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    const content = child(this.summaryCard, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 0.8, 1.4)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
      this.summaryH = r.containerHeight
      this.layoutSide()
    })
    this.summaryTitle = textRow(content, "MeasureSummaryTitle", "Buba · Custom fit", "Headline1", d, inner, 3.6, this.labelColor)
    this.summaryLines = textRow(content, "MeasureSummaryLines", "Chest 100 cm\nTop length 70 cm\nSleeve length 25 cm\nNeck 40 cm", "Headline2", d, inner, 11, new vec4(1, 1, 1, 1))
    this.summaryLines.horizontalAlignment = HorizontalAlignment.Left
    this.summaryLines.size = this.summaryLines.size * 1.25
    this.summaryLines.verticalOverflow = VerticalOverflow.Shrink
    const edit = labeledButton(content, "EditMeasurementsButton", "Edit measurements", inner, 5, d, "Headline2", undefined, true)
    edit.button.onTriggerUp.add(() => this.editMeasurements())
    this.summaryCard.enabled = false
  }

  /** Summary card sits on the far side of the step card (away from the hands and the cut lines). */
  private layoutSide(): void {
    if (this.summaryCard) this.summaryCard.getTransform().setLocalPosition(new vec3(0, this.plateSize.y / 2 + this.summaryH / 2 + 3, 0))
    this.drawDots()
  }

  /** Same path as pinching the big action button. */
  pressAction(): void {
    if (this.mode === "align") this._onStartCutting.invoke()
    else this._onNext.invoke()
  }

  /** Same path as pinching "Edit measurements". */
  editMeasurements(): void {
    if (this.mode === "align" && this.sceneObject.enabled) this._onEditMeasurements.invoke()
  }

  showAlign(): void {
    this.mode = "align"
    this.sceneObject.enabled = true
    this.counter.text = "Align pattern"
    this.label.text = this.alignText
    this.label.size = this.counter.size
    this.action.label.text = "Start cutting →"
    this.dotState = {index: -1, total: 0}
    this.drawDots()
    this.leaderTarget = null
  }

  /** Compact "<style> · Custom fit" card with a few key measurements; align stage only. */
  showMeasureSummary(title: string, lines: string[]): void {
    this.summaryTitle.text = title
    this.summaryLines.text = lines.join("\n")
    this.summaryCard.enabled = true
  }

  showStep(label: string, index: number, total: number, title: string): void {
    this.mode = "step"
    this.sceneObject.enabled = true
    this.summaryCard.enabled = false
    const cut = label.indexOf(" · ")
    const head = cut > 0 ? label.substring(0, cut) : label
    const detail = cut > 0 ? label.substring(cut + 3) : title
    this.label.text = head || title
    this.label.size = this.titleSize
    this.counter.text = `Step ${index + 1} of ${total} · ${detail}`
    this.action.label.text = index === total - 1 ? "Finish ✓" : "Next step →"
    this.dotState = {index, total}
    this.drawDots()
  }

  /** World point on the active line the leader line should reach (null = no leader). */
  setLeaderTarget(world: vec3 | null): void {
    this.leaderTarget = world
  }

  /** Vertical dot track just outside the card's right edge: filled = done, glowing = current, hollow = future. */
  private drawDots(): void {
    if (!this.dots) return
    const {index, total} = this.dotState
    const done = new MeshAccumulator(0)
    const cur = new MeshAccumulator(0)
    const fut = new MeshAccumulator(0)
    const x = this.plateSize.x / 2 + 2.4
    const span = (total - 1) * (DOT_R * 2 + DOT_GAP)
    for (let i = 0; i < total; i++) {
      // Top of the card = first step; accumulator z = -local y.
      const z = -(span / 2) + i * (DOT_R * 2 + DOT_GAP)
      if (i < index) ring(done, x, z, DOT_R / 2, DOT_R)
      else if (i === index) {
        ring(cur, x, z, DOT_R * 0.6, DOT_R * 1.2)
        ring(cur, x, z, DOT_R * 1.7, 0.25)
      } else ring(fut, x, z, DOT_R - 0.15, 0.3)
    }
    // Three tints → three child meshes under the dots holder.
    const holder = this.dots.getSceneObject()
    this.dots.mesh = fut.build()
    this.dots.mainMaterial = this.mats.dim
    const ensure = (name: string, mat: Material): RenderMeshVisual => {
      for (let i = 0; i < holder.getChildrenCount(); i++) if (holder.getChild(i).name === name) return holder.getChild(i).getComponent("Component.RenderMeshVisual") as RenderMeshVisual
      const so = child(holder, name, new vec3(0, 0.02, 0))
      const r = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      r.mainMaterial = mat
      return r
    }
    ensure("DoneDots", this.mats.done).mesh = done.build()
    ensure("CurrentDot", this.mats.glow).mesh = cur.build()
    holder.enabled = total > 0
  }

  /** Thin glowing line from the card's nearest edge to the active line's anchor. */
  private updateLeader(): void {
    if (!this.leader) return
    const so = this.leader.getSceneObject()
    if (!this.leaderTarget || this.mode !== "step") {
      so.enabled = false
      return
    }
    const inv = this.sceneObject.getTransform().getInvertedWorldTransform()
    const p = inv.multiplyPoint(this.leaderTarget)
    const hw = this.plateSize.x / 2
    const hh = this.plateSize.y / 2
    const sx = Math.min(hw, Math.max(-hw, p.x))
    const sy = Math.min(hh, Math.max(-hh, p.y))
    const dx = p.x - sx
    const dy = p.y - sy
    if (dx * dx + dy * dy < 4) {
      so.enabled = false
      return
    }
    const key = `${p.x.toFixed(1)},${p.y.toFixed(1)},${hw.toFixed(1)}`
    if ((this as unknown as {lastLeader?: string}).lastLeader !== key) {
      ;(this as unknown as {lastLeader?: string}).lastLeader = key
      const acc = new MeshAccumulator(0)
      acc.segment([sx, -sy], [p.x, -p.y], 0.45)
      ring(acc, p.x, -p.y, 0.6, 0.35)
      this.leader.mesh = acc.build()
    }
    so.enabled = true
  }

  moveTo(worldPos: vec3): void {
    this.sceneObject.getTransform().setWorldPosition(worldPos)
  }

  hide(): void {
    this.sceneObject.enabled = false
    if (this.summaryCard) this.summaryCard.enabled = false
  }
}

/** Ring (or filled disc when r ≤ width/2) in accumulator XZ. */
function ring(acc: MeshAccumulator, cx: number, cz: number, r: number, width: number): void {
  if (width <= 0) return
  const pts: P2[] = []
  const n = 20
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r])
  }
  acc.polyline(pts, width)
}
