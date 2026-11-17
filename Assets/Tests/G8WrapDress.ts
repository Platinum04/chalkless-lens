// LEAF scenario — full wrapDress flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G8WrapDress extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("wrapDress", "WrapDressButton", ["fold", "measure", "back", "wrapFront", "sleeve", "tie"], true)
  }
}
