/**
 * ChalkLessStepPanelUI.ts — passive view lying flat on the fabric beside the current line:
 * one short step label plus one big action button ("Start cutting" while aligning, "Next" while cutting).
 * Exposes: showAlign(), showStep(label, index, total), hide(), moveTo(worldPos), pressAction().
 * Emits: onStartCutting, onNext.
 * Must not: decide which step comes next.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, labeledButton, LabeledButton, textRow} from "./ChalkLessStyleUI"

@component
export class ChalkLessStepPanelUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessStepPanelUI – step label + Next</span>')
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
  @hint("Step label colour (match the glowing line)")
  @widget(new ColorWidget())
  labelColor: vec4 = new vec4(0.55, 1, 1, 1)
  @ui.group_end

  private _onStartCutting = new Event<void>()
  private _onNext = new Event<void>()
  get onStartCutting(): PublicApi<void> {
    return this._onStartCutting.publicApi()
  }
  get onNext(): PublicApi<void> {
    return this._onNext.publicApi()
  }

  private mode: "align" | "step" = "align"
  private counter: Text
  private label: Text
  private action: LabeledButton

  /** Current label text (for tests). */
  get labelText(): string {
    return this.label ? this.label.text : ""
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    const W = this.panelWidth
    const inner = W - 4
    const d = this.viewDistance
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 1.0, 1.6)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    this.counter = textRow(content, "StepCounter", "Align pattern", "Headline2", d, inner, 3, new vec4(0.8, 0.85, 0.9, 1))
    this.label = textRow(content, "StepLabel", this.alignText, "Title2", d, inner, 10, this.labelColor)
    this.action = labeledButton(content, "StepActionButton", "Start cutting", inner, 8, d, "Title2")
    this.action.button.onTriggerUp.add(() => this.pressAction())
  }

  /** Same path as pinching the big action button. */
  pressAction(): void {
    if (this.mode === "align") this._onStartCutting.invoke()
    else this._onNext.invoke()
  }

  showAlign(): void {
    this.mode = "align"
    this.sceneObject.enabled = true
    this.counter.text = "Align pattern"
    this.label.text = this.alignText
    this.action.label.text = "Start cutting"
  }

  showStep(label: string, index: number, total: number, title: string): void {
    this.mode = "step"
    this.sceneObject.enabled = true
    this.counter.text = `Step ${index + 1} of ${total} — ${title}`
    this.label.text = label
    this.action.label.text = "Next"
  }

  moveTo(worldPos: vec3): void {
    this.sceneObject.getTransform().setWorldPosition(worldPos)
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
