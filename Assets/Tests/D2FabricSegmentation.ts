// LEAF scenario — pure fabric segmentation on a synthetic image: a light rectangle rotated 10° on a
// darker table. Corners must land within 2 px and the angle within 2°.
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {rayPlaneY, rectFromCorners, segmentFabric, syntheticFabricImage, V3} from "../Scripts/ChalkLessFabricVision"

@component
export class D2FabricSegmentation extends Scenario {
  async run(): Promise<void> {
    const W = 160
    const H = 120
    const cx = 80.3
    const cy = 61.7
    const L = 90
    const Wd = 50
    const A = 10
    const img = syntheticFabricImage(W, H, cx, cy, L, Wd, A)
    const r = segmentFabric(img, W, H)
    expect(r !== null).toBe(true)
    const t = (A * Math.PI) / 180
    const ux = Math.cos(t)
    const uy = Math.sin(t)
    const exp = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sa, sb]) => [cx + ((sa * L) / 2) * ux - ((sb * Wd) / 2) * uy, cy + ((sa * L) / 2) * uy + ((sb * Wd) / 2) * ux])
    let worst = 0
    for (const c of r.corners) {
      let best = 1e9
      for (const e of exp) best = Math.min(best, Math.sqrt((e[0] - c[0]) ** 2 + (e[1] - c[1]) ** 2))
      worst = Math.max(worst, best)
    }
    print(`D2: angle ${r.angleDeg.toFixed(2)} deg, worst corner error ${worst.toFixed(2)} px`)
    expect(worst < 2).toBe(true)
    expect(Math.abs(r.angleDeg - A) < 2).toBe(true)
    // Plane projection: straight-down ray from 60 cm above hits the plane right below.
    const p = rayPlaneY([5, 0, -3], [5, -10, -3], -60) as V3
    expect(Math.abs(p[1] + 60) < 1e-6 && Math.abs(p[0] - 5) < 1e-6).toBe(true)
    const rect = rectFromCorners([[0, -70, 0], [100, -70, 0], [100, -70, 60], [0, -70, 60]])
    expect(Math.abs(rect.lengthCm - 100) < 1e-6 && Math.abs(rect.widthCm - 60) < 1e-6).toBe(true)
  }
}
