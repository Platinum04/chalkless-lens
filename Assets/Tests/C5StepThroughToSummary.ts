// LEAF scenario — real SIK input via DefaultLeafInteractor.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, findChild, getMain, lineRoot, measurementValue, openMeasure, placeViaButtons, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

/** Criterion 5 */
@component
export class C5StepThroughToSummary extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    const i = new ChalkLessInteractor()
    await openMeasure(i, m)
    await placeViaButtons(i, m)
    expect(uiChild("SummaryCard").enabled).toBe(false)
    await i.pinch("StepActionButton")
    await waitPhase(m, "cutting")
    const ids = ["fold", "measure", "neckline", "shoulder", "sleeve", "sideSeam", "hem"]
    for (let s = 0; s < 7; s++) {
      expect(m.currentStepId).toBe(ids[s])
      const st = m.pattern.lineStates
      for (let k = 0; k < 7; k++) expect(st[k]).toBe(k < s ? "done" : k === s ? "active" : "future")
      expect(m.stepPanel.labelText.length).toBeGreaterThan(0)
      await i.pinch("StepActionButton")
    }
    await waitPhase(m, "done")
    expect(m.pattern.lineStates.every((x) => x === "done")).toBe(true)
    expect(uiChild("SummaryCard").enabled).toBe(true)
    expect(uiChild("StepPanel").enabled).toBe(false)
    print(`ChalkLessTest: summary = ${m.summary.summaryText}`)
    expect(m.summary.summaryText.length).toBeGreaterThan(0)
  }
}
