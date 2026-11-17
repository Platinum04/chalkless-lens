/**
 * ChalkLessMain.ts — orchestrator and single owner of ChalkLess state.
 * Flow: menu -> measure -> align -> cutting (style's steps) -> done. The chosen style's recipe
 * (ChalkLessStyleRecipes) supplies measurements, cut order, geometry and summary text.
 * Public state for tests: phase, styleId, currentStep, currentStepId, measurements, measureIndex,
 * patternPosition, patternSizeCm. Public actions mirror every button so tests can drive them.
 * Big styles (agbada, long kaftan, wrapper) grow the fabric/table stand-in so the lay fits.
 * Expects @inputs: the five UI views + fabric (+ optional table). Must not: create UI text or UIKit components.
 */
import {ChalkLessGarmentMenuUI} from "./ChalkLessGarmentMenuUI"
import {ChalkLessMeasurePadUI} from "./ChalkLessMeasurePadUI"
import {ChalkLessPatternUI} from "./ChalkLessPatternUI"
import {ChalkLessStepPanelUI} from "./ChalkLessStepPanelUI"
import {ChalkLessSummaryUI} from "./ChalkLessSummaryUI"
import {BUBA, defaultsOf, fabricSavedEstimate, Measurements, PatternGeometry, StyleRecipe} from "./ChalkLessPattern"
import {findStyle} from "./ChalkLessStyleRecipes"
import {ChalkLessWorkTable} from "./ChalkLessWorkTable"
import {ChalkLessTableFinder, TableSurface} from "./ChalkLessTableFinder"
import {ChalkLessFabricFinder, FabricRect} from "./ChalkLessFabricFinder"

export type Phase = "findTable" | "menu" | "measure" | "align" | "cutting" | "done"

@component
export class ChalkLessMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessMain – garment cutting guide</span>')
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
  @input
  @hint("Optional: World Query table finder (first start only; preview falls back to the stand-in)")
  @allowUndefined
  tableFinder: ChalkLessTableFinder
  @input
  @hint("Optional: camera fabric finder (runs after the table is confirmed)")
  @allowUndefined
  fabricFinder: ChalkLessFabricFinder
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Step size of the − / + buttons (cm)")
  @widget(new SliderWidget(0.5, 5, 0.5))
  stepCm: number = 1
  @input
  @hint("Step size of the big −5 / +5 buttons (cm)")
  @widget(new SliderWidget(2, 10, 1))
  bigStepCm: number = 5
  @input
  @hint("How many key measurements the align-stage summary card lists")
  @widget(new SliderWidget(2, 6, 1))
  summaryMeasureCount: number = 4
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
  @hint("Jump to a stage at launch for review: -1 = normal start (menu), -3 = measurement pad, -2 = align pattern, 0.. = cutting step, last+1 = summary")
  @widget(new SliderWidget(-3, 12, 1))
  debugJumpToStep: number = -1
  @input
  @hint("Style used by the debug jump: buba, kaftanLong, kaftanShort, agbada, dashiki, corset, wrapper, suit, blazer, joggers, palazzo, bubu, aLineDress, sheathDress, wrapDress, maxiGown")
  debugStyleId: string = "buba"
  @input
  @hint("Debug jump uses every measurement at its maximum (checks that big lays still fit)")
  debugMaxMeasurements: boolean = false
  @ui.group_end

  phase: Phase = "menu"
  styleId: string = "buba"
  measurements: Measurements = defaultsOf(BUBA.measurements)
  measureIndex = 0
  currentStep = -1
  /** True when the fabric stand-in was enlarged to fit the current style's lay. */
  fabricEnlarged = false
  private recipe: StyleRecipe = BUBA
  private geometry: PatternGeometry
  private baseFabric: vec3
  private baseTable: vec3
  private baseTablePos: vec3
  private tableObj: SceneObject

  get styleName(): string {
    return this.recipe.name
  }
  get currentStepId(): string {
    const st = this.recipe.steps
    return this.currentStep >= 0 && this.currentStep < st.length ? st[this.currentStep].id : ""
  }
  get stepCount(): number {
    return this.recipe.steps.length
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
    // The cutting table is the fabric's sibling stand-in; grown together with the fabric for big lays.
    const parent = this.fabric.getParent()
    if (parent) for (let i = 0; i < parent.getChildrenCount(); i++) if (parent.getChild(i).name === "CuttingTable") this.tableObj = parent.getChild(i)
    this.garmentMenu.onStyleChosen.add((id) => this.chooseStyle(id))
    this.measurePad.onDecrease.add(() => this.adjustMeasurement(-this.stepCm))
    this.measurePad.onIncrease.add(() => this.adjustMeasurement(this.stepCm))
    this.measurePad.onDecreaseBig.add(() => this.adjustMeasurement(-this.bigStepCm))
    this.measurePad.onIncreaseBig.add(() => this.adjustMeasurement(this.bigStepCm))
    this.measurePad.onNext.add(() => this.nextMeasurement())
    this.stepPanel.onEditMeasurements.add(() => this.editMeasurements())
    this.stepPanel.onStartCutting.add(() => this.startCutting())
    this.stepPanel.onNext.add(() => this.next())
    this.summary.onRestart.add(() => this.restart())
    this.restart()
    // First start only: find the real table (device). Preview falls back at once, so this stays on "menu".
    if (this.tableFinder && this.debugJumpToStep === -1) {
      this.findTable(false)
      return
    }
    const j = this.debugJumpToStep
    const sid = this.debugStyleId || "buba"
    if (j === -3 || j === -2) this.chooseMaybeMax(sid)
    if (j === -2) this.placePattern()
    if (j >= 0) {
      this.chooseMaybeMax(sid)
      this.placePattern()
      this.startCutting()
      for (let i = 0; i < this.debugJumpToStep; i++) this.next()
    }
  }

  private chooseMaybeMax(id: string): void {
    this.chooseStyle(id)
    if (!this.debugMaxMeasurements) return
    for (const d of this.recipe.measurements) this.measurements[d.key] = d.maxCm
    this.refreshGeometry()
    this.pushMeasurement()
  }

  /** True once the table phase has finished (confirmed, skipped or fell back). */
  tableReady = false
  /** Fabric rectangle from the camera, or null when aligning by hand. */
  detectedFabric: FabricRect | null = null

  /** "Find your table" phase. forceUi shows the prompt even where World Query can't run (tests, re-locate). */
  findTable(forceUi = true): void {
    if (!this.tableFinder) return
    this.phase = "findTable"
    this.garmentMenu.hide()
    this.tableFinder.begin((s) => this.onTableFound(s), forceUi)
  }

  private onTableFound(s: TableSurface | null): void {
    this.tableReady = true
    if (s) this.moveWorkAreaTo(s.position)
    this.restart()
    if (!this.fabricFinder) return
    const y = this.fabric.getTransform().getWorldPosition().y
    if (s) this.fabricFinder.run(y, (r) => this.applyDetectedFabric(r))
    else print("ChalkLess: fabric detection unavailable, align by hand")
  }

  /** Translate the whole work area (stand-in, fabric, pattern, panels) so the fabric top sits on the hit point. */
  private moveWorkAreaTo(hit: vec3): void {
    const f = this.fabric.getTransform().getWorldPosition()
    const tr = this.getSceneObject().getTransform()
    tr.setWorldPosition(tr.getWorldPosition().add(hit.sub(f)))
    print(`ChalkLess: work area moved onto the table (${hit.x.toFixed(0)}, ${hit.y.toFixed(0)}, ${hit.z.toFixed(0)})`)
  }

  /** Detected cloth: centre the fabric on it, use its size, and start the pattern flush with its fold (left) edge. */
  applyDetectedFabric(r: FabricRect | null): void {
    this.detectedFabric = r
    if (!r) return
    const ft = this.fabric.getComponent(ChalkLessWorkTable.getTypeName()) as ChalkLessWorkTable
    const tr = this.fabric.getTransform()
    const f = tr.getWorldPosition()
    tr.setWorldPosition(new vec3(r.center.x, f.y, r.center.z))
    this.baseFabric = new vec3(Math.round(r.sizeCm.x), ft ? ft.currentSize.y : 0.4, Math.round(r.sizeCm.y))
    // fitFabric clamps the offset to the fabric, so a large negative X lands the pattern on the left (fold) edge.
    this.patternStartOffset = new vec2(-999, 0)
    this.fitFabric()
    print(`ChalkLess: pattern snapped to fabric edge (yaw ${r.yawDeg.toFixed(1)} deg; rotate by hand if needed)`)
  }

  restart(): void {
    this.phase = "menu"
    this.setRecipe(BUBA)
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
    this.chooseStyle("buba")
  }

  /** Pick a garment style by id (buba, kaftanLong, kaftanShort, agbada, dashiki, corset, wrapper). */
  chooseStyle(id: string): void {
    if (this.phase !== "menu") return
    const rec = findStyle(id)
    if (!rec) {
      print(`ChalkLess: unknown style ${id}`)
      return
    }
    this.setRecipe(rec)
    this.phase = "measure"
    this.garmentMenu.hide()
    this.measurePad.show()
    this.pushMeasurement()
    print(`ChalkLess: style=${this.styleId} phase=measure`)
  }

  adjustMeasurement(delta: number): void {
    if (this.phase !== "measure") return
    const d = this.recipe.measurements[this.measureIndex]
    const v = Math.min(d.maxCm, Math.max(d.minCm, this.measurements[d.key] + delta))
    this.measurements[d.key] = Math.round(v * 10) / 10
    this.refreshGeometry()
    this.pushMeasurement()
    print(`ChalkLess: ${d.key}=${this.measurements[d.key]} pattern=${this.geometry.widthCm.toFixed(1)}x${this.geometry.lengthCm.toFixed(1)}`)
  }

  /** "Next measurement"; on the last one it acts as "Place pattern". */
  nextMeasurement(): void {
    if (this.phase !== "measure") return
    if (this.measureIndex < this.recipe.measurements.length - 1) {
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
    this.fitFabric()
    this.pattern.setVisible(true)
    this.pattern.setCurrentStep(-1)
    this.pattern.setDraggable(true)
    this.stepPanel.showAlign()
    this.stepPanel.showMeasureSummary(`${this.recipe.name} · Custom fit`, this.keyMeasurementLines())
    this.placeStepPanel()
    print("ChalkLess: phase=align")
  }

  /** "Edit measurements" on the align-stage card: back to the measure pad, values kept. */
  editMeasurements(): void {
    if (this.phase !== "align") return
    this.phase = "measure"
    this.pattern.setDraggable(false)
    this.pattern.setVisible(false)
    this.stepPanel.hide()
    this.measureIndex = 0
    this.measurePad.show()
    this.refreshGeometry()
    this.pushMeasurement()
    print("ChalkLess: phase=measure (edit)")
  }

  /** The first few measurements (the recipe lists the key ones first), e.g. "Chest  100 cm". */
  private keyMeasurementLines(): string[] {
    const defs = this.recipe.measurements
    const prio = ["chest", "bust", "topLength", "length", "sleeveLength", "waist", "hip"]
    const picked = defs.filter((d) => prio.indexOf(d.key) >= 0)
    for (const d of defs) if (picked.indexOf(d) < 0) picked.push(d)
    return picked.slice(0, this.summaryMeasureCount).map((d) => `${d.label}  ${this.measurements[d.key]} cm`)
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
    if (this.currentStep >= this.recipe.steps.length) {
      this.finish()
      return
    }
    this.showStep()
  }

  /** Voice "back": revisit the previous step without leaving the cutting phase. */
  previous(): void {
    if (this.phase !== "cutting" || this.currentStep <= 0) return
    this.currentStep--
    this.showStep()
  }

  private showStep(): void {
    const st = this.geometry.steps[this.currentStep]
    const steps = this.recipe.steps
    this.pattern.setCurrentStep(this.currentStep)
    this.stepPanel.showStep(st.label, this.currentStep, steps.length, steps[this.currentStep].title)
    this.placeStepPanel()
    print(`ChalkLess: step ${this.currentStep} ${steps[this.currentStep].id} · ${st.label}`)
  }

  private finish(): void {
    this.phase = "done"
    const n = this.recipe.steps.length
    this.currentStep = n
    this.pattern.setCurrentStep(n)
    this.stepPanel.hide()
    const est = fabricSavedEstimate(this.geometry, this.chalkMarginCm, this.recipe)
    const fs = this.pattern.fabricSize
    const note = this.fabricEnlarged ? ` Fabric shown at ${Math.round(fs.x)} × ${Math.round(fs.y)} cm to fit.` : ""
    this.summary.show(
      this.recipe.piecesText(this.measurements),
      `Fabric saved: about ${Math.round(est.savedCm2)} cm² (${est.savedPct.toFixed(0)}%) vs a standard chalk layout (estimate).${note}`,
    )
    print(`ChalkLess: phase=done (${this.styleId})`)
  }

  private setRecipe(rec: StyleRecipe): void {
    this.recipe = rec
    this.styleId = rec.id
    this.measurements = defaultsOf(rec.measurements)
    this.measureIndex = 0
    this.currentStep = -1
    this.refreshGeometry()
    this.fitFabric()
  }

  /** Grow the fabric (and table) stand-in when a style's lay is bigger than the default 150 × 80 cm. */
  private fitFabric(): void {
    const ft = this.fabric.getComponent(ChalkLessWorkTable.getTypeName()) as ChalkLessWorkTable
    const tt = this.tableObj ? (this.tableObj.getComponent(ChalkLessWorkTable.getTypeName()) as ChalkLessWorkTable) : null
    if (!this.baseFabric) this.baseFabric = ft ? ft.currentSize : new vec3(this.pattern.fabricSize.x, 0.4, this.pattern.fabricSize.y)
    if (!this.baseTable && tt) this.baseTable = tt.currentSize
    // Big styles split into lay groups (suit: jacket then trousers) size the fabric to the largest group.
    const lay = this.pattern.laySizeCm
    const w = Math.max(this.baseFabric.x, Math.ceil(lay.x + 8))
    const d = Math.max(this.baseFabric.z, Math.ceil(lay.y + 4))
    this.fabricEnlarged = w > this.baseFabric.x || d > this.baseFabric.z
    if (ft) ft.resize(new vec3(w, this.baseFabric.y, d))
    // Table stays within ~180 × 115 cm so the whole lay is in view from the standing eye position.
    if (tt && this.baseTable) {
      // Keep room on the right for the flat step card (≈44 cm) so it never hangs off the table on big lays:
      // widen only to the right and shift the table so its left edge stays put.
      let tw = Math.max(this.baseTable.x, w + 20)
      // Card centre as placeStepPanel would put it with the pattern at its start offset, plus its half width.
      const startX = Math.min(Math.max(0, w / 2 - lay.x / 2 - 2), Math.abs(this.patternStartOffset.x)) * Math.sign(this.patternStartOffset.x)
      const needRight = Math.min(w / 2 + 23, Math.max(this.stepPanelX, startX + lay.x / 2 + 26)) + 24
      const extra = Math.max(0, needRight - tw / 2)
      tw += extra
      tt.resize(new vec3(tw, this.baseTable.y, Math.max(this.baseTable.z, d + 4)))
      const tr = this.tableObj.getTransform()
      if (!this.baseTablePos) this.baseTablePos = tr.getLocalPosition()
      tr.setLocalPosition(new vec3(this.baseTablePos.x + extra / 2, this.baseTablePos.y, this.baseTablePos.z))
    }
    this.pattern.fabricSize = new vec2(w, d)
    const f = this.fabric.getTransform().getWorldPosition()
    const maxX = Math.max(0, w / 2 - lay.x / 2 - 2)
    const maxZ = Math.max(0, d / 2 - lay.y / 2 - 2)
    const ox = Math.min(maxX, Math.max(-maxX, this.patternStartOffset.x))
    const oz = Math.min(maxZ, Math.max(-maxZ, this.patternStartOffset.y))
    this.pattern.getSceneObject().getTransform().setWorldPosition(new vec3(f.x + ox, f.y, f.z + oz))
    if (this.fabricEnlarged) print(`ChalkLess: fabric stand-in enlarged to ${w} x ${d} cm for ${this.styleId}`)
  }

  private refreshGeometry(): void {
    this.geometry = this.recipe.build(this.measurements)
    this.pattern.rebuild(this.geometry)
    this.measurePad.setMiniPreview(this.geometry)
  }

  private pushMeasurement(): void {
    const defs = this.recipe.measurements
    const d = defs[this.measureIndex]
    this.measurePad.setMeasurement(d.label, this.measurements[d.key], this.measureIndex, defs.length, this.measureIndex === defs.length - 1, this.recipe.name)
  }

  /**
   * Cutting stage: put the step card (with its progress dots) right next to the active line so the
   * leader stays short. Searches positions on the table top; the card must not cover the active
   * line or its label, prefers not covering other lines and prefers the near (tailor's) side.
   * Returns false when no spot is free (caller falls back to the beside-the-lay placement).
   */
  private placeCardNearActiveLine(): boolean {
    const obs = this.pattern.stepObstaclesWorld()
    if (obs.active.length === 0) return false
    const f = this.fabric.getTransform().getWorldPosition()
    const fs = this.pattern.fabricSize
    let bx0 = f.x - fs.x / 2
    let bx1 = f.x + fs.x / 2
    let bz0 = f.z - fs.y / 2
    let bz1 = f.z + fs.y / 2
    const tt = this.tableObj ? (this.tableObj.getComponent(ChalkLessWorkTable.getTypeName()) as ChalkLessWorkTable) : null
    if (tt) {
      const tp = this.tableObj.getTransform().getWorldPosition()
      const ts = tt.currentSize
      bx0 = Math.min(bx0, tp.x - ts.x / 2)
      bx1 = Math.max(bx1, tp.x + ts.x / 2)
      bz0 = Math.min(bz0, tp.z - ts.z / 2)
      bz1 = Math.max(bz1, tp.z + ts.z / 2)
    }
    // Card footprint (local plane) -> world XZ offsets from its centre.
    const fp = this.stepPanel.footprint
    const wt = this.stepPanel.getSceneObject().getTransform().getWorldTransform()
    const ax = wt.multiplyDirection(new vec3(1, 0, 0)).normalize()
    const ay = wt.multiplyDirection(new vec3(0, 1, 0)).normalize()
    let dx0 = 1e9
    let dx1 = -1e9
    let dz0 = 1e9
    let dz1 = -1e9
    for (const lx of [fp.x, fp.z])
      for (const ly of [fp.y, fp.w]) {
        const ox = ax.x * lx + ay.x * ly
        const oz = ax.z * lx + ay.z * ly
        dx0 = Math.min(dx0, ox)
        dx1 = Math.max(dx1, ox)
        dz0 = Math.min(dz0, oz)
        dz1 = Math.max(dz1, oz)
      }
    const M = 1
    const CLEAR = 3
    const lab = obs.label
    let best: vec2 | null = null
    let bestScore = 1e12
    const cxMin = bx0 + M - dx0
    const cxMax = bx1 - M - dx1
    const czMin = bz0 + M - dz0
    const czMax = bz1 - M - dz1
    const tryAt = (cx: number, cz: number): void => {
      if (cx < cxMin || cx > cxMax || cz < czMin || cz > czMax) return
      const x0 = cx + dx0
      const x1 = cx + dx1
      const z0 = cz + dz0
      const z1 = cz + dz1
      if (lab && x0 < Math.max(lab.x, lab.z) + 1 && x1 > Math.min(lab.x, lab.z) - 1 && z0 < Math.max(lab.y, lab.w) + 1 && z1 > Math.min(lab.y, lab.w) - 1) return
      let d2 = 1e12
      for (const p of obs.active) {
        const ddx = p.x < x0 ? x0 - p.x : p.x > x1 ? p.x - x1 : 0
        const ddz = p.y < z0 ? z0 - p.y : p.y > z1 ? p.y - z1 : 0
        const d = ddx * ddx + ddz * ddz
        if (d < CLEAR * CLEAR) return
        if (d < d2) d2 = d
      }
      const dmin = Math.sqrt(d2)
      if (dmin >= bestScore) return
      let covered = 0
      for (const p of obs.other) if (p.x > x0 && p.x < x1 && p.y > z0 && p.y < z1) covered++
      // Short leader first; covering other lines costs ~1 cm per 5 cm of line; near side preferred.
      const score = dmin + covered * 0.8 + (bz1 - z1) * 0.12
      if (score < bestScore) {
        bestScore = score
        best = new vec2(cx, cz)
      }
    }
    // Coarse 6 cm grid, then a 1 cm refinement around the best spot.
    for (let cx = cxMin; cx <= cxMax; cx += 6) for (let cz = czMin; cz <= czMax; cz += 6) tryAt(cx, cz)
    if (best) {
      const b = best as vec2
      for (let ix = -5; ix <= 5; ix++) for (let iz = -5; iz <= 5; iz++) tryAt(b.x + ix, b.y + iz)
    }
    if (!best) return false
    const pos = new vec3(best.x, f.y + 0.6, best.y)
    this.stepPanel.moveTo(pos)
    this.stepPanel.setLeaderTarget(this.pattern.currentLineNearestWorld(pos))
    return true
  }

  private placeStepPanel(): void {
    if (this.phase === "cutting" && this.placeCardNearActiveLine()) return
    const f = this.fabric.getTransform().getWorldPosition()
    const a = this.pattern.currentLineAnchorWorld()
    const z = Math.min(f.z + 22, Math.max(f.z - 22, a.z))
    const c = this.pattern.patternCenterWorld
    // Beside the lay, but never further out than just past the fabric's right edge (stays in view, never covers lines).
    const tableHalf = this.pattern.fabricSize.x / 2 + 23
    const x = Math.min(f.x + tableHalf, Math.max(f.x + this.stepPanelX, c.x + this.pattern.laySizeCm.x / 2 + 26))
    this.stepPanel.moveTo(new vec3(x, f.y + 0.6, z))
    this.stepPanel.setLeaderTarget(this.pattern.currentLineNearestWorld(new vec3(x, f.y, z)))
  }
}
