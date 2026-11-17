// LEAF scenario — full dashiki flow with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class S4Dashiki extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("dashiki", "DashikiButton", ["fold", "measure", "neckline", "yoke", "shoulderSleeve", "sleeveEnd", "sideSeam", "hem"])
  }
}
