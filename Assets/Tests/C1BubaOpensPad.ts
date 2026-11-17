// LEAF scenario — real SIK input via DefaultLeafInteractor.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, findChild, getMain, lineRoot, measurementValue, openMeasure, placeViaButtons, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

/** Criterion 1 */
@component
export class C1BubaOpensPad extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    const i = new ChalkLessInteractor()
    expect(uiChild("GarmentMenu").enabled).toBe(true)
    await openMeasure(i, m)
    expect(m.phase).toBe("measure")
    expect(uiChild("MeasurementPad").enabled).toBe(true)
    expect(uiChild("GarmentMenu").enabled).toBe(false)
  }
}
