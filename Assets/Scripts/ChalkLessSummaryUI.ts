/**
 * ChalkLessSummaryUI.ts — passive view: summary card standing at the far edge of the table
 * after the hem is cut. Exposes show(lines), hide(), restart via onRestart.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, labeledButton, textRow} from "./ChalkLessStyleUI"

@component
export class ChalkLessSummaryUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessSummaryUI – cut summary card</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(20, 60, 1))
  panelWidth: number = 36
  @input
  @hint("Viewing distance used to scale text (cm)")
  @widget(new SliderWidget(60, 250, 1))
  viewDistance: number = 150
  @input("vec4", "{0.6, 1, 0.7, 1}")
  @hint("Headline colour")
  @widget(new ColorWidget())
  headlineColor: vec4 = new vec4(0.6, 1, 0.7, 1)
  @ui.group_end

  private _onRestart = new Event<void>()
  get onRestart(): PublicApi<void> {
    return this._onRestart.publicApi()
  }

  private piecesText: Text
  private savedText: Text

  get summaryText(): string {
    return this.piecesText ? this.piecesText.text + "\n" + this.savedText.text : ""
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    const W = this.panelWidth
    const inner = W - 4
    const d = this.viewDistance
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 1.2, 1.8)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    textRow(content, "SummaryTitle", "All cuts done", "Title2", d, inner, 5, this.headlineColor)
    this.piecesText = textRow(content, "SummaryPieces", "Pieces cut: 4", "Headline1", d, inner, 8, new vec4(1, 1, 1, 1))
    this.savedText = textRow(content, "SummarySaved", "Fabric saved: 0 cm²", "Headline2", d, inner, 8, new vec4(1, 0.9, 0.6, 1))
    const again = labeledButton(content, "RestartButton", "Cut another buba", inner, 6, d, "Headline1")
    again.button.onTriggerUp.add(() => this._onRestart.invoke())
  }

  show(pieces: string, saved: string): void {
    this.sceneObject.enabled = true
    this.piecesText.text = pieces
    this.savedText.text = saved
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
