import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {C1BubaOpensPad} from "./C1BubaOpensPad"
import {C2MeasurementsResize} from "./C2MeasurementsResize"
import {C3DragPattern} from "./C3DragPattern"
import {C4ActiveLineDecor} from "./C4ActiveLineDecor"
import {C5StepThroughToSummary} from "./C5StepThroughToSummary"
import {S1KaftanLong} from "./S1KaftanLong"
import {S2KaftanShort} from "./S2KaftanShort"
import {S3Agbada} from "./S3Agbada"
import {S4Dashiki} from "./S4Dashiki"
import {S5Corset} from "./S5Corset"
import {S6Wrapper} from "./S6Wrapper"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-buba-opens-pad", typename: C1BubaOpensPad.getTypeName()},
    {id: "c2-measurements-resize", typename: C2MeasurementsResize.getTypeName()},
    {id: "c3-drag-pattern", typename: C3DragPattern.getTypeName()},
    {id: "c4-active-line-decor", typename: C4ActiveLineDecor.getTypeName()},
    {id: "c5-steps-to-summary", typename: C5StepThroughToSummary.getTypeName()},
    {id: "s1-kaftan-long", typename: S1KaftanLong.getTypeName()},
    {id: "s2-kaftan-short", typename: S2KaftanShort.getTypeName()},
    {id: "s3-agbada", typename: S3Agbada.getTypeName()},
    {id: "s4-dashiki", typename: S4Dashiki.getTypeName()},
    {id: "s5-corset", typename: S5Corset.getTypeName()},
    {id: "s6-wrapper", typename: S6Wrapper.getTypeName()},
  ]
}
