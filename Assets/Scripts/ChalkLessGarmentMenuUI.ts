/**
 * ChalkLessGarmentMenuUI.ts — passive view: garment menu floating above the far table edge.
 * Two pages, each a 2-column grid of big UIKit buttons named <Style>Button. Page 1 (shown at start):
 * BubaButton, KaftanLongButton, KaftanShortButton, AgbadaButton, DashikiButton, CorsetButton,
 * WrapperButton + MenuNextPageButton ("More styles ›"). Page 2: SuitButton, BlazerButton,
 * JoggersButton, PalazzoButton, BubuButton, ALineDressButton, SheathDressButton, WrapDressButton,
 * MaxiGownButton + MenuPrevPageButton ("‹ Back"). Exposes also showPage(i).
 * Emits: onStyleChosen(id), onBubaChosen. Exposes: show(), hide(), chooseStyle(id), chooseBuba().
 * Must not: hold any domain state.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, flexItem, labeledButton, textRow} from "./ChalkLessStyleUI"
import {PAGE1_STYLES, PAGE2_STYLES} from "./ChalkLessStyleRecipes"
import {P2, StyleRecipe} from "./ChalkLessPattern"
import {garmentIcon} from "./ChalkLessGarmentIcons"
import {MeshAccumulator, tintedMaterial} from "./ChalkLessLines"
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
  @input("vec4", "{0.8, 0.97, 1, 1}")
  @hint("Line-art garment icon colour on each style button (keep light)")
  @widget(new ColorWidget())
  iconColor: vec4 = new vec4(0.8, 0.97, 1, 1)
  @input
  @hint("Title on page 2 (global styles)")
  title2: string = "More styles — global"
  @ui.group_end

  private _onBubaChosen = new Event<void>()
  get onBubaChosen(): PublicApi<void> {
    return this._onBubaChosen.publicApi()
  }
  private _onStyleChosen = new Event<string>()
  get onStyleChosen(): PublicApi<string> {
    return this._onStyleChosen.publicApi()
  }

  private pages: SceneObject[] = []
  private pageSizes: vec2[] = []
  private plate: BackPlate
  /** Index of the visible menu page (0 = original styles, 1 = global styles). */
  page = 0

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    this.plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    this.plate.style = "simple"
    this.buildPage(0, PAGE1_STYLES, this.title, "MenuNextPageButton", "More styles ›", () => this.showPage(1))
    this.buildPage(1, PAGE2_STYLES, this.title2, "MenuPrevPageButton", "‹ Back", () => this.showPage(0))
    this.showPage(0)
  }

  /** One page = title + 2-column grid of style buttons; the last grid cell is the page-switch button. */
  private buildPage(idx: number, styles: StyleRecipe[], title: string, navName: string, navLabel: string, onNav: () => void): void {
    const W = this.panelWidth
    const inner = W - 4
    const gap = 1.2
    const btnW = (inner - gap) / 2
    const h = this.buttonHeight
    const d = this.viewDistance
    const content = child(this.sceneObject, idx === 0 ? "Content" : `ContentPage${idx + 1}`, new vec3(0, 0, CONTENT_Z))
    this.pages[idx] = content
    this.pageSizes[idx] = new vec2(W, 10)
    const flex = flexContainer(content, FlexDirection.Column, W, -1, gap, 1.8)
    flex.onLayoutComplete.add((r) => {
      this.pageSizes[idx] = new vec2(r.containerWidth, r.containerHeight)
      if (this.page === idx) this.plate.size = this.pageSizes[idx]
    })
    textRow(content, idx === 0 ? "MenuTitle" : `MenuTitlePage${idx + 1}`, title, "Headline1", d, inner, 4, this.titleColor)
    const cells: {name: string; label: string; act: () => void; rec?: StyleRecipe}[] = styles.map((st) => ({name: st.buttonName, label: st.menuLabel, act: () => this.chooseStyle(st.id), rec: st}))
    cells.push({name: navName, label: navLabel, act: onNav})
    for (let i = 0; i < cells.length; i += 2) {
      const row = child(content, idx === 0 ? `StyleRow${i / 2}` : `Page${idx + 1}Row${i / 2}`)
      flexItem(row, inner, h)
      flexContainer(row, FlexDirection.Row, inner, h, gap, 0)
      for (const c of cells.slice(i, i + 2)) {
        const b = labeledButton(row, c.name, c.label, btnW, h, d, "Subheadline")
        b.button.onTriggerUp.add(c.act)
        if (c.rec) this.addIcon(b.so, b.label, c.rec, btnW, h)
      }
    }
  }

  /** Light line-art garment icon on the button's left (ChalkLessGarmentIcons). */
  private addIcon(btn: SceneObject, label: Text, rec: StyleRecipe, w: number, h: number): void {
    if (!this.iconMat) this.iconMat = tintedMaterial(requireAsset("../ChalkLessUnlit.mat") as Material, this.iconColor)
    const box = h - 1.4
    const acc = new MeshAccumulator(0)
    for (const l of garmentIcon(rec.id)) acc.polyline(l.map((p) => [p[0] * box, p[1] * box] as P2), 0.22)
    const iconX = -w / 2 + 0.8 + box / 2
    const so = global.scene.createSceneObject(btn.name + "Icon")
    so.setParent(btn)
    so.getTransform().setLocalPosition(new vec3(iconX, 0, 0.85))
    so.getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI / 2, 0, 0))
    const r = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    r.mesh = acc.build()
    r.mainMaterial = this.iconMat
    // Shift the label right so it sits beside the icon.
    const lt = label.getSceneObject().getTransform()
    const p = lt.getLocalPosition()
    const lw = w - box - 2.4
    lt.setLocalPosition(new vec3(-w / 2 + box + 1.6 + lw / 2, p.y, p.z))
    label.layoutRect = Rect.create(-lw / 2, lw / 2, -h / 2 + 0.3, h / 2 - 0.3)
    // Long names ("Kaftan long sleeve") wrap to two lines instead of shrinking to a sliver.
    if (label.text.length > 11) {
      label.horizontalOverflow = HorizontalOverflow.Wrap
      label.verticalOverflow = VerticalOverflow.Shrink
    }
  }

  private iconMat: Material

  /** Show menu page idx (0 or 1); hidden pages are disabled so their buttons can't be pinched. */
  showPage(idx: number): void {
    this.page = idx
    for (let i = 0; i < this.pages.length; i++) this.pages[i].enabled = i === idx
    if (this.plate && this.pageSizes[idx]) this.plate.size = this.pageSizes[idx]
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
    this.showPage(0)
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
