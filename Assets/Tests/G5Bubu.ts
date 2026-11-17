// LEAF scenario — full bubu flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G5Bubu extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("bubu", "BubuButton", ["fold", "measure", "neckline", "shoulderSleeve", "sleeveEnd", "sideSeam", "hem"], true)
  }
}
