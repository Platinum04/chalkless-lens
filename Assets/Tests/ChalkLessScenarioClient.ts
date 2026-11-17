/**
 * ChalkLessScenarioClient.ts — local preview auto-run of every registered LEAF scenario.
 * Runs them in order on Lens start and prints PASS/FAIL per scenario.
 */
import {DefaultScenarioManager} from "Leaf.lspkg/Scenarios/scenario/manager/DefaultLeafScenarioManager"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {getMain} from "./ChalkLessLeafHelpers"

@component
export class ChalkLessScenarioClient extends BaseScriptComponent {
  @input
  @hint("Only run the scenario with this id (empty = all)")
  only: string = ""

  @input
  @hint("Run all LEAF scenarios when the Lens starts (turn on to test)")
  runOnStart: boolean = false

  onAwake(): void {
    if (!this.runOnStart) return
    this.createEvent("OnStartEvent").bind(() => {
      this.runAll().catch((e) => print(`[LEAF-RESULT] client error ${e}`))
    })
  }

  private async runAll(): Promise<void> {
    const mgr = DefaultScenarioManager.getInstance()
    await sleep(2000)
    for (const id of mgr.listScenarioIds()) {
      if (this.only && id !== this.only) continue
      getMain().restart()
      await sleep(500)
      try {
        await mgr.startScenario(id)
        print(`[LEAF-RESULT] ${id} PASS`)
      } catch (e) {
        print(`[LEAF-RESULT] ${id} FAIL ${e}`)
      }
      await sleep(500)
    }
    print("[LEAF-RESULT] done")
  }
}
