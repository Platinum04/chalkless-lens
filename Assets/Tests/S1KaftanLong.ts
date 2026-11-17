// LEAF scenario — full kaftanLong flow with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class S1KaftanLong extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("kaftanLong", "KaftanLongButton", ["fold", "measure", "neckline", "placket", "shoulder", "sleeve", "sideSeam", "hem"])
  }
}
