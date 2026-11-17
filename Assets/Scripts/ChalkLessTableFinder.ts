/**
 * ChalkLessTableFinder.ts — "Find your table" phase. On device it hit-tests the real world with
 * World Query along the hand ray (or the gaze ray when no hand is targeting), accepts near-level
 * surfaces at cutting-table height below the eye, shows a light ring reticle on the hit and lets the
 * tailor pinch ConfirmTableButton. In the Lens Studio preview (or when World Query is unavailable)
 * it falls back straight away to the virtual stand-in table.
 * API: begin(onDone) — onDone(surface | null) is called exactly once (null = use stand-in).
 * State for tests: status ("idle" | "searching" | "confirmed" | "fallback" | "skipped"), lastHit.
 * Expects @inputs: ui (ChalkLessTableFinderUI), head (camera SceneObject), reticleMaterial.
 * Must not: move the work area itself (ChalkLessMain does), or keep running after onDone.
 */
import {InteractionManager} from "InteractionKit.lspkg/Core/InteractionManager/InteractionManager"
import {MeshAccumulator, meshObject, tintedMaterial} from "./ChalkLessLines"
import {P2} from "./ChalkLessPattern"
import {ChalkLessTableFinderUI} from "./ChalkLessTableFinderUI"

export type TableFinderStatus = "idle" | "searching" | "confirmed" | "fallback" | "skipped"
export interface TableSurface {
  position: vec3
  normal: vec3
}

/** Pure: is this hit a plausible cutting-table top? (normal near up, 50–110 cm below the eye) */
export function isTableHit(normal: vec3, hitY: number, eyeY: number, maxTiltDeg: number, minDrop: number, maxDrop: number): boolean {
  const n = normal.normalize()
  const tilt = (Math.acos(Math.min(1, Math.max(-1, n.y))) * 180) / Math.PI
  const drop = eyeY - hitY
  return tilt <= maxTiltDeg && drop >= minDrop && drop <= maxDrop
}

@component
export class ChalkLessTableFinder extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessTableFinder – World Query table detection</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Find-your-table prompt panel")
  ui: ChalkLessTableFinderUI
  @input
  @hint("Camera SceneObject (eye position and gaze ray)")
  head: SceneObject
  @input
  @hint("Unlit material cloned for the reticle ring")
  reticleMaterial: Material
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Max tilt of the surface from level (degrees)")
  @widget(new SliderWidget(5, 30, 1))
  maxTiltDeg: number = 15
  @input
  @hint("Table top must be at least this far below the eye (cm)")
  @widget(new SliderWidget(20, 100, 1))
  minDropCm: number = 50
  @input
  @hint("Table top must be at most this far below the eye (cm)")
  @widget(new SliderWidget(60, 160, 1))
  maxDropCm: number = 110
  @input
  @hint("Seconds without a table hit before the Use virtual table button appears")
  @widget(new SliderWidget(1, 15, 0.5))
  skipAfterSec: number = 4
  @input("vec4", "{0.55, 1, 0.9, 1}")
  @hint("Reticle colour (light: additive display)")
  @widget(new ColorWidget())
  reticleColor: vec4 = new vec4(0.55, 1, 0.9, 1)
  @input
  @hint("Reticle ring radius (cm)")
  @widget(new SliderWidget(3, 30, 1))
  reticleRadiusCm: number = 12
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Also try World Query in the Lens Studio preview (normally the preview skips straight to the stand-in)")
  detectInPreview: boolean = false
  @ui.group_end

  status: TableFinderStatus = "idle"
  lastHit: TableSurface | null = null
  private onDone: ((s: TableSurface | null) => void) | null = null
  private session: HitTestSession | null = null
  private reticle: SceneObject
  private startTime = 0
  private pending = false
  private update: SceneEvent

  onAwake(): void {
    this.ui.onConfirm.add(() => this.confirm())
    this.ui.onSkip.add(() => this.skip())
    this.ui.hide()
    this.buildReticle()
  }

  /** Start the phase. Calls onDone synchronously when detection can't run (preview / no World Query). */
  begin(onDone: (s: TableSurface | null) => void, forceUi = false): void {
    this.onDone = onDone
    this.lastHit = null
    const editor = global.deviceInfoSystem.isEditor()
    if (!forceUi && editor && !this.detectInPreview) {
      this.fallback()
      return
    }
    if (!editor || this.detectInPreview) try {
      const wq = require("LensStudio:WorldQueryModule") as WorldQueryModule
      const opts = HitTestSessionOptions.create()
      opts.filter = true
      this.session = wq.createHitTestSessionWithOptions(opts)
      this.session.start()
    } catch (e) {
      this.session = null
    }
    if (!this.session && !forceUi) {
      this.fallback()
      return
    }
    this.status = "searching"
    this.startTime = getTime()
    this.ui.show()
    this.ui.setStatus(this.session ? "Looking for a flat surface..." : "Table detection unavailable here.")
    this.ui.setConfirmVisible(false)
    this.ui.setSkipVisible(!this.session)
    this.update = this.createEvent("UpdateEvent")
    this.update.bind(() => this.tick())
    print("ChalkLess: phase=findTable")
  }

  private tick(): void {
    if (this.status !== "searching") return
    if (getTime() - this.startTime > this.skipAfterSec && !this.lastHit) {
      this.ui.setSkipVisible(true)
      this.ui.setStatus("No table found yet. Keep looking, or use the virtual table.")
    }
    if (!this.session || this.pending) return
    const ray = this.currentRay()
    if (!ray) return
    this.pending = true
    this.session.hitTest(ray[0], ray[1], (hit) => {
      this.pending = false
      if (this.status !== "searching") return
      const eyeY = this.head.getTransform().getWorldPosition().y
      if (hit && isTableHit(hit.normal, hit.position.y, eyeY, this.maxTiltDeg, this.minDropCm, this.maxDropCm)) {
        this.lastHit = {position: hit.position, normal: hit.normal}
        this.reticle.enabled = true
        this.reticle.getTransform().setWorldPosition(hit.position.add(new vec3(0, 0.3, 0)))
        this.ui.setConfirmVisible(true)
        this.ui.setStatus(`Table found, ${Math.round(eyeY - hit.position.y)} cm below your eyes.`)
      } else {
        this.reticle.enabled = false
        this.ui.setConfirmVisible(this.lastHit !== null)
      }
    })
  }

  /** Hand ray when a hand is targeting, otherwise the gaze ray from the camera. */
  private currentRay(): [vec3, vec3] | null {
    try {
      const it = InteractionManager.getInstance().getTargetingInteractors()
      for (const i of it) {
        if (i.isActive() && i.isTargeting() && i.startPoint && i.direction) return [i.startPoint, i.startPoint.add(i.direction.uniformScale(300))]
      }
    } catch (e) {
      // SIK not ready yet: use gaze.
    }
    const t = this.head.getTransform()
    const p = t.getWorldPosition()
    return [p, p.add(t.forward.uniformScale(-300))]
  }

  confirm(): void {
    if (this.status !== "searching" || !this.lastHit) return
    this.status = "confirmed"
    print(`ChalkLess: table confirmed at ${this.lastHit.position}`)
    this.finish(this.lastHit)
  }

  skip(): void {
    if (this.status !== "searching") return
    this.status = "skipped"
    print("ChalkLess: table detection skipped, using stand-in")
    this.finish(null)
  }

  private fallback(): void {
    this.status = "fallback"
    print("ChalkLess: table detection unavailable, using stand-in")
    this.finish(null)
  }

  private finish(s: TableSurface | null): void {
    if (this.session) this.session.stop()
    this.session = null
    if (this.update) this.update.enabled = false
    this.reticle.enabled = false
    this.ui.hide()
    const cb = this.onDone
    this.onDone = null
    if (cb) cb(s)
  }

  private buildReticle(): void {
    const acc = new MeshAccumulator(0)
    const pts: P2[] = []
    const r = this.reticleRadiusCm
    for (let k = 0; k <= 48; k++) pts.push([Math.cos((k / 48) * Math.PI * 2) * r, Math.sin((k / 48) * Math.PI * 2) * r])
    acc.polyline(pts, 0.5)
    acc.polyline([[-r * 0.3, 0], [r * 0.3, 0]], 0.4)
    acc.polyline([[0, -r * 0.3], [0, r * 0.3]], 0.4)
    const holder = global.scene.createSceneObject("TableReticle")
    this.reticle = holder
    meshObject(holder, "Ring", acc.build(), tintedMaterial(this.reticleMaterial, this.reticleColor))
    holder.enabled = false
  }
}
