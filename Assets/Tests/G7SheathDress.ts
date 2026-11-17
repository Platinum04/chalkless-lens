// LEAF scenario — full sheathDress flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G7SheathDress extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("sheathDress", "SheathDressButton", ["fold", "measure", "neckline", "shoulder", "armhole", "waistDart", "sideSeam", "hem"], true)
  }
}
