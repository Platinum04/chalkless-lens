import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1BubaOpensPad} from "./C1BubaOpensPad"
import {C2MeasurementsResize} from "./C2MeasurementsResize"
import {C3DragPattern} from "./C3DragPattern"
import {C4ActiveLineDecor} from "./C4ActiveLineDecor"
import {C5StepThroughToSummary} from "./C5StepThroughToSummary"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-buba-opens-pad", typename: C1BubaOpensPad.getTypeName()},
    {id: "c2-measurements-resize", typename: C2MeasurementsResize.getTypeName()},
    {id: "c3-drag-pattern", typename: C3DragPattern.getTypeName()},
    {id: "c4-active-line-decor", typename: C4ActiveLineDecor.getTypeName()},
    {id: "c5-steps-to-summary", typename: C5StepThroughToSummary.getTypeName()},
  ]
}
