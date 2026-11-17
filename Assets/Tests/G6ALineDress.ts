// LEAF scenario — full aLineDress flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G6ALineDress extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("aLineDress", "ALineDressButton", ["fold", "measure", "neckline", "shoulder", "armhole", "sideSeam", "hem"], true)
  }
}
