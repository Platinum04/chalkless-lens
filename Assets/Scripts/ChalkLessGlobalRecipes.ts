/**
 * ChalkLessGlobalRecipes.ts — global garment recipes: Suit, Blazer, Joggers, Palazzo, Bubu and
 * ladies' dresses (A-line, sheath, wrap, maxi gown). Same StyleRecipe contract as
 * ChalkLessStyleRecipes: measurements (default/min/max cm), cut order, build(m) with labels computed
 * from the measurements, pieces text and a chalk-layout area for the fabric-saved estimate.
 * Drafting: half pattern on the fold where symmetric, quarter chest/waist/hip + ease, armhole depth
 * ≈ chest/5 + 4. Multi-piece garments lay pieces side by side (fabric stand-in grows if needed).
 * Function first — shapes are standard blocks, not final styling. Must not: touch SceneObjects or UI.
 */
import {
  arc,
  chalkAreaColumns,
  cutStep,
  easeCurve,
  finishLayout,
  splitLay,
  Mark,
  MeasurementDef,
  Measurements,
  P2,
  PatternGeometry,
  PIECE_GAP_CM,
  polylineLength,
  r,
  sleevePiece,
  SEAM_CM,
  NECK_SEAM_CM,
  HEM_SEAM_CM,
  StepDef,
  StepGeometry,
  StyleRecipe,
} from "./ChalkLessPattern"

const def = (key: string, label: string, d: number, min: number, max: number): MeasurementDef => ({key, label, defaultCm: d, minCm: min, maxCm: max})
const fold = (l: number, c: P2, label: string): StepGeometry => ({id: "fold", lines: [[[0, -2], [0, l + 2]]], closed: false, centroid: c, marks: [], label})
const measure = (c: P2, marks: Mark[], label: string): StepGeometry => ({id: "measure", lines: [], closed: false, centroid: c, marks, label})
const markStep = (id: string, lines: P2[][], c: P2, label: string): StepGeometry => ({id, lines, closed: false, centroid: c, marks: [], label})
const len = (p: P2[]): number => r(polylineLength(p))
const step = (id: string, title: string, kind: StepDef["kind"] = "cut"): StepDef => ({id, title, kind})
const FOLD_MEASURE: StepDef[] = [step("fold", "Fold", "fold"), step("measure", "Measure", "measure")]
const G = PIECE_GAP_CM
const mv = (pts: P2[], dx: number, dz: number): P2[] => pts.map((p) => [p[0] + dx, p[1] + dz] as P2)
const rect = (x: number, z: number, w: number, h: number): P2[] => [
  [x, z],
  [x + w, z],
  [x + w, z + h],
  [x, z + h],
  [x, z],
]

/** A mixed body outline can include a neck, normal seams and a hem in one cut step. */
function bodyAllowances(points: P2[], neckEdges: number[] = []): number[] {
  const bottom = Math.max(...points.map((p) => p[1]))
  return points.slice(1).map((p, k) => neckEdges.indexOf(k) >= 0 ? NECK_SEAM_CM : Math.abs(p[1] - bottom) < 1e-6 && Math.abs(points[k][1] - bottom) < 1e-6 ? HEM_SEAM_CM : SEAM_CM)
}

// ───────────────────────────── Jacket block (Suit + Blazer) ─────────────────────────────

interface JacketParts {
  back: P2[]
  front: P2[]
  backC: P2
  frontC: P2
  frontX: number
  frontRight: number
  ad: number
  cw: number
  wz: number
}

/** Back on the fold (x = 0) + front with button extension and notch lapel beside it. */
function jacketBlock(m: Measurements): JacketParts {
  const nw = m.neck / 6
  const nd = m.neck / 6 + 4
  const sh = m.shoulder / 2
  const drop = 4
  const ad = m.chest / 5 + 5
  const cw = m.chest / 4 + 4 // tailored ease
  const L = m.jacketLength
  const ww = Math.max(m.waist / 4 + 3, cw - 6)
  const wz = Math.min(L - 12, ad + 18)
  const back: P2[] = arc(0, 0, nw, 2.5, 0, Math.PI / 2, 8).reverse()
  back.push([sh, drop])
  for (const p of easeCurve([sh, drop], [cw, ad]).slice(1)) back.push(p)
  back.push([ww, wz], [cw, L], [0, L])
  const fx = cw + G + 3
  const bz = wz - 4 // lapel break (top button)
  const fl: P2[] = [
    [-3, L],
    [-3, bz],
    [nw + 5, nd + 2],
    [nw + 2, nd],
    [nw, 0],
    [sh, drop],
  ]
  for (const p of easeCurve([sh, drop], [cw, ad]).slice(1)) fl.push(p)
  fl.push([ww, wz], [cw + 1, L], [-3, L])
  return {back, front: mv(fl, fx, 0), backC: [cw / 2, L / 2], frontC: [fx + cw / 2, L / 2], frontX: fx, frontRight: fx + cw + 1, ad, cw, wz}
}

const jacketDefs = (): MeasurementDef[] => [
  def("neck", "Neck", 40, 30, 54),
  def("shoulder", "Shoulder", 46, 34, 60),
  def("chest", "Chest", 100, 76, 140),
  def("waist", "Waist", 88, 60, 130),
  def("jacketLength", "Jacket length", 75, 60, 90),
  def("sleeveLength", "Sleeve length", 62, 50, 72),
  def("roundSleeve", "Round sleeve (arm)", 36, 24, 50),
]

function jacketMarks(m: Measurements, j: JacketParts, sx: number, sw: number): Mark[] {
  return [
    {a: [0, -3], b: [m.neck / 6, -3], label: `Neck ${m.neck} cm`},
    {a: [0, 6], b: [m.shoulder / 2, 6], label: `Shoulder ${m.shoulder} cm`},
    {a: [0, j.ad], b: [j.cw, j.ad], label: `Chest ${m.chest} cm`},
    {a: [0, j.wz], b: [Math.max(m.waist / 4 + 3, j.cw - 6), j.wz], label: `Waist ${m.waist} cm`},
    {a: [4, 0], b: [4, m.jacketLength], label: `Length ${m.jacketLength} cm`},
    {a: [sx, sw / 2], b: [sx + m.sleeveLength, sw / 2], label: `Sleeve ${m.sleeveLength} cm`},
  ]
}

// ───────────────────────────── Trouser block (Suit, Joggers, Palazzo) ─────────────────────────────

interface Trouser {
  front: P2[]
  back: P2[]
  frontC: P2
  backC: P2
  right: number
  waistCm: number
}

/** Front + back legs side by side from x0, top at z0. legHem = full leg hem circumference. */
function trouserBlock(x0: number, z0: number, waist: number, hip: number, rise: number, L: number, legHem: number, ease: number, pullOn = false): Trouser {
  const leg = (hq: number, wq: number, ext: number, hem: number, top: number): {pts: P2[]; c: P2; w: number} => {
    const xc = (hq + ext) / 2
    const pts: P2[] = [[hq - wq, top], [hq, 0], [hq, rise - 6]]
    for (const p of easeCurve([hq, rise - 6], [hq + ext, rise], 6).slice(1)) pts.push(p)
    pts.push([xc + hem / 2, L], [xc - hem / 2, L], [Math.min(0, xc - hem / 2), rise * 0.7], [hq - wq, top])
    const minX = Math.min(0, xc - hem / 2)
    return {pts: mv(pts, -minX, 0), c: [xc - minX, L / 2], w: Math.max(hq + ext, xc + hem / 2) - minX}
  }
  // A closed waist has 2 cm wearing ease. A pull-on opening must also clear the hips.
  const waistCm = pullOn ? Math.max(waist + 2, hip + 4) : waist + 2
  const q = waistCm / 4
  const f = leg(hip / 4 + ease, q, hip / 16, legHem / 2 - 1, 0)
  // The back waist rises 2 cm: account for that diagonal when matching its seam length.
  const b = leg(hip / 4 + ease + 2, Math.sqrt(q * q - 4), hip / 10, legHem / 2 + 1, -2)
  const bx = x0 + f.w + G
  return {
    front: mv(f.pts, x0, z0),
    back: mv(b.pts, bx, z0),
    frontC: [f.c[0] + x0, f.c[1] + z0],
    backC: [b.c[0] + bx, b.c[1] + z0],
    right: bx + b.w,
    waistCm,
  }
}

const trouserDefs = (waist: number, hip: number, rise: number, L: number, hem: number, hemLabel: string, hemMin: number, hemMax: number): MeasurementDef[] => [
  def("waist", "Waist", waist, 56, 130),
  def("hip", "Hip", hip, 76, 150),
  def("crotchDepth", "Crotch depth (rise)", rise, 20, 36),
  def("trouserLength", "Trouser length (outseam)", L, 70, 115),
  def("hemWidth", hemLabel, hem, hemMin, hemMax),
]

function trouserMarks(m: Measurements, t: Trouser, x0: number, z0: number, hemLabel: string): Mark[] {
  return [
    {a: [x0, z0 + 3], b: [x0 + t.waistCm / 4, z0 + 3], label: `Waist ${m.waist}; seam ${r(t.waistCm)} cm`},
    {a: [x0, z0 + m.crotchDepth * 0.7], b: [x0 + m.hip / 4, z0 + m.crotchDepth * 0.7], label: `Hip ${m.hip} cm`},
    {a: [t.right + 2, z0], b: [t.right + 2, z0 + m.crotchDepth], label: `Rise ${m.crotchDepth} cm`},
    {a: [x0 + 3, z0 + m.crotchDepth], b: [x0 + 3, z0 + m.trouserLength], label: `Length ${m.trouserLength} cm`},
    {a: [t.frontC[0] - 6, z0 + m.trouserLength - 4], b: [t.frontC[0] + 6, z0 + m.trouserLength - 4], label: `${hemLabel} ${m.hemWidth} cm`},
  ]
}

// ───────────────────────────── Suit ─────────────────────────────

function buildSuit(m: Measurements): PatternGeometry {
  const j = jacketBlock(m)
  const L = m.jacketLength
  const sx = j.frontRight + G
  const sw = m.roundSleeve + 8
  const sleeve = sleevePiece(sx, 0, sw, m.sleeveLength, sw * 0.72)
  const cl = m.neck / 2 + 6
  const collar = rect(sx, sw + G, cl, 9)
  const tz = L + G
  const t = trouserBlock(0, tz, m.waist, m.hip, m.crotchDepth, m.trouserLength, m.hemWidth, 2)
  const bandLength = t.waistCm + 3 // 3 cm closure overlap; cutting allowances are added separately.
  const band = rect(t.right + G, tz, 8, bandLength)
  const c: P2 = [sx / 2, (tz + m.trouserLength) / 2]
  const steps: StepGeometry[] = [
    fold(L, j.backC, `Fold here · back on the fold, ${r(L)} cm`),
    measure(c, [...jacketMarks(m, j, sx, sw), ...trouserMarks(m, t, 0, tz, "Leg hem"), {a: [t.right + G, tz + t.waistCm], b: [t.right + G + 8, tz + t.waistCm], label: "Band closure: 3 cm overlap", group: 1}], "Check the jacket marks · neck, shoulder, chest, waist, length, sleeve"),
    cutStep("jacketFront", [j.front], j.frontC, `Cut jacket front + lapel · ${len(j.front)} cm outline`, true, [bodyAllowances(j.front, [3])]),
    cutStep("jacketBack", [j.back], j.backC, `Cut jacket back on the fold · ${len(j.back)} cm`, false, [bodyAllowances(j.back, [0,1,2,3,4,5,6,7])]),
    cutStep("sleeve", [sleeve], [sx + m.sleeveLength / 2, sw / 2], `Cut sleeve · ${len(sleeve)} cm outline`, true),
    cutStep("collar", [collar], [sx + cl / 2, sw + G + 4.5], `Cut collar · ${r(cl)} × 9 cm`, true),
    cutStep("trouserFront", [t.front], t.frontC, `Cut trouser front · ${len(t.front)} cm outline`, true, [bodyAllowances(t.front)]),
    cutStep("trouserBack", [t.back], t.backC, `Cut trouser back · ${len(t.back)} cm outline`, true, [bodyAllowances(t.back)]),
    cutStep("waistband", [band], [t.right + G + 4, tz + bandLength / 2], `Cut waistband · ${r(bandLength)} × 8 cm; 3 cm overlap`, true),
  ]
  // 197 × 146 cm in one lay is bigger than the table: show the jacket lay, then the trouser lay.
  return splitLay(finishLayout(steps), ["Jacket", "Trousers"], ["trouserFront", "trouserBack", "waistband"])
}

const SUIT: StyleRecipe = {
  id: "suit",
  name: "Suit",
  buttonName: "SuitButton",
  menuLabel: "Suit",
  reviewNotes: ["Prototype: collar/facing, sleeve balance and trouser closure need tailor approval."],
  // Jacket and trousers share the waist: ask for it once (jacket's waist), not twice.
  measurements: [...jacketDefs(), ...trouserDefs(84, 100, 27, 104, 42, "Leg hem (round)", 32, 60).filter((d) => d.key !== "waist")],
  steps: [
    ...FOLD_MEASURE,
    step("jacketFront", "Jacket front + lapel"),
    step("jacketBack", "Jacket back"),
    step("sleeve", "Sleeve"),
    step("collar", "Collar"),
    step("trouserFront", "Trouser front"),
    step("trouserBack", "Trouser back"),
    step("waistband", "Waistband"),
  ],
  build: buildSuit,
  piecesText: () => "Pieces cut: 12 (jacket: 2 fronts, back on the fold, 2 sleeves, 2 collars; trousers: 2 fronts, 2 backs, waistband)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 4),
}

// ───────────────────────────── Blazer ─────────────────────────────

function buildBlazer(m: Measurements): PatternGeometry {
  const j = jacketBlock(m)
  const L = m.jacketLength
  const sx = j.frontRight + G
  const sw = m.roundSleeve + 8
  const tw = sw * 0.6 + 2
  const uw = sw * 0.4 + 2
  const top = sleevePiece(sx, 0, tw, m.sleeveLength, tw * 0.75)
  const under = sleevePiece(sx, tw + G, uw, m.sleeveLength, uw * 0.75, 5)
  const c: P2 = [sx / 2, L / 2]
  const steps: StepGeometry[] = [
    fold(L, j.backC, `Fold here · back on the fold, ${r(L)} cm`),
    measure(c, jacketMarks(m, j, sx, tw), "Check the marks · neck, shoulder, chest, waist, length, sleeve"),
    cutStep("front", [j.front], j.frontC, `Cut front + lapel · ${len(j.front)} cm outline`, true, [bodyAllowances(j.front, [3])]),
    cutStep("back", [j.back], j.backC, `Cut back on the fold · ${len(j.back)} cm`, false, [bodyAllowances(j.back, [0,1,2,3,4,5,6,7])]),
    cutStep("topSleeve", [top], [sx + m.sleeveLength / 2, tw / 2], `Cut top sleeve · ${len(top)} cm outline`, true),
    cutStep("underSleeve", [under], [sx + m.sleeveLength / 2, tw + G + uw / 2], `Cut under sleeve · ${len(under)} cm outline`, true),
  ]
  return finishLayout(steps)
}

const BLAZER: StyleRecipe = {
  id: "blazer",
  name: "Blazer",
  buttonName: "BlazerButton",
  menuLabel: "Blazer",
  reviewNotes: ["Prototype: collar/facing, two-piece sleeve balance and closure need tailor approval."],
  measurements: jacketDefs().map((d) => (d.key === "jacketLength" ? def("jacketLength", "Blazer length", 70, 55, 85) : d)),
  steps: [...FOLD_MEASURE, step("front", "Front + lapel"), step("back", "Back"), step("topSleeve", "Top sleeve"), step("underSleeve", "Under sleeve")],
  build: buildBlazer,
  piecesText: () => "Pieces cut: 7 (2 fronts with lapels, back on the fold, 2 top sleeves + 2 under sleeves)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 4),
}

// ───────────────────────────── Joggers ─────────────────────────────

function buildJoggers(m: Measurements): PatternGeometry {
  const L = m.trouserLength - m.cuffHeight
  const t = trouserBlock(0, 0, m.waist, m.hip, m.crotchDepth, L, m.hemWidth + 8, 4, true)
  const bandW = (m.bandWidth + 0.5) * 2 // Finished casing clearance; seam allowances are added once.
  const bandL = t.waistCm
  const bx = t.right + G
  const band = rect(bx, 0, bandW, bandL)
  const cx = bx + bandW + G
  const cuffL = m.hemWidth
  const cuffH = m.cuffHeight * 2
  const cuff = rect(cx, 0, cuffH, cuffL)
  const c: P2 = [t.right / 2, L / 2]
  const steps: StepGeometry[] = [
    fold(L, c, `Fold selvedge to selvedge · cut 2 of each leg`),
    measure(
      c,
      [
        // The leg is cut short by the cuff: keep the length mark on the leg (label keeps the full length).
        ...trouserMarks(m, t, 0, 0, "Ankle").map((mk): Mark => {
          const flat = mk.a[1] === mk.b[1]
          const za = flat ? Math.min(mk.a[1], L - 4) : mk.a[1]
          const zb = flat ? za : Math.min(mk.b[1], L)
          return {a: [mk.a[0], za], b: [mk.b[0], zb], label: mk.label}
        }),
        {a: [bx + bandW / 2, 0], b: [bx + bandW / 2, bandL], label: `Band ${r(bandL)} cm`},
        {a: [cx, 4], b: [cx + cuffH, 4], label: `Cuff ${m.cuffHeight} cm`},
      ],
      "Check the marks · waist, hip, rise, length, ankle, band, cuff",
    ),
    cutStep("front", [t.front], t.frontC, `Cut front leg · ${len(t.front)} cm outline`, true),
    cutStep("back", [t.back], t.backC, `Cut back leg · ${len(t.back)} cm outline`, true),
    cutStep("waistband", [band], [bx + bandW / 2, bandL / 2], `Cut elastic waistband · ${r(bandL)} × ${r(bandW)} cm`, true),
    cutStep("cuff", [cuff], [cx + cuffH / 2, cuffL / 2], `Cut ankle cuff · ${r(cuffL)} × ${r(cuffH)} cm (cut 2)`, true),
  ]
  const geometry = finishLayout(steps)
  geometry.fitWarnings = [`Stretch cuffs must extend ${Math.ceil(800 / m.hemWidth)}% to fit the leg opening. Test the rib fabric first.`]
  return geometry
}

const JOGGERS: StyleRecipe = {
  id: "joggers",
  name: "Joggers",
  buttonName: "JoggersButton",
  menuLabel: "Joggers",
  measurements: [
    ...trouserDefs(80, 100, 28, 100, 24, "Ankle (round)", 18, 36),
    def("bandWidth", "Waistband (elastic) width", 4, 2.5, 7),
    def("cuffHeight", "Ankle cuff height", 7, 4, 12),
  ],
  steps: [...FOLD_MEASURE, step("front", "Front leg"), step("back", "Back leg"), step("waistband", "Elastic waistband"), step("cuff", "Ankle cuff")],
  build: buildJoggers,
  piecesText: () => "Pieces cut: 7 (2 fronts, 2 backs, elastic waistband, 2 ankle cuffs)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 4),
}

// ───────────────────────────── Palazzo ─────────────────────────────

function buildPalazzo(m: Measurements): PatternGeometry {
  const L = m.trouserLength
  const t = trouserBlock(0, 0, m.waist, m.hip, m.crotchDepth, L, m.hemWidth, 3)
  const bx = t.right + G
  const bandLength = t.waistCm + 3
  const band = rect(bx, 0, 10, bandLength)
  const c: P2 = [t.right / 2, L / 2]
  const steps: StepGeometry[] = [
    fold(L, c, `Fold selvedge to selvedge · cut 2 of each leg`),
    measure(c, [...trouserMarks(m, t, 0, 0, "Leg hem"), {a: [bx, t.waistCm], b: [bx + 10, t.waistCm], label: "Band closure: 3 cm overlap"}], "Check the marks · waist, hip, rise, length, wide hem"),
    cutStep("front", [t.front], t.frontC, `Cut wide-leg front · ${len(t.front)} cm outline`, true, [bodyAllowances(t.front)]),
    cutStep("back", [t.back], t.backC, `Cut wide-leg back · ${len(t.back)} cm outline`, true, [bodyAllowances(t.back)]),
    cutStep("waistband", [band], [bx + 5, bandLength / 2], `Cut waistband · ${r(bandLength)} × 10 cm; 3 cm overlap`, true),
  ]
  return finishLayout(steps)
}

const PALAZZO: StyleRecipe = {
  id: "palazzo",
  name: "Palazzo trousers",
  buttonName: "PalazzoButton",
  menuLabel: "Palazzo (ladies)",
  measurements: trouserDefs(70, 98, 27, 104, 80, "Leg hem width (round)", 50, 120),
  steps: [...FOLD_MEASURE, step("front", "Front leg"), step("back", "Back leg"), step("waistband", "Waistband")],
  build: buildPalazzo,
  piecesText: () => "Pieces cut: 5 (2 wide-leg fronts, 2 wide-leg backs, waistband)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 3),
}

// ───────────────────────────── Bubu ─────────────────────────────

function buildBubu(m: Measurements): PatternGeometry {
  const nw = m.neck / 6 + 1
  const nd = m.neck / 6 + 3
  const sh = m.shoulder / 2
  const W = sh + m.sleeveLength
  const zt = 3 + m.sleeveLength * 0.12
  const so = m.sleeveOpening / 2 + 3
  const ad = m.bust / 5 + 14 // deep batwing underarm
  const hw = Math.max(m.bust / 4 + 10, m.hip / 4 + 8)
  const L = m.fullLength
  const hemW = hw + 8
  const c: P2 = [W / 2, L / 2]
  const neck = arc(0, 0, nw, nd, 0, Math.PI / 2, 12)
  const top: P2[] = [
    [nw, 0],
    [sh, 3],
    [W, zt],
  ]
  const end: P2[] = [
    [W, zt],
    [W, zt + so],
  ]
  const under: P2[] = []
  const p0: P2 = [W, zt + so]
  const p1: P2 = [hw + 4, zt + so]
  const p2: P2 = [hw, ad]
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
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
    fold(L, c, `Fold here · ${r(L)} cm along the fold`),
    measure(
      c,
      [
        {a: [0, -3], b: [nw, -3], label: `Neck ${m.neck} cm`},
        {a: [0, 6], b: [sh, 6], label: `Shoulder ${m.shoulder} cm`},
        {a: [sh, zt - 3], b: [W, zt - 3], label: `Sleeve ${m.sleeveLength} cm`},
        {a: [W - 3, zt], b: [W - 3, zt + so], label: `Opening ${m.sleeveOpening} cm`},
        {a: [0, ad], b: [hw, ad], label: `Bust ${m.bust} cm`},
        {a: [0, L - 20], b: [hw, L - 20], label: `Hip ${m.hip} cm`},
        {a: [4, 0], b: [4, L], label: `Length ${m.fullLength} cm`},
      ],
      "Check the marks · neck, shoulder, wide sleeve, bust, hip, length",
    ),
    cutStep("neckline", [neck], c, `Cut round neck · ${len(neck)} cm curve`),
    cutStep("shoulderSleeve", [top], c, `Cut shoulder + wide sleeve top · ${len(top)} cm`),
    cutStep("sleeveEnd", [end], c, `Cut sleeve end · ${len(end)} cm, leave open`),
    cutStep("sideSeam", [under], c, `Cut batwing underarm + side · ${len(under)} cm`),
    cutStep("hem", [hem], c, `Cut hem · ${len(hem)} cm at the ankle`),
  ]
  return finishLayout(steps)
}

const BUBU: StyleRecipe = {
  id: "bubu",
  name: "Bubu gown",
  buttonName: "BubuButton",
  menuLabel: "Bubu gown",
  measurements: [
    def("neck", "Neck", 38, 28, 54),
    def("shoulder", "Shoulder", 40, 30, 56),
    def("bust", "Bust", 100, 76, 150),
    def("hip", "Hip", 110, 80, 160),
    def("fullLength", "Full length (to ankle)", 140, 100, 165),
    def("sleeveLength", "Sleeve length (wide)", 45, 25, 65),
    def("sleeveOpening", "Sleeve opening", 50, 30, 80),
  ],
  steps: [
    ...FOLD_MEASURE,
    step("neckline", "Round neck"),
    step("shoulderSleeve", "Shoulder + sleeve"),
    step("sleeveEnd", "Sleeve end"),
    step("sideSeam", "Underarm + side seam"),
    step("hem", "Hem"),
  ],
  build: buildBubu,
  piecesText: () => "Pieces cut: 2 (front + back on the fold (wide batwing sleeves cut on))",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 1),
}

// ───────────────────────────── Dress bodice block ─────────────────────────────

interface Bodice {
  neck: P2[]
  shoulder: P2[]
  armhole: P2[]
  nw: number
  sh: number
  bq: number
  ad: number
}

function bodice(m: Measurements, scoop = 3): Bodice {
  const nw = m.neck / 6 + 1
  const nd = m.neck / 5 + scoop
  const sh = m.shoulder / 2
  const bq = m.bust / 4 + 3
  const ad = m.bust / 5 + 3
  return {
    neck: arc(0, 0, nw, nd, 0, Math.PI / 2, 12),
    shoulder: [
      [nw, 0],
      [sh, 4],
    ],
    armhole: easeCurve([sh, 4], [bq, ad]),
    nw,
    sh,
    bq,
    ad,
  }
}

const dressBase = (L: number): MeasurementDef[] => [
  def("neck", "Neck", 36, 28, 50),
  def("shoulder", "Shoulder", 38, 30, 50),
  def("bust", "Bust", 90, 70, 140),
  def("waist", "Waist", 72, 50, 120),
  def("hip", "Hip", 98, 70, 150),
  def("dressLength", "Dress length", L, 70, 150),
]

function dressMarks(m: Measurements, b: Bodice, wz: number, L: number): Mark[] {
  return [
    {a: [0, -3], b: [b.nw, -3], label: `Neck ${m.neck} cm`},
    {a: [0, 6], b: [b.sh, 6], label: `Shoulder ${m.shoulder} cm`},
    {a: [0, b.ad], b: [b.bq, b.ad], label: `Bust ${m.bust} cm`},
    {a: [0, wz], b: [m.waist / 4 + 2, wz], label: `Waist ${m.waist} cm`},
    {a: [0, wz + 20], b: [m.hip / 4 + 2, wz + 20], label: `Hip ${m.hip} cm`},
    {a: [4, 0], b: [4, L], label: `Length ${L} cm`},
  ]
}

const dressSteps = (extra: StepDef[] = []): StepDef[] => [
  ...FOLD_MEASURE,
  step("neckline", "Neckline"),
  step("shoulder", "Shoulder"),
  step("armhole", "Armhole"),
  ...extra,
  step("sideSeam", "Side seam"),
  step("hem", "Hem"),
]

// ───────────────────────────── A-line dress ─────────────────────────────

function buildALine(m: Measurements): PatternGeometry {
  const b = bodice(m)
  const L = m.dressLength
  const hemW = Math.max(b.bq, m.hip / 4 + 2) + m.hemFlare
  const c: P2 = [hemW / 2, L / 2]
  const side: P2[] = [
    [b.bq, b.ad],
    [hemW, L - 1.5],
  ]
  const hem: P2[] = [
    [hemW, L - 1.5],
    [hemW * 0.5, L - 0.3],
    [0, L],
  ]
  const wz = b.ad + 15
  const steps: StepGeometry[] = [
    fold(L, c, `Fold here · ${r(L)} cm along the fold`),
    measure(c, [...dressMarks(m, b, wz, L), {a: [hemW - m.hemFlare, L - 6], b: [hemW, L - 6], label: `Flare ${m.hemFlare} cm`}], "Check the marks · neck, shoulder, bust, waist, hip, length, flare"),
    cutStep("neckline", [b.neck], c, `Cut neckline · ${len(b.neck)} cm curve`),
    cutStep("shoulder", [b.shoulder], c, `Cut shoulder · ${len(b.shoulder)} cm`),
    cutStep("armhole", [b.armhole], c, `Cut armhole · ${len(b.armhole)} cm curve`),
    cutStep("sideSeam", [side], c, `Cut A-line side seam · ${len(side)} cm`),
    cutStep("hem", [hem], c, `Cut curved hem · ${len(hem)} cm`),
  ]
  return finishLayout(steps)
}

const A_LINE: StyleRecipe = {
  id: "aLineDress",
  name: "A-line dress",
  buttonName: "ALineDressButton",
  menuLabel: "A-line dress",
  measurements: [...dressBase(100), def("hemFlare", "Hem flare (each side)", 12, 4, 30)],
  steps: dressSteps(),
  build: buildALine,
  piecesText: () => "Pieces cut: 2 (front + back on the fold (sleeveless A-line))",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 2),
}

// ───────────────────────────── Sheath dress ─────────────────────────────

function buildSheath(m: Measurements): PatternGeometry {
  const b = bodice(m, 2)
  const L = m.dressLength
  const wz = Math.max(b.ad + 6, m.waistLength)
  const wq = m.waist / 4 + 2
  const hq = m.hip / 4 + 2
  const hz = Math.min(L - 10, wz + 20)
  const c: P2 = [hq / 2, L / 2]
  const dw = Math.min(5, Math.max(2, (m.bust - m.waist) / 8))
  const side: P2[] = [
    [b.bq, b.ad],
    [wq + dw, wz],
    [hq, hz],
    [hq - 2, L],
  ]
  const hem: P2[] = [
    [hq - 2, L],
    [0, L],
  ]
  const dx = b.bq * 0.5
  const dart: P2[] = [
    [dx, b.ad + 3],
    [dx + dw / 2, wz],
    [dx, Math.min(L - 4, wz + 14)],
    [dx - dw / 2, wz],
    [dx, b.ad + 3],
  ]
  const steps: StepGeometry[] = [
    fold(L, c, `Fold here · ${r(L)} cm along the fold`),
    measure(c, [...dressMarks(m, b, wz, L), {a: [b.bq + 3, 0], b: [b.bq + 3, wz], label: `Nape to waist ${m.waistLength} cm`}], "Check the marks · neck, shoulder, bust, waist, hip, length"),
    cutStep("neckline", [b.neck], c, `Cut neckline · ${len(b.neck)} cm curve`),
    cutStep("shoulder", [b.shoulder], c, `Cut shoulder · ${len(b.shoulder)} cm`),
    cutStep("armhole", [b.armhole], c, `Cut armhole · ${len(b.armhole)} cm curve`),
    markStep("waistDart", [dart], c, `Mark waist dart · ${r(dw)} cm wide, ${r(Math.min(L - 4, wz + 14) - b.ad - 3)} cm long`),
    cutStep("sideSeam", [side], c, `Cut shaped side seam · ${len(side)} cm`),
    cutStep("hem", [hem], c, `Cut hem · ${len(hem)} cm straight`),
  ]
  return finishLayout(steps)
}

const SHEATH: StyleRecipe = {
  id: "sheathDress",
  name: "Sheath dress",
  buttonName: "SheathDressButton",
  menuLabel: "Sheath dress",
  reviewNotes: ["Prototype: front/back balance, dart placement and zip need tailor fitting."],
  measurements: [...dressBase(95), def("waistLength", "Nape to waist", 40, 32, 50)],
  steps: dressSteps([step("waistDart", "Waist dart", "mark")]),
  build: buildSheath,
  piecesText: () => "Pieces cut: 2 (front + back on the fold, with waist darts marked)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 2),
}

// ───────────────────────────── Wrap dress ─────────────────────────────

function buildWrap(m: Measurements): PatternGeometry {
  const b = bodice(m, 0)
  const L = m.dressLength
  const wz = Math.max(b.ad + 6, m.waistLength)
  const hemW = Math.max(b.bq, m.hip / 4 + 2) + 6
  // Back on the fold.
  const backNeck = arc(0, 0, b.nw, 2.5, 0, Math.PI / 2, 8).reverse()
  const back: P2[] = [...backNeck, [b.sh, 4]]
  for (const p of b.armhole.slice(1)) back.push(p)
  back.push([m.waist / 4 + 3, wz], [hemW, L], [0, L])
  // Wrap front: side seam at u = 6, crosses over to the far waist.
  const fx = hemW + G
  const span = b.bq * 2 - 4
  const fl: P2[] = [[0, L], [6, b.ad]]
  for (const p of easeCurve([b.bq + 6 - b.sh, 4], [6, b.ad]).reverse().slice(1)) fl.push(p)
  fl.push([b.bq + 6 - b.nw, 0], [6 + span, wz], [12 + span, L], [0, L])
  const front = mv(fl, fx, 0)
  const sx = fx + span + 12 + G
  const sw = m.roundSleeve + 6
  const sleeve = sleevePiece(sx, 0, sw, m.sleeveLength, sw - 4)
  const tieL = (m.waist + 60) / 2
  const tx = sx + m.sleeveLength + G
  const tie = rect(tx, 0, 8, tieL)
  const c: P2 = [hemW / 2, L / 2]
  const steps: StepGeometry[] = [
    fold(L, c, `Fold here · back on the fold, ${r(L)} cm`),
    measure(
      c,
      [
        ...dressMarks(m, b, wz, L),
        {a: [sx, sw / 2], b: [sx + m.sleeveLength, sw / 2], label: `Sleeve ${m.sleeveLength} cm`},
        {a: [tx + 4, 0], b: [tx + 4, tieL], label: `Tie ${r(tieL)} cm`},
      ],
      "Check the marks · neck, bust, waist, hip, length, sleeve, tie",
    ),
    cutStep("back", [back], c, `Cut back on the fold · ${len(back)} cm`, false, [bodyAllowances(back, [0,1,2,3,4,5,6,7])]),
    cutStep("wrapFront", [front], [fx + span / 2, L / 2], `Cut wrap front · ${len(front)} cm outline (cut 2)`, true, [bodyAllowances(front, [12])]),
    cutStep("sleeve", [sleeve], [sx + m.sleeveLength / 2, sw / 2], `Cut sleeve · ${len(sleeve)} cm outline`, true),
    cutStep("tie", [tie], [tx + 4, tieL / 2], `Cut tie belt · ${r(tieL)} × 8 cm (cut 2)`, true),
  ]
  return finishLayout(steps)
}

const WRAP: StyleRecipe = {
  id: "wrapDress",
  name: "Wrap dress",
  buttonName: "WrapDressButton",
  menuLabel: "Wrap dress",
  reviewNotes: ["Prototype: wrap coverage, neckline finish and sleeve pitch need tailor fitting."],
  measurements: [
    ...dressBase(105),
    def("waistLength", "Nape to waist", 40, 32, 50),
    def("sleeveLength", "Sleeve length", 25, 10, 60),
    def("roundSleeve", "Round sleeve (arm)", 30, 22, 46),
  ],
  steps: [...FOLD_MEASURE, step("back", "Back"), step("wrapFront", "Wrap front"), step("sleeve", "Sleeve"), step("tie", "Tie belt")],
  build: buildWrap,
  piecesText: () => "Pieces cut: 7 (back on the fold, 2 wrap fronts, 2 sleeves, 2 tie belts)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 4),
}

// ───────────────────────────── Maxi / ball gown ─────────────────────────────

function buildMaxi(m: Measurements): PatternGeometry {
  const b = bodice(m, 1)
  const BL = m.bodiceLength
  const wq = m.waist / 4 + 2
  const SL = m.skirtLength
  const waistArc = wq // Same stitching circumference as the bodice, including its ease.
  const theta = (m.hemSweep / 4 - waistArc) / SL
  if (!(theta > 0 && theta <= Math.PI / 2)) throw new Error("Skirt sweep must exceed the waist and fit a quarter-sector layout")
  const rw = waistArc / theta
  const z0 = BL + G + rw
  const cz = z0 - rw
  const pt = (R: number, a: number): P2 => [R * Math.sin(a), cz + R * Math.cos(a)]
  const waistLine: P2[] = []
  const hemLine: P2[] = []
  for (let i = 0; i <= 16; i++) {
    const a = (theta * i) / 16
    waistLine.push(pt(rw, a))
    hemLine.push(pt(rw + SL, theta - a))
  }
  const skirtSide: P2[] = [pt(rw, theta), pt(rw + SL, theta)]
  const bodiceSide: P2[] = [
    [b.bq, b.ad],
    [wq, BL],
    [0, BL],
  ]
  const bc: P2 = [b.bq / 2, BL / 2]
  const sc: P2 = pt(rw + SL / 2, theta / 2)
  const total = cz + rw + SL
  const steps: StepGeometry[] = [
    fold(total, sc, `Fold here · bodice and skirt both on the fold, ${r(total)} cm`),
    measure(
      sc,
      [
        {a: [0, -3], b: [b.nw, -3], label: `Neck ${m.neck} cm`},
        {a: [0, b.ad], b: [b.bq, b.ad], label: `Bust ${m.bust} cm`},
        {a: [0, BL - 3], b: [wq, BL - 3], label: `Waist ${m.waist} cm`},
        {a: [b.bq + 3, 0], b: [b.bq + 3, BL], label: `Bodice ${m.bodiceLength} cm`},
        {a: [3, z0], b: [3, z0 + SL], label: `Skirt ${m.skirtLength} cm`},
        {a: pt(rw + SL - 4, 0), b: pt(rw + SL - 4, theta), label: `Hem sweep ${m.hemSweep} cm`},
      ],
      "Check the bodice marks · neck, bust, waist, bodice length",
    ),
    cutStep("neckline", [b.neck], bc, `Cut bodice neckline · ${len(b.neck)} cm curve`),
    cutStep("shoulder", [b.shoulder], bc, `Cut shoulder · ${len(b.shoulder)} cm`),
    cutStep("armhole", [b.armhole], bc, `Cut armhole · ${len(b.armhole)} cm curve`),
    cutStep("bodiceSide", [bodiceSide], bc, `Cut bodice side + waist · ${len(bodiceSide)} cm`),
    cutStep("skirtWaist", [waistLine], sc, `Cut skirt waist curve · ${len(waistLine)} cm`),
    cutStep("skirtSide", [skirtSide], sc, `Cut flared skirt side · ${len(skirtSide)} cm`),
    cutStep("skirtHem", [hemLine], sc, `Cut skirt hem · ${len(hemLine)} cm curve`),
  ]
  // The full lay runs ~2 m: show the bodice lay, then the skirt lay.
  // Not transposed as a whole: the bodice lay stays upright; splitLay turns only a group too deep for the table.
  return splitLay(finishLayout(steps, false), ["Bodice", "Skirt"], ["skirtWaist", "skirtSide", "skirtHem"])
}

const MAXI: StyleRecipe = {
  id: "maxiGown",
  name: "Maxi / ball gown",
  buttonName: "MaxiGownButton",
  menuLabel: "Maxi / ball gown",
  reviewNotes: ["Prototype bodice: darts and closure need tailor fitting. Use fresh cloth for the skirt lay."],
  measurements: [
    def("neck", "Neck", 36, 28, 50),
    def("shoulder", "Shoulder", 38, 30, 50),
    def("bust", "Bust", 90, 70, 140),
    def("waist", "Waist", 70, 50, 120),
    def("bodiceLength", "Bodice (shoulder to waist)", 40, 32, 50),
    def("skirtLength", "Skirt length (waist to floor)", 110, 80, 130),
    def("hemSweep", "Hem sweep (round)", 280, 160, 500),
  ],
  steps: [
    ...FOLD_MEASURE,
    step("neckline", "Bodice neckline"),
    step("shoulder", "Shoulder"),
    step("armhole", "Armhole"),
    step("bodiceSide", "Bodice side + waist"),
    step("skirtWaist", "Skirt waist"),
    step("skirtSide", "Skirt side"),
    step("skirtHem", "Skirt hem"),
  ],
  build: buildMaxi,
  piecesText: () => "Pieces cut: 4 (bodice front + back on the fold, flared skirt front + back on the fold)",
  chalkLayoutAreaCm2: (g, mm) => chalkAreaColumns(g, mm, 2),
}

/** Menu page 2 order. */
export const GLOBAL_STYLES: StyleRecipe[] = [SUIT, BLAZER, JOGGERS, PALAZZO, BUBU, A_LINE, SHEATH, WRAP, MAXI]
