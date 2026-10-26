import type { VectorPath } from '../../types'
import { circ, dots, lin, poly, rad, radLit, rng, star, type Art } from './kit'

// Premium, understated artwork for the luxury / metal / minimal collections.

// Low-poly obsidian facets with a soft diagonal sheen.
export function onyxFacets(): Art {
  const r = rng(77)
  const cols = 7
  const rows = 4
  const pts: [number, number][][] = []
  for (let y = 0; y <= rows; y++) {
    const row: [number, number][] = []
    for (let x = 0; x <= cols; x++) {
      const jx = x === 0 || x === cols ? 0 : (r() - 0.5) * 14
      const jy = y === 0 || y === rows ? 0 : (r() - 0.5) * 12
      row.push([(x / cols) * 160 + jx, (y / rows) * 101 + jy])
    }
    pts.push(row)
  }
  const paths: VectorPath[] = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const a = pts[y][x]
      const b = pts[y][x + 1]
      const c = pts[y + 1][x + 1]
      const d = pts[y + 1][x]
      for (const tri of [[a, b, c], [a, c, d]]) {
        const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3
        const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3
        const light = 1 - (cx / 160) * 0.6 - (cy / 101) * 0.4
        const v = Math.round(10 + light * 22 + r() * 8)
        paths.push({ d: poly(tri.flat()), fill: `rgb(${v},${v},${v + 3})`, stroke: 'rgba(255,255,255,0.035)', sw: 0.4 })
      }
    }
  }
  paths.push({ d: poly([40, 0, 72, 0, 120, 101, 88, 101]), fill: lin(40, 0, 120, 101, 0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.06)', 1, 'rgba(255,255,255,0)') })
  return { viewW: 160, viewH: 101, paths }
}

// Total solar eclipse: corona, dark disc, "diamond ring" flash.
export function eclipse(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: dots(60, 314, 160, 101, 0.2, 0.55), fill: 'rgba(255,255,255,0.55)' },
      { d: circ(114, 46, 46), fill: rad(114, 46, 46, 0, 'rgba(255,210,120,0)', 0.5, 'rgba(255,210,120,0)', 0.56, 'rgba(255,214,140,0.95)', 0.64, 'rgba(255,170,70,0.45)', 0.8, 'rgba(255,140,40,0.12)', 1, 'rgba(255,140,40,0)') },
      { d: circ(114, 46, 25.6), fill: rad(110, 42, 26, 0, '#141418', 1, '#020203') },
      { d: circ(114, 46, 25.6), stroke: 'rgba(255,236,190,0.9)', sw: 0.7 },
      { d: circ(96.5, 29, 6), fill: rad(96.5, 29, 6, 0, 'rgba(255,255,255,0.95)', 1, 'rgba(255,255,255,0)') },
      { d: star(96.5, 29, 11, 0.55, 4, -45), fill: 'rgba(255,255,255,0.9)' },
    ],
  }
}

// Art-deco double frame, stepped corners, sunburst and crown.
export function decoFrame(): Art {
  const gold = lin(0, 0, 160, 101, 0, '#fff1c2', 0.45, '#d9a94a', 1, '#9b6a1e')
  let rays = ''
  for (let i = 0; i <= 16; i++) {
    const a = Math.PI + (i / 16) * Math.PI
    rays += `M80 30L${(80 + 46 * Math.cos(a)).toFixed(1)} ${(30 + 30 * Math.sin(a)).toFixed(1)}`
  }
  const corner = (sx: number, sy: number) => {
    const x = sx < 0 ? 10 : 150
    const y = sy < 0 ? 10 : 91
    const dx = -sx
    const dy = -sy
    return `M${x} ${y + dy * 14}V${y}H${x + dx * 14}M${x + dx * 4} ${y + dy * 10}V${y + dy * 4}H${x + dx * 10}`
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: rays, stroke: 'rgba(233,196,106,0.22)', sw: 0.7 },
      { d: 'M6 6H154V95H6Z', stroke: gold, sw: 1.1 },
      { d: 'M9.5 9.5H150.5V91.5H9.5Z', stroke: 'rgba(233,196,106,0.55)', sw: 0.5 },
      { d: corner(-1, -1) + corner(1, -1) + corner(-1, 1) + corner(1, 1), stroke: gold, sw: 1.2 },
      { d: 'M68 34 L70 22 L75 28 L80 18 L85 28 L90 22 L92 34 Z', fill: gold, stroke: 'rgba(60,30,5,0.55)', sw: 0.6 },
      { d: 'M67 34.5 H93 V37.5 H67 Z', fill: gold, stroke: 'rgba(60,30,5,0.55)', sw: 0.5 },
      { d: circ(70, 21, 1.6) + circ(80, 17, 1.8) + circ(90, 21, 1.6), fill: '#fff4cf' },
      { d: 'M44 74 H70 M90 74 H116', stroke: gold, sw: 0.7 },
      { d: poly([80, 71, 83, 74, 80, 77, 77, 74]), fill: gold },
    ],
  }
}

// Engraved hexagon micro-pattern (very low contrast).
export function hexMicro(color = 'rgba(0,0,0,0.07)'): Art {
  let d = ''
  const s = 5
  const h = s * Math.sqrt(3)
  for (let row = 0; row * h * 0.5 < 112; row++) {
    for (let col = 0; col * s * 3 < 176; col++) {
      const cx = col * s * 3 + (row % 2 ? s * 1.5 : 0)
      const cy = row * h * 0.5
      const p: number[] = []
      for (let k = 0; k < 6; k++) {
        const a = (k * Math.PI) / 3
        p.push(cx + s * Math.cos(a), cy + s * Math.sin(a))
      }
      d += poly(p)
    }
  }
  return { viewW: 160, viewH: 101, paths: [{ d, stroke: color, sw: 0.35 }] }
}

// Angular racing chevrons in brushed gold.
export function chevrons(): Art {
  const gold = lin(0, 0, 60, 101, 0, '#fff1c2', 0.5, '#d9a94a', 1, '#8f611a')
  const ch = (x: number, w: number) => poly([x, 0, x + w, 0, x + w + 28, 50.5, x + w, 101, x, 101, x + 28, 50.5])
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: ch(96, 9), fill: gold, alpha: 0.95 },
      { d: ch(112, 4), fill: gold, alpha: 0.8 },
      { d: ch(122, 2), fill: gold, alpha: 0.6 },
      { d: 'M96 0 L124 50.5 L96 101', stroke: 'rgba(255,255,255,0.35)', sw: 0.5 },
    ],
  }
}

// Stealth flying wing (sawtooth trailing edge) with violet edge glow.
export function stealthShapes(): Art {
  const glow = '#9b8cff'
  const wing = poly([113, 36, 156, 62, 148, 66, 140, 63, 131, 70, 122, 64, 113, 73, 104, 64, 95, 70, 86, 63, 78, 66, 70, 62])
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: wing, fill: lin(90, 36, 136, 73, 0, '#2a2b33', 1, '#09090c') },
      { d: poly([113, 36, 156, 62, 148, 66, 140, 63, 131, 70, 122, 64, 113, 73]), fill: 'rgba(0,0,0,0.35)' },
      { d: 'M113 36 L122 64 M113 36 L104 64 M113 36 L113 73', stroke: 'rgba(255,255,255,0.08)', sw: 0.5 },
      { d: wing, stroke: glow, sw: 2.6, alpha: 0.16 },
      { d: wing, stroke: glow, sw: 0.7, alpha: 0.95 },
      { d: 'M108 52 L118 52', stroke: 'rgba(155,140,255,0.6)', sw: 1.2 },
      { d: 'M0 88 L40 88 L48 80 L92 80', stroke: glow, sw: 0.5, alpha: 0.45 },
    ],
  }
}

// Glowing golden orb with a thin orbit ring.
export function orb(): Art {
  return {
    viewW: 100,
    viewH: 100,
    paths: [
      { d: circ(50, 50, 48), fill: rad(50, 50, 48, 0, 'rgba(217,180,91,0.35)', 0.45, 'rgba(217,180,91,0.08)', 1, 'rgba(217,180,91,0)') },
      { d: 'M14 58 A38 12 -12 0 0 86 42', stroke: 'rgba(233,196,106,0.35)', sw: 0.8 },
      { d: circ(50, 50, 16), fill: radLit(50, 50, 16, 0, '#fff3c4', 0.5, '#e2b85a', 1, '#8a611c') },
      { d: 'M86 42 A38 12 -12 0 0 14 58', stroke: 'rgba(233,196,106,0.75)', sw: 0.8 },
      { d: circ(44.5, 44, 3.2), fill: 'rgba(255,255,255,0.75)' },
    ],
  }
}

// A single continuous calligraphic line: hills and a sun.
export function oneLine(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      {
        d: 'M14 70 C30 70 34 46 48 46 C60 46 64 64 74 64 C84 64 90 34 104 34 C116 34 118 58 128 60 C136 62 140 52 146 52',
        stroke: '#111216',
        sw: 0.9,
      },
      { d: circ(118, 22, 7), stroke: '#111216', sw: 0.9 },
      { d: 'M14 74 H146', stroke: 'rgba(17,18,22,0.25)', sw: 0.4 },
    ],
  }
}

// Fine frost cracks radiating from a corner.
export function frostCracks(): Art {
  const r = rng(5)
  let d = ''
  for (let i = 0; i < 9; i++) {
    let x = 160
    let y = 0
    const a0 = Math.PI * (0.55 + r() * 0.4)
    d += `M${x} ${y}`
    for (let k = 0; k < 6; k++) {
      const a = a0 + (r() - 0.5) * 0.6
      const len = 8 + r() * 10
      x += Math.cos(a) * len
      y += Math.sin(a) * len
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`
    }
  }
  return { viewW: 160, viewH: 101, paths: [{ d, stroke: 'rgba(255,255,255,0.35)', sw: 0.45 }] }
}
