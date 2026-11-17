/**
 * ChalkLessStyleUI.ts — shared UIKit composition helpers for ChalkLess UI modules:
 * type scale, text rows, labelled UIKit Buttons, flex containers.
 * Imported only by *UI.ts modules. Light colours only (additive display).
 */
import {FlexLayout} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexAlignSelf, FlexDirection, FlexJustify} from "UIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {Button} from "UIKit.lspkg/Scripts/Components/Button/Button"
import {boxMesh, meshObject, tintedMaterial} from "./ChalkLessLines"

export type TextRole = "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2" | "Subheadline" | "Button" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700},
  Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700},
  Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500},
  Body: {size: 39, weight: 500},
  Caption: {size: 38, weight: 500},
}
export function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * (distanceCm / 110)
}
export function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

export const CONTENT_Z = 0.6
/** UIKit System 3.0 button style. "Primary" gradient renders only partly in the 5.25 preview, so use a flat style. */
export const BUTTON_STYLE = "Prism"
export const BUTTON_LABEL_Z = 0.08

/**
 * Bright face drawn on every button (the flat Prism style reads faint on the additive display):
 * a light border, a mid-teal fill that lightens on hover/pinch, and big white text on top.
 * Light colours only — black is invisible on Specs.
 */
const FACE_BORDER = new vec4(0.55, 0.9, 1, 1)
const FACE_FILL = new vec4(0.13, 0.3, 0.38, 1)
const FACE_HOVER = new vec4(0.25, 0.52, 0.64, 1)
const FACE_PRESS = new vec4(0.4, 0.72, 0.85, 1)
const FACE_CONFIRM = new vec4(0.55, 0.95, 1, 1)
/** Confirm flash length (s) — quiet motion, under 200 ms. */
const CONFIRM_S = 0.18
const FACE_Z = 0.55
const BORDER_CM = 0.35
const LABEL_SCALE = 1.2
type FaceMats = {border: Material; fill: Material; hover: Material; press: Material; confirm: Material}
let faceMats: FaceMats | null = null
function buttonFaceMaterials(): FaceMats {
  if (!faceMats) {
    const base = requireAsset("../ChalkLessUnlit.mat") as Material
    faceMats = {
      border: tintedMaterial(base, FACE_BORDER),
      fill: tintedMaterial(base, FACE_FILL),
      hover: tintedMaterial(base, FACE_HOVER),
      press: tintedMaterial(base, FACE_PRESS),
      confirm: tintedMaterial(base, FACE_CONFIRM),
    }
  }
  return faceMats
}

export function child(parent: SceneObject, name: string, pos?: vec3): SceneObject {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  if (pos) so.getTransform().setLocalPosition(pos)
  return so
}

export function makeText(so: SceneObject, value: string, role: TextRole, dist: number, w: number, h: number, color: vec4): Text {
  const t = so.createComponent("Component.Text") as Text
  t.text = value
  t.depthTest = true
  applyTextRole(t, role, dist)
  t.textFill.color = color
  t.horizontalAlignment = HorizontalAlignment.Center
  t.verticalAlignment = VerticalAlignment.Center
  t.horizontalOverflow = HorizontalOverflow.Wrap
  t.verticalOverflow = VerticalOverflow.Overflow
  t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
  return t
}

export function flexContainer(so: SceneObject, dir: FlexDirection, width: number, height: number, gap: number, pad: number): FlexLayout {
  const f = so.createComponent(FlexLayout.getTypeName()) as FlexLayout
  f.direction = dir
  f.width = width
  f.height = height
  f.justifyContent = FlexJustify.Center
  f.alignItems = FlexAlign.Center
  if (dir === FlexDirection.Column) f.rowGap = gap
  else f.columnGap = gap
  f.paddingTop = pad
  f.paddingBottom = pad
  f.paddingLeft = pad
  f.paddingRight = pad
  return f
}

export function flexItem(so: SceneObject, w: number, h: number): FlexItem {
  const it = so.createComponent(FlexItem.getTypeName()) as FlexItem
  it.overrideWidth = w
  it.overrideHeight = h
  it.alignSelf = FlexAlignSelf.Auto
  return it
}

/** A text row as a flex child. */
export function textRow(parent: SceneObject, name: string, value: string, role: TextRole, dist: number, w: number, h: number, color: vec4): Text {
  const so = child(parent, name)
  flexItem(so, w, h)
  return makeText(so, value, role, dist, w, h, color)
}

export interface LabeledButton {
  so: SceneObject
  button: Button
  label: Text
}

/** UIKit Button with a raw Text label lifted off its face; registered as a flex child. */
export function labeledButton(
  parent: SceneObject,
  name: string,
  label: string,
  w: number,
  h: number,
  dist: number,
  role: TextRole = "Headline1",
  style: string = BUTTON_STYLE,
  pill: boolean = false,
): LabeledButton {
  const so = child(parent, name)
  const button = so.createComponent(Button.getTypeName()) as Button
  button.setTheme("Inherited", style)
  button.size = new vec3(w, h, 1)
  flexItem(so, w, h)
  const mats = buttonFaceMaterials()
  const face = child(so, name + "Face", new vec3(0, 0, FACE_Z))
  const shape = (cw: number, ch: number, z: number): RenderMesh => (pill ? capsuleMesh(cw, ch, z) : boxMesh(new vec3(0, 0, z), new vec3(cw, ch, 0.05)))
  meshObject(face, "Border", shape(w, h, 0), mats.border)
  const fill = meshObject(face, "Fill", shape(w - BORDER_CM * 2, h - BORDER_CM * 2, 0.06), mats.fill)
  const lo = child(so, name + "Label", new vec3(0, 0, FACE_Z + 0.2))
  const t = makeText(lo, label, role, dist, w - 1.8, h, new vec4(1, 1, 1, 1))
  t.size = t.size * LABEL_SCALE
  t.horizontalOverflow = HorizontalOverflow.Shrink
  // States: rest (fill) / hover (lighter) / pressed / confirmed (bright flash + ✓ for < 200 ms).
  const check = child(so, name + "Check", new vec3(w / 2 - Math.min(h, w / 4) / 2 - 0.4, 0, FACE_Z + 0.3))
  const ct = makeText(check, "✓", role, dist, Math.min(h, w / 4), h, new vec4(1, 1, 1, 1))
  ct.size = t.size
  check.enabled = false
  let hovered = false
  let confirming = false
  const rest = (): void => {
    fill.mainMaterial = hovered ? mats.hover : mats.fill
  }
  const flash = button.createEvent("DelayedCallbackEvent") as DelayedCallbackEvent
  flash.bind(() => {
    confirming = false
    check.enabled = false
    rest()
  })
  button.onHoverEnter.add(() => {
    hovered = true
    if (!confirming) rest()
  })
  button.onHoverExit.add(() => {
    hovered = false
    if (!confirming) rest()
  })
  button.onTriggerDown.add(() => {
    fill.mainMaterial = mats.press
  })
  button.onTriggerUp.add(() => {
    confirming = true
    fill.mainMaterial = mats.confirm
    check.enabled = true
    flash.reset(CONFIRM_S)
  })
  button.onTriggerCanceled.add(() => rest())
  return {so, button, label: t}
}

/** Flat capsule (pill) in the XY plane at depth z, facing +Z. */
export function capsuleMesh(w: number, h: number, z: number): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3},
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  const r = Math.min(h, w) / 2
  const cx = w / 2 - r
  const pts: number[][] = []
  const n = 12
  for (let i = 0; i <= n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI
    pts.push([cx + Math.cos(a) * r, Math.sin(a) * r])
  }
  for (let i = 0; i <= n; i++) {
    const a = Math.PI / 2 + (i / n) * Math.PI
    pts.push([-cx + Math.cos(a) * r, Math.sin(a) * r])
  }
  const v: number[] = [0, 0, z, 0, 0, 1]
  for (const p of pts) v.push(p[0], p[1], z, 0, 0, 1)
  const id: number[] = []
  for (let i = 1; i <= pts.length; i++) id.push(0, i, (i % pts.length) + 1)
  mb.appendVerticesInterleaved(v)
  mb.appendIndices(id)
  mb.updateMesh()
  return mb.getMesh()
}
