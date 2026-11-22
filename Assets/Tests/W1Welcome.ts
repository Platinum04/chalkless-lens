// LEAF scenario: the first-run welcome card shows, and a real pinch on WelcomeStartButton
// moves on to the table step (preview falls back to the stand-in, so it lands on "menu").
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, getMain, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

@component
export class W1Welcome extends Scenario {
  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    await waitPhase(m, "menu", 5000)
    expect(m.showWelcome(true)).toBe(true)
    expect(m.phase).toBe("welcome")
    expect(uiChild("WelcomePanel").enabled).toBe(true)
    expect(uiChild("GarmentMenu").enabled).toBe(false)
    await sleep(1000)
    const i = new ChalkLessInteractor()
    await i.pinch("WelcomeStartButton")
    await waitPhase(m, "menu", 3000)
    expect(uiChild("WelcomePanel").enabled).toBe(false)
    expect(uiChild("GarmentMenu").enabled).toBe(true)
  }
}
