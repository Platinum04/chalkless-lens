/**
 * ChalkLessWorkTable.ts — preview stand-in: builds a box visual for a table or fabric slab
 * on its own authored SceneObject. The SceneObject's position is the TOP surface centre.
 * In real use this is replaced by the tailor's real table and fabric.
 */
import {boxMesh, meshObject, tintedMaterial} from "./ChalkLessLines"

@component
export class ChalkLessWorkTable extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessWorkTable – stand-in slab (table / fabric)</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unlit material cloned for the slab colour")
  material: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Slab size in cm (width X, thickness Y, depth Z)")
  size: vec3 = new vec3(180, 4, 90)
  @input("vec4", "{0.78, 0.66, 0.5, 1}")
  @hint("Slab colour (keep light — additive display)")
  @widget(new ColorWidget())
  color: vec4 = new vec4(0.78, 0.66, 0.5, 1)
  @input
  @hint("Add four legs down to the floor (table only)")
  withLegs: boolean = true
  @input
  @hint("Leg length in cm (top height minus slab thickness)")
  @widget(new SliderWidget(0, 120, 1))
  legLength: number = 86
  @ui.group_end

  onAwake(): void {
    const mat = tintedMaterial(this.material, this.color)
    const s = this.size
    meshObject(this.sceneObject, "Slab", boxMesh(new vec3(0, -s.y / 2, 0), s), mat)
    if (this.withLegs) {
      const lm = tintedMaterial(this.material, new vec4(this.color.x * 0.8, this.color.y * 0.8, this.color.z * 0.8, 1))
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const c = new vec3(sx * (s.x / 2 - 5), -s.y - this.legLength / 2, sz * (s.z / 2 - 5))
          meshObject(this.sceneObject, "Leg", boxMesh(c, new vec3(5, this.legLength, 5)), lm)
        }
      }
    }
  }
}
