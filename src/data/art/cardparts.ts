import type { VectorPath } from '../../types'
import { circ, lin, rad, rect, rrect, type Art } from './kit'

// Realistic card hardware and small ornaments shared by the premium designs.

const METALS = {
  // highlight, body, shadow, rim/bevel, deep edge
  gold: ['#fff6d6', '#e6c068', '#a87a26', '#f8dc92', '#5e4210'],
  silver: ['#ffffff', '#d5d9df', '#868d96', '#eef0f3', '#4a5058'],
  rose: ['#fff0ea', '#e8aa98', '#a5604e', '#f7cfc2', '#5e2e24'],
} as const

export type Metal = keyof typeof METALS

// Translate an SVG path (absolute commands are shifted, relative ones kept).
function shiftPath(d: string, dx: number, dy: number): string {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  let out = ''
  let cmd = ''
  let i = 0
  for (const t of tok) {
    if (/[a-zA-Z]/.test(t)) {
      cmd = t
      i = 0
      out += t
      continue
    }
    let v = parseFloat(t)
    if (cmd === cmd.toUpperCase()) {
      if (cmd === 'H') v += dx
      else if (cmd === 'V') v += dy
      else if (cmd === 'A') v += i % 7 === 5 ? dx : i % 7 === 6 ? dy : 0
      else v += i % 2 ? dy : dx
    }
    out += (/[a-zA-Z]$/.test(out) ? '' : ' ') + Math.round(v * 100) / 100
    i++
  }
  return out
}

// EMV contact chip: recessed pocket, bevelled metal plate, engraved contact
// pads, brushed micro-texture and a soft specular sweep (key light top-left).
export function chipArt(metal: Metal = 'gold'): Art {
  const [hi, mid, lo, rim, deep] = METALS[metal]
  const plate = rrect(1.6, 1.6, 48.8, 36.8, 6.5)
  const grooves =
    'M1.6 14.2H11Q14 14.2 17.4 12.4M1.6 25.8H11Q14 25.8 17.4 27.6' +
    'M50.4 14.2H41Q38 14.2 34.6 12.4M50.4 25.8H41Q38 25.8 34.6 27.6' +
    'M26 1.6V9.6M26 30.4V38.4' +
    rrect(17.4, 9.6, 17.2, 20.8, 3.6)
  let brush = ''
  for (let k = 0; k < 15; k++) {
    const y = 3 + k * 2.4 + ((k * 7) % 5) * 0.2
    brush += `M2 ${y.toFixed(2)}H50`
  }
  const paths: VectorPath[] = [
    // pocket milled into the card + soft contact shadow
    { d: rrect(0.4, 0.9, 51.2, 38.9, 7.4), fill: 'rgba(0,0,0,0.38)' },
    { d: rrect(0.9, 0.9, 50.2, 38.2, 7), fill: 'rgba(0,0,0,0.3)' },
    // plate body: metal banding from the light
    { d: plate, fill: lin(2, 2, 46, 40, 0, hi, 0.28, mid, 0.52, rim, 0.78, mid, 1, lo) },
    // pad-to-pad tone variation (each contact is a separate piece of metal)
    { d: rrect(17.4, 9.6, 17.2, 20.8, 3.6), fill: lin(17, 9, 35, 31, 0, 'rgba(255,255,255,0.28)', 1, 'rgba(0,0,0,0.12)') },
    { d: rect(1.6, 14.2, 15.8, 11.6) + rect(34.6, 14.2, 15.8, 11.6), fill: 'rgba(0,0,0,0.06)', clip: plate },
    // brushed micro streaks
    { d: brush, stroke: 'rgba(255,255,255,0.22)', sw: 0.25, clip: plate },
    { d: shiftPath(brush, 0, 1.1), stroke: 'rgba(0,0,0,0.08)', sw: 0.25, clip: plate },
    // engraved grooves: dark cut, lit lower lip
    { d: grooves, stroke: deep, sw: 1.05, alpha: 0.75, clip: plate },
    { d: shiftPath(grooves, 0.35, 0.55), stroke: rim, sw: 0.45, alpha: 0.8, clip: plate },
    // core shading toward the bottom-right
    { d: plate, fill: lin(10, 6, 50, 40, 0, 'rgba(0,0,0,0)', 0.6, 'rgba(0,0,0,0)', 1, 'rgba(0,0,0,0.28)'), blend: 'multiply' },
    // specular sweep
    {
      d: 'M6 40L24 0H33L15 40Z',
      fill: lin(6, 20, 33, 20, 0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.55)', 1, 'rgba(255,255,255,0)'),
      clip: plate,
      blend: 'screen',
    },
    // bevelled edge: lit top-left, dark bottom-right
    {
      d: plate,
      stroke: lin(0, 0, 52, 40, 0, 'rgba(255,255,255,0.95)', 0.45, 'rgba(255,255,255,0.15)', 0.55, 'rgba(0,0,0,0.1)', 1, 'rgba(0,0,0,0.55)'),
      sw: 1,
    },
    { d: rrect(3, 3, 46, 34, 5.4), stroke: 'rgba(0,0,0,0.12)', sw: 0.4 },
    // tiny glint on the corner facing the light
    { d: circ(7.2, 5.4, 1.6), fill: rad(7.2, 5.4, 1.6, 0, 'rgba(255,255,255,0.95)', 1, 'rgba(255,255,255,0)'), blend: 'screen' },
  ]
  return { viewW: 52, viewH: 40, paths }
}

// Contactless symbol (four arcs), laser-engraved: soft shadow, body, lit edge.
export function contactlessArt(color = 'rgba(255,255,255,0.85)'): Art {
  const arcs = [5, 10, 15, 20]
    .map((r) => {
      const a = (50 * Math.PI) / 180
      const x0 = 6 + r * Math.cos(-a)
      const y0 = 17 + r * Math.sin(-a)
      const x1 = 6 + r * Math.cos(a)
      const y1 = 17 + r * Math.sin(a)
      return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
    })
    .join('')
  return {
    viewW: 30,
    viewH: 34,
    paths: [
      { d: shiftPath(arcs, 0.6, 0.9), stroke: 'rgba(0,0,0,0.35)', sw: 3 },
      { d: arcs, stroke: color, sw: 2.6 },
      { d: shiftPath(arcs, -0.45, -0.55), stroke: 'rgba(255,255,255,0.35)', sw: 0.7 },
    ],
  }
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
