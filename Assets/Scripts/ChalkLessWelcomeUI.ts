/**
 * ChalkLessWelcomeUI.ts — passive view for the first-run welcome card: what ChalkLess does, three short
 * tips and a big WelcomeStartButton, plus a small WelcomeHideButton ("Start, don't show again").
 * API: show(), hide(); events onStart(dontShowAgain). Must not: decide the flow; ChalkLessMain drives it.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, labeledButton, textRow} from "./ChalkLessStyleUI"

@component
export class ChalkLessWelcomeUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessWelcomeUI – first-run welcome card</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(20, 60, 1))
  panelWidth: number = 36
  @input
  @hint("Viewing distance used to scale text (cm)")
  @widget(new SliderWidget(60, 250, 1))
  viewDistance: number = 110
  @ui.group_end

  private _onStart = new Event<boolean>()
  /** Fires with true when the tailor chose "don't show again". */
  get onStart(): PublicApi<boolean> {
    return this._onStart.publicApi()
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
    textRow(content, "WelcomeTitle", "Welcome to ChalkLess", "Title2", d, inner, 4.5, new vec4(0.6, 1, 0.9, 1))
    textRow(content, "WelcomeTagline", "Cut right the first time", "HeadlineXL", d, inner, 6, new vec4(1, 1, 1, 1))
    textRow(content, "WelcomeTip1", "1. Lay your fabric flat on a table", "Headline1", d, inner, 5, new vec4(1, 0.95, 0.75, 1))
    textRow(content, "WelcomeTip2", "2. Pinch to press, or say \"next\" / \"back\"", "Headline1", d, inner, 5, new vec4(1, 0.95, 0.75, 1))
    textRow(content, "WelcomeTip3", "3. Cut along the glowing line, one at a time", "Headline1", d, inner, 5, new vec4(1, 0.95, 0.75, 1))
    const start = labeledButton(content, "WelcomeStartButton", "Start", inner, 7, d, "HeadlineXL")
    start.button.onTriggerUp.add(() => this._onStart.invoke(false))
    const hide = labeledButton(content, "WelcomeHideButton", "Start, don't show again", inner, 4.5, d, "Body")
    hide.button.onTriggerUp.add(() => this._onStart.invoke(true))
  }

  show(): void {
    this.sceneObject.enabled = true
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
