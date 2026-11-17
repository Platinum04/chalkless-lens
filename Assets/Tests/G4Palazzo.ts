// LEAF scenario — full palazzo flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G4Palazzo extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("palazzo", "PalazzoButton", ["fold", "measure", "front", "back", "waistband"], true)
  }
}
