/**
 * ChalkLessFabricFinder.ts — after the table is confirmed, grabs one Camera Module frame, runs the
 * pure segmentation in ChalkLessFabricVision (downsampled CPU pass), projects the cloth corners onto
 * the table plane with the camera intrinsics (DeviceCamera.unproject + ray/plane intersection) and
 * reports the fabric rectangle. Single frame only: nothing is recorded, stored or sent anywhere.
 * API: run(planeY, onResult) — onResult(rect | null) once (null = align by hand).
 * State for tests: status ("idle" | "running" | "found" | "fallback"), lastRegion (pixel box).
 * Expects @inputs: head (camera SceneObject; device reference frame). Must not: move scene objects.
 */
import {FabricRegion, rayPlaneY, rectFromCorners, segmentFabric, downsample, V3} from "./ChalkLessFabricVision"

export type FabricFinderStatus = "idle" | "running" | "found" | "fallback"
export interface FabricRect {
  center: vec3
  /** Long side along X after yaw, short side along Z (cm). */
  sizeCm: vec2
  /** Yaw of the long edge from world +X (degrees, counter-clockwise seen from above). */
  yawDeg: number
}

@component
export class ChalkLessFabricFinder extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">ChalkLessFabricFinder – camera fabric detection</span>')
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Camera SceneObject (device reference frame for unproject)")
  head: SceneObject
  @ui.group_end
  @ui.separator
  @ui.group_start("Settings")
  @input
  @hint("Width of the downsampled image used for segmentation (px)")
  @widget(new SliderWidget(48, 256, 8))
  workWidthPx: number = 128
  @input
  @hint("Minimum colour difference from the table counted as cloth (0–441)")
  @widget(new SliderWidget(10, 120, 1))
  minColourDiff: number = 30
  @input
  @hint("Give up and align by hand after this many seconds")
  @widget(new SliderWidget(1, 15, 0.5))
  timeoutSec: number = 5
  @ui.group_end
  @ui.separator
  @ui.group_start("Debug")
  @input
  @hint("Also try the camera in the Lens Studio preview (normally the preview uses the stand-in fabric)")
  detectInPreview: boolean = false
  @ui.group_end

  status: FabricFinderStatus = "idle"
  lastRegion: FabricRegion | null = null
  private onResult: ((r: FabricRect | null) => void) | null = null

  run(planeY: number, onResult: (r: FabricRect | null) => void): void {
    this.onResult = onResult
    this.lastRegion = null
    if (global.deviceInfoSystem.isEditor() && !this.detectInPreview) {
      this.fail()
      return
    }
    this.status = "running"
    let camTex: Texture
    let devCam: DeviceCamera
    const camId = global.deviceInfoSystem.isEditor() ? CameraModule.CameraId.Default_Color : CameraModule.CameraId.Left_Color
    try {
      const cm = require("LensStudio:CameraModule") as CameraModule
      const req = CameraModule.createCameraRequest()
      req.cameraId = camId
      req.imageSmallerDimension = 352
      camTex = cm.requestCamera(req)
      devCam = global.deviceInfoSystem.getTrackingCameraForId(camId)
    } catch (e) {
      this.fail()
      return
    }
    if (!camTex || !devCam) {
      this.fail()
      return
    }
    const provider = camTex.control as CameraTextureProvider
    let gotFrame = false
    const reg = provider.onNewFrame.add(() => {
      gotFrame = true
    })
    const start = getTime()
    const upd = this.createEvent("UpdateEvent")
    upd.bind(() => {
      if (this.status !== "running") {
        upd.enabled = false
        return
      }
      if (getTime() - start > this.timeoutSec) {
        upd.enabled = false
        provider.onNewFrame.remove(reg)
        this.fail()
        return
      }
      // createFromTexture throws inside onNewFrame, so copy the pixels from UpdateEvent.
      if (!gotFrame) return
      upd.enabled = false
      provider.onNewFrame.remove(reg)
      let rect: FabricRect | null = null
      try {
        rect = this.analyseTexture(camTex, devCam, planeY)
      } catch (e) {
        print(`ChalkLess: fabric detection error ${e}`)
      }
      if (rect) this.succeed(rect)
      else this.fail()
    })
  }

  /** One frame -> fabric rectangle on the plane y = planeY (world cm), or null. */
  private analyseTexture(tex: Texture, devCam: DeviceCamera, planeY: number): FabricRect | null {
    const w = tex.getWidth()
    const h = tex.getHeight()
    const copy = ProceduralTextureProvider.createFromTexture(tex)
    const px = new Uint8Array(w * h * 4)
    ;(copy.control as ProceduralTextureProvider).getPixels(0, 0, w, h, px)
    const small = downsample(px, w, h, 4, this.workWidthPx)
    const region = segmentFabric(small.data, small.w, small.h, {minThreshold: this.minColourDiff})
    this.lastRegion = region
    if (!region) return null
    // Pixel (top-left origin, as DeviceCamera expects) -> world point on the table plane.
    const sx = w / small.w
    const sy = h / small.h
    const toWorld = this.head.getTransform().getWorldTransform()
    const corners: V3[] = []
    for (const c of region.corners) {
      const uv = new vec2((c[0] * sx) / w, (c[1] * sy) / h)
      const a = toWorld.multiplyPoint(devCam.unproject(uv, 10))
      const b = toWorld.multiplyPoint(devCam.unproject(uv, 200))
      const p = rayPlaneY([a.x, a.y, a.z], [b.x, b.y, b.z], planeY)
      if (!p) return null
      corners.push(p)
    }
    const r = rectFromCorners(corners)
    if (r.lengthCm < 20 || r.widthCm < 15 || r.lengthCm > 400) return null
    return {center: new vec3(r.center[0], planeY, r.center[2]), sizeCm: new vec2(r.lengthCm, r.widthCm), yawDeg: r.yawDeg}
  }

  private succeed(r: FabricRect): void {
    this.status = "found"
    print(`ChalkLess: fabric found ${Math.round(r.sizeCm.x)} x ${Math.round(r.sizeCm.y)} cm, yaw ${r.yawDeg.toFixed(1)} deg`)
    this.deliver(r)
  }

  private fail(): void {
    this.status = "fallback"
    print("ChalkLess: fabric detection unavailable, align by hand")
    this.deliver(null)
  }

  private deliver(r: FabricRect | null): void {
    const cb = this.onResult
    this.onResult = null
    if (cb) cb(r)
  }
}
