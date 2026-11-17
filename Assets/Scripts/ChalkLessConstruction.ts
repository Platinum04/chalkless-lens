import {HEM_SEAM_CM, NECK_SEAM_CM, P2, PatternGeometry, SEAM_CM, StepDef, StepGeometry} from "./ChalkLessPattern"

const EPS = 1e-6
const same = (a: P2, b: P2): boolean => Math.hypot(a[0] - b[0], a[1] - b[1]) < EPS
interface Edge {a: P2; b: P2; n: P2; allowance: number; path: number; segment: number}
interface Path {step: number; line: number; points: P2[]; closed: boolean; edges: Edge[]}

function allowance(id: string): number {
  if (id === "placket") return 0 // An opening slit is cut on its centre line, not expanded into a hole.
  if (/neckline|collar/i.test(id)) return NECK_SEAM_CM
  if (/hem/i.test(id)) return HEM_SEAM_CM
  return SEAM_CM
}

/** Intersect the two offset edge lines. The miter limit prevents spikes at near-parallel corners. */
function join(p: P2, a: Edge, b: Edge): P2 {
  const pa: P2 = [p[0] + a.n[0] * a.allowance, p[1] + a.n[1] * a.allowance]
  const pb: P2 = [p[0] + b.n[0] * b.allowance, p[1] + b.n[1] * b.allowance]
  const da: P2 = [a.b[0] - a.a[0], a.b[1] - a.a[1]]
  const db: P2 = [b.b[0] - b.a[0], b.b[1] - b.a[1]]
  const det = da[0] * db[1] - da[1] * db[0]
  if (Math.abs(det) < EPS) return [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]
  const t = ((pb[0] - pa[0]) * db[1] - (pb[1] - pa[1]) * db[0]) / det
  const q: P2 = [pa[0] + t * da[0], pa[1] + t * da[1]]
  const limit = 8 * Math.max(a.allowance, b.allowance, 0.1)
  return Math.hypot(q[0] - p[0], q[1] - p[1]) <= limit ? q : [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2]
}

/**
 * Recipes are drafted on the stitching line. Build the actual cutting line once, with joined
 * offsets and fold clipping. Rendering uses solid cut paths and dashed original stitch paths.
 * Do this after layout transforms, so allowance widths remain real centimetres in every lay.
 */
export function prepareCuttingGeometry(source: PatternGeometry, definitions: StepDef[], bodyAllowanceCm = SEAM_CM): PatternGeometry {
  const steps: StepGeometry[] = source.steps.map((s) => ({...s, lines: s.lines.map((l) => l.map((p) => [...p] as P2)), marks: s.marks.map((m) => ({...m, a: [...m.a] as P2, b: [...m.b] as P2}))}))
  const paths: Path[] = []
  const foldLines = steps.filter((s, i) => definitions[i]?.kind === "fold").flatMap((s) => s.lines.map((l) => ({line: l, group: s.group || 0})))
  steps.forEach((s, si) => {
    if (definitions[si]?.kind !== "cut") return
    s.stitchLines = s.lines.map((l) => l.map((p) => [...p] as P2))
    s.lines.forEach((points, li) => {
      const closed = points.length > 2 && same(points[0], points[points.length - 1])
      let area = 0
      for (let k = 1; k < points.length; k++) area += points[k - 1][0] * points[k][1] - points[k][0] * points[k - 1][1]
      const c = s.lineCentroids?.[li] || s.centroid
      const path: Path = {step: si, line: li, points, closed, edges: []}
      for (let k = 1; k < points.length; k++) {
        const a = points[k - 1]
        const b = points[k]
        const dx = b[0] - a[0]
        const dz = b[1] - a[1]
        const length = Math.hypot(dx, dz)
        if (length < EPS) throw new Error(`Zero-length pattern edge: ${s.id}`)
        let nx = dz / length
        let nz = -dx / length
        if (closed ? area < 0 : nx * ((a[0] + b[0]) / 2 - c[0]) + nz * ((a[1] + b[1]) / 2 - c[1]) < 0) {nx = -nx; nz = -nz}
        const id = s.id || definitions[si].id
        let distance = s.allowances?.[li]?.[k - 1] ?? allowance(id)
        if (distance === SEAM_CM) distance = bodyAllowanceCm
        if (/sleeve/i.test(id) && points.length === 20 && k - 1 === 17) distance = HEM_SEAM_CM
        path.edges.push({a, b, n: [nx, nz], allowance: distance, path: paths.length, segment: k - 1})
      }
      paths.push(path)
    })
  })
  // Show one grain guide per piece during the measurement step. It follows each layout transform.
  const measureStep = steps.find((s, i) => definitions[i]?.kind === "measure")
  const grainKeys = new Set<string>()
  if (measureStep) for (const path of paths) {
    const s = steps[path.step]
    const c = s.lineCentroids?.[path.line] || s.centroid
    const direction = s.grainDirection
    if (!direction) continue
    const key = `${s.group || 0}:${c[0].toFixed(4)}:${c[1].toFixed(4)}`
    if (grainKeys.has(key)) continue
    grainKeys.add(key)
    measureStep.marks.push({a: [c[0] - direction[0] * 4, c[1] - direction[1] * 4], b: [c[0] + direction[0] * 4, c[1] + direction[1] * 4], label: "Grain", group: s.group || 0})
  }
  for (const path of paths) {
    const s = steps[path.step]
    s.lines[path.line] = path.points.map((p, index) => {
      let before = path.edges[index - 1]
      let after = path.edges[index]
      if (path.closed && (index === 0 || index === path.points.length - 1)) {before = path.edges[path.edges.length - 1]; after = path.edges[0]}
      // A body outline is split across neckline/shoulder/side/hem steps. Join them at shared endpoints.
      if (!before || !after) {
        const candidates = paths.filter((other) => other !== path && (steps[other.step].group || 0) === (s.group || 0))
          .flatMap((other) => [other.edges[0], other.edges[other.edges.length - 1]])
          .filter((edge) => edge && edge.allowance > 0 && (same(edge.a, p) || same(edge.b, p)))
        if (!before && after?.allowance > 0) before = candidates[0]
        if (!after && before?.allowance > 0) after = candidates[0]
      }
      const edge = before || after
      let q: P2 = before && after ? join(p, before, after) : [p[0] + edge.n[0] * edge.allowance, p[1] + edge.n[1] * edge.allowance]
      // Cut-on-fold edges remain uncut: terminate adjoining allowances exactly at the fold.
      if (!path.closed && (index === 0 || index === path.points.length - 1)) {
        for (const fold of foldLines) {
          if (fold.group !== (s.group || 0) || fold.line.length < 2) continue
          const a = fold.line[0], b = fold.line[fold.line.length - 1]
          if (Math.abs(a[0] - b[0]) < EPS && Math.abs(p[0] - a[0]) < EPS) q = [a[0], q[1]]
          if (Math.abs(a[1] - b[1]) < EPS && Math.abs(p[1] - a[1]) < EPS) q = [q[0], a[1]]
        }
      }
      return q
    })
  }
  // Extend a front placket slit through the neck allowance to the actual neck cut, not just its stitch line.
  for (const path of paths.filter((p) => steps[p.step].id === "placket")) {
    for (const index of [0, path.points.length - 1]) {
      for (const other of paths.filter((p) => steps[p.step].id === "neckline")) {
        for (const k of [0, other.points.length - 1]) if (same(path.points[index], other.points[k])) steps[path.step].lines[path.line][index] = [...steps[other.step].lines[other.line][k]] as P2
      }
    }
  }
  steps.forEach((s, i) => {
    if (definitions[i]?.kind !== "cut") return
    const total = s.lines.reduce((sum, l) => sum + l.slice(1).reduce((v, p, k) => v + Math.hypot(p[0] - l[k][0], p[1] - l[k][1]), 0), 0)
    const head = source.steps[i].label.split(" · ")[0]
    s.label = `${head}${s.quantity && s.quantity > 1 ? ` (cut ${s.quantity})` : ""} · ${Math.round(total)} cm cut${s.id === "placket" ? "; front only" : "; dashed stitch"}`
  })
  const slit = steps.find((s) => s.id === "placket")
  if (slit) slit.stitchLines = []
  // Include allowances in each lay's footprint, and move stitch/mark/fold geometry with the cut.
  const groups = source.groups?.map((g) => ({...g}))
  let width = 0, length = 0
  const shifts: P2[] = []
  for (let group = 0; group < (groups?.length || 1); group++) {
    const selected = steps.filter((s) => (s.group || 0) === group)
    const points = selected.filter((s) => s.stitchLines).flatMap((s) => s.lines.flat())
    const x0 = Math.min(0, ...points.map((p) => p[0]))
    const z0 = Math.min(0, ...points.map((p) => p[1]))
    const w = Math.max(...points.map((p) => p[0])) - x0
    const h = Math.max(...points.map((p) => p[1])) - z0
    shifts.push([-x0, -z0])
    const move = (p: P2): P2 => [p[0] - x0, p[1] - z0]
    for (const s of selected) {
      s.lines = s.lines.map((l) => l.map(move))
      s.stitchLines = s.stitchLines?.map((l) => l.map(move))
      s.centroid = move(s.centroid)
      s.lineCentroids = s.lineCentroids?.map(move)
    }
    if (groups) {groups[group].widthCm = w; groups[group].lengthCm = h}
    width = Math.max(width, w); length = Math.max(length, h)
  }
  for (const s of steps) for (const m of s.marks) {
    const shift = shifts[m.group ?? s.group ?? 0]
    m.a = [m.a[0] + shift[0], m.a[1] + shift[1]]
    m.b = [m.b[0] + shift[0], m.b[1] + shift[1]]
  }
  return {...source, steps, groups, widthCm: source.groups ? source.widthCm : width, lengthCm: source.groups ? source.lengthCm : length}
}

/** Fabric depth the lay should stay within (table ≈115 cm deep incl. margins). */
export const LAY_DEPTH_FIT_CM = 107

/**
 * Turn a whole lay (or each lay group) a quarter turn when it runs too deep for the table, so the long
 * pieces lie along the table's long axis. This is a true rotation (not a mirror) of every piece AND of the
 * cloth under it: grain arrows turn with the pieces, so grain relative to the cloth is unchanged. The
 * fabric stand-in is sized from the turned lay, i.e. the cloth is simply laid lengthwise along the table.
 */
export function rotateLongLay(g: PatternGeometry, depthFitCm = LAY_DEPTH_FIT_CM): PatternGeometry {
  const sizes: P2[] = g.groups ? g.groups.map((gr) => [gr.widthCm, gr.lengthCm] as P2) : [[g.widthCm, g.lengthCm]]
  const turn = sizes.map((s) => s[1] > depthFitCm && s[0] < s[1])
  if (!turn.some((t) => t)) return g
  // (x, z) -> (z, W - x): a quarter turn seen from above (determinant +1, so no piece is mirrored).
  const rot = (k: number, p: P2): P2 => (turn[k] ? [p[1], sizes[k][0] - p[0]] : p)
  const dir = (k: number, d: P2): P2 => (turn[k] ? [d[1], -d[0]] : d)
  const steps: StepGeometry[] = g.steps.map((s) => {
    const k = g.groups ? s.group || 0 : 0
    return {
      ...s,
      lines: s.lines.map((l) => l.map((p) => rot(k, p))),
      stitchLines: s.stitchLines?.map((l) => l.map((p) => rot(k, p))),
      centroid: rot(k, s.centroid),
      lineCentroids: s.lineCentroids?.map((c) => rot(k, c)),
      grainDirection: s.grainDirection && dir(k, s.grainDirection),
      marks: s.marks.map((m) => {
        const mk = g.groups ? (m.group ?? k) : 0
        return {...m, a: rot(mk, m.a), b: rot(mk, m.b)}
      }),
    }
  })
  const groups = g.groups?.map((gr, k) => (turn[k] ? {...gr, widthCm: gr.lengthCm, lengthCm: gr.widthCm} : {...gr}))
  const note = "Lay turned: cloth length runs along the table (grain kept)."
  return {
    ...g,
    steps,
    groups,
    widthCm: g.groups ? g.widthCm : g.lengthCm,
    lengthCm: g.groups ? g.lengthCm : g.widthCm,
    rotatedLay: true,
    fitWarnings: [...(g.fitWarnings || []), note],
  }
}
