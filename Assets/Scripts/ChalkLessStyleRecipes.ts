/**
 * ChalkLessStyleRecipes.ts — the garment style registry: Buba, Kaftan (long / short sleeve),
 * Agbada, Dashiki, Ladies' corset, Wrapper skirt. Each recipe: measurements with defaults/min/max,
 * cut order, buildPattern(measurements) with labels computed from the measurements, pieces text,
 * and a standard-chalk-layout area for the fabric-saved estimate.
 * Drafting conventions: half pattern on the fold, quarter chest/hip + ease, armhole depth ≈ chest/5 + 4,
 * seam allowance 1.5 cm drawn dashed outside each cut. Must not: touch SceneObjects or UI.
 */
import {
  arc,
  BODY_EASE_CM,
  BUBA,
  chalkAreaColumns,
  CHEST_EASE_CM,
  cutStep,
  easeCurve,
  finishLayout,
  Mark,
  MeasurementDef,
  Measurements,
  P2,
  PatternGeometry,
  PIECE_GAP_CM,
  polylineLength,
  r,
  sleevePiece,
  StepGeometry,
  StyleRecipe,
} from "./ChalkLessPattern"
import {GLOBAL_STYLES} from "./ChalkLessGlobalRecipes"

const def = (key: string, label: string, d: number, min: number, max: number): MeasurementDef => ({key, label, defaultCm: d, minCm: min, maxCm: max})
const fold = (len: number, c: P2, label: string): StepGeometry => ({id: "fold", lines: [[[0, -2], [0, len + 2]]], closed: false, centroid: c, marks: [], label})
const measure = (c: P2, marks: Mark[], label: string): StepGeometry => ({id: "measure", lines: [], closed: false, centroid: c, marks, label})
const markStep = (id: string, lines: P2[][], c: P2, label: string): StepGeometry => ({id, lines, closed: false, centroid: c, marks: [], label})
const len = (p: P2[]): number => r(polylineLength(p))

// ───────────────────────────── Kaftan ─────────────────────────────

function kaftanDefs(long: boolean): MeasurementDef[] {
  const d = [
    def("neck", "Neck", 40, 28, 60),
    def("shoulder", "Shoulder", 46, 30, 64),
    def("chest", "Chest", 104, 70, 160),
    def("hip", "Hip", 108, 70, 160),
    def("fullLength", "Full length (to ankle)", 140, 100, 165),
    long ? def("sleeveLength", "Sleeve length (to wrist)", 58, 40, 75) : def("sleeveLength", "Sleeve length (short)", 25, 12, 40),
    def("roundSleeve", "Round sleeve (arm)", 36, 22, 56),
  ]
  if (long) d.push(def("wrist", "Wrist (cuff)", 28, 16, 40))
  d.push(def("slit", "Side slit", 30, 10, 50))
  d.push(def("placket", "Neck placket", 22, 10, 35))
  return d
}

function buildKaftan(m: Measurements, long: boolean): PatternGeometry {
  const nw = m.neck / 6
  const nd = m.neck / 6 + 2
  const sh = m.shoulder / 2
  const drop = 4
  const ad = m.chest / 5 + 4
  const cw = m.chest / 4 + CHEST_EASE_CM
  const hw = m.hip / 4 + BODY_EASE_CM
  const L = m.fullLength
  const hemW = hw + 4 // a little walking room at the ankle
  const hipZ = Math.min(L - 20, ad + 30)
  const bodyW = Math.max(cw, hemW)
  const sx = bodyW + PIECE_GAP_CM
  const sw = m.roundSleeve + 6
  const SL = m.sleeveLength
  const cuff = Math.min(sw, long ? m.wrist + 4 : sw - 4)
  const bodyC: P2 = [bodyW / 2, L / 2]
  const sleeveC: P2 = [sx + SL / 2, sw / 2]

  const neck = arc(0, 0, nw, nd, 0, Math.PI / 2, 12)
  const placket: P2[] = [
    [0, nd],
    [0, nd + m.placket],
  ]
  const shoulder: P2[] = [
    [nw, 0],
    [sh, drop],
  ]
  const sleeve = sleevePiece(sx, 0, sw, SL, cuff)
  const side = easeCurve([sh, drop], [cw, ad])
  side.push([hw, hipZ])
  side.push([hemW, L])
  const hem: P2[] = [
    [hemW, L],
    [0, L],
  ]
  const marks: Mark[] = [
    {a: [0, -3], b: [nw, -3], label: `Neck ${m.neck} cm`},
    {a: [0, drop + 2], b: [sh, drop + 2], label: `Shoulder ${m.shoulder} cm`},
    {a: [0, ad], b: [cw, ad], label: `Chest ${m.chest} cm`},
    {a: [0, hipZ], b: [hw, hipZ], label: `Hip ${m.hip} cm`},
    {a: [4, 0], b: [4, L], label: `Length ${m.fullLength} cm`},
    {a: [2, nd], b: [2, nd + m.placket], label: `Placket ${m.placket} cm`},
    {a: [hemW + 2, L - m.slit], b: [hemW + 2, L], label: `Slit ${m.slit} cm`},
    {a: [sx, sw / 2], b: [sx + SL, sw / 2], label: `Sleeve ${m.sleeveLength} cm`},
    {a: [sx + 13, 0], b: [sx + 13, sw], label: `Arm ${m.roundSleeve} cm`},
  ]
  if (long) marks.push({a: [sx + SL - 3, (sw - cuff) / 2], b: [sx + SL - 3, (sw + cuff) / 2], label: `Wrist ${m.wrist} cm`})
  const steps: StepGeometry[] = [
    fold(L, bodyC, `Fold here — ${r(L)} cm along the fold`),
    measure(bodyC, marks, "Check the marks — neck, chest, hip, length, placket, slit, sleeve"),
    cutStep("neckline", [neck], bodyC, `Cut neckline — ${len(neck)} cm curve`),
    cutStep("placket", [placket], bodyC, `Cut neck placket — ${r(m.placket)} cm slit down the fold`),
    cutStep("shoulder", [shoulder], bodyC, `Cut shoulder — ${len(shoulder)} cm`),
    cutStep("sleeve", [sleeve], sleeveC, `Cut ${long ? "long" : "short"} sleeve — ${len(sleeve)} cm outline`, true),
    cutStep("sideSeam", [side], bodyC, `Cut side seam — ${len(side)} cm, slit open last ${r(m.slit)} cm`),
    cutStep("hem", [hem], bodyC, `Cut hem — ${len(hem)} cm at the ankle`),
  ]
  return finishLayout(steps)
}

function kaftan(long: boolean): StyleRecipe {
  return {
    id: long ? "kaftanLong" : "kaftanShort",
    name: long ? "Kaftan (long sleeve)" : "Kaftan (short sleeve)",
    buttonName: long ? "KaftanLongButton" : "KaftanShortButton",
    menuLabel: long ? "Kaftan long sleeve" : "Kaftan short sleeve",
    measurements: kaftanDefs(long),
    steps: [
      {id: "fold", title: "Fold", kind: "fold"},
      {id: "measure", title: "Measure", kind: "measure"},
      {id: "neckline", title: "Neckline", kind: "cut"},
      {id: "placket", title: "Neck placket", kind: "cut"},
      {id: "shoulder", title: "Shoulder", kind: "cut"},
      {id: "sleeve", title: "Sleeve", kind: "cut"},
      {id: "sideSeam", title: "Side seam + slit", kind: "cut"},
      {id: "hem", title: "Hem", kind: "cut"},
    ],
    build: (m) => buildKaftan(m, long),
    piecesText: () => `Pieces cut: 4 — front + back on the fold + 2 ${long ? "long" : "short"} sleeves`,
    chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 2),
  }
}

// ───────────────────────────── Agbada ─────────────────────────────

function buildAgbada(m: Measurements): PatternGeometry {
  const W = m.shoulder / 2 + m.shoulderToWrist // half of the arm span, from the fold
  const nw = m.neck / 6 + 1
  const nd = m.neckDepth
  const drop = 3
  const so = m.sleeveOpening
  const L = m.fullLength
  const sh = m.shoulder / 2
  const c: P2 = [W / 2, L / 2]
  const ew = m.neck / 2 + 6 // embroidery panel half width
  const eh = nd + 22
  const neck: P2[] = [
    [nw, 0],
    [0, nd],
  ]
  const panel: P2[] = [
    [ew, 0.5],
    [ew, eh],
    [0, eh],
  ]
  const shoulder: P2[] = [
    [nw, 0],
    [W, drop],
  ]
  const opening: P2[] = [
    [W, drop],
    [W, drop + so],
  ]
  const side: P2[] = [
    [W, drop + so],
    [W - 3, L],
  ]
  const hem: P2[] = [
    [W - 3, L],
    [0, L],
  ]
  const ad = m.chest / 5 + 4
  const steps: StepGeometry[] = [
    fold(L, c, `Fold here — ${r(L)} cm along the fold`),
    measure(
      c,
      [
        {a: [0, -3], b: [nw, -3], label: `Neck ${m.neck} cm`},
        {a: [2, 0], b: [2, nd], label: `V depth ${m.neckDepth} cm`},
        {a: [0, ad], b: [m.chest / 4 + CHEST_EASE_CM, ad], label: `Chest ${m.chest} cm`},
        {a: [sh, 10], b: [W, 10], label: `Shoulder to wrist ${m.shoulderToWrist} cm`},
        {a: [W - 5, drop], b: [W - 5, drop + so], label: `Opening ${m.sleeveOpening} cm`},
        {a: [ew + 4, 0], b: [ew + 4, L], label: `Length ${m.fullLength} cm`},
      ],
      "Check the marks — neck, chest, arm span, opening, length",
    ),
    cutStep("neckline", [neck], c, `Cut V neck — ${len(neck)} cm each side of the fold`),
    markStep("embroidery", [panel], c, `Mark embroidery panel — ${r(ew * 2)} × ${r(eh)} cm`),
    cutStep("shoulder", [shoulder], c, `Cut shoulder line — ${len(shoulder)} cm out to the wrist`),
    cutStep("sleeveOpening", [opening], c, `Cut sleeve opening — ${r(so)} cm, leave it open`),
    cutStep("sideSeam", [side], c, `Cut side seam — ${len(side)} cm`),
    cutStep("hem", [hem], c, `Cut hem — ${len(hem)} cm at the ankle`),
  ]
  return finishLayout(steps)
}

const AGBADA: StyleRecipe = {
  id: "agbada",
  name: "Agbada",
  buttonName: "AgbadaButton",
  menuLabel: "Agbada",
  measurements: [
    def("neck", "Neck", 42, 30, 60),
    def("shoulder", "Shoulder", 48, 34, 64),
    def("shoulderToWrist", "Shoulder to wrist", 72, 50, 90),
    def("chest", "Chest", 108, 80, 160),
    def("fullLength", "Full length (to ankle)", 145, 110, 165),
    def("sleeveOpening", "Sleeve opening", 40, 25, 60),
    def("neckDepth", "V neck depth", 18, 8, 30),
  ],
  steps: [
    {id: "fold", title: "Fold", kind: "fold"},
    {id: "measure", title: "Measure", kind: "measure"},
    {id: "neckline", title: "Neckline", kind: "cut"},
    {id: "embroidery", title: "Embroidery panel", kind: "mark"},
    {id: "shoulder", title: "Shoulder line", kind: "cut"},
    {id: "sleeveOpening", title: "Sleeve opening", kind: "cut"},
    {id: "sideSeam", title: "Side seam", kind: "cut"},
    {id: "hem", title: "Hem", kind: "cut"},
  ],
  build: buildAgbada,
  piecesText: () => "Pieces cut: 2 — front + back, each one wide piece on the fold",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 1),
}

// ───────────────────────────── Dashiki ─────────────────────────────

function buildDashiki(m: Measurements): PatternGeometry {
  const nw = m.neck / 6
  const nd = m.neck / 5 + 4 // V neck
  const sh = m.shoulder / 2
  const drop = 4
  const ad = m.chest / 5 + 4
  const cw = m.chest / 4 + CHEST_EASE_CM
  const hw = m.hip / 4 + BODY_EASE_CM
  const L = m.topLength
  const hemW = Math.max(cw, hw) + 6 // A-line
  const SL = m.sleeveLength
  const ex = Math.max(sh + SL, cw + 2)
  const zt = drop + (ex - sh) * 0.2
  const so = m.roundSleeve / 2 + 3
  const c: P2 = [hemW / 2, L / 2]
  const yd = nd + 8
  const yx = sh - 4
  const neck: P2[] = [
    [nw, 0],
    [0, nd],
  ]
  const yoke: P2[] = [
    [0, yd],
    [yx, yd],
    [yx, (drop * (yx - nw)) / (sh - nw)],
  ]
  const top: P2[] = [
    [nw, 0],
    [sh, drop],
    [ex, zt],
  ]
  const end: P2[] = [
    [ex, zt],
    [ex, zt + so],
  ]
  const under: P2[] = []
  const p0: P2 = [ex, zt + so]
  const p2: P2 = [cw, ad + 4]
  const p1: P2 = [cw, zt + so]
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    const a = (1 - t) * (1 - t)
    const b = 2 * (1 - t) * t
    under.push([a * p0[0] + b * p1[0] + t * t * p2[0], a * p0[1] + b * p1[1] + t * t * p2[1]])
  }
  under.push([hemW, L])
  const hem: P2[] = [
    [hemW, L],
    [0, L],
  ]
  const steps: StepGeometry[] = [
    fold(L, c, `Fold here — ${r(L)} cm along the fold`),
    measure(
      c,
      [
        {a: [0, -3], b: [nw, -3], label: `Neck ${m.neck} cm`},
        {a: [0, drop + 2], b: [sh, drop + 2], label: `Shoulder ${m.shoulder} cm`},
        {a: [sh, zt - 3], b: [ex, zt - 3], label: `Sleeve ${m.sleeveLength} cm`},
        {a: [ex - 3, zt], b: [ex - 3, zt + so], label: `Arm ${m.roundSleeve} cm`},
        {a: [0, ad + 6], b: [cw, ad + 6], label: `Chest ${m.chest} cm`},
        {a: [0, L - 8], b: [hw, L - 8], label: `Hip ${m.hip} cm`},
        {a: [4, yd], b: [4, L], label: `Length ${m.topLength} cm`},
      ],
      "Check the marks — neck, shoulder, sleeve, chest, hip, length",
    ),
    cutStep("neckline", [neck], c, `Cut V neck — ${len(neck)} cm each side`),
    markStep("yoke", [yoke], c, `Mark yoke panel — ${r(yx * 2)} × ${r(yd)} cm`),
    cutStep("shoulderSleeve", [top], c, `Cut shoulder + sleeve top — ${len(top)} cm`),
    cutStep("sleeveEnd", [end], c, `Cut sleeve end — ${len(end)} cm`),
    cutStep("sideSeam", [under], c, `Cut underarm + A-line side — ${len(under)} cm`),
    cutStep("hem", [hem], c, `Cut hem — ${len(hem)} cm straight`),
  ]
  return finishLayout(steps)
}

const DASHIKI: StyleRecipe = {
  id: "dashiki",
  name: "Dashiki",
  buttonName: "DashikiButton",
  menuLabel: "Dashiki",
  measurements: [
    def("neck", "Neck", 40, 28, 60),
    def("shoulder", "Shoulder", 46, 30, 64),
    def("chest", "Chest", 104, 70, 160),
    def("topLength", "Top length", 74, 55, 90),
    def("sleeveLength", "Sleeve length (kimono)", 22, 10, 35),
    def("roundSleeve", "Round sleeve (arm)", 40, 28, 56),
    def("hip", "Hip", 104, 70, 160),
  ],
  steps: [
    {id: "fold", title: "Fold", kind: "fold"},
    {id: "measure", title: "Measure", kind: "measure"},
    {id: "neckline", title: "Neckline", kind: "cut"},
    {id: "yoke", title: "Yoke panel", kind: "mark"},
    {id: "shoulderSleeve", title: "Shoulder + sleeve", kind: "cut"},
    {id: "sleeveEnd", title: "Sleeve end", kind: "cut"},
    {id: "sideSeam", title: "Underarm + side seam", kind: "cut"},
    {id: "hem", title: "Hem", kind: "cut"},
  ],
  build: buildDashiki,
  piecesText: () => "Pieces cut: 2 — front + back on the fold (kimono sleeves cut on)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 1),
}

// ───────────────────────────── Ladies' corset ─────────────────────────────

const CORSET_PANELS = [
  {id: "cutCF", title: "Centre front (CF)", abbr: "CF", share: 0.15, bust: 0},
  {id: "cutSideFront", title: "Side front", abbr: "SF", share: 0.19, bust: 0.22},
  {id: "cutSide", title: "Side", abbr: "S", share: 0.17, bust: 0.2},
  {id: "cutSideBack", title: "Side back", abbr: "SB", share: 0.17, bust: 0.2},
  {id: "cutBack", title: "Back", abbr: "B", share: 0.17, bust: 0.2},
  {id: "cutCB", title: "Centre back (CB)", abbr: "CB", share: 0.15, bust: 0.18},
]

function buildCorset(m: Measurements): PatternGeometry {
  const hb = m.bust / 2
  const hwst = m.waist / 2 - 2 // 2 cm negative ease per half for shaping
  const hh = m.hip / 2
  const BL = m.bodiceLength
  const H = BL + m.waistToHip
  const gap = 5
  const steps: StepGeometry[] = []
  const grains: Mark[] = []
  let x = 0
  const cuts: StepGeometry[] = []
  CORSET_PANELS.forEach((p, i) => {
    const bw = i === 0 ? m.bustPoint / 2 : (hb - m.bustPoint / 2) * p.bust
    const ww = hwst * p.share
    const pw = hh * p.share
    const mw = Math.max(bw, ww, pw)
    let pts: P2[]
    let c: P2
    let gx: number
    if (i === 0) {
      pts = [
        [0, 0],
        [bw, 0],
        [ww, BL],
        [pw, H],
        [0, H],
      ]
      c = [mw / 2, H / 2]
      gx = mw / 2
    } else {
      const cx = x + mw / 2
      pts = [
        [cx - bw / 2, 0],
        [cx + bw / 2, 0],
        [cx + ww / 2, BL],
        [cx + pw / 2, H],
        [cx - pw / 2, H],
        [cx - ww / 2, BL],
        [cx - bw / 2, 0],
      ]
      c = [cx, H / 2]
      gx = cx
    }
    grains.push({a: [gx, 5], b: [gx, H - 5], label: p.abbr})
    cuts.push(
      cutStep(p.id, [pts], c, `Cut panel ${i + 1}/6 ${p.abbr} — ${len(pts)} cm`, i > 0),
    )
    x += mw + gap
  })
  const ext = x - gap
  const c: P2 = [ext / 2, H / 2]
  steps.push(fold(H, [ext / 2, H / 2], `Fold for the CF panel — ${r(H)} cm`))
  steps.push(
    measure(
      c,
      [
        {a: [0, -4], b: [ext, -4], label: `Bust ${m.bust} cm (half shown)`},
        {a: [0, BL - 3], b: [ext, BL - 3], label: `Waist ${m.waist} cm`},
        {a: [0, H + 2], b: [ext, H + 2], label: `Hip ${m.hip} cm`},
        {a: [0, 2], b: [m.bustPoint / 2, 2], label: `BP ${m.bustPoint} cm`},
        {a: [ext + 3, 0], b: [ext + 3, BL], label: `BL ${m.bodiceLength}`},
        {a: [ext + 3, BL], b: [ext + 3, H], label: `W–H ${m.waistToHip}`},
        ...grains,
      ],
      "Check the marks — bust, waist, hip and the grainline on every panel",
    ),
  )
  for (const s of cuts) steps.push(s)
  return finishLayout(steps)
}

const CORSET: StyleRecipe = {
  id: "corset",
  name: "Ladies' corset",
  buttonName: "CorsetButton",
  menuLabel: "Ladies' corset",
  measurements: [
    def("bust", "Bust", 88, 70, 130),
    def("waist", "Waist", 70, 50, 110),
    def("hip", "Hip", 96, 70, 140),
    def("bustPoint", "Bust point (apex to apex)", 18, 14, 26),
    def("waistToHip", "Waist to hip", 18, 10, 25),
    def("bodiceLength", "Bodice length", 28, 20, 40),
  ],
  steps: [
    {id: "fold", title: "Fold", kind: "fold"},
    {id: "measure", title: "Measure + grainlines", kind: "measure"},
    ...CORSET_PANELS.map((p) => ({id: p.id, title: p.title, kind: "cut" as const})),
  ],
  build: buildCorset,
  piecesText: () => "Pieces cut: 11 — CF on the fold + 2 each of side front, side, side back, back, CB",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 6),
}

// ───────────────────────────── Wrapper skirt ─────────────────────────────

function buildWrapper(m: Measurements): PatternGeometry {
  const hwid = m.hip * 0.75 // half of hip × 1.5 wrap, on the fold
  const L = m.skirtLength
  const wbL = m.waist * 0.75 + 2 // half waistband (waist × 1.5 wrap) + overlap
  const wbH = m.waistband * 2
  const z0 = L + 6
  const sc: P2 = [hwid / 2, L / 2]
  const bc: P2 = [wbL / 2, z0 + wbH / 2]
  const band: P2[] = [
    [0, z0],
    [wbL, z0],
    [wbL, z0 + wbH],
    [0, z0 + wbH],
  ]
  const sides: P2[] = [
    [0, 0],
    [hwid, 0],
    [hwid, L],
  ]
  const hem: P2[] = [
    [hwid, L],
    [0, L],
  ]
  const steps: StepGeometry[] = [
    {id: "fold", lines: [[[0, -2], [0, z0 + wbH + 2]]], closed: false, centroid: sc, marks: [], label: `Fold here — ${r(z0 + wbH)} cm along the fold`},
    measure(
      sc,
      [
        {a: [0, 8], b: [hwid, 8], label: `Hip ${m.hip} × 1.5 wrap = ${r(m.hip * 1.5)} cm`},
        {a: [4, 0], b: [4, L], label: `Length ${m.skirtLength} cm`},
        {a: [0, z0 + wbH / 2], b: [wbL - 6, z0 + wbH / 2], label: `Waist ${m.waist} cm`},
        {a: [wbL - 3, z0], b: [wbL - 3, z0 + wbH], label: `Band ${m.waistband} cm`},
      ],
      "Check the marks — hip wrap, length, waist, band",
    ),
    cutStep("waistband", [band], bc, `Cut waistband — ${r(wbL * 2)} × ${r(wbH)} cm on the fold`),
    cutStep("sideEdges", [sides], sc, `Cut waist edge + side edge — ${len(sides)} cm`),
    cutStep("hem", [hem], sc, `Cut hem — ${len(hem)} cm straight`),
  ]
  return finishLayout(steps)
}

const WRAPPER: StyleRecipe = {
  id: "wrapper",
  name: "Wrapper skirt",
  buttonName: "WrapperButton",
  menuLabel: "Wrapper skirt",
  measurements: [
    def("waist", "Waist", 72, 50, 120),
    def("hip", "Hip", 100, 70, 150),
    def("skirtLength", "Skirt length", 100, 50, 120),
    def("waistband", "Waistband width", 5, 3, 10),
  ],
  steps: [
    {id: "fold", title: "Fold", kind: "fold"},
    {id: "measure", title: "Measure", kind: "measure"},
    {id: "waistband", title: "Waistband", kind: "cut"},
    {id: "sideEdges", title: "Waist + side edges", kind: "cut"},
    {id: "hem", title: "Hem", kind: "cut"},
  ],
  build: buildWrapper,
  piecesText: () => "Pieces cut: 2 — wrapper on the fold + waistband",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 1),
}

/** Menu page 1 (original styles, order and button names unchanged). */
export const PAGE1_STYLES: StyleRecipe[] = [BUBA, kaftan(true), kaftan(false), AGBADA, DASHIKI, CORSET, WRAPPER]
/** Menu page 2: global styles (ChalkLessGlobalRecipes). */
export const PAGE2_STYLES: StyleRecipe[] = GLOBAL_STYLES
/** Every style, menu order. */
export const STYLES: StyleRecipe[] = [...PAGE1_STYLES, ...PAGE2_STYLES]

export function findStyle(id: string): StyleRecipe | undefined {
  for (const s of STYLES) if (s.id === id) return s
  return undefined
}
