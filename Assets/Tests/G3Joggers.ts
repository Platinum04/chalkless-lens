// LEAF scenario — full joggers flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G3Joggers extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("joggers", "JoggersButton", ["fold", "measure", "front", "back", "waistband", "cuff"], true)
  }
}
