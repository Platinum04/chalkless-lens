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
import {G1Suit} from "./G1Suit"
import {G2Blazer} from "./G2Blazer"
import {G3Joggers} from "./G3Joggers"
import {G4Palazzo} from "./G4Palazzo"
import {G5Bubu} from "./G5Bubu"
import {G6ALineDress} from "./G6ALineDress"
import {G7SheathDress} from "./G7SheathDress"
import {G8WrapDress} from "./G8WrapDress"
import {G9MaxiGown} from "./G9MaxiGown"
import {D1DetectionFallback} from "./D1DetectionFallback"
import {D2FabricSegmentation} from "./D2FabricSegmentation"

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
    {id: "g1-suit", typename: G1Suit.getTypeName()},
    {id: "g2-blazer", typename: G2Blazer.getTypeName()},
    {id: "g3-joggers", typename: G3Joggers.getTypeName()},
    {id: "g4-palazzo", typename: G4Palazzo.getTypeName()},
    {id: "g5-bubu", typename: G5Bubu.getTypeName()},
    {id: "g6-a-line-dress", typename: G6ALineDress.getTypeName()},
    {id: "g7-sheath-dress", typename: G7SheathDress.getTypeName()},
    {id: "g8-wrap-dress", typename: G8WrapDress.getTypeName()},
    {id: "g9-maxi-gown", typename: G9MaxiGown.getTypeName()},
    {id: "d1-detection-fallback", typename: D1DetectionFallback.getTypeName()},
    {id: "d2-fabric-segmentation", typename: D2FabricSegmentation.getTypeName()},
  ]
}
