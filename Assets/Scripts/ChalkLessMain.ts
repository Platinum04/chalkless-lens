/**
 * ChalkLessMain.ts — orchestrator and single owner of ChalkLess state.
 * Flow: menu -> measure -> align -> cutting (7 steps) -> done.
 * Public state for tests: phase, currentStep, currentStepId, measurements, measureIndex,
 * patternPosition, patternSizeCm. Public actions mirror every button so tests can drive them.
 * Expects @inputs: the five UI views. Must not: create UI text or UIKit components.
 */
import {ChalkLessGarmentMenuUI} from "./ChalkLessGarmentMenuUI"
import {ChalkLessMeasurePadUI} from "./ChalkLessMeasurePadUI"
import {ChalkLessPatternUI} from "./ChalkLessPatternUI"
import {ChalkLessStepPanelUI} from "./ChalkLessStepPanelUI"
import {ChalkLessSummaryUI} from "./ChalkLessSummaryUI"
import {buildPattern, defaultMeasurements, fabricSavedEstimate, MEASUREMENTS, Measurements, PatternGeometry, STEPS} from "./ChalkLessPattern"

export type Phase = "menu" | "measure" | "align" | "cutting" | "done"

@component
export class ChalkLessMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessMain – buba cutting guide</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Garment menu panel")
  garmentMenu: ChalkLessGarmentMenuUI
  @input
  @hint("Measurement pad panel")
  measurePad: ChalkLessMeasurePadUI
  @input
  @hint("Pattern on the fabric")
  pattern: ChalkLessPatternUI
  @input
  @hint("Step label + Next panel lying on the fabric")
  stepPanel: ChalkLessStepPanelUI
  @input
  @hint("Summary card at the far edge of the table")
  summary: ChalkLessSummaryUI
  @input
  @hint("Fabric SceneObject (top surface centre)")
  fabric: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Step size of the − / + buttons (cm)")
  @widget(new SliderWidget(0.5, 5, 0.5))
  stepCm: number = 1
  @input
  @hint("Where the pattern centre starts on the fabric, relative to the fabric centre (x, z cm)")
  patternStartOffset: vec2 = new vec2(-18, -2)
  @input
  @hint("Step panel offset from fabric centre along X (cm) — keeps it beside the lines")
  stepPanelX: number = 50
  @input
  @hint("Extra margin a standard chalk layout leaves around the pattern (cm) — for the fabric-saved estimate")
  @widget(new SliderWidget(0, 10, 0.5))
  chalkMarginCm: number = 4
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Jump straight to a cutting step at launch for review (-1 = normal start at the menu, 0..6 = step, 7 = summary)")
  @widget(new SliderWidget(-1, 7, 1))
  debugJumpToStep: number = -1
  @ui.group_end

  phase: Phase = "menu"
  measurements: Measurements = defaultMeasurements()
  measureIndex = 0
  currentStep = -1
  private geometry: PatternGeometry

  get currentStepId(): string {
    return this.currentStep >= 0 && this.currentStep < STEPS.length ? STEPS[this.currentStep].id : ""
  }
  get patternPosition(): vec3 {
    return this.pattern.patternCenterWorld
  }
  get patternSizeCm(): vec2 {
    return new vec2(this.geometry.widthCm, this.geometry.lengthCm)
  }

  onAwake(): void {
    const refs: [string, unknown][] = [
      ["garmentMenu", this.garmentMenu],
      ["measurePad", this.measurePad],
      ["pattern", this.pattern],
      ["stepPanel", this.stepPanel],
      ["summary", this.summary],
      ["fabric", this.fabric],
    ]
    for (const [n, v] of refs) if (!v) print(`ChalkLessMain: missing @input ${n}`)
    this.createEvent("OnStartEvent").bind(() => this.start())
  }

  private start(): void {
    this.garmentMenu.onBubaChosen.add(() => this.chooseBuba())
    this.measurePad.onDecrease.add(() => this.adjustMeasurement(-this.stepCm))
    this.measurePad.onIncrease.add(() => this.adjustMeasurement(this.stepCm))
    this.measurePad.onNext.add(() => this.nextMeasurement())
    this.stepPanel.onStartCutting.add(() => this.startCutting())
    this.stepPanel.onNext.add(() => this.next())
    this.summary.onRestart.add(() => this.restart())
    this.restart()
    if (this.debugJumpToStep >= 0) {
      this.chooseBuba()
      this.placePattern()
      this.startCutting()
      for (let i = 0; i < this.debugJumpToStep; i++) this.next()
    }
  }

  restart(): void {
    this.phase = "menu"
    this.measurements = defaultMeasurements()
    this.measureIndex = 0
    this.currentStep = -1
    this.refreshGeometry()
    const f = this.fabric.getTransform().getWorldPosition()
    this.pattern.getSceneObject().getTransform().setWorldPosition(new vec3(f.x + this.patternStartOffset.x, f.y, f.z + this.patternStartOffset.y))
    this.pattern.setCurrentStep(-1)
    this.pattern.setVisible(false)
    this.pattern.setDraggable(false)
    this.garmentMenu.show()
    this.measurePad.hide()
    this.stepPanel.hide()
    this.summary.hide()
    print("ChalkLess: phase=menu")
  }

  chooseBuba(): void {
    if (this.phase !== "menu") return
    this.phase = "measure"
    this.garmentMenu.hide()
    this.measurePad.show()
    this.pushMeasurement()
    print("ChalkLess: phase=measure")
  }

  adjustMeasurement(delta: number): void {
    if (this.phase !== "measure") return
    const d = MEASUREMENTS[this.measureIndex]
    const v = Math.min(d.maxCm, Math.max(d.minCm, this.measurements[d.key] + delta))
    this.measurements[d.key] = Math.round(v * 10) / 10
    this.refreshGeometry()
    this.pushMeasurement()
    print(`ChalkLess: ${d.key}=${this.measurements[d.key]} pattern=${this.geometry.widthCm.toFixed(1)}x${this.geometry.lengthCm.toFixed(1)}`)
  }

  /** "Next measurement"; on the last one it acts as "Place pattern". */
  nextMeasurement(): void {
    if (this.phase !== "measure") return
    if (this.measureIndex < MEASUREMENTS.length - 1) {
      this.measureIndex++
      this.pushMeasurement()
    } else {
      this.placePattern()
    }
  }

  placePattern(): void {
    if (this.phase !== "measure") return
    this.phase = "align"
    this.measurePad.hide()
    this.refreshGeometry()
    this.pattern.setVisible(true)
    this.pattern.setCurrentStep(-1)
    this.pattern.setDraggable(true)
    this.stepPanel.showAlign()
    this.placeStepPanel()
    print("ChalkLess: phase=align")
  }

  startCutting(): void {
    if (this.phase !== "align") return
    this.phase = "cutting"
    this.pattern.setDraggable(false)
    this.currentStep = 0
    this.showStep()
    print("ChalkLess: phase=cutting")
  }

  /** Next button (and voice "next"). */
  next(): void {
    if (this.phase !== "cutting") return
    this.currentStep++
    if (this.currentStep >= STEPS.length) {
      this.finish()
      return
    }
    this.showStep()
  }

  private showStep(): void {
    const st = this.geometry.steps[this.currentStep]
    this.pattern.setCurrentStep(this.currentStep)
    this.stepPanel.showStep(st.label, this.currentStep, STEPS.length, STEPS[this.currentStep].title)
    this.placeStepPanel()
    print(`ChalkLess: step ${this.currentStep} ${STEPS[this.currentStep].id} — ${st.label}`)
  }

  private finish(): void {
    this.phase = "done"
    this.currentStep = STEPS.length
    this.pattern.setCurrentStep(STEPS.length)
    this.stepPanel.hide()
    const est = fabricSavedEstimate(this.geometry, this.chalkMarginCm)
    this.summary.show(
      "Pieces cut: 3 — front on the fold + 2 sleeves",
      `Fabric saved: about ${Math.round(est.savedCm2)} cm² (${est.savedPct.toFixed(0)}%) vs a standard chalk layout (estimate)`,
    )
    print("ChalkLess: phase=done")
  }

  private refreshGeometry(): void {
    this.geometry = buildPattern(this.measurements)
    this.pattern.rebuild(this.geometry)
    this.measurePad.setMiniPreview(this.geometry)
  }

  private pushMeasurement(): void {
    const d = MEASUREMENTS[this.measureIndex]
    this.measurePad.setMeasurement(d.label, this.measurements[d.key], this.measureIndex, MEASUREMENTS.length, this.measureIndex === MEASUREMENTS.length - 1)
  }

  private placeStepPanel(): void {
    const f = this.fabric.getTransform().getWorldPosition()
    const a = this.pattern.currentLineAnchorWorld()
    const z = Math.min(f.z + 22, Math.max(f.z - 22, a.z))
    this.stepPanel.moveTo(new vec3(f.x + this.stepPanelX, f.y + 0.6, z))
  }
}
