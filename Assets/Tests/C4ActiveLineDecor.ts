// LEAF scenario — real SIK input via DefaultLeafInteractor.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, findChild, getMain, lineRoot, measurementValue, openMeasure, placeViaButtons, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

/** Criterion 4 */
@component
export class C4ActiveLineDecor extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    const i = new ChalkLessInteractor()
    await openMeasure(i, m)
    await placeViaButtons(i, m)
    await i.pinch("StepActionButton")
    await waitPhase(m, "cutting")
    for (let s = 0; s < 7; s++) {
      expect(m.currentStep).toBe(s)
      const st = m.pattern.lineStates
      expect(st.filter((x) => x === "active").length).toBe(1)
      expect(st.indexOf("active")).toBe(s)
      // Label: the text beside the glowing line, or (for the "measure" step, which has
      // only marks and no line) the per-mark labels under Line_<s>/MarkLabels.
      const marks = findChild(lineRoot(m.pattern, s), "MarkLabels")
      const lineLabel = m.pattern.activeLabelText
      print(`ChalkLessTest: step ${s} ${m.currentStepId} lineLabel="${lineLabel}" markLabels=${marks.enabled ? marks.getChildrenCount() : 0}`)
      expect(lineLabel.length > 0 || (marks.enabled && marks.getChildrenCount() > 0)).toBe(true)
      for (let k = 0; k < 7; k++) {
        const r = lineRoot(m.pattern, k)
        for (const n of ["Glow", "Arrows", "SeamAllowance"]) expect(findChild(r, n).enabled).toBe(k === s)
      }
      if (s < 6) await i.pinch("StepActionButton")
    }
  }
}
