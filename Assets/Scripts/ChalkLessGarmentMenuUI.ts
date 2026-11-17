/**
 * ChalkLessGarmentMenuUI.ts — passive view: garment menu floating above the far table edge.
 * Every style in the registry is active, laid out as a 2-column grid of big UIKit buttons named
 * <Style>Button (BubaButton, KaftanLongButton, KaftanShortButton, AgbadaButton, DashikiButton,
 * CorsetButton, WrapperButton).
 * Emits: onStyleChosen(id), onBubaChosen. Exposes: show(), hide(), chooseStyle(id), chooseBuba().
 * Must not: hold any domain state.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, flexItem, labeledButton, textRow} from "./ChalkLessStyleUI"
import {STYLES} from "./ChalkLessStyleRecipes"
@component
export class ChalkLessGarmentMenuUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessGarmentMenuUI – garment picker</span>')
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Panel width in cm")
  @widget(new SliderWidget(24, 50, 1))
  panelWidth: number = 36
  @input
  @hint("Viewing distance used to scale text (cm)")
  @widget(new SliderWidget(60, 250, 1))
  viewDistance: number = 150
  @input
  @hint("Menu title")
  title: string = "ChalkLess — choose a garment"
  @input
  @hint("Height of each style button (cm)")
  @widget(new SliderWidget(4, 9, 0.5))
  buttonHeight: number = 5.5
  @input("vec4", "{0.85, 0.95, 1, 1}")
  @hint("Title text colour (keep light — additive display)")
  @widget(new ColorWidget())
  titleColor: vec4 = new vec4(0.85, 0.95, 1, 1)
  @ui.group_end

  private _onBubaChosen = new Event<void>()
  get onBubaChosen(): PublicApi<void> {
    return this._onBubaChosen.publicApi()
  }
  private _onStyleChosen = new Event<string>()
  get onStyleChosen(): PublicApi<string> {
    return this._onStyleChosen.publicApi()
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    const W = this.panelWidth
    const inner = W - 4
    const gap = 1.2
    const btnW = (inner - gap) / 2
    const h = this.buttonHeight
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, gap, 1.8)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    const d = this.viewDistance
    textRow(content, "MenuTitle", this.title, "Headline1", d, inner, 4, this.titleColor)
    for (let i = 0; i < STYLES.length; i += 2) {
      const row = child(content, `StyleRow${i / 2}`)
      flexItem(row, inner, h)
      flexContainer(row, FlexDirection.Row, inner, h, gap, 0)
      for (const st of STYLES.slice(i, i + 2)) {
        const b = labeledButton(row, st.buttonName, st.menuLabel, btnW, h, d, "Subheadline")
        const id = st.id
        b.button.onTriggerUp.add(() => this.chooseStyle(id))
      }
    }
  }

  /** Same path as pinching that style's button. */
  chooseStyle(id: string): void {
    this._onStyleChosen.invoke(id)
    if (id === "buba") this._onBubaChosen.invoke()
  }

  /** Same path as pinching the Buba button. */
  chooseBuba(): void {
    this.chooseStyle("buba")
  }

  show(): void {
    this.sceneObject.enabled = true
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
