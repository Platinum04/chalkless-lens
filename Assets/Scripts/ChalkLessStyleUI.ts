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
const FACE_Z = 0.55
const BORDER_CM = 0.35
const LABEL_SCALE = 1.2
let faceMats: {border: Material; fill: Material; hover: Material; press: Material} | null = null
function buttonFaceMaterials(): {border: Material; fill: Material; hover: Material; press: Material} {
  if (!faceMats) {
    const base = requireAsset("../ChalkLessUnlit.mat") as Material
    faceMats = {
      border: tintedMaterial(base, FACE_BORDER),
      fill: tintedMaterial(base, FACE_FILL),
      hover: tintedMaterial(base, FACE_HOVER),
      press: tintedMaterial(base, FACE_PRESS),
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
): LabeledButton {
  const so = child(parent, name)
  const button = so.createComponent(Button.getTypeName()) as Button
  button.setTheme("Inherited", style)
  button.size = new vec3(w, h, 1)
  flexItem(so, w, h)
  const mats = buttonFaceMaterials()
  const face = child(so, name + "Face", new vec3(0, 0, FACE_Z))
  meshObject(face, "Border", boxMesh(vec3.zero(), new vec3(w, h, 0.05)), mats.border)
  const fill = meshObject(face, "Fill", boxMesh(new vec3(0, 0, 0.06), new vec3(w - BORDER_CM * 2, h - BORDER_CM * 2, 0.05)), mats.fill)
  const setFill = (m: Material): void => {
    fill.mainMaterial = m
  }
  button.onHoverEnter.add(() => setFill(mats.hover))
  button.onHoverExit.add(() => setFill(mats.fill))
  button.onTriggerDown.add(() => setFill(mats.press))
  button.onTriggerUp.add(() => setFill(mats.hover))
  button.onTriggerCanceled.add(() => setFill(mats.fill))
  const lo = child(so, name + "Label", new vec3(0, 0, FACE_Z + 0.2))
  const t = makeText(lo, label, role, dist, w - 1.8, h, new vec4(1, 1, 1, 1))
  t.size = t.size * LABEL_SCALE
  t.horizontalOverflow = HorizontalOverflow.Shrink
  return {so, button, label: t}
}
