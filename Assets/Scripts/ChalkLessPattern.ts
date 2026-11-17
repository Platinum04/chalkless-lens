/**
 * ChalkLessPattern.ts — pure buba pattern maths. No scene access.
 * Owns: measurement definitions + defaults, the seven step definitions, and the
 * geometry of every line (pattern-local XZ plane, x = away from fold, z = down the length).
 * Must not: touch SceneObjects or UI.
 */

export type MeasurementKey = "neck" | "shoulder" | "chest" | "topLength" | "sleeveLength" | "roundSleeve" | "hip"

export interface MeasurementDef {
  key: MeasurementKey
  label: string
  defaultCm: number
  minCm: number
  maxCm: number
}

export const MEASUREMENTS: MeasurementDef[] = [
  {key: "neck", label: "Neck", defaultCm: 40, minCm: 28, maxCm: 60},
  {key: "shoulder", label: "Shoulder", defaultCm: 46, minCm: 30, maxCm: 64},
  {key: "chest", label: "Chest", defaultCm: 100, minCm: 70, maxCm: 150},
  {key: "topLength", label: "Top length", defaultCm: 70, minCm: 45, maxCm: 76},
  {key: "sleeveLength", label: "Sleeve length", defaultCm: 25, minCm: 10, maxCm: 60},
  {key: "roundSleeve", label: "Round sleeve (arm)", defaultCm: 36, minCm: 22, maxCm: 56},
  {key: "hip", label: "Hip", defaultCm: 104, minCm: 70, maxCm: 150},
]

export type Measurements = Record<MeasurementKey, number>

export function defaultMeasurements(): Measurements {
  const m = {} as Measurements
  for (const d of MEASUREMENTS) m[d.key] = d.defaultCm
  return m
}

export type StepKind = "fold" | "measure" | "cut"

export interface StepDef {
  id: string
  title: string
  kind: StepKind
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

export type P2 = [number, number]

export interface Mark {
  a: P2
  b: P2
  label: string
}

export interface StepGeometry {
  lines: P2[][] // polylines for this step
  closed: boolean
  centroid: P2 // the piece the line belongs to (for outward seam allowance)
  marks: Mark[] // measure step only
  label: string // step label text, lengths calculated from measurements
}

export interface PatternGeometry {
  widthCm: number
  lengthCm: number
  steps: StepGeometry[]
}

export function polylineLength(pts: P2[]): number {
  let l = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0]
    const dz = pts[i][1] - pts[i - 1][1]
    l += Math.sqrt(dx * dx + dz * dz)
  }
  return l
}

/** Ease (cm) added to the quarter chest / hip for a loose buba. */
export const BODY_EASE_CM = 5
/** Gap between the front piece and the sleeve piece on the fabric. */
export const PIECE_GAP_CM = 8
/** Sleeve cap height. */
export const SLEEVE_CAP_CM = 10

export function buildPattern(m: Measurements): PatternGeometry {
  const nw = m.neck / 6 // half neck width
  const nd = m.neck / 6 + 2 // front neck depth
  const sh = m.shoulder / 2 // half shoulder
  const drop = 4 // shoulder slope
  const ad = m.chest / 5 + 4 // armhole depth
  const cw = m.chest / 4 + BODY_EASE_CM
  const hw = m.hip / 4 + BODY_EASE_CM
  const L = m.topLength
  const bodyW = Math.max(cw, hw)
  const sx = bodyW + PIECE_GAP_CM
  const sw = m.roundSleeve + 6
  const SL = m.sleeveLength
  const cap = SLEEVE_CAP_CM

  const bodyC: P2 = [bodyW / 2, L / 2]
  const sleeveC: P2 = [sx + sw / 2, SL / 2]

  const neck: P2[] = []
  for (let i = 0; i <= 12; i++) {
    const t = (i / 12) * (Math.PI / 2)
    neck.push([nw * Math.cos(t), nd * Math.sin(t)])
  }

  const shoulder: P2[] = [
    [nw, 0],
    [sh, drop],
  ]

  const sleeve: P2[] = []
  for (let i = 0; i <= 16; i++) {
    const s = i / 16
    sleeve.push([sx + sw * s, cap * (1 - Math.sin(Math.PI * s))])
  }
  sleeve.push([sx + sw - 2, SL])
  sleeve.push([sx + 2, SL])
  sleeve.push([sx, cap])

  const side: P2[] = []
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * (Math.PI / 2)
    side.push([sh + (cw - sh) * (1 - Math.cos(t)), drop + (ad - drop) * Math.sin(t)])
  }
  side.push([hw, L])

  const hem: P2[] = [
    [hw, L],
    [0, L],
  ]

  const r = (x: number) => Math.round(x)

  const steps: StepGeometry[] = [
    {
      lines: [[[0, -2], [0, L + 2]]],
      closed: false,
      centroid: bodyC,
      marks: [],
      label: `Fold here — ${r(L)} cm along the fold`,
    },
    {
      lines: [],
      closed: false,
      centroid: bodyC,
      marks: [
        {a: [0, -3], b: [nw, -3], label: `Neck ${m.neck} cm`},
        {a: [0, drop + 2], b: [sh, drop + 2], label: `Shoulder ${m.shoulder} cm`},
        {a: [0, ad], b: [cw, ad], label: `Chest ${m.chest} cm`},
        {a: [4, 0], b: [4, L], label: `Length ${m.topLength} cm`},
        {a: [sx + sw / 2, 0], b: [sx + sw / 2, SL], label: `Sleeve ${m.sleeveLength} cm`},
        {a: [sx, cap + 3], b: [sx + sw, cap + 3], label: `Arm ${m.roundSleeve} cm`},
        {a: [0, L - 8], b: [hw, L - 8], label: `Hip ${m.hip} cm`},
      ],
      label: "Check the marks — neck, shoulder, chest, length, sleeve, hip",
    },
    {lines: [neck], closed: false, centroid: bodyC, marks: [], label: `Cut neckline — ${r(polylineLength(neck))} cm curve`},
    {lines: [shoulder], closed: false, centroid: bodyC, marks: [], label: `Cut shoulder — ${r(polylineLength(shoulder))} cm`},
    {lines: [sleeve], closed: true, centroid: sleeveC, marks: [], label: `Cut sleeve — ${r(polylineLength(sleeve))} cm outline`},
    {lines: [side], closed: false, centroid: bodyC, marks: [], label: `Cut side seam — ${r(polylineLength(side))} cm`},
    {lines: [hem], closed: false, centroid: bodyC, marks: [], label: `Cut hem — ${r(polylineLength(hem))} cm straight`},
  ]

  return {widthCm: sx + sw, lengthCm: Math.max(L, SL + 2), steps}
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

/** Fabric-saved estimate vs a standard chalk layout (generous margins + wider chalk line). */
export function fabricSavedEstimate(g: PatternGeometry, chalkMarginCm: number): {savedCm2: number; savedPct: number} {
  const ours = (g.widthCm + 3) * (g.lengthCm + 3)
  const chalk = (g.widthCm + 3 + chalkMarginCm * 2) * (g.lengthCm + 3 + chalkMarginCm * 2)
  const saved = chalk - ours
  return {savedCm2: saved, savedPct: (saved / chalk) * 100}
}
