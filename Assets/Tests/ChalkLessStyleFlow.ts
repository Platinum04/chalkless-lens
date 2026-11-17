/**
 * ChalkLessStyleFlow.ts — shared LEAF flow for one garment style, all with real SIK input:
 * pinch the style button, step every measurement (with +/- on each), place the pattern,
 * start cutting, Next through every step (exactly one active line each time), then summary.
 */
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ChalkLessInteractor, getMain, uiChild, waitPhase} from "./ChalkLessLeafHelpers"

export async function runStyleFlow(styleId: string, buttonName: string, stepIds: string[], page2 = false): Promise<void> {
  await sleep(1500)
  const m = getMain()
  const i = new ChalkLessInteractor()
  await waitPhase(m, "menu", 5000)
  if (page2) await i.pinch("MenuNextPageButton")
  await i.pinch(buttonName)
  await waitPhase(m, "measure")
  expect(m.styleId).toBe(styleId)
  expect(uiChild("GarmentMenu").enabled).toBe(false)
  expect(uiChild("MeasurementPad").enabled).toBe(true)

  const keys = Object.keys(m.measurements as unknown as Record<string, number>)
  expect(keys.length).toBeGreaterThan(0)
  let resized = 0
  for (let k = 0; k < keys.length; k++) {
    const before = m.patternSizeCm
    await i.pinch("PlusButton")
    const after = m.patternSizeCm
    if (Math.abs(after.x - before.x) > 0.01 || Math.abs(after.y - before.y) > 0.01) resized++
    await i.pinch("MinusButton")
    const mi = m.measureIndex
    await i.pinch("NextMeasurementButton")
    if (m.phase === "measure" && m.measureIndex === mi) print(`ChalkLessTest: ${styleId} Next did not advance at measurement ${k} (${keys[k]})`)
  }
  print(`ChalkLessTest: ${styleId} ${keys.length} measurements, ${resized} resize the pattern`)
  expect(resized).toBeGreaterThan(0)
  await waitPhase(m, "align")
  expect(m.pattern.isDraggable).toBe(true)

  await i.pinch("StepActionButton")
  await waitPhase(m, "cutting")
  expect(m.pattern.isDraggable).toBe(false)
  expect(m.stepCount).toBe(stepIds.length)
  for (let s = 0; s < stepIds.length; s++) {
    expect(m.currentStepId).toBe(stepIds[s])
    const st = m.pattern.lineStates
    expect(st.filter((x) => x === "active").length).toBe(1)
    for (let k = 0; k < stepIds.length; k++) expect(st[k]).toBe(k < s ? "done" : k === s ? "active" : "future")
    expect(m.stepPanel.labelText.length).toBeGreaterThan(0)
    await i.pinch("StepActionButton")
  }
  await waitPhase(m, "done")
  expect(uiChild("SummaryCard").enabled).toBe(true)
  print(`ChalkLessTest: ${styleId} summary = ${m.summary.summaryText}`)
  expect(m.summary.summaryText.indexOf("Pieces cut")).toBeGreaterThan(-1)
}
