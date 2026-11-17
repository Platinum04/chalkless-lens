/**
 * ChalkLessGarmentIcons.ts — simple line-art garment silhouettes for the menu buttons.
 * Each icon is a list of polylines in a unit box: x in [-0.5, 0.5] (right), z in [-0.5, 0.5] (down).
 * Shapes are drawn as a left half-outline (neck centre → hem centre) mirrored to the right.
 * Pure data; must not create SceneObjects.
 */
import {P2} from "./ChalkLessPattern"

/** Mirror a left half-outline into a closed full outline. */
function sym(half: P2[]): P2[] {
  const right = half
    .slice()
    .reverse()
    .map((p) => [-p[0], p[1]] as P2)
  return half.concat(right)
}

/** Top with sleeves: neck depth, shoulder, sleeve end, armpit, hem (left-side x values are negative). */
function top(sleeveX: number, sleeveZ: number, hemZ: number, hemX: number, cuff = 0.12): P2[][] {
  const half: P2[] = [
    [-0.1, -0.44],
    [-0.13, -0.5],
    [-0.28, -0.44],
    [sleeveX, sleeveZ - cuff / 2],
    [sleeveX + 0.06, sleeveZ + cuff / 2],
    [-0.26, -0.18],
    [hemX, hemZ],
    [0, hemZ],
  ]
  // Neck scoop
  const neck: P2[] = [
    [-0.13, -0.5],
    [-0.08, -0.4],
    [0, -0.37],
    [0.08, -0.4],
    [0.13, -0.5],
  ]
  return [sym(half), neck]
}

function dress(waistX: number, hemX: number, hemZ: number): P2[][] {
  const half: P2[] = [
    [-0.08, -0.42],
    [-0.12, -0.5],
    [-0.2, -0.47],
    [-0.19, -0.25],
    [waistX, -0.1],
    [hemX, hemZ],
    [0, hemZ],
  ]
  return [sym(half), [[-0.08, -0.42], [0, -0.36], [0.08, -0.42]]]
}

function trousers(hemX: number, innerX: number): P2[][] {
  return [
    [
      [-0.22, -0.5],
      [0.22, -0.5],
      [hemX * -1, 0.5],
      [innerX * -1, 0.5],
      [0, -0.12],
      [innerX, 0.5],
      [hemX, 0.5],
      [-0.22, -0.5],
    ],
    [
      [-0.22, -0.42],
      [0.22, -0.42],
    ],
  ]
}

export function garmentIcon(id: string): P2[][] {
  switch (id) {
    case "buba":
      return top(-0.42, -0.3, 0.2, -0.27)
    case "dashiki": {
      const t = top(-0.4, -0.33, 0.15, -0.28)
      t.push([[-0.1, -0.37], [0, -0.2], [0.1, -0.37]]) // embroidered V
      return t
    }
    case "kaftanShort":
      return top(-0.4, -0.3, 0.3, -0.26)
    case "kaftanLong":
      return top(-0.5, -0.05, 0.5, -0.26)
    case "agbada":
      return [
        sym([
          [-0.1, -0.44],
          [-0.13, -0.5],
          [-0.5, -0.35],
          [-0.5, 0.25],
          [-0.25, 0.25],
          [-0.25, 0.5],
          [0, 0.5],
        ]),
        [[-0.13, -0.5], [0, -0.38], [0.13, -0.5]],
      ]
    case "corset":
      return [
        sym([
          [0, -0.4],
          [-0.28, -0.5],
          [-0.3, -0.35],
          [-0.18, 0],
          [-0.28, 0.4],
          [0, 0.48],
        ]),
        [[0, -0.4], [0, 0.48]],
      ]
    case "wrapper":
      return [
        sym([
          [0, -0.4],
          [-0.3, -0.4],
          [-0.36, 0.45],
          [0, 0.45],
        ]),
        [[0.3, -0.4], [0.05, 0.45]],
        [[-0.3, -0.3], [0.3, -0.3]],
      ]
    case "suit":
    case "blazer": {
      const t = top(-0.45, -0.05, 0.4, -0.3, 0.1)
      t[1] = [[-0.13, -0.5], [0, -0.05], [0.13, -0.5]] // V lapel
      t.push([[0, -0.05], [0, 0.4]])
      if (id === "suit") t.push([[-0.2, 0.15], [-0.08, 0.15]])
      return t
    }
    case "joggers":
      return trousers(-0.2, -0.06)
    case "palazzo":
      return trousers(-0.42, -0.02)
    case "bubu":
      return dress(-0.45, -0.5, 0.5)
    case "aLineDress":
      return dress(-0.16, -0.36, 0.45)
    case "sheathDress":
      return dress(-0.15, -0.2, 0.45)
    case "wrapDress": {
      const d = dress(-0.16, -0.32, 0.45)
      d.push([[0.08, -0.42], [-0.16, -0.1]], [[-0.16, -0.1], [0.32, 0.45]])
      return d
    }
    case "maxiGown":
      return dress(-0.14, -0.38, 0.5)
    default:
      return top(-0.42, -0.3, 0.2, -0.27)
  }
}
