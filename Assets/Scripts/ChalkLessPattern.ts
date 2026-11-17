/**
 * ChalkLessPattern.ts — pure pattern maths shared by every garment style + the Buba recipe.
 * Owns: types (measurements, steps, geometry, StyleRecipe), drafting helpers (arcs, offsets,
 * transpose-to-fit), the fabric-saved estimate, and the Buba recipe (kept exactly: 7 measurements,
 * 7 steps fold/measure/neckline/shoulder/sleeve/sideSeam/hem).
 * Geometry is pattern-local XZ: x = away from the fold, z = down the length (before any transpose).
 * Other styles live in ChalkLessStyleRecipes.ts. Must not: touch SceneObjects or UI.
 */

export type MeasurementKey = string

export interface MeasurementDef {
  key: MeasurementKey
  label: string
  defaultCm: number
  minCm: number
  maxCm: number
}

export type Measurements = Record<MeasurementKey, number>

export type StepKind = "fold" | "measure" | "mark" | "cut"

export interface StepDef {
  id: string
  title: string
  kind: StepKind
}

export type P2 = [number, number]

export interface Mark {
  a: P2
  b: P2
  label: string
}

export interface StepGeometry {
  id?: string
  lines: P2[][] // polylines for this step
  closed: boolean
  centroid: P2 // the piece the line belongs to (for outward seam allowance)
  marks: Mark[] // measure step only
  label: string // step label text, lengths calculated from measurements ("Cut ..." = cut line)
}

export interface PatternGeometry {
  widthCm: number
  lengthCm: number
  steps: StepGeometry[]
  /** True when the layout was turned 90° so the length runs along the fabric width. */
  transposed?: boolean
}

/** One garment style: everything Main needs to drive menu → measure → cut → summary. */
export interface StyleRecipe {
  id: string
  name: string
  /** Stable SceneObject name of its menu button, e.g. "BubaButton". */
  buttonName: string
  menuLabel: string
  measurements: MeasurementDef[]
  steps: StepDef[]
  build(m: Measurements): PatternGeometry
  piecesText(m: Measurements): string
  /** Area (cm²) a standard chalk layout would use for the same pieces. */
  chalkLayoutAreaCm2(g: PatternGeometry, marginCm: number): number
}

export function defaultsOf(defs: MeasurementDef[]): Measurements {
  const m = {} as Measurements
  for (const d of defs) m[d.key] = d.defaultCm
  return m
}

/** Seam allowances (cm): body seams, neck, hem. */
export const SEAM_CM = 1.5
export const NECK_SEAM_CM = 1
export const HEM_SEAM_CM = 3
/** Ease (cm) added to the quarter hip for a loose garment; chest gets a little more for arm room. */
export const BODY_EASE_CM = 5
export const CHEST_EASE_CM = 7
/** Gap between pieces on the fabric. */
export const PIECE_GAP_CM = 8
/** Sleeve cap height. */
export const SLEEVE_CAP_CM = 10
/** Max pattern depth before the layout is turned to run along the fabric width. */
export const FABRIC_DEPTH_FIT_CM = 76

export const r = (x: number): number => Math.round(x)

export function polylineLength(pts: P2[]): number {
  let l = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0]
    const dz = pts[i][1] - pts[i - 1][1]
    l += Math.sqrt(dx * dx + dz * dz)
  }
  return l
}

/** Quarter-ellipse (or any elliptical arc) points, angle in radians, x = cx + rx cos, z = cz + rz sin. */
export function arc(cx: number, cz: number, rx: number, rz: number, a0: number, a1: number, n = 12): P2[] {
  const out: P2[] = []
  for (let i = 0; i <= n; i++) {
    const t = a0 + ((a1 - a0) * i) / n
    out.push([cx + rx * Math.cos(t), cz + rz * Math.sin(t)])
  }
  return out
}

/** Eased curve from p to q (horizontal tangent at q, vertical start) — armhole / underarm shape. */
export function easeCurve(p: P2, q: P2, n = 10): P2[] {
  const out: P2[] = []
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * (Math.PI / 2)
    out.push([p[0] + (q[0] - p[0]) * (1 - Math.cos(t)), p[1] + (q[1] - p[1]) * Math.sin(t)])
  }
  return out
}

export function cutStep(id: string, lines: P2[][], centroid: P2, label: string, closed = false): StepGeometry {
  return {id, lines, closed, centroid, marks: [], label}
}

/**
 * Finalise a layout: shift so cut lines start at (0,0), measure extent, and when the pattern is
 * deeper than the fabric (long robes), turn it 90° so the length runs along the fabric width.
 */
export function finishLayout(steps: StepGeometry[], allowTranspose = true): PatternGeometry {
  let minX = Infinity
  let minZ = Infinity
  let maxX = -Infinity
  let maxZ = -Infinity
  for (const st of steps) {
    if (st.id === "fold") continue
    for (const l of st.lines)
      for (const p of l) {
        minX = Math.min(minX, p[0])
        maxX = Math.max(maxX, p[0])
        minZ = Math.min(minZ, p[1])
        maxZ = Math.max(maxZ, p[1])
      }
  }
  const sx = -Math.min(0, minX)
  const sz = -Math.min(0, minZ)
  let w = maxX + sx
  let l = maxZ + sz
  const transpose = allowTranspose && l > FABRIC_DEPTH_FIT_CM && w < l
  const map = (p: P2): P2 => (transpose ? [p[1] + sz, p[0] + sx] : [p[0] + sx, p[1] + sz])
  const out: StepGeometry[] = steps.map((st) => ({
    id: st.id,
    lines: st.lines.map((ln) => ln.map(map)),
    closed: st.closed,
    centroid: map(st.centroid),
    marks: st.marks.map((mk) => ({a: map(mk.a), b: map(mk.b), label: mk.label})),
    label: st.label,
  }))
  if (transpose) {
    const t = w
    w = l
    l = t
  }
  return {widthCm: w, lengthCm: l, steps: out, transposed: transpose}
}

/** Offset a polyline outward (away from centroid) by dist, per-vertex averaged normals. */
export function offsetOutward(pts: P2[], centroid: P2, dist: number): P2[] {
  const segN: P2[] = []
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0]
    const dz = pts[i][1] - pts[i - 1][1]
    const len = Math.sqrt(dx * dx + dz * dz) || 1
    let nx = dz / len
    let nz = -dx / len
    const mx = (pts[i][0] + pts[i - 1][0]) / 2 - centroid[0]
    const mz = (pts[i][1] + pts[i - 1][1]) / 2 - centroid[1]
    if (nx * mx + nz * mz < 0) {
      nx = -nx
      nz = -nz
    }
    segN.push([nx, nz])
  }
  const out: P2[] = []
  for (let i = 0; i < pts.length; i++) {
    const a = segN[Math.max(0, i - 1)]
    const b = segN[Math.min(segN.length - 1, i)]
    let nx = a[0] + b[0]
    let nz = a[1] + b[1]
    const l = Math.sqrt(nx * nx + nz * nz) || 1
    nx /= l
    nz /= l
    out.push([pts[i][0] + nx * dist, pts[i][1] + nz * dist])
  }
  return out
}

/** Standard chalk layout: generous margin around the whole lay plus per extra piece column. */
export function chalkAreaColumns(g: PatternGeometry, marginCm: number, columns: number): number {
  return (g.widthCm + 3 + marginCm * 2 * columns) * (g.lengthCm + 3 + marginCm * 2)
}

/** Fabric-saved estimate vs a standard chalk layout. */
export function fabricSavedEstimate(
  g: PatternGeometry,
  chalkMarginCm: number,
  recipe?: StyleRecipe,
): {savedCm2: number; savedPct: number} {
  const ours = (g.widthCm + 3) * (g.lengthCm + 3)
  const chalk = recipe ? recipe.chalkLayoutAreaCm2(g, chalkMarginCm) : chalkAreaColumns(g, chalkMarginCm, 1)
  const saved = chalk - ours
  return {savedCm2: saved, savedPct: (saved / chalk) * 100}
}

// ───────────────────────────── Buba ─────────────────────────────

export const MEASUREMENTS: MeasurementDef[] = [
  {key: "neck", label: "Neck", defaultCm: 40, minCm: 28, maxCm: 60},
  {key: "shoulder", label: "Shoulder", defaultCm: 46, minCm: 30, maxCm: 64},
  {key: "chest", label: "Chest", defaultCm: 100, minCm: 70, maxCm: 150},
  {key: "topLength", label: "Top length", defaultCm: 70, minCm: 45, maxCm: 76},
  {key: "sleeveLength", label: "Sleeve length", defaultCm: 25, minCm: 10, maxCm: 60},
  {key: "roundSleeve", label: "Round sleeve (arm)", defaultCm: 36, minCm: 22, maxCm: 56},
  {key: "hip", label: "Hip", defaultCm: 104, minCm: 70, maxCm: 150},
]

export function defaultMeasurements(): Measurements {
  return defaultsOf(MEASUREMENTS)
}

export const STEPS: StepDef[] = [
  {id: "fold", title: "Fold", kind: "fold"},
  {id: "measure", title: "Measure", kind: "measure"},
  {id: "neckline", title: "Neckline", kind: "cut"},
  {id: "shoulder", title: "Shoulder", kind: "cut"},
  {id: "sleeve", title: "Sleeve", kind: "cut"},
  {id: "sideSeam", title: "Side seam", kind: "cut"},
  {id: "hem", title: "Hem", kind: "cut"},
]

/**
 * Sleeve piece laid with its length along X (so sleeve length shows in the pattern extent).
 * Cap curve at x = sx, cuff at x = sx + SL; across-arm width along Z from z0.
 */
export function sleevePiece(sx: number, z0: number, sw: number, SL: number, cuffW: number, cap = SLEEVE_CAP_CM): P2[] {
  const pts: P2[] = []
  for (let i = 0; i <= 16; i++) {
    const s = i / 16
    pts.push([sx + cap * (1 - Math.sin(Math.PI * s)), z0 + sw * s])
  }
  const inset = (sw - cuffW) / 2
  pts.push([sx + SL, z0 + sw - inset])
  pts.push([sx + SL, z0 + inset])
  pts.push([sx + cap, z0])
  return pts
}

export function buildPattern(m: Measurements): PatternGeometry {
  const nw = m.neck / 6 // half neck width
  const nd = m.neck / 6 + 2 // front neck depth
  const sh = m.shoulder / 2 // half shoulder
  const drop = 4 // shoulder slope
  const ad = m.chest / 5 + 4 // armhole depth
  const cw = m.chest / 4 + CHEST_EASE_CM // quarter chest + ease
  const hw = m.hip / 4 + BODY_EASE_CM // quarter hip + ease
  const L = m.topLength
  const bodyW = Math.max(cw, hw)
  const sx = bodyW + PIECE_GAP_CM
  const sw = m.roundSleeve + 6
  const SL = m.sleeveLength
  const cap = SLEEVE_CAP_CM

  const bodyC: P2 = [bodyW / 2, L / 2]
  const sleeveC: P2 = [sx + SL / 2, sw / 2]

  const neck = arc(0, 0, nw, nd, 0, Math.PI / 2, 12)
  const shoulder: P2[] = [
    [nw, 0],
    [sh, drop],
  ]
  const sleeve = sleevePiece(sx, 0, sw, SL, sw - 4, cap)
  const side = easeCurve([sh, drop], [cw, ad])
  side.push([hw, L])
  const hem: P2[] = [
    [hw, L],
    [0, L],
  ]

  const steps: StepGeometry[] = [
    {id: "fold", lines: [[[0, -2], [0, L + 2]]], closed: false, centroid: bodyC, marks: [], label: `Fold here — ${r(L)} cm along the fold`},
    {
      id: "measure",
      lines: [],
      closed: false,
      centroid: bodyC,
      marks: [
        {a: [0, -3], b: [nw, -3], label: `Neck ${m.neck} cm`},
        {a: [0, drop + 2], b: [sh, drop + 2], label: `Shoulder ${m.shoulder} cm`},
        {a: [0, ad], b: [cw, ad], label: `Chest ${m.chest} cm`},
        {a: [4, 0], b: [4, L], label: `Length ${m.topLength} cm`},
        {a: [sx, sw / 2], b: [sx + SL, sw / 2], label: `Sleeve ${m.sleeveLength} cm`},
        {a: [sx + cap + 3, 0], b: [sx + cap + 3, sw], label: `Arm ${m.roundSleeve} cm`},
        {a: [0, L - 8], b: [hw, L - 8], label: `Hip ${m.hip} cm`},
      ],
      label: "Check the marks — neck, shoulder, chest, length, sleeve, hip",
    },
    cutStep("neckline", [neck], bodyC, `Cut neckline — ${r(polylineLength(neck))} cm curve`),
    cutStep("shoulder", [shoulder], bodyC, `Cut shoulder — ${r(polylineLength(shoulder))} cm`),
    cutStep("sleeve", [sleeve], sleeveC, `Cut sleeve — ${r(polylineLength(sleeve))} cm outline`, true),
    cutStep("sideSeam", [side], bodyC, `Cut side seam — ${r(polylineLength(side))} cm`),
    cutStep("hem", [hem], bodyC, `Cut hem — ${r(polylineLength(hem))} cm straight`),
  ]

  return {widthCm: sx + SL, lengthCm: Math.max(L, sw + 2), steps}
}

export const BUBA: StyleRecipe = {
  id: "buba",
  name: "Buba",
  buttonName: "BubaButton",
  menuLabel: "Buba",
  measurements: MEASUREMENTS,
  steps: STEPS,
  build: buildPattern,
  piecesText: () => "Pieces cut: 3 — front on the fold + 2 sleeves",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 1),
}
