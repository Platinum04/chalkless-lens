/**
 * ChalkLessTableFinderUI.ts — passive view for the "Find your table" phase: a prompt, a status line,
 * a big ConfirmTableButton and a SkipTableButton ("Use virtual table").
 * API: show(), hide(), setStatus(text), setConfirmVisible(b), setSkipVisible(b); events onConfirm, onSkip.
 * Must not: run World Query or decide anything; ChalkLessTableFinder drives it.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, labeledButton, LabeledButton, textRow} from "./ChalkLessStyleUI"

@component
export class ChalkLessTableFinderUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessTableFinderUI – find your table prompt</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(20, 60, 1))
  panelWidth: number = 34
  @input
  @hint("Viewing distance used to scale text (cm)")
  @widget(new SliderWidget(60, 250, 1))
  viewDistance: number = 110
  @input
  @hint("Prompt shown while looking for the table")
  prompt: string = "Look at your cutting table and pinch Confirm"
  @ui.group_end

  private _onConfirm = new Event<void>()
  get onConfirm(): PublicApi<void> {
    return this._onConfirm.publicApi()
  }
  private _onSkip = new Event<void>()
  get onSkip(): PublicApi<void> {
    return this._onSkip.publicApi()
  }

  private statusText: Text
  private confirm: LabeledButton
  private skip: LabeledButton

  get status(): string {
    return this.statusText ? this.statusText.text : ""
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    const W = this.panelWidth
    const inner = W - 4
    const d = this.viewDistance
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 1.2, 1.8)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    textRow(content, "TableTitle", "Find your table", "Title2", d, inner, 4.5, new vec4(0.6, 1, 0.9, 1))
    textRow(content, "TablePrompt", this.prompt, "Headline2", d, inner, 6, new vec4(1, 1, 1, 1))
    this.statusText = textRow(content, "TableStatus", "Looking for a flat surface...", "Body", d, inner, 3.5, new vec4(1, 0.9, 0.6, 1))
    this.confirm = labeledButton(content, "ConfirmTableButton", "Confirm table", inner, 7, d, "HeadlineXL")
    this.confirm.button.onTriggerUp.add(() => this._onConfirm.invoke())
    this.skip = labeledButton(content, "SkipTableButton", "Use virtual table", inner, 5, d, "Headline2")
    this.skip.button.onTriggerUp.add(() => this._onSkip.invoke())
    this.setConfirmVisible(false)
    this.setSkipVisible(false)
  }

  show(): void {
    this.sceneObject.enabled = true
  }

  hide(): void {
    this.sceneObject.enabled = false
  }

  setStatus(text: string): void {
    if (this.statusText) this.statusText.text = text
  }

  setConfirmVisible(v: boolean): void {
    if (this.confirm) this.confirm.so.enabled = v
  }

  setSkipVisible(v: boolean): void {
    if (this.skip) this.skip.so.enabled = v
  }
}
