// LEAF scenario — detection fallback in the preview: the Lens reaches "menu" by itself, and the
// "Find your table" prompt can be left with a real pinch on SkipTableButton.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, waitUntil} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, getMain, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

@component
export class D1DetectionFallback extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    await waitPhase(m, "menu", 5000)
    expect(m.tableReady).toBe(true)
    expect(m.tableFinder.status).toBe("fallback")
    expect(m.fabricFinder.status).toBe("fallback")
    expect(uiChild("TableFinderPanel").enabled).toBe(false)
    // Show the prompt again (as on device with no table found) and leave it with the skip button.
    m.findTable(true)
    await waitPhase(m, "findTable", 2000)
    expect(uiChild("TableFinderPanel").enabled).toBe(true)
    expect(uiChild("GarmentMenu").enabled).toBe(false)
    const i = new ChalkLessInteractor()
    await i.pinch("SkipTableButton")
    await waitPhase(m, "menu", 3000)
    await waitUntil(() => !uiChild("TableFinderPanel").enabled, 1000, () => "TableFinderPanel still shown")
    expect(m.tableFinder.status).toBe("skipped")
    expect(uiChild("GarmentMenu").enabled).toBe(true)
  }
}
