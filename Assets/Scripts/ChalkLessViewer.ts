/**
 * ChalkLessViewer.ts — where the tailor stands: the main camera's world position, plus small yaw helpers
 * for walk-around readability. Pure helpers, no scene state of its own besides a cached camera transform.
 * Must not: move the pattern or fabric (they stay world-locked).
 */
let cameraTransform: Transform | null = null
let override: vec3 | null = null

/** Debug: pretend the tailor stands here (null = use the camera). Used to review walk-around in preview. */
export function setViewerOverride(p: vec3 | null): void {
  override = p
}

function findCamera(o: SceneObject): SceneObject | null {
  if (o.getComponent("Component.Camera")) return o
  for (let i = 0; i < o.getChildrenCount(); i++) {
    const f = findCamera(o.getChild(i))
    if (f) return f
  }
  return null
}

/** World position of the user's head (main camera); null if no camera found. */
export function viewerPosition(): vec3 | null {
  if (override) return override
  if (!cameraTransform) {
    for (let i = 0; i < global.scene.getRootObjectsCount(); i++) {
      const c = findCamera(global.scene.getRootObject(i))
      if (c) {
        cameraTransform = c.getTransform()
        break
      }
    }
  }
  return cameraTransform ? cameraTransform.getWorldPosition() : null
}

/**
 * Yaw (radians, about world +Y) that turns a flat label/card, authored to read upright for a viewer at +Z,
 * so it reads upright for a viewer standing at `viewer` and looking at `at`.
 */
export function readingYaw(at: vec3, viewer: vec3): number {
  const dx = at.x - viewer.x
  const dz = at.z - viewer.z
  return Math.atan2(-dx, -dz)
}

/** Wrap an angle to (-PI, PI]. */
export function wrapAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2
  while (a <= -Math.PI) a += Math.PI * 2
  return a
}

/** Move `cur` toward `target` along the shortest arc; `k` = fraction per frame (0..1). */
export function approachAngle(cur: number, target: number, k: number): number {
  return wrapAngle(cur + wrapAngle(target - cur) * k)
}

/** Per-frame smoothing fraction for a time constant (≈ settle in 3·tau). */
export function smoothK(tauSec: number): number {
  return 1 - Math.exp(-Math.max(getDeltaTime(), 0.001) / tauSec)
}

/** Rotation about world Y. */
export function yawQuat(yaw: number): quat {
  return quat.angleAxis(yaw, vec3.up())
}
