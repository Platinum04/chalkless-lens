/**
 * ChalkLessGarmentMenuUI.ts — passive view: garment menu floating above the far table edge.
 * Buba is active; Wrapper skirt and Kaftan are greyed "Coming soon" placeholders.
 * Emits: onBubaChosen. Exposes: show(), hide(), chooseBuba() (same path as pinching the button).
 * Must not: hold any domain state.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, labeledButton, textRow} from "./ChalkLessStyleUI"

@component
export class ChalkLessGarmentMenuUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessGarmentMenuUI – garment picker</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(20, 50, 1))
  panelWidth: number = 32
  @input
  @hint("Viewing distance used to scale text (cm)")
  @widget(new SliderWidget(60, 250, 1))
  viewDistance: number = 150
  @input
  @hint("Menu title")
  title: string = "ChalkLess — choose a garment"
  @input("vec4", "{0.85, 0.95, 1, 1}")
  @hint("Title text colour (keep light — additive display)")
  @widget(new ColorWidget())
  titleColor: vec4 = new vec4(0.85, 0.95, 1, 1)
  @ui.group_end

  private _onBubaChosen = new Event<void>()
  get onBubaChosen(): PublicApi<void> {
    return this._onBubaChosen.publicApi()
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    const W = this.panelWidth
    const btnW = W - 4
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 1.2, 1.8)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    const d = this.viewDistance
    textRow(content, "MenuTitle", this.title, "Headline1", d, btnW, 4, this.titleColor)
    const buba = labeledButton(content, "BubaButton", "Buba", btnW, 6.5, d, "Title2")
    buba.button.onTriggerUp.add(() => this.chooseBuba())
    for (const name of ["Wrapper skirt", "Kaftan"]) {
      const b = labeledButton(content, name.replace(" ", "") + "Button", `${name} — Coming soon`, btnW, 5, d, "Headline2")
      b.button.inactive = true
      b.label.textFill.color = new vec4(0.6, 0.6, 0.6, 1)
    }
  }

  /** Same path as pinching the Buba button. */
  chooseBuba(): void {
    this._onBubaChosen.invoke()
  }

  show(): void {
    this.sceneObject.enabled = true
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
