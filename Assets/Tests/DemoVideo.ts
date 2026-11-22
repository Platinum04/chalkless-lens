/**
 * DemoVideo.ts — not a test: a paced, hands-free run of the Lens for recording the Devpost video.
 * Uses the same real SIK pinches/drags as the LEAF tests, with pauses so a viewer can follow.
 * Run it with ChalkLessScenarioClient: runOnStart on, only = "demo-video".
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, getMain, waitPhase} from "./ChalkLessLeafHelpers"

const PAGE2 = ["SuitButton", "BlazerButton", "JoggersButton", "PalazzoButton", "BubuButton", "ALineDressButton", "SheathDressButton", "WrapDressButton", "MaxiGownButton"]

@component
export class DemoVideo extends Scenario {
  private i = new ChalkLessInteractor()
  private fast = false

  private async tap(name: string, pause = 900): Promise<void> {
    await this.i.pinch(name)
    await sleep(pause)
  }

  private async pick(button: string): Promise<void> {
    const m = getMain()
    m.restart()
    await waitPhase(m, "menu", 5000)
    await sleep(this.fast ? 500 : 1200)
    if (PAGE2.indexOf(button) >= 0) await this.tap("MenuNextPageButton", this.fast ? 500 : 1000)
    await this.tap(button, this.fast ? 400 : 1200)
    await waitPhase(m, "measure")
  }

  /** Buba measurements: a few visible edits, then walk to "Place pattern". */
  private async measure(): Promise<void> {
    const m = getMain()
    let guard = 0
    while (m.phase === "measure" && guard++ < 20) {
      if (guard <= 2) {
        await this.tap("PlusFiveButton", 700)
        await this.tap("PlusButton", 700)
        await this.tap("MinusButton", 900)
      }
      await this.tap("NextMeasurementButton", 700)
    }
    await waitPhase(m, "align")
  }

  private async cut(steps: number, pause: number): Promise<void> {
    const m = getMain()
    await this.tap("StepActionButton", this.fast ? 700 : 1500)
    await waitPhase(m, "cutting")
    for (let s = 0; s < steps && m.phase === "cutting"; s++) {
      await sleep(pause)
      await this.tap("StepActionButton", 300)
    }
  }

  async run(): Promise<void> {
    await sleep(1500)
    const m = getMain()
    await waitPhase(m, "menu", 5000)

    // 0. Welcome card
    m.showWelcome(true)
    await sleep(5000)
    await this.tap("WelcomeStartButton", 800)

    // 1. Find the table (preview shows the prompt; skip uses the stand-in table)
    m.findTable(true)
    await waitPhase(m, "findTable", 2000)
    await sleep(2500)
    await this.tap("SkipTableButton", 1500)

    // 2. Buba, full
    await this.pick("BubaButton")
    await this.measure()
    await sleep(1200)
    await this.i.pinchDrag("Pattern", new vec3(0.6, 0, 0.3), 1800)
    await sleep(1200)
    await this.cut(99, 1600)
    await waitPhase(m, "done", 5000)
    await sleep(3500)

    // 3. Agbada, a big lay
    await this.pick("AgbadaButton")
    m.placePattern()
    await sleep(2000)
    await this.cut(2, 1800)

    // 4. Quick tour of the other styles
    this.fast = true
    const tour = ["KaftanLongButton", "KaftanShortButton", "DashikiButton", "CorsetButton", "WrapperButton", ...PAGE2]
    for (const b of tour) {
      await this.pick(b)
      m.placePattern()
      await sleep(1000)
      await this.cut(0, 0)
      await sleep(1100)
      await sleep(300)
    }
    m.restart()
    await sleep(2000)
    print("[LEAF-RESULT] demo-video finished")
  }
}
