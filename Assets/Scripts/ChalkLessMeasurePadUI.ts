/**
 * ChalkLessMeasurePadUI.ts — passive view: the measurement pad (one measurement at a time,
 * big − / + buttons, big "Next measurement" / "Place pattern" button, live mini preview).
 * Exposes: show(), hide(), setMeasurement(...), setMiniPreview(geometry).
 * Emits: onDecrease, onIncrease, onNext (Next measurement or Place pattern).
 * Must not: hold measurement values — Main owns them and pushes them in.
 */
import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {BackPlate} from "UIKit.lspkg/Scripts/BackPlate"
import {FlexDirection} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {child, CONTENT_Z, flexContainer, flexItem, labeledButton, LabeledButton, textRow} from "./ChalkLessStyleUI"
import {PatternGeometry} from "./ChalkLessPattern"
import {MeshAccumulator, tintedMaterial} from "./ChalkLessLines"

@component
export class ChalkLessMeasurePadUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessMeasurePadUI – measurement pad</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit material cloned for the mini pattern preview lines")
  lineMaterial: Material
  @ui.group_end
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
  @hint("Mini preview scale (preview cm per pattern cm). Fixed so size changes are visible.")
  @widget(new SliderWidget(0.05, 0.4, 0.01))
  previewScale: number = 0.17
  @input("vec4", "{0.4, 0.95, 1, 1}")
  @hint("Mini preview line colour")
  @widget(new ColorWidget())
  previewColor: vec4 = new vec4(0.4, 0.95, 1, 1)
  @input("vec4", "{1, 0.9, 0.55, 1}")
  @hint("Measurement value colour")
  @widget(new ColorWidget())
  valueColor: vec4 = new vec4(1, 0.9, 0.55, 1)
  @ui.group_end

  private _onDecrease = new Event<void>()
  private _onIncrease = new Event<void>()
  private _onNext = new Event<void>()
  get onDecrease(): PublicApi<void> {
    return this._onDecrease.publicApi()
  }
  get onIncrease(): PublicApi<void> {
    return this._onIncrease.publicApi()
  }
  get onNext(): PublicApi<void> {
    return this._onNext.publicApi()
  }

  private stepText: Text
  private nameText: Text
  private valueText: Text
  private nextBtn: LabeledButton
  private previewRmv: RenderMeshVisual
  private previewHolder: SceneObject
  private lastPreviewSize = new vec2(0, 0)

  /** Current mini-preview size in cm (for tests). */
  get previewSizeCm(): vec2 {
    return this.lastPreviewSize
  }

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const plate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    plate.style = "simple"
    const W = this.panelWidth
    const inner = W - 4
    const d = this.viewDistance
    const content = child(this.sceneObject, "Content", new vec3(0, 0, CONTENT_Z))
    const flex = flexContainer(content, FlexDirection.Column, W, -1, 1.0, 1.8)
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    this.stepText = textRow(content, "MeasureStep", "Buba measurement 1 of 7", "Headline2", d, inner, 3, new vec4(0.8, 0.85, 0.9, 1))
    this.nameText = textRow(content, "MeasureName", "Round sleeve (arm)", "Headline1", d, inner, 3.5, new vec4(1, 1, 1, 1))

    const row = child(content, "ValueRow")
    flexItem(row, inner, 7)
    flexContainer(row, FlexDirection.Row, inner, 7, 1.0, 0)
    const minus = labeledButton(row, "MinusButton", "−", 7, 7, d, "Title1")
    minus.button.onTriggerUp.add(() => this._onDecrease.invoke())
    this.valueText = textRow(row, "MeasureValue", "104 cm", "Title1", d, inner - 16, 7, this.valueColor)
    const plus = labeledButton(row, "PlusButton", "+", 7, 7, d, "Title1")
    plus.button.onTriggerUp.add(() => this._onIncrease.invoke())

    this.nextBtn = labeledButton(content, "NextMeasurementButton", "Next measurement", inner, 6.5, d, "Headline1")
    this.nextBtn.button.onTriggerUp.add(() => this._onNext.invoke())

    textRow(content, "PreviewCaption", "Live pattern preview", "Caption", d, inner, 2.2, new vec4(0.75, 0.8, 0.85, 1))
    this.previewHolder = child(content, "MiniPreview")
    flexItem(this.previewHolder, inner, 15)
    const meshSo = child(this.previewHolder, "MiniPreviewLines", new vec3(0, 0, 0.2))
    meshSo.getTransform().setLocalRotation(quat.fromEulerAngles(Math.PI / 2, 0, 0))
    this.previewRmv = meshSo.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    if (this.lineMaterial) this.previewRmv.mainMaterial = tintedMaterial(this.lineMaterial, this.previewColor)
  }

  setMeasurement(name: string, valueCm: number, index: number, total: number, isLast: boolean, styleName: string = "Buba"): void {
    this.stepText.text = `${styleName} measurement ${index + 1} of ${total}`
    this.nameText.text = name
    this.valueText.text = `${valueCm} cm`
    this.nextBtn.label.text = isLast ? "Place pattern" : "Next measurement"
  }

  setMiniPreview(g: PatternGeometry): void {
    // Fixed scale so changes are visible; shrink only when a long/wide style would overflow the 15 cm box.
    const s = Math.min(this.previewScale, 14.5 / Math.max(1, g.lengthCm), (this.panelWidth - 5) / Math.max(1, g.widthCm))
    const acc = new MeshAccumulator(0)
    const ox = -g.widthCm / 2
    const oz = -g.lengthCm / 2
    for (const st of g.steps) {
      for (const line of st.lines) {
        acc.polyline(
          line.map((p) => [(p[0] + ox) * s, (p[1] + oz) * s] as [number, number]),
          0.25,
        )
      }
    }
    this.previewRmv.mesh = acc.build()
    this.lastPreviewSize = new vec2(g.widthCm * s, g.lengthCm * s)
  }

  show(): void {
    this.sceneObject.enabled = true
  }

  hide(): void {
    this.sceneObject.enabled = false
  }
}
