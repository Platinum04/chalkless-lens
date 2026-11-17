// LEAF scenario — full agbada flow with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class S3Agbada extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("agbada", "AgbadaButton", ["fold", "measure", "neckline", "embroidery", "shoulder", "sleeveOpening", "sideSeam", "hem"])
  }
}
