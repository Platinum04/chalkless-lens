// LEAF scenario — full blazer flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G2Blazer extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("blazer", "BlazerButton", ["fold", "measure", "front", "back", "topSleeve", "underSleeve"], true)
  }
}
