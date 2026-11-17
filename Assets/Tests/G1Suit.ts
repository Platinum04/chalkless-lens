// LEAF scenario — full suit flow (menu page 2) with real SIK input.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runStyleFlow} from "./ChalkLessStyleFlow"

@component
export class G1Suit extends Scenario {
  async run(): Promise<void> {
    await runStyleFlow("suit", "SuitButton", ["fold", "measure", "jacketFront", "jacketBack", "sleeve", "collar", "trouserFront", "trouserBack", "waistband"], true)
  }
}
