// LEAF scenario — full wrapper flow with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class S6Wrapper extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("wrapper", "WrapperButton", ["fold", "measure", "waistband", "sideEdges", "hem"])
  }
}
