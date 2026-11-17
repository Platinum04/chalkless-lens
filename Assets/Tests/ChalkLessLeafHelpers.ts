/**
 * ChalkLessLeafHelpers.ts — shared LEAF test helpers: real SIK input on named UIKit buttons
 * and access to the ChalkLessMain controller.
 */
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findInteractablesByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, sleep, waitUntil} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessMain} from "../Scripts/ChalkLessMain"
import {ChalkLessPatternUI} from "../Scripts/ChalkLessPatternUI"

export function getMain(): ChalkLessMain {
  const so = findSceneObjectByName("ChalkLess")
  if (!so) throw new Error("SceneObject ChalkLess not found")
  const m = so.getComponent(ChalkLessMain.getTypeName()) as ChalkLessMain
  if (!m) throw new Error("ChalkLessMain component not found on ChalkLess")
  return m
}

export function uiChild(name: string): SceneObject {
  const ui = findSceneObjectByName("UI")
  if (!ui) throw new Error("UI not found")
  for (let i = 0; i < ui.getChildrenCount(); i++) {
    const c = ui.getChild(i)
    if (c.name === name) return c
  }
  throw new Error(`UI/${name} not found`)
}

export class ChalkLessInteractor extends DefaultLeafInteractor {
  /** Real SIK pinch (hover + trigger start/end) on an enabled Interactable by SceneObject name. */
  async pinch(name: string): Promise<void> {
    const b = findInteractablesByName(name, undefined, true)[0]
    if (!b) throw new Error(`Interactable "${name}" not found or not enabled`)
    await this.trigger(b)
    await sleep(250)
  }

  async pinchDrag(name: string, perFrame: vec3, ms: number): Promise<void> {
    const t = findInteractablesByName(name, undefined, true)[0]
    if (!t) throw new Error(`Interactable "${name}" not found or not enabled`)
    await this.drag(t, perFrame, ms)
    await sleep(300)
  }
}

export async function waitPhase(m: ChalkLessMain, phase: string, ms = 3000): Promise<void> {
  await waitUntil(() => m.phase === phase, ms, () => `phase is ${m.phase}, expected ${phase}`)
}

/** Menu -> measure via real pinch on BubaButton. */
export async function openMeasure(i: ChalkLessInteractor, m: ChalkLessMain): Promise<void> {
  await waitPhase(m, "menu", 5000)
  await i.pinch("BubaButton")
  await waitPhase(m, "measure")
}

/** Measure -> align by pressing NextMeasurementButton 7 times (last is "Place pattern"). */
export async function placeViaButtons(i: ChalkLessInteractor, m: ChalkLessMain): Promise<void> {
  for (let k = 0; k < 7; k++) await i.pinch("NextMeasurementButton")
  await waitPhase(m, "align")
}

export function findChild(root: SceneObject, name: string): SceneObject {
  for (let i = 0; i < root.getChildrenCount(); i++) if (root.getChild(i).name === name) return root.getChild(i)
  throw new Error(`${root.name}/${name} not found`)
}
export function lineRoot(p: ChalkLessPatternUI, k: number): SceneObject {
  return findChild(findChild(p.getSceneObject(), "PatternContent"), `Line_${k}`)
}
export function measurementValue(m: {measurements: unknown}, key: string): number {
  return (m.measurements as Record<string, number>)[key]
}

