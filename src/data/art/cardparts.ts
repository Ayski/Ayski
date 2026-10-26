import type { VectorPath } from '../../types'
import { circ, lin, rrect, type Art } from './kit'

// Realistic card hardware and small ornaments shared by the premium designs.

const METALS = {
  gold: ['#fff1c2', '#e9c46a', '#b8892c', '#f6d98b'],
  silver: ['#ffffff', '#d7dbe0', '#8f969e', '#eceef1'],
  rose: ['#ffe4da', '#e9a99a', '#a86452', '#f6cbbf'],
} as const

export type Metal = keyof typeof METALS

// EMV contact chip: bevelled plate with engraved contact pads.
export function chipArt(metal: Metal = 'gold'): Art {
  const [hi, mid, lo, rim] = METALS[metal]
  const line = metal === 'silver' ? 'rgba(40,44,50,0.45)' : 'rgba(90,60,10,0.5)'
  return {
    viewW: 52,
    viewH: 40,
    paths: [
      { d: rrect(1, 1, 50, 38, 7), fill: lin(0, 0, 52, 40, 0, hi, 0.45, mid, 1, lo), stroke: 'rgba(0,0,0,0.35)', sw: 0.8 },
      { d: rrect(3, 3, 46, 34, 6), stroke: rim, sw: 0.8, alpha: 0.7 },
      { d: rrect(18, 11, 16, 18, 3), fill: lin(0, 11, 0, 29, 0, mid, 1, hi), stroke: line, sw: 1.1 },
      {
        d: 'M18 14 H6 M18 20 H3 M18 26 H6 M34 14 H46 M34 20 H49 M34 26 H46 M26 11 V3 M26 29 V37',
        stroke: line,
        sw: 1.1,
      },
      { d: 'M6 6 Q14 3 24 4', stroke: 'rgba(255,255,255,0.75)', sw: 1.2 },
    ],
  }
}

// Contactless symbol (four arcs).
export function contactlessArt(color = 'rgba(255,255,255,0.85)'): Art {
  const arcs = [5, 10, 15, 20].map((r) => {
    const a = (50 * Math.PI) / 180
    const x0 = 6 + r * Math.cos(-a)
    const y0 = 17 + r * Math.sin(-a)
    const x1 = 6 + r * Math.cos(a)
    const y1 = 17 + r * Math.sin(a)
    return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
  })
  return { viewW: 30, viewH: 34, paths: [{ d: arcs.join(''), stroke: color, sw: 2.6 }] }
}

// Ellipse rotated by `deg` (for leaves, petals, scales).
export function rotEll(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const a = (deg * Math.PI) / 180
  const x1 = cx - rx * Math.cos(a)
  const y1 = cy - rx * Math.sin(a)
  const x2 = cx + rx * Math.cos(a)
  const y2 = cy + rx * Math.sin(a)
  const f = (v: number) => v.toFixed(2)
  return `M${f(x1)} ${f(y1)}A${f(rx)} ${f(ry)} ${f(deg)} 1 0 ${f(x2)} ${f(y2)}A${f(rx)} ${f(ry)} ${f(deg)} 1 0 ${f(x1)} ${f(y1)}Z`
}

// Laurel wreath with a centred monogram disc.
export function laurel(gold = true): Art {
  const leafFill = gold ? lin(0, 0, 100, 100, 0, '#fff1c2', 0.5, '#e2b85a', 1, '#a87a22') : lin(0, 0, 100, 100, 0, '#ffffff', 1, '#9aa0a8')
  const edge = gold ? 'rgba(80,50,5,0.55)' : 'rgba(30,34,40,0.5)'
  let leaves = ''
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++) {
      const t = 0.12 + i * 0.1
      const ang = Math.PI / 2 + side * (t * Math.PI * 0.95)
      const cx = 50 + 38 * Math.cos(ang)
      const cy = 52 + 38 * Math.sin(ang)
      const tangent = (ang * 180) / Math.PI + 90 * side
      leaves += rotEll(cx + side * 4 * Math.cos(ang + Math.PI / 2), cy + 4 * Math.sin(ang + Math.PI / 2), 7, 3, tangent - 25 * side)
      leaves += rotEll(cx - side * 4 * Math.cos(ang + Math.PI / 2), cy - 4 * Math.sin(ang + Math.PI / 2), 7, 3, tangent + 25 * side)
    }
  }
  const paths: VectorPath[] = [
    { d: 'M50 90 A38 38 0 0 1 14 40 M50 90 A38 38 0 0 0 86 40', stroke: edge, sw: 1.4 },
    { d: leaves, fill: leafFill, stroke: edge, sw: 0.6 },
    { d: circ(50, 50, 16), fill: leafFill, stroke: edge, sw: 0.9 },
    { d: circ(50, 50, 12.5), stroke: gold ? 'rgba(255,245,210,0.8)' : 'rgba(255,255,255,0.8)', sw: 0.8 },
  ]
  return { viewW: 100, viewH: 100, paths }
}

// Six-fold snowflake with side branches and a soft glow pass.
export function snowflake(): Art {
  let d = ''
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 - Math.PI / 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    const P = (r: number, off: number) => [50 + r * ca - off * sa, 50 + r * sa + off * ca]
    const [x0, y0] = P(6, 0)
    const [x1, y1] = P(44, 0)
    d += `M${x0} ${y0}L${x1} ${y1}`
    for (const [r, len] of [[18, 8], [28, 10], [37, 6]] as const) {
      const [bx, by] = P(r, 0)
      const [lx, ly] = P(r + len * 0.8, len)
      const [rx, ry] = P(r + len * 0.8, -len)
      d += `M${bx} ${by}L${lx} ${ly}M${bx} ${by}L${rx} ${ry}`
    }
  }
  const hex = Array.from({ length: 6 }, (_, k) => {
    const a = (k * Math.PI) / 3 - Math.PI / 2
    return `${(50 + 7 * Math.cos(a)).toFixed(2)} ${(50 + 7 * Math.sin(a)).toFixed(2)}`
  })
  return {
    viewW: 100,
    viewH: 100,
    paths: [
      { d, stroke: 'rgba(255,255,255,0.25)', sw: 6 },
      { d, stroke: lin(0, 0, 100, 100, 0, '#ffffff', 1, '#cfe3f5'), sw: 2.2 },
      { d: 'M' + hex.join('L') + 'Z', fill: 'rgba(255,255,255,0.9)', stroke: '#e3f0fb', sw: 1 },
    ],
  }
}
