/**
 * ChalkLessPattern.ts — pure pattern maths shared by every garment style + the Buba recipe.
 * Owns: types (measurements, steps, geometry, StyleRecipe), drafting helpers (arcs, offsets,
 * explicit layout transforms), the fabric-saved estimate, and the Buba recipe (kept exactly: 7 measurements,
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
  /** Lay group the mark belongs to (big styles shown in groups). */
  group?: number
}

export interface StepGeometry {
  id?: string
  lines: P2[][] // polylines for this step
  closed: boolean
  centroid: P2 // the piece the line belongs to (for outward seam allowance)
  marks: Mark[] // measure step only
  label: string // step label text, lengths calculated from measurements ("Cut ..." = cut line)
  /** Lay group (0 = first lay shown); only set for big styles split into groups. */
  group?: number
  /** Recipe coordinates are stitching lines. Prepared geometry stores the actual cut in lines. */
  stitchLines?: P2[][]
  /** Optional allowance per segment, for mixed neck/body/hem outlines. */
  allowances?: number[][]
  /** Separate pieces can share a step, but must retain their own inside reference. */
  lineCentroids?: P2[]
  /** Grain direction in this lay, transformed with the piece instead of guessed from screen size. */
  grainDirection?: P2
  quantity?: number
}

/** One group of pieces shown on the fabric at a time (coords of its steps start at 0,0). */
export interface LayGroup {
  name: string
  widthCm: number
  lengthCm: number
}

export interface PatternGeometry {
  widthCm: number
  lengthCm: number
  steps: StepGeometry[]
  /** True when the layout was turned 90° so the length runs along the fabric width. */
  transposed?: boolean
  /** Big styles: pieces shown one group at a time; each step's coords are local to its group. */
  groups?: LayGroup[]
  fitWarnings?: string[]
  /** True when the whole lay (cloth included) was turned a quarter turn to run along the table. */
  rotatedLay?: boolean
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
  reviewNotes?: string[]
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

export function cutStep(id: string, lines: P2[][], centroid: P2, label: string, closed = false, allowances?: number[][]): StepGeometry {
  let grainDirection: P2 = [0, 1]
  if (["sleeve", "topSleeve", "underSleeve", "collar", "cuff"].indexOf(id) >= 0) grainDirection = [1, 0]
  if (id === "waistband" || id === "tie") {
    const p = lines.flat()
    if (Math.max(...p.map((q) => q[0])) - Math.min(...p.map((q) => q[0])) > Math.max(...p.map((q) => q[1])) - Math.min(...p.map((q) => q[1]))) grainDirection = [1, 0]
  }
  const quantity = ["sleeve", "topSleeve", "underSleeve", "collar", "cuff", "tie", "jacketFront", "trouserFront", "trouserBack", "wrapFront"].indexOf(id) >= 0 || (closed && (id === "front" || id === "back" || id.indexOf("cut") === 0)) ? 2 : 1
  return {id, lines, closed, centroid, marks: [], label, allowances, grainDirection, quantity}
}

/**
 * Finalise a layout: shift its drafting lines into positive coordinates and measure the extent.
 * Preserve grain orientation by default. A transpose requires an explicit caller decision.
 */
export function finishLayout(steps: StepGeometry[], allowTranspose = false): PatternGeometry {
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
    ...st,
    id: st.id,
    lines: st.lines.map((ln) => ln.map(map)),
    closed: st.closed,
    centroid: map(st.centroid),
    lineCentroids: st.lineCentroids?.map(map),
    grainDirection: st.grainDirection && (transpose ? [st.grainDirection[1], st.grainDirection[0]] : st.grainDirection),
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

/**
 * Split a big lay into two groups shown one after the other (e.g. jacket, then trousers).
 * widthCm/lengthCm stay the full lay (pattern size + fabric estimate unchanged); every step's
 * coordinates are moved so its group starts at (0,0), preserving its cloth grain direction.
 * The fold line is clipped to group 0; measure marks go to the group whose pieces contain them.
 */
export function splitLay(g: PatternGeometry, names: [string, string], group1Ids: string[]): PatternGeometry {
  return splitLayGroups(g, names, [[], group1Ids])
}

/** Keep complete pieces together while allowing several fresh-cloth lays. Step ids and order stay fixed. */
export function splitLayGroups(g: PatternGeometry, names: string[], ids: string[][]): PatternGeometry {
  const grp = (st: StepGeometry): number => Math.max(0, ids.findIndex((list) => list.indexOf(st.id || "") >= 0))
  const box = names.map(() => ({x0: Infinity, z0: Infinity, x1: -Infinity, z1: -Infinity}))
  const grow = (k: number, p: P2): void => {
    const b = box[k]
    b.x0 = Math.min(b.x0, p[0])
    b.z0 = Math.min(b.z0, p[1])
    b.x1 = Math.max(b.x1, p[0])
    b.z1 = Math.max(b.z1, p[1])
  }
  for (const st of g.steps) if (st.id !== "fold") for (const l of st.lines) for (const p of l) grow(grp(st), p)
  const inside = (k: number, p: P2): boolean => {
    const b = box[k]
    return p[0] >= b.x0 - 1 && p[0] <= b.x1 + 1 && p[1] >= b.z0 - 1 && p[1] <= b.z1 + 1
  }
  const markGroup = (mk: Mark): number => {
    const mid: P2 = [(mk.a[0] + mk.b[0]) / 2, (mk.a[1] + mk.b[1]) / 2]
    const found = box.findIndex((_, k) => inside(k, mid))
    if (found >= 0) return found
    // Dimension marks often sit just outside a piece. Associate them with the closest lay.
    let best = 0, distance = Infinity
    box.forEach((b, k) => {
      const d = Math.hypot(Math.max(b.x0 - mid[0], 0, mid[0] - b.x1), Math.max(b.z0 - mid[1], 0, mid[1] - b.z1))
      if (d < distance) {best = k; distance = d}
    })
    return best
  }
  // Marks extend their group's box a little (labels sit beside them).
  for (const st of g.steps) for (const mk of st.marks) {
    const k = markGroup(mk)
    grow(k, mk.a)
    grow(k, mk.b)
  }
  // Turn a group only when it is too deep for the table and wider would fit better.
  // Cloth grain and nap decide orientation. A table's dimensions must not rotate a piece silently.
  const turn = box.map(() => false)
  const map = (k: number, p: P2): P2 => {
    const b = box[k]
    const x = p[0] - b.x0
    const z = p[1] - b.z0
    return turn[k] ? [z, x] : [x, z]
  }
  const clip = (k: number, p: P2): P2 => {
    const b = box[k]
    return [Math.min(b.x1 + 2, Math.max(b.x0 - 2, p[0])), Math.min(b.z1 + 2, Math.max(b.z0 - 2, p[1]))]
  }
  const steps: StepGeometry[] = g.steps.map((st) => {
    const k = grp(st)
    return {
      ...st,
      id: st.id,
      lines: st.lines.map((ln) => ln.map((p) => map(k, st.id === "fold" ? clip(k, p) : p))),
      closed: st.closed,
      centroid: map(k, st.centroid),
      lineCentroids: st.lineCentroids?.map((c) => map(k, c)),
      grainDirection: st.grainDirection && (turn[k] ? [st.grainDirection[1], st.grainDirection[0]] : st.grainDirection),
      marks: st.marks.map((mk) => {
        const mg = markGroup(mk)
        return {a: map(mg, mk.a), b: map(mg, mk.b), label: mk.label, group: mg}
      }),
      label: st.label,
      group: k,
    }
  })
  const groups: LayGroup[] = box.map((b, k) => {
    const w = b.x1 - b.x0
    const l = b.z1 - b.z0
    return {name: names[k], widthCm: turn[k] ? l : w, lengthCm: turn[k] ? w : l}
  })
  let previous = 0
  for (const st of steps) if (st.lines.length > 0 && st.id !== "fold") {
    if (st.group !== previous) st.label = st.label.replace(" · ", ` (${names[st.group || 0]} lay) · `)
    previous = st.group || 0
  }
  return {...g, steps, groups}
}

/** Size of the lay actually shown on the fabric at once (largest group, or the whole lay). */
export function shownLaySize(g: PatternGeometry): P2 {
  if (!g.groups || g.groups.length === 0) return [g.widthCm, g.lengthCm]
  let w = 0
  let l = 0
  for (const gr of g.groups) {
    w = Math.max(w, gr.widthCm)
    l = Math.max(l, gr.lengthCm)
  }
  return [w, l]
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

/** Match the sampled cap seam to the actual armhole, instead of assuming a 10 cm cap fits. */
export function matchedSleeve(sx: number, z0: number, sw: number, SL: number, cuffW: number, armholeCm: number): {points: P2[]; warning?: string} {
  const capLength = (cap: number, width = sw): number => polylineLength(sleevePiece(0, 0, width, SL, cuffW, cap).slice(0, 17))
  const maxCap = Math.max(0.1, SL - 1)
  if (sw > armholeCm) return {points: sleevePiece(sx, z0, sw, SL, cuffW, Math.min(10, maxCap)), warning: "Arm circumference and armhole conflict. Adjust measurements with a tailor."}
  let width = sw
  let warning: string | undefined
  if (capLength(maxCap) < armholeCm) {
    let lo = sw
    let hi = armholeCm
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2
      if (capLength(maxCap, mid) < armholeCm) lo = mid
      else hi = mid
    }
    width = (lo + hi) / 2
    warning = "Short sleeve needs extra upper-arm room to match the armhole. Tailor check required."
  }
  let lo = 0
  let hi = maxCap
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    if (capLength(mid, width) < armholeCm) lo = mid
    else hi = mid
  }
  return {points: sleevePiece(sx, z0, width, SL, Math.min(cuffW, width), (lo + hi) / 2), warning}
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
  const backX = bodyW + PIECE_GAP_CM
  const sx = backX + bodyW + PIECE_GAP_CM
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
  const side = easeCurve([sh, drop], [cw, ad])
  const fittedSleeve = matchedSleeve(sx, 0, sw, SL, sw - 4, 2 * polylineLength(side))
  const sleeve = fittedSleeve.points
  side.push([hw, L])
  const hem: P2[] = [
    [hw, L],
    [0, L],
  ]

  const steps: StepGeometry[] = [
    {id: "fold", lines: [[[0, -2], [0, L + 2]]], closed: false, centroid: bodyC, marks: [], label: `Fold here · ${r(L)} cm along the fold`},
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
      label: "Check the marks · neck, shoulder, chest, length, sleeve, hip",
    },
    cutStep("neckline", [neck], bodyC, `Cut neckline · ${r(polylineLength(neck))} cm curve`),
    cutStep("shoulder", [shoulder], bodyC, `Cut shoulder · ${r(polylineLength(shoulder))} cm`),
    cutStep("sleeve", [sleeve], sleeveC, `Cut sleeve · ${r(polylineLength(sleeve))} cm outline`, true),
    cutStep("sideSeam", [side], bodyC, `Cut side seam · ${r(polylineLength(side))} cm`),
    cutStep("hem", [hem], bodyC, `Cut hem · ${r(polylineLength(hem))} cm straight`),
  ]

  // Front and back have separate necklines, and are cut separately on their own folds.
  const move = (line: P2[]): P2[] => line.map((p) => [p[0] + backX, p[1]])
  const backC: P2 = [backX + bodyW / 2, L / 2]
  steps[0].lines.push([[backX, -2], [backX, L + 2]])
  steps[0].label = "Fold each body piece separately; front neck deeper than back"
  steps[2].lines.push(move(arc(0, 0, nw, 2.5, 0, Math.PI / 2, 12)))
  steps[2].label = "Cut front and back necklines separately"
  for (const k of [3, 5, 6]) steps[k].lines.push(move(steps[k].lines[0]))
  for (const k of [2, 3, 5, 6]) steps[k].lineCentroids = [bodyC, backC]
  steps[3].label = "Cut both shoulder seams"
  steps[5].label = "Cut both armholes and side seams"
  steps[6].label = "Cut front and back hems"
  return {widthCm: sx + SL, lengthCm: Math.max(L, sw + 2), steps, fitWarnings: fittedSleeve.warning ? [fittedSleeve.warning] : []}
}

export const BUBA: StyleRecipe = {
  id: "buba",
  name: "Buba",
  buttonName: "BubaButton",
  menuLabel: "Buba",
  measurements: MEASUREMENTS,
  steps: STEPS,
  build: buildPattern,
  piecesText: () => "Pieces cut: 4 (front on its fold, back on its fold, 2 mirrored sleeves)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 1),
}
