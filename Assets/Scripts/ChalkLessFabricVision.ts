/**
 * ChalkLessFabricVision.ts — pure maths for fabric detection. No Lens API, no SceneObjects:
 * every function takes plain arrays/numbers so it can be unit-tested with a synthetic image.
 *
 * Pipeline: sample the table colour from the image border -> mask pixels that differ from it
 * (colour distance + local texture) -> keep the largest connected region -> oriented bounding
 * box from second moments -> four corners, centre, size and angle in pixels.
 * Then pixel corners are projected onto the table plane (ray / plane intersection).
 * Must not: touch the camera, the scene or any state.
 */

export type Pt = [number, number]
export type V3 = [number, number, number]

export interface FabricRegion {
  /** Corners in pixel coordinates (x right, y down), in order around the box. */
  corners: Pt[]
  center: Pt
  /** Long side and short side in pixels. */
  lengthPx: number
  widthPx: number
  /** Angle of the long side from +x, degrees in (-90, 90]. */
  angleDeg: number
  areaPx: number
}

export interface SegmentOptions {
  /** Minimum colour distance (0..441) counted as "not table". */
  minThreshold?: number
  /** Threshold = max(minThreshold, k * border colour spread). */
  spreadK?: number
  /** Border ring width in pixels used to sample the table colour. */
  border?: number
  /** Regions smaller than this fraction of the image are rejected. */
  minAreaFrac?: number
}

/** Area-average downsample of an RGBA (or RGB with channels=3) image to roughly maxW wide. */
export function downsample(src: Uint8Array, w: number, h: number, channels: number, maxW: number): {data: Uint8Array; w: number; h: number} {
  const f = Math.max(1, Math.ceil(w / maxW))
  const ow = Math.floor(w / f)
  const oh = Math.floor(h / f)
  const out = new Uint8Array(ow * oh * 3)
  for (let y = 0; y < oh; y++)
    for (let x = 0; x < ow; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let dy = 0; dy < f; dy++)
        for (let dx = 0; dx < f; dx++) {
          const i = ((y * f + dy) * w + (x * f + dx)) * channels
          r += src[i]
          g += src[i + 1]
          b += src[i + 2]
        }
      const n = f * f
      const o = (y * ow + x) * 3
      out[o] = r / n
      out[o + 1] = g / n
      out[o + 2] = b / n
    }
  return {data: out, w: ow, h: oh}
}

/** Mean colour and spread (RMS colour distance) of the border ring: the table around the cloth. */
export function borderColour(rgb: Uint8Array, w: number, h: number, ring: number): {mean: V3; spread: number} {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  const each = (fn: (i: number) => void): void => {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if (x < ring || y < ring || x >= w - ring || y >= h - ring) fn((y * w + x) * 3)
  }
  each((i) => {
    r += rgb[i]
    g += rgb[i + 1]
    b += rgb[i + 2]
    n++
  })
  const mean: V3 = [r / n, g / n, b / n]
  let s = 0
  each((i) => {
    s += (rgb[i] - mean[0]) ** 2 + (rgb[i + 1] - mean[1]) ** 2 + (rgb[i + 2] - mean[2]) ** 2
  })
  return {mean, spread: Math.sqrt(s / n)}
}

/**
 * Cloth mask: 1 where the pixel's colour differs from the table colour, or where local texture
 * (difference to its right/down neighbours) is much stronger than the table's own texture.
 */
export function clothMask(rgb: Uint8Array, w: number, h: number, opts: SegmentOptions = {}): Uint8Array {
  const ring = opts.border ?? 2
  const {mean, spread} = borderColour(rgb, w, h, ring)
  const thr = Math.max(opts.minThreshold ?? 30, (opts.spreadK ?? 3) * spread)
  const texThr = Math.max(40, 4 * spread)
  const mask = new Uint8Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x
      const i = p * 3
      const d = Math.sqrt((rgb[i] - mean[0]) ** 2 + (rgb[i + 1] - mean[1]) ** 2 + (rgb[i + 2] - mean[2]) ** 2)
      let tex = 0
      if (x + 1 < w && y + 1 < h) {
        const ir = i + 3
        const id = i + w * 3
        tex = Math.abs(rgb[i] - rgb[ir]) + Math.abs(rgb[i + 1] - rgb[ir + 1]) + Math.abs(rgb[i] - rgb[id]) + Math.abs(rgb[i + 1] - rgb[id + 1])
      }
      // Texture alone only counts away from the cloth boundary's single-pixel edge response.
      mask[p] = d > thr || (tex > texThr && d > thr * 0.5) ? 1 : 0
    }
  return mask
}

/** Largest 4-connected region of a 0/1 mask; returns its pixel indices. */
export function largestRegion(mask: Uint8Array, w: number, h: number): number[] {
  const seen = new Uint8Array(w * h)
  let best: number[] = []
  const stack: number[] = []
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue
    const region: number[] = []
    stack.push(s)
    seen[s] = 1
    while (stack.length) {
      const p = stack.pop() as number
      region.push(p)
      const x = p % w
      const y = (p - x) / w
      const nb = [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]
      for (const q of nb)
        if (q >= 0 && mask[q] && !seen[q]) {
          seen[q] = 1
          stack.push(q)
        }
    }
    if (region.length > best.length) best = region
  }
  return best
}

/** Oriented bounding box of a pixel set (indices into a w-wide image) from second moments. */
export function orientedBox(pixels: number[], w: number): FabricRegion | null {
  const n = pixels.length
  if (n < 3) return null
  let sx = 0
  let sy = 0
  for (const p of pixels) {
    sx += p % w
    sy += Math.floor(p / w)
  }
  const cx = sx / n
  const cy = sy / n
  let m20 = 0
  let m02 = 0
  let m11 = 0
  for (const p of pixels) {
    const dx = (p % w) - cx
    const dy = Math.floor(p / w) - cy
    m20 += dx * dx
    m02 += dy * dy
    m11 += dx * dy
  }
  const theta = 0.5 * Math.atan2(2 * m11, m20 - m02)
  const ux = Math.cos(theta)
  const uy = Math.sin(theta)
  let a0 = 1e9
  let a1 = -1e9
  let b0 = 1e9
  let b1 = -1e9
  for (const p of pixels) {
    const dx = (p % w) - cx
    const dy = Math.floor(p / w) - cy
    const a = dx * ux + dy * uy
    const b = -dx * uy + dy * ux
    if (a < a0) a0 = a
    if (a > a1) a1 = a
    if (b < b0) b0 = b
    if (b > b1) b1 = b
  }
  // Pixel centres -> pixel edges: grow by half a pixel on each side.
  a0 -= 0.5
  a1 += 0.5
  b0 -= 0.5
  b1 += 0.5
  const corner = (a: number, b: number): Pt => [cx + a * ux - b * uy, cy + a * uy + b * ux]
  const corners = [corner(a0, b0), corner(a1, b0), corner(a1, b1), corner(a0, b1)]
  const mid = corner((a0 + a1) / 2, (b0 + b1) / 2)
  let len = a1 - a0
  let wid = b1 - b0
  let ang = (theta * 180) / Math.PI
  if (wid > len) {
    const t = len
    len = wid
    wid = t
    ang += 90
  }
  while (ang > 90) ang -= 180
  while (ang <= -90) ang += 180
  return {corners, center: mid, lengthPx: len, widthPx: wid, angleDeg: ang, areaPx: n}
}

/** Full 2D pass: RGB image (3 bytes per pixel) -> the largest cloth region's box, or null. */
export function segmentFabric(rgb: Uint8Array, w: number, h: number, opts: SegmentOptions = {}): FabricRegion | null {
  const mask = clothMask(rgb, w, h, opts)
  const region = largestRegion(mask, w, h)
  if (region.length < (opts.minAreaFrac ?? 0.03) * w * h) return null
  return orientedBox(region, w)
}

/** Intersect the ray a -> b (extended) with the horizontal plane y = planeY. Null if parallel or behind a. */
export function rayPlaneY(a: V3, b: V3, planeY: number): V3 | null {
  const dy = b[1] - a[1]
  if (Math.abs(dy) < 1e-6) return null
  const t = (planeY - a[1]) / dy
  if (t <= 0) return null
  return [a[0] + (b[0] - a[0]) * t, planeY, a[2] + (b[2] - a[2]) * t]
}

/** Rectangle on the table (world XZ) from 4 projected corners: centre, side lengths (long first) and yaw of the long side. */
export function rectFromCorners(c: V3[]): {center: V3; lengthCm: number; widthCm: number; yawDeg: number} {
  const center: V3 = [(c[0][0] + c[1][0] + c[2][0] + c[3][0]) / 4, c[0][1], (c[0][2] + c[1][2] + c[2][2] + c[3][2]) / 4]
  const d = (p: V3, q: V3): number => Math.sqrt((p[0] - q[0]) ** 2 + (p[2] - q[2]) ** 2)
  const s01 = (d(c[0], c[1]) + d(c[3], c[2])) / 2
  const s12 = (d(c[1], c[2]) + d(c[0], c[3])) / 2
  const longA = s01 >= s12
  const p = longA ? c[0] : c[1]
  const q = longA ? c[1] : c[2]
  let yaw = (Math.atan2(-(q[2] - p[2]), q[0] - p[0]) * 180) / Math.PI
  while (yaw > 90) yaw -= 180
  while (yaw <= -90) yaw += 180
  return {center, lengthCm: Math.max(s01, s12), widthCm: Math.min(s01, s12), yawDeg: yaw}
}

/** Test helper: RGB image of a light rotated rectangle on a darker, slightly noisy table. */
export function syntheticFabricImage(w: number, h: number, cx: number, cy: number, len: number, wid: number, angleDeg: number, seed = 7): Uint8Array {
  const out = new Uint8Array(w * h * 3)
  const t = (angleDeg * Math.PI) / 180
  const ux = Math.cos(t)
  const uy = Math.sin(t)
  let s = seed
  const rnd = (): number => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = x - cx
      const dy = y - cy
      const a = dx * ux + dy * uy
      const b = -dx * uy + dy * ux
      const inside = Math.abs(a) <= len / 2 && Math.abs(b) <= wid / 2
      const i = (y * w + x) * 3
      const n = (rnd() - 0.5) * 10
      if (inside) {
        out[i] = 225 + n
        out[i + 1] = 220 + n
        out[i + 2] = 205 + n
      } else {
        out[i] = 120 + n
        out[i + 1] = 85 + n
        out[i + 2] = 55 + n
      }
    }
  return out
}
