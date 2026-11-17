/**
 * ChalkLessLines.ts — MeshBuilder helpers that turn 2D polylines (XZ plane) into flat
 * ribbon meshes: solid lines, dashed lines, direction arrows, boxes.
 * Must not: own any state or create SceneObjects.
 */
import {P2} from "./ChalkLessPattern"

export class MeshAccumulator {
  private verts: number[] = []
  private idx: number[] = []
  private count = 0

  constructor(private y: number) {}

  private quad(p0: P2, p1: P2, p2: P2, p3: P2): void {
    const b = this.count
    for (const p of [p0, p1, p2, p3]) {
      this.verts.push(p[0], this.y, p[1], 0, 1, 0)
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3)
    this.count += 4
  }

  segment(a: P2, b: P2, width: number): void {
    const dx = b[0] - a[0]
    const dz = b[1] - a[1]
    const len = Math.sqrt(dx * dx + dz * dz)
    if (len < 1e-4) return
    const nx = (-dz / len) * (width / 2)
    const nz = (dx / len) * (width / 2)
    // extend slightly so joints look continuous
    const ex = (dx / len) * (width / 2)
    const ez = (dz / len) * (width / 2)
    const a2: P2 = [a[0] - ex, a[1] - ez]
    const b2: P2 = [b[0] + ex, b[1] + ez]
    this.quad([a2[0] + nx, a2[1] + nz], [b2[0] + nx, b2[1] + nz], [b2[0] - nx, b2[1] - nz], [a2[0] - nx, a2[1] - nz])
  }

  polyline(pts: P2[], width: number): void {
    for (let i = 1; i < pts.length; i++) this.segment(pts[i - 1], pts[i], width)
  }

  dashed(pts: P2[], width: number, dash: number, gap: number): void {
    let on = true
    let remain = dash
    for (let i = 1; i < pts.length; i++) {
      let a: P2 = pts[i - 1]
      const b = pts[i]
      let segLen = Math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)
      while (segLen > 1e-4) {
        const step = Math.min(remain, segLen)
        const t = step / segLen
        const p: P2 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
        if (on) this.segment(a, p, width)
        a = p
        segLen -= step
        remain -= step
        if (remain <= 1e-4) {
          on = !on
          remain = on ? dash : gap
        }
      }
    }
  }

  /** Chevron arrows along the polyline pointing in the drawing (cut) direction. */
  arrows(pts: P2[], spacing: number, size: number, width: number): void {
    let acc = spacing / 2
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]
      const b = pts[i]
      const dx = b[0] - a[0]
      const dz = b[1] - a[1]
      const len = Math.sqrt(dx * dx + dz * dz)
      if (len < 1e-4) continue
      const ux = dx / len
      const uz = dz / len
      let d = acc
      while (d <= len) {
        const tip: P2 = [a[0] + ux * d, a[1] + uz * d]
        const back: P2 = [tip[0] - ux * size, tip[1] - uz * size]
        const l: P2 = [back[0] - uz * size * 0.6, back[1] + ux * size * 0.6]
        const r: P2 = [back[0] + uz * size * 0.6, back[1] - ux * size * 0.6]
        this.segment(l, tip, width)
        this.segment(r, tip, width)
        d += spacing
      }
      acc = d - len
    }
  }

  isEmpty(): boolean {
    return this.count === 0
  }

  build(): RenderMesh {
    const mb = new MeshBuilder([
      {name: "position", components: 3},
      {name: "normal", components: 3},
    ])
    mb.topology = MeshTopology.Triangles
    mb.indexType = MeshIndexType.UInt16
    if (this.count > 0) {
      mb.appendVerticesInterleaved(this.verts)
      mb.appendIndices(this.idx)
    }
    mb.updateMesh()
    return mb.getMesh()
  }
}

/** Axis-aligned box mesh centred at `center`. */
export function boxMesh(center: vec3, size: vec3): RenderMesh {
  const mb = new MeshBuilder([
    {name: "position", components: 3},
    {name: "normal", components: 3},
  ])
  mb.topology = MeshTopology.Triangles
  mb.indexType = MeshIndexType.UInt16
  const hx = size.x / 2
  const hy = size.y / 2
  const hz = size.z / 2
  const faces: [number[], number[][]][] = [
    [[0, 1, 0], [[-hx, hy, -hz], [-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz]]],
    [[0, -1, 0], [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]]],
    [[0, 0, 1], [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]]],
    [[0, 0, -1], [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]]],
    [[1, 0, 0], [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]]],
    [[-1, 0, 0], [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]]],
  ]
  const v: number[] = []
  const id: number[] = []
  let c = 0
  for (const [n, ps] of faces) {
    for (const p of ps) v.push(p[0] + center.x, p[1] + center.y, p[2] + center.z, n[0], n[1], n[2])
    id.push(c, c + 1, c + 2, c, c + 2, c + 3)
    c += 4
  }
  mb.appendVerticesInterleaved(v)
  mb.appendIndices(id)
  mb.updateMesh()
  return mb.getMesh()
}

export function tintedMaterial(base: Material, color: vec4): Material {
  const m = base.clone()
  m.mainPass.baseColor = color
  m.mainPass.twoSided = true
  return m
}

export function meshObject(parent: SceneObject, name: string, mesh: RenderMesh, mat: Material): RenderMeshVisual {
  const so = global.scene.createSceneObject(name)
  so.setParent(parent)
  const rmv = so.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
  rmv.mesh = mesh
  rmv.mainMaterial = mat
  return rmv
}
