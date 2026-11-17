// LEAF scenario — full corset flow with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class S5Corset extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("corset", "CorsetButton", ["fold", "measure", "cutCF", "cutSideFront", "cutSide", "cutSideBack", "cutBack", "cutCB"])
  }
}
