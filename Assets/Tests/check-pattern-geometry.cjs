// Run with Node 24+: node --disable-warning=ExperimentalWarning Assets/Tests/check-pattern-geometry.cjs
// Pure recipe checks. No scene state or Lens Studio connection is required.
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const {stripTypeScriptTypes} = require('node:module')
const scripts = path.resolve(__dirname, '../Scripts')
function load(file, names, context = {}) {
  const source = fs.readFileSync(path.join(scripts, file), 'utf8')
    .replace(/^import[\s\S]*?from ["'][^"']+["']\r?\n/gm, '').replace(/^export /gm, '')
  return vm.runInNewContext(stripTypeScriptTypes(source, {mode: 'transform'}) + ';({' + names + '})', context)
}
const core = load('ChalkLessPattern.ts', 'arc,BODY_EASE_CM,BUBA,chalkAreaColumns,CHEST_EASE_CM,cutStep,easeCurve,finishLayout,PIECE_GAP_CM,polylineLength,r,sleevePiece,matchedSleeve,splitLay,SEAM_CM,NECK_SEAM_CM,HEM_SEAM_CM')
const globalRecipes = load('ChalkLessGlobalRecipes.ts', 'GLOBAL_STYLES', core)
const {STYLES} = load('ChalkLessStyleRecipes.ts', 'STYLES', {...core, ...globalRecipes})
const {prepareCuttingGeometry} = load('ChalkLessConstruction.ts', 'prepareCuttingGeometry', core)
const defaults = recipe => Object.fromEntries(recipe.measurements.map(d => [d.key, d.defaultCm]))
const recipe = id => STYLES.find(r => r.id === id)
const length = points => points.slice(1).reduce((sum, p, k) => sum + Math.hypot(p[0] - points[k][0], p[1] - points[k][1]), 0)
const near = (a, b, label, tolerance = 1e-5) => assert(Math.abs(a - b) < tolerance, label + ': ' + a + ' != ' + b)
let builds = 0
for (const rec of STYLES) {
  const base = defaults(rec)
  const cases = [base, Object.fromEntries(rec.measurements.map(d => [d.key, d.minCm])), Object.fromEntries(rec.measurements.map(d => [d.key, d.maxCm]))]
  for (const d of rec.measurements) cases.push({...base, [d.key]: d.minCm}, {...base, [d.key]: d.maxCm})
  for (const m of cases) {
    const raw = rec.build(m)
    const snapshot = JSON.stringify(raw)
    const g = prepareCuttingGeometry(raw, rec.steps)
    assert.equal(JSON.stringify(raw), snapshot, rec.id + ' constructor mutates its source')
    assert.equal(g.steps.length, rec.steps.length)
    assert(g.widthCm > 0 && g.lengthCm > 0 && Number.isFinite(g.widthCm + g.lengthCm), rec.id + ' bounds')
    for (const [i, s] of g.steps.entries()) {
      assert.equal(s.id, rec.steps[i].id, rec.id + ' stable step IDs')
      for (const line of [...s.lines, ...(s.stitchLines || [])]) for (const p of line) assert(p.length === 2 && p.every(Number.isFinite), rec.id + ' non-finite coordinates')
      if (rec.steps[i].kind === 'cut') assert(s.stitchLines, rec.id + ' missing stitch path')
    }
    builds++
  }
}
const buba = recipe('buba'), bm = defaults(buba), bg = buba.build(bm)
assert(buba.piecesText(bm).includes('Pieces cut: 4'))
for (const id of ['neckline', 'shoulder', 'sideSeam', 'hem']) assert.equal(bg.steps.find(s => s.id === id).lines.length, 2, 'Buba ' + id + ' missing back')
assert.equal(bg.steps[0].lines.length, 2, 'separate front/back folds')
assert(length(bg.steps[2].lines[0]) > length(bg.steps[2].lines[1]), 'front and back neckline must differ')
for (const id of ['buba', 'kaftanLong', 'kaftanShort']) {
  const rec = recipe(id), m = defaults(rec), g = rec.build(m)
  const side = g.steps.find(s => s.id === 'sideSeam').lines[0].slice(0, 11)
  const sleeve = g.steps.find(s => s.id === 'sleeve').lines[0].slice(0, 17)
  near(length(sleeve), 2 * length(side), id + ' sleeve cap / armhole')
}
const wrap = recipe('wrapper'), wm = defaults(wrap), wg = wrap.build(wm)
near(length(wg.steps.find(s => s.id === 'sideEdges').lines[0].slice(0, 2)), length(wg.steps.find(s => s.id === 'waistband').lines[0].slice(0, 2)), 'wrapper band attachment')
const maxi = recipe('maxiGown'), mm = defaults(maxi), mg = maxi.build(mm)
near(length(mg.steps.find(s => s.id === 'bodiceSide').lines[0].slice(-2)), length(mg.steps.find(s => s.id === 'skirtWaist').lines[0]), 'maxi waist attachment', 0.002)
const square = {widthCm: 10, lengthCm: 10, steps: [core.cutStep('panel', [[[0,0],[10,0],[10,10],[0,10],[0,0]]], [5,5], 'Cut panel', true)]}
const sq = prepareCuttingGeometry(square, [{id:'panel',title:'Panel',kind:'cut'}])
near(Math.max(...sq.steps[0].lines[0].map(p => p[0])) - Math.min(...sq.steps[0].lines[0].map(p => p[0])), 13, 'exact 1.5 cm mitered square width')
near(length(sq.steps[0].lines[0]), 52, 'cut perimeter including allowance')
near(length(sq.steps[0].stitchLines[0]), 40, 'stitch perimeter unchanged')
assert.deepEqual(sq.steps[0].lines[0][0], sq.steps[0].lines[0].at(-1), 'closed offset join')
const preparedBuba = prepareCuttingGeometry(bg, buba.steps)
const hem = preparedBuba.steps.find(s => s.id === 'hem')
near(hem.lines[0][0][1] - hem.stitchLines[0][0][1], 3, 'hem has 3 cm allowance')
const fold = preparedBuba.steps[0].lines[0][0][0]
near(hem.lines[0].at(-1)[0], fold, 'no cut allowance crossing the fold')
for (const id of ['suit', 'palazzo', 'joggers']) {
  const rec = recipe(id), m = defaults(rec), g = rec.build(m)
  const front = g.steps.find(s => ['trouserFront','front'].includes(s.id)).lines[0]
  const back = g.steps.find(s => ['trouserBack','back'].includes(s.id)).lines[0]
  const sewnWaist = 2 * (length(front.slice(0,2)) + length(back.slice(0,2)))
  const target = id === 'joggers' ? Math.max(m.waist + 2, m.hip + 4) : m.waist + 2
  near(sewnWaist, target, id + ' defined waist ease')
  const band = g.steps.find(s => s.id === 'waistband').lines[0]
  near(length(band.slice(1,3)), sewnWaist + (id === 'joggers' ? 0 : 3), id + ' band attachment and explicit overlap')
}
const sheath = recipe('sheathDress'), sm = defaults(sheath), sg = sheath.build(sm)
const waistSide = sg.steps.find(s => s.id === 'sideSeam').lines[0][1][0]
const diamond = sg.steps.find(s => s.id === 'waistDart').lines[0]
const intake = Math.abs(diamond[1][0] - diamond[3][0])
near(4 * (waistSide - intake), sm.waist + 8, 'sheath waist after actual dart uptake')
for (const rec of STYLES) {
  const raw = rec.build(defaults(rec)), g = prepareCuttingGeometry(raw, rec.steps)
  assert(!raw.transposed, rec.id + ' silently rotated for the table')
  assert(g.steps.find(s => s.id === 'measure').marks.some(m => m.label === 'Grain'), rec.id + ' missing grain guides')
}
const kaftan = recipe('kaftanLong'), kg = prepareCuttingGeometry(kaftan.build(defaults(kaftan)), kaftan.steps)
const slit = kg.steps.find(s => s.id === 'placket')
const neck = kg.steps.find(s => s.id === 'neckline')
near(Math.hypot(slit.lines[0][0][0] - neck.lines[0].at(-1)[0], slit.lines[0][0][1] - neck.lines[0].at(-1)[1]), 0, 'placket reaches the actual neck cut')
assert.equal(slit.stitchLines.length, 0, 'no fake offset stitching line along an opening slit')
function crosses(a, b, c, d) {
  const u = [b[0]-a[0], b[1]-a[1]], v = [d[0]-c[0], d[1]-c[1]]
  const det = u[0]*v[1]-u[1]*v[0]
  if (Math.abs(det) < 1e-8) return false
  const w = [c[0]-a[0], c[1]-a[1]]
  const t = (w[0]*v[1]-w[1]*v[0])/det, s = (w[0]*u[1]-w[1]*u[0])/det
  return t > 1e-6 && t < 1-1e-6 && s > 1e-6 && s < 1-1e-6
}
for (const rec of STYLES) {
  const g = prepareCuttingGeometry(rec.build(defaults(rec)), rec.steps)
  for (const step of g.steps) if (step.closed) for (const line of step.lines) {
    for (let a = 1; a < line.length; a++) for (let b = a+2; b < line.length; b++) assert(!crosses(line[a-1], line[a], line[b-1], line[b]), rec.id + '/' + step.id + ' self-intersecting cut')
  }
}
console.log('PASS: ' + STYLES.length + ' styles, ' + builds + ' default/range builds; matched sleeves, Buba back, waist joins, joined allowances and fold endpoints.')
