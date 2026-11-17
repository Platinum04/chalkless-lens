// LEAF scenario — full kaftanShort flow with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class S2KaftanShort extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("kaftanShort", "KaftanShortButton", ["fold", "measure", "neckline", "placket", "shoulder", "sleeve", "sideSeam", "hem"])
  }
}
