// LEAF scenario — full maxiGown flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G9MaxiGown extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("maxiGown", "MaxiGownButton", ["fold", "measure", "neckline", "shoulder", "armhole", "bodiceSide", "skirtWaist", "skirtSide", "skirtHem"], true)
  }
}
