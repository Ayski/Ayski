import type { VectorPath } from '../../types'
import { circ, dots, gloss, INK, lin, pixels, poly, rad, radLit, rect, rng, star, type Art } from './kit'
import { rotEll } from './cardparts'

// Artwork for gaming, anime/manga, street, vintage, glass, gradient,
// geometric and futuristic collections.

// Esports emblem: angular shield, lightning, hex field.
export function esportsEmblem(): Art {
  const shield = 'M50 6 L90 18 L86 62 Q74 86 50 96 Q26 86 14 62 L10 18 Z'
  return {
    viewW: 100,
    viewH: 102,
    paths: [
      { d: shield, fill: lin(10, 6, 90, 96, 0, '#2de2ff', 1, '#0a5fb4'), stroke: INK, sw: 4 },
      { d: 'M50 14 L82 24 L79 60 Q69 80 50 88 Z', fill: 'rgba(0,0,0,0.22)' },
      { d: 'M50 16 L80 25 L77 58 Q68 78 50 86 Q32 78 23 58 L20 25 Z', stroke: 'rgba(255,255,255,0.55)', sw: 1.4 },
      { d: poly([56, 22, 30, 58, 48, 58, 40, 84, 70, 44, 52, 44, 62, 22]), fill: lin(0, 22, 0, 84, 0, '#fff6b0', 1, '#ffb800'), stroke: INK, sw: 3 },
      gloss('M22 26 Q30 20 42 18', 2.6, 0.7),
    ],
  }
}

export function hexField(color = 'rgba(45,226,255,0.12)'): Art {
  let d = ''
  const s = 9
  const h = s * Math.sqrt(3)
  for (let row = 0; row * h * 0.5 < 112; row++) {
    for (let col = 0; col * s * 3 < 176; col++) {
      const cx = col * s * 3 + (row % 2 ? s * 1.5 : 0)
      const cy = row * h * 0.5
      const p: number[] = []
      for (let k = 0; k < 6; k++) p.push(cx + s * 0.92 * Math.cos((k * Math.PI) / 3), cy + s * 0.92 * Math.sin((k * Math.PI) / 3))
      d += poly(p)
    }
  }
  return { viewW: 160, viewH: 101, paths: [{ d, stroke: color, sw: 0.5 }] }
}

// 8-bit landscape: sky bands, sun, mountains, trees, clouds.
export function pixelLandscape(): Art {
  const W = 40
  const H = 25
  const rows: string[] = []
  for (let y = 0; y < H; y++) {
    let row = ''
    for (let x = 0; x < W; x++) {
      let c = y < 6 ? 'a' : y < 11 ? 'b' : 'c'
      const sx = x - 29
      const sy = y - 7
      if (sx * sx + sy * sy < 12) c = 'S'
      else if (sx * sx + sy * sy < 18) c = 's'
      const m1 = 11 + Math.abs((x % 14) - 7) * 0.95
      if (y > m1) c = y > m1 + 2 ? 'M' : 'm'
      if ((x === 6 || x === 7 || x === 22 || x === 23 || x === 24) && y >= 3 && y <= 4) c = 'w'
      if ((x === 5 || x === 8 || x === 21 || x === 25) && y === 4) c = 'w'
      const hill = 19 + Math.sin(x / 3) * 1.2
      if (y > hill) c = y > hill + 1.5 ? 'G' : 'g'
      if (y >= 22) c = y === 22 ? 'g' : 'D'
      row += c
    }
    rows.push(row)
  }
  for (const tx of [4, 12, 33]) {
    for (let k = 0; k < 4; k++) {
      const y = 15 + k
      const r = rows[y].split('')
      for (let dx = -k; dx <= k; dx++) if (r[tx + dx]) r[tx + dx] = 'T'
      rows[y] = r.join('')
    }
    const r = rows[19].split('')
    r[tx] = 'K'
    rows[19] = r.join('')
  }
  return {
    viewW: 160,
    viewH: 100,
    paths: pixels(rows, { a: '#3b4cca', b: '#5c6ee0', c: '#8fa3ff', S: '#fff3a0', s: '#ffd54a', m: '#9c8bd6', M: '#6b5fb0', w: '#ffffff', g: '#7ee34a', G: '#3fa82c', D: '#7a4a24', T: '#1f7a2e', K: '#5a3417' }, 4),
  }
}

// Cherry blossom branch with gradient petals, buds and falling petals.
export function sakuraBranch(): Art {
  const r = rng(12)
  const paths: VectorPath[] = []
  const branch = 'M160 18 Q128 22 108 34 Q92 44 70 46 M118 30 Q112 16 98 10 M96 42 Q92 58 80 70'
  paths.push({ d: branch, stroke: '#4a2a2a', sw: 3.2 }, { d: branch, stroke: '#6b3b36', sw: 1.6 })
  const blossom = (x: number, y: number, s: number) => {
    let petals = ''
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * 360 - 90
      const rad_ = (a * Math.PI) / 180
      petals += rotEll(x + 3.4 * s * Math.cos(rad_), y + 3.4 * s * Math.sin(rad_), 3.6 * s, 2.6 * s, a)
    }
    paths.push({ d: petals, fill: radLit(x, y, 7 * s, 0, '#fff4f8', 0.6, '#ffc3d9', 1, '#f58bb4'), stroke: 'rgba(170,60,100,0.45)', sw: 0.4 })
    paths.push({ d: circ(x, y, 1.2 * s), fill: '#e0457b' })
  }
  ;[
    [128, 24, 1.2], [112, 33, 1], [100, 14, 0.9], [92, 44, 1.1], [80, 50, 0.8], [84, 66, 1], [140, 20, 0.9], [72, 44, 0.7],
  ].forEach(([x, y, s]) => blossom(x, y, s))
  let fall = ''
  for (let i = 0; i < 12; i++) fall += rotEll(20 + r() * 130, 50 + r() * 50, 2.2, 1.3, r() * 180)
  paths.push({ d: fall, fill: '#ffb3cf', alpha: 0.85 })
  return { viewW: 160, viewH: 101, paths }
}

// Manga panel: diagonal split, speed lines, screentone, SFX.
export function mangaPanel(): Art {
  let speed = ''
  const r = rng(8)
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const r0 = 18 + r() * 10
    speed += `M${(110 + r0 * Math.cos(a)).toFixed(1)} ${(52 + r0 * 0.7 * Math.sin(a)).toFixed(1)}L${(110 + 140 * Math.cos(a)).toFixed(1)} ${(52 + 100 * Math.sin(a)).toFixed(1)}`
  }
  let tone = ''
  for (let y = 4; y < 101; y += 3.2) for (let x = (y / 3.2) % 2 ? 1.6 : 0; x < 70; x += 3.2) if (x < 66 - y * 0.55) tone += circ(x, y, 0.75)
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: speed, stroke: '#111', sw: 0.5 },
      { d: poly([0, 0, 72, 0, 18, 101, 0, 101]), fill: '#ffffff' },
      { d: tone, fill: '#111' },
      { d: 'M72 0 L18 101', stroke: '#111', sw: 3.2 },
      { d: 'M3 3 H157 V98 H3 Z', stroke: '#111', sw: 2.4 },
    ],
  }
}

// Brick wall with spray drips and a doodled crown.
export function graffitiWall(): Art {
  let mortar = ''
  for (let row = 0; row < 12; row++) {
    const y = row * 9
    mortar += `M0 ${y}H160`
    for (let x = row % 2 ? 10 : 0; x < 160; x += 20) mortar += `M${x} ${y}V${y + 9}`
  }
  const r = rng(31)
  let drips = ''
  let drops = ''
  for (let i = 0; i < 9; i++) {
    const x = 44 + r() * 76
    const y = 55.5 - (x - 80) * 0.105
    const len = 3 + r() * 11
    drips += `M${x.toFixed(1)} ${y.toFixed(1)}v${len.toFixed(1)}`
    drops += circ(x, y + len + 0.6, 1)
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: mortar, stroke: 'rgba(0,0,0,0.45)', sw: 0.8 },
      { d: mortar, stroke: 'rgba(255,255,255,0.05)', sw: 0.3 },
      { d: circ(30, 30, 24), fill: rad(30, 30, 24, 0, 'rgba(255,90,0,0.35)', 1, 'rgba(255,90,0,0)') },
      { d: circ(130, 70, 28), fill: rad(130, 70, 28, 0, 'rgba(0,200,255,0.25)', 1, 'rgba(0,200,255,0)') },
      { d: drips, stroke: '#ff7a00', sw: 1, alpha: 0.95 },
      { d: drops, fill: '#ff7a00', alpha: 0.95 },
      { d: 'M118 22 L122 12 L128 20 L134 10 L140 20 L146 12 L148 24 Z', stroke: '#ffe14d', sw: 1.4 },
      { d: star(30, 80, 5, 2, 5) + star(140, 86, 4, 1.6, 5), stroke: '#ffffff', sw: 0.8, alpha: 0.7 },
    ],
  }
}

// Seventies rainbow arcs.
export function seventies(): Art {
  const colors = ['#e2522b', '#ef8a2d', '#f2b63d', '#7a4a24']
  const paths: VectorPath[] = []
  colors.forEach((c, i) => {
    const r0 = 70 - i * 11
    paths.push({ d: `M${120 - r0} 101 A${r0} ${r0} 0 0 1 ${120 + r0} 101`, stroke: c, sw: 10 })
  })
  paths.push({ d: circ(120, 101, 20), fill: '#f6e7c8' })
  paths.push({ d: star(18, 84, 5, 1.8, 4, 0) + star(32, 76, 3, 1.1, 4, 0), fill: '#e2522b' })
  return { viewW: 160, viewH: 101, paths }
}

// Frosted glass panes with refraction edges and caustic lines.
export function glassPanes(): Art {
  const pane = (pts: number[], tint: string) => [
    { d: poly(pts), fill: tint },
    { d: poly(pts), stroke: 'rgba(255,255,255,0.55)', sw: 0.8 },
  ]
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: circ(120, 30, 26), fill: rad(120, 30, 26, 0, 'rgba(120,255,240,0.45)', 1, 'rgba(120,255,240,0)') },
      { d: circ(40, 80, 30), fill: rad(40, 80, 30, 0, 'rgba(150,120,255,0.4)', 1, 'rgba(150,120,255,0)') },
      ...pane([70, 14, 146, 24, 136, 74, 60, 64], 'rgba(255,255,255,0.12)'),
      ...pane([96, 40, 154, 50, 146, 94, 88, 86], 'rgba(255,255,255,0.08)'),
      { d: 'M74 18 L142 27', stroke: 'rgba(255,255,255,0.8)', sw: 1.2 },
      { d: 'M84 30 Q100 40 118 34 Q132 30 140 40 M80 46 Q98 54 116 48', stroke: 'rgba(255,255,255,0.25)', sw: 0.6 },
    ],
  }
}

// Aurora ribbons over a starry sky and mountain silhouette.
export function aurora(): Art {
  const ribbon = (y: number, amp: number, phase: number) => {
    let top = `M-5 ${y}`
    let bottom = ''
    const pts: [number, number][] = []
    for (let x = -5; x <= 165; x += 10) pts.push([x, y + Math.sin(x / 22 + phase) * amp])
    pts.forEach(([x, yy]) => (top += `L${x} ${yy.toFixed(1)}`))
    pts.reverse().forEach(([x, yy]) => (bottom += `L${x} ${(yy + 22).toFixed(1)}`))
    return top + bottom + 'Z'
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: dots(80, 21, 160, 70, 0.2, 0.6), fill: 'rgba(255,255,255,0.75)' },
      { d: ribbon(18, 10, 0), fill: lin(0, 18, 0, 50, 0, 'rgba(120,255,190,0)', 0.35, 'rgba(120,255,190,0.55)', 1, 'rgba(120,255,190,0)') },
      { d: ribbon(28, 12, 1.6), fill: lin(0, 28, 0, 62, 0, 'rgba(180,120,255,0)', 0.4, 'rgba(180,120,255,0.45)', 1, 'rgba(180,120,255,0)') },
      { d: ribbon(10, 8, 3), fill: lin(0, 10, 0, 40, 0, 'rgba(90,220,255,0)', 0.45, 'rgba(90,220,255,0.35)', 1, 'rgba(90,220,255,0)') },
      { d: poly([0, 101, 0, 78, 18, 64, 30, 72, 48, 56, 66, 74, 82, 66, 100, 80, 118, 60, 136, 76, 150, 68, 160, 74, 160, 101]), fill: '#0c1830' },
      { d: 'M0 78 L18 64 L30 72 L48 56 L66 74 L82 66 L100 80 L118 60 L136 76 L150 68 L160 74', stroke: 'rgba(160,255,210,0.4)', sw: 0.6 },
    ],
  }
}

// White beam through a glass prism, dispersed into a spectrum.
export function prism(): Art {
  const spectrum = ['#ff3b3b', '#ff9f1c', '#ffe14d', '#4cd137', '#2bb5ff', '#7c5cff']
  const paths: VectorPath[] = [{ d: 'M0 62 L66 50', stroke: 'rgba(255,255,255,0.9)', sw: 2 }]
  spectrum.forEach((c, i) => {
    const y = 40 + i * 9
    paths.push({ d: poly([92, 52 + i * 1.2, 160, y - 4, 160, y + 4, 92, 53.2 + i * 1.2]), fill: c, alpha: 0.85 })
  })
  paths.push({ d: poly([80, 22, 104, 70, 56, 70]), fill: lin(56, 22, 104, 70, 0, 'rgba(255,255,255,0.35)', 1, 'rgba(255,255,255,0.08)'), stroke: 'rgba(255,255,255,0.85)', sw: 1.2 })
  paths.push({ d: 'M80 22 L74 70', stroke: 'rgba(255,255,255,0.25)', sw: 0.6 })
  return { viewW: 160, viewH: 101, paths }
}

// HUD rings with ticks, arcs and a glowing core.
export function hudRings(color = '#38bdf8'): Art {
  let ticks = ''
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2
    const r0 = i % 5 ? 40 : 37
    ticks += `M${(50 + r0 * Math.cos(a)).toFixed(2)} ${(50 + r0 * Math.sin(a)).toFixed(2)}L${(50 + 43 * Math.cos(a)).toFixed(2)} ${(50 + 43 * Math.sin(a)).toFixed(2)}`
  }
  const arc = (r: number, a0: number, a1: number) => {
    const p = (a: number) => `${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`
    return `M${p(a0)}A${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${p(a1)}`
  }
  return {
    viewW: 100,
    viewH: 100,
    paths: [
      { d: circ(50, 50, 48), fill: rad(50, 50, 48, 0, 'rgba(56,189,248,0.18)', 1, 'rgba(56,189,248,0)') },
      { d: ticks, stroke: color, sw: 0.7, alpha: 0.8 },
      { d: arc(32, -1.2, 1.6) + arc(32, 2.2, 3.6), stroke: color, sw: 2.4, alpha: 0.9 },
      { d: arc(24, 0.4, 4.2), stroke: color, sw: 0.8, alpha: 0.7 },
      { d: circ(50, 50, 10), fill: radLit(50, 50, 10, 0, '#e0f7ff', 0.5, color, 1, '#0b4a6b') },
      { d: circ(50, 50, 15), stroke: color, sw: 0.6, alpha: 0.6 },
      { d: rect(49.4, 2, 1.2, 8) + rect(49.4, 90, 1.2, 8), fill: color },
    ],
  }
}

// Iridescent holographic foil: shifting colour ribbons, sheen, glitter, rings.
export function holoFoil(): Art {
  const r = rng(55)
  const hues = ['#ff7ad9', '#7ee8ff', '#b8ff7a', '#a98bff', '#ffd27a']
  const paths: VectorPath[] = []
  hues.forEach((c, i) => {
    const y0 = -18 + i * 26
    const top: [number, number][] = []
    for (let x = -10; x <= 170; x += 6) top.push([x, y0 + x * 0.22 + 7 * Math.sin(x / 19 + i * 1.3)])
    const thick = 15 + (i % 2) * 5
    const d =
      'M' + top.map(([x, y]) => `${x} ${y.toFixed(1)}`).join('L') +
      'L' + [...top].reverse().map(([x, y]) => `${x} ${(y + thick).toFixed(1)}`).join('L') + 'Z'
    paths.push({ d, fill: lin(0, 0, 160, 101, 0, c, 0.5, hues[(i + 2) % hues.length], 1, hues[(i + 4) % hues.length]), alpha: 0.42 })
  })
  let rings = ''
  for (let k = 1; k <= 7; k++) rings += circ(124, 30, k * 4.5)
  paths.push({ d: rings, stroke: 'rgba(255,255,255,0.35)', sw: 0.35 })
  paths.push({ d: poly([30, 0, 58, 0, 118, 101, 90, 101]), fill: lin(30, 0, 118, 101, 0, 'rgba(255,255,255,0)', 0.5, 'rgba(255,255,255,0.35)', 1, 'rgba(255,255,255,0)') })
  let glitter = ''
  let sparks = ''
  for (let i = 0; i < 60; i++) glitter += circ(r() * 160, r() * 101, 0.2 + r() * 0.45)
  for (let i = 0; i < 8; i++) sparks += star(r() * 160, r() * 101, 2.2, 0.4, 4, 0)
  paths.push({ d: glitter, fill: 'rgba(255,255,255,0.75)' }, { d: sparks, fill: 'rgba(255,255,255,0.9)' })
  return { viewW: 160, viewH: 101, paths }
}
