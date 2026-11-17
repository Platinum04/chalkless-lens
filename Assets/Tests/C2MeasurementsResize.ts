// LEAF scenario — real SIK input via DefaultLeafInteractor.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, findChild, getMain, lineRoot, measurementValue, openMeasure, placeViaButtons, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

/** Criterion 2 */
@component
export class C2MeasurementsResize extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    const i = new ChalkLessInteractor()
    await openMeasure(i, m)
    const keys = ["neck", "shoulder", "chest", "topLength", "sleeveLength", "roundSleeve", "hip"]
    const sizeChanged: string[] = []
    for (let k = 0; k < 7; k++) {
      expect(m.measureIndex).toBe(k)
      const key = keys[k]
      const v0 = measurementValue(m, key)
      const s0 = m.patternSizeCm
      const p0 = m.measurePad.previewSizeCm
      await i.pinch("PlusButton")
      const v1 = measurementValue(m, key)
      expect(v1).toBeGreaterThan(v0)
      const s1 = m.patternSizeCm
      const p1 = m.measurePad.previewSizeCm
      const changed = !s1.equal(s0)
      expect(changed).toBe(!p1.equal(p0))
      if (changed) sizeChanged.push(key)
      await i.pinch("MinusButton")
      expect(measurementValue(m, key)).toBeCloseTo(v0, 3)
      expect(m.patternSizeCm.equal(s0)).toBe(true)
      print(
        `ChalkLessTest: ${key} ${v0}->${v1} size ${s0.x.toFixed(1)}x${s0.y.toFixed(1)} -> ${s1.x.toFixed(1)}x${s1.y.toFixed(1)} preview ${p0.x.toFixed(2)}x${p0.y.toFixed(2)} -> ${p1.x.toFixed(2)}x${p1.y.toFixed(2)}`,
      )
      await i.pinch("NextMeasurementButton")
    }
    print(`ChalkLessTest: size changed for [${sizeChanged.join(",")}]`)
    expect(sizeChanged.length).toBeGreaterThan(0)
    await waitPhase(m, "align")
  }
}
