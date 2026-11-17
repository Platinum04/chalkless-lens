// LEAF scenario — real SIK input via DefaultLeafInteractor.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, findChild, getMain, lineRoot, measurementValue, openMeasure, placeViaButtons, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

/** Criterion 3 */
@component
export class C3DragPattern extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    const i = new ChalkLessInteractor()
    await openMeasure(i, m)
    await placeViaButtons(i, m)
    expect(m.pattern.isDraggable).toBe(true)
    const a = m.patternPosition
    await i.pinchDrag("Pattern", new vec3(1.0, 0, 0.5), 2000)
    const b = m.patternPosition
    print(`ChalkLessTest: pattern ${a.toString()} -> ${b.toString()}`)
    expect(b.sub(a).length).toBeGreaterThan(2)
    expect(b.y).toBeCloseTo(a.y, 1)
  }
}
