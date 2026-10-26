import type { VectorPath } from '../../types'
import { blob, circ, cloud, dots, ell, flower, INK, poly, rect, rng, rrect, spiral, star, type Art } from './kit'

// Hand-drawn parody doodles of well-known cartoon universes.
// Original drawings — no official logos, names or artwork.

// ---- Sea sponge in square pants -------------------------------------------
export function sponge(): Art {
  const Y = '#f7e04b'
  const YD = '#d9bd2a'
  const pores: [number, number, number][] = [
    [54, 38, 7], [150, 42, 8], [100, 30, 5], [52, 112, 5], [158, 88, 5], [70, 130, 6], [146, 126, 6],
  ]
  const paths: VectorPath[] = [
    { d: 'M38 98 Q16 108 20 132', stroke: INK, sw: 5 },
    { d: 'M162 98 Q184 108 180 130', stroke: INK, sw: 5 },
    { d: 'M72 176 L72 198', stroke: INK, sw: 5 },
    { d: 'M128 176 L128 198', stroke: INK, sw: 5 },
    { d: rect(65, 184, 14, 12), fill: '#fff', stroke: INK, sw: 2.5 },
    { d: rect(121, 184, 14, 12), fill: '#fff', stroke: INK, sw: 2.5 },
    { d: 'M65 188.5 H79 M121 188.5 H135', stroke: '#d6342c', sw: 2 },
    { d: 'M65 192 H79 M121 192 H135', stroke: '#2d6fb6', sw: 2 },
    { d: ell(66, 204, 16, 8), fill: INK },
    { d: ell(134, 204, 16, 8), fill: INK },
    // body
    { d: 'M38 22 Q58 12 80 20 Q102 28 122 18 Q144 10 162 22 Q168 80 164 142 L36 144 Q32 84 38 22 Z', fill: Y, stroke: INK, sw: 5 },
    { d: pores.map(([x, y, r]) => circ(x, y, r)).join(''), fill: YD },
    // shirt, collar, tie
    { d: 'M36 144 L164 142 L164 154 L36 156 Z', fill: '#fff', stroke: INK, sw: 4 },
    { d: 'M84 144 L96 152 L100 144 M116 144 L104 152 L100 144', stroke: INK, sw: 3 },
    { d: 'M96 147 L104 147 L106 156 L100 170 L94 156 Z', fill: '#d6342c', stroke: INK, sw: 3 },
    // square pants + belt
    { d: 'M36 156 L164 154 L162 178 L38 180 Z', fill: '#8a5a2b', stroke: INK, sw: 4 },
    { d: 'M48 162 H62 M74 162 H88 M112 162 H126 M138 162 H152', stroke: INK, sw: 4 },
    // eyes
    { d: circ(78, 62, 21) + circ(122, 62, 21), fill: '#fff', stroke: INK, sw: 4 },
    { d: circ(82, 64, 9) + circ(118, 64, 9), fill: '#4aa3df', stroke: INK, sw: 2.5 },
    { d: circ(82, 64, 4) + circ(118, 64, 4), fill: INK },
    { d: circ(85, 60, 2) + circ(121, 60, 2), fill: '#fff' },
    { d: 'M66 42 L61 31 M78 40 L78 28 M90 42 L95 31 M110 42 L105 31 M122 40 L122 28 M134 42 L139 31', stroke: INK, sw: 3.5 },
    // cheeks + freckles
    { d: circ(52, 96, 10) + circ(148, 96, 10), fill: '#f29c9c' },
    { d: circ(48, 94, 1.6) + circ(54, 99, 1.6) + circ(50, 101, 1.6) + circ(146, 94, 1.6) + circ(152, 98, 1.6) + circ(148, 101, 1.6), fill: '#b5443f' },
    // teeth then smile, nose on top
    { d: rect(88, 112, 11, 14) + rect(101, 112, 11, 14), fill: '#fff', stroke: INK, sw: 3 },
    { d: 'M56 96 Q100 136 144 96', stroke: INK, sw: 5 },
    { d: 'M100 70 Q124 72 119 87 Q110 93 101 85', fill: Y, stroke: INK, sw: 4 },
  ]
  return { viewW: 200, viewH: 214, paths }
}

// Underwater backdrop with flower-shaped "sky" spots and bubbles.
export function seaBackdrop(): Art {
  const paths: VectorPath[] = []
  const spots: [number, number, number, string][] = [
    [18, 16, 9, '#7fd3f5'], [132, 12, 8, '#9be7c4'], [150, 70, 7, '#7fd3f5'], [10, 78, 6, '#c3b5ff'], [118, 40, 5, '#9be7c4'],
  ]
  spots.forEach(([x, y, r, c]) => {
    let d = ''
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      d += circ(x + r * 0.6 * Math.cos(a), y + r * 0.6 * Math.sin(a), r * 0.55)
    }
    paths.push({ d, fill: c }, { d: circ(x, y, r * 0.35), fill: 'rgba(255,255,255,0.55)' })
  })
  const r = rng(11)
  let bub = ''
  for (let i = 0; i < 14; i++) bub += circ(110 + r() * 46, 20 + r() * 75, 1.2 + r() * 3)
  paths.push({ d: bub, stroke: 'rgba(255,255,255,0.85)', sw: 0.8 })
  // sand
  paths.push({ d: 'M0 88 Q40 82 80 88 Q120 94 160 86 L160 101 L0 101 Z', fill: '#f1d48a', stroke: INK, sw: 1.2 })
  const sr = rng(5)
  let sand = ''
  for (let i = 0; i < 28; i++) sand += circ(sr() * 160, 90 + sr() * 10, 0.4 + sr() * 0.5)
  paths.push({ d: sand, fill: '#c9a24f' })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Pink frosted donut ----------------------------------------------------
export function donut(): Art {
  const sprinkleColors = ['#ffe14d', '#4fc3f7', '#ffffff', '#7ee08a', '#b388ff', '#ff7043']
  const r = rng(7)
  const byColor = new Map<string, string>()
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2
    const rad = 40 + r() * 20
    const x = 100 + rad * Math.cos(a)
    const y = 100 + rad * Math.sin(a)
    const t = r() * Math.PI
    const dx = 4.5 * Math.cos(t)
    const dy = 4.5 * Math.sin(t)
    const c = sprinkleColors[i % sprinkleColors.length]
    byColor.set(c, (byColor.get(c) ?? '') + `M${(x - dx).toFixed(1)} ${(y - dy).toFixed(1)}L${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`)
  }
  const paths: VectorPath[] = [
    { d: circ(100, 100, 82) + circ(100, 100, 26), fill: '#e9a65a', stroke: INK, sw: 5, rule: 'evenodd' },
    { d: 'M30 128 Q60 176 120 178', stroke: 'rgba(120,60,10,0.35)', sw: 6 },
    { d: blob(100, 100, 66, 5, 9) + circ(100, 100, 32), fill: '#f47fb2', stroke: INK, sw: 4, rule: 'evenodd' },
    ...[...byColor.entries()].map(([c, d]) => ({ d, stroke: c, sw: 4.5 })),
    { d: 'M58 72 Q70 52 94 44', stroke: 'rgba(255,255,255,0.75)', sw: 6 },
  ]
  return { viewW: 200, viewH: 200, paths }
}

export function skyClouds(spots: [number, number, number][] = [[150, 12, 0.38], [88, 8, 0.3], [148, 90, 0.32]]): Art {
  return { viewW: 160, viewH: 101, paths: spots.flatMap(([x, y, s]) => cloud(x, y, s)) }
}

// ---- Green swirling portal + lab flask --------------------------------------
export function portal(): Art {
  const paths: VectorPath[] = [
    { d: blob(100, 100, 94, 5, 6), fill: 'rgba(158,240,26,0.22)' },
    { d: blob(100, 100, 80, 6, 7), fill: '#2fbf4a', stroke: '#0d4d1c', sw: 4 },
    { d: blob(100, 100, 62, 5, 8, 1), fill: '#7be04a' },
    { d: blob(100, 100, 40, 4, 9, 2), fill: '#c9f75a' },
    { d: spiral(100, 100, 4, 74, 3.2), stroke: '#efffc2', sw: 4 },
    { d: spiral(100, 100, 6, 70, 3.2, Math.PI), stroke: '#1e8f3a', sw: 3 },
    { d: circ(20, 60, 6) + circ(178, 130, 7) + circ(30, 156, 4) + circ(170, 40, 4), fill: '#7be04a', stroke: '#0d4d1c', sw: 2 },
  ]
  return { viewW: 200, viewH: 200, paths }
}

export function flask(): Art {
  return {
    viewW: 80,
    viewH: 118,
    paths: [
      { d: 'M30 12 H50 V46 L72 100 Q75 112 62 112 H18 Q5 112 8 100 L30 46 Z', fill: 'rgba(220,240,255,0.55)', stroke: INK, sw: 4 },
      { d: 'M23 72 H57 L69 101 Q71 108 62 108 H18 Q9 108 11 101 Z', fill: '#7be04a' },
      { d: circ(32, 92, 4) + circ(46, 84, 3) + circ(52, 98, 2.5), fill: 'rgba(255,255,255,0.8)' },
      { d: rrect(27, 2, 26, 12, 3), fill: '#b5835a', stroke: INK, sw: 3 },
      { d: 'M36 22 V40', stroke: 'rgba(255,255,255,0.8)', sw: 3 },
    ],
  }
}

export function starfield(seed: number, count = 70): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: dots(count, seed, 160, 101, 0.25, 0.8), fill: 'rgba(255,255,255,0.85)' },
      { d: star(140, 18, 3, 1, 4, 0) + star(22, 80, 2.4, 0.8, 4, 0), fill: '#ffffff' },
    ],
  }
}

// ---- Lazy orange cat + lasagna ---------------------------------------------
export function lazyCat(): Art {
  const O = '#f39a2b'
  const CREAM = '#fde3a7'
  return {
    viewW: 220,
    viewH: 190,
    paths: [
      { d: 'M48 74 L56 18 L100 52 Z M172 74 L164 18 L120 52 Z', fill: O, stroke: INK, sw: 5 },
      { d: 'M60 58 L64 34 L86 52 Z M160 58 L156 34 L134 52 Z', fill: '#f6b8a0' },
      { d: 'M30 112 Q28 54 110 46 Q192 54 190 112 Q190 170 110 174 Q30 170 30 112 Z', fill: O, stroke: INK, sw: 5 },
      { d: 'M98 50 Q103 64 96 76 M110 48 V74 M122 50 Q117 64 124 76', stroke: INK, sw: 5 },
      { d: ell(86, 100, 24, 28) + ell(134, 100, 24, 28), fill: '#fff', stroke: INK, sw: 4 },
      { d: circ(92, 110, 6) + circ(128, 110, 6), fill: INK },
      // heavy, lazy eyelids
      { d: 'M61 101 Q60 70 86 71 Q112 70 111 101 Q86 92 61 101 Z M109 101 Q108 70 134 71 Q160 70 159 101 Q134 92 109 101 Z', fill: O, stroke: INK, sw: 4 },
      { d: ell(98, 138, 20, 15) + ell(122, 138, 20, 15), fill: CREAM, stroke: INK, sw: 3.5 },
      { d: 'M102 123 Q110 117 118 123 Q110 133 102 123 Z', fill: '#f07ca0', stroke: INK, sw: 3 },
      { d: 'M96 152 Q110 160 128 147', stroke: INK, sw: 4 },
      { d: 'M74 134 L28 126 M74 142 L26 146 M146 134 L192 126 M146 142 L194 146', stroke: INK, sw: 3 },
    ],
  }
}

export function lasagna(): Art {
  return {
    viewW: 140,
    viewH: 92,
    paths: [
      { d: ell(70, 78, 66, 13), fill: '#ffffff', stroke: INK, sw: 4 },
      { d: 'M20 74 L120 74 L118 63 L22 63 Z', fill: '#f5d27a', stroke: INK, sw: 3 },
      { d: 'M22 63 L118 63 L116 52 L24 52 Z', fill: '#c9381e', stroke: INK, sw: 3 },
      { d: 'M24 52 L116 52 L114 42 L26 42 Z', fill: '#f5d27a', stroke: INK, sw: 3 },
      { d: 'M26 42 Q36 31 46 39 Q56 29 66 39 Q76 29 86 39 Q96 29 106 39 Q112 33 114 42 Z', fill: '#ffe9a8', stroke: INK, sw: 3 },
      { d: circ(44, 47, 2.4) + circ(70, 46, 2) + circ(96, 47, 2.4), fill: '#c9381e' },
      { d: 'M50 26 Q44 16 52 8 M70 24 Q64 12 72 4 M90 26 Q84 16 92 8', stroke: 'rgba(80,60,40,0.55)', sw: 3 },
    ],
  }
}

export function checks(color = 'rgba(224,75,58,0.85)'): Art {
  let d = ''
  for (let y = 0; y < 4; y++) for (let x = 0; x < 17; x++) if ((x + y) % 2 === 0) d += rect(x * 10 - 5, y * 10, 10, 10)
  return { viewW: 160, viewH: 40, paths: [{ d, fill: color }] }
}

// ---- Flower-power mystery van -----------------------------------------------
export function mysteryVan(): Art {
  return {
    viewW: 240,
    viewH: 132,
    paths: [
      { d: 'M14 98 L14 52 Q16 30 40 28 L170 28 Q190 28 204 50 L226 74 Q232 80 232 92 L232 104 L14 104 Z', fill: '#3fb9a6', stroke: INK, sw: 5 },
      { d: 'M14 86 L232 86 L232 104 L14 104 Z', fill: '#2d6fb6', stroke: INK, sw: 4 },
      { d: rrect(30, 38, 40, 28, 6) + rrect(78, 38, 40, 28, 6) + rrect(126, 38, 40, 28, 6), fill: '#bfe9ff', stroke: INK, sw: 3.5 },
      { d: 'M176 38 L198 38 L218 70 L176 70 Z', fill: '#bfe9ff', stroke: INK, sw: 3.5 },
      { d: 'M38 44 L50 44 M86 44 L98 44 M134 44 L146 44', stroke: '#ffffff', sw: 3 },
      ...flower(50, 77, 8, '#f59e2b', '#ffe14d'),
      ...flower(96, 76, 6, '#f59e2b', '#ffe14d'),
      ...flower(148, 77, 8, '#f59e2b', '#ffe14d'),
      ...flower(196, 79, 6, '#f59e2b', '#ffe14d'),
      { d: 'M170 72 V100', stroke: INK, sw: 3 },
      { d: circ(60, 108, 17) + circ(186, 108, 17), fill: INK },
      { d: circ(60, 108, 7) + circ(186, 108, 7), fill: '#9aa0a8' },
      { d: circ(225, 90, 5), fill: '#ffe14d', stroke: INK, sw: 2 },
      { d: 'M28 28 L28 20 L150 20 L150 28', stroke: INK, sw: 3 },
    ],
  }
}

export function hauntedNight(): Art {
  const bat = (x: number, y: number, s: number) =>
    poly([x - 14 * s, y, x - 8 * s, y - 7 * s, x - 4 * s, y - 2 * s, x, y - 6 * s, x + 4 * s, y - 2 * s, x + 8 * s, y - 7 * s, x + 14 * s, y, x + 7 * s, y - 1 * s, x + 4 * s, y + 3 * s, x, y, x - 4 * s, y + 3 * s, x - 7 * s, y - 1 * s])
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: circ(126, 26, 17), fill: '#ffe9a0' },
      { d: circ(120, 21, 3) + circ(131, 31, 4) + circ(122, 33, 2), fill: 'rgba(200,170,80,0.45)' },
      { d: bat(40, 22, 0.55) + bat(62, 14, 0.4) + bat(98, 30, 0.35), fill: INK },
      { d: 'M2 101 L2 64 L12 54 L12 44 L20 44 L20 50 L34 36 L52 54 L52 66 L62 58 L72 68 L72 101 Z', fill: '#1a1030' },
      { d: rect(24, 58, 5, 7) + rect(40, 62, 5, 7) + rect(60, 74, 4, 6), fill: '#ffd36b' },
      { d: 'M0 96 Q40 88 80 95 Q120 101 160 92 L160 101 L0 101 Z', fill: '#24163e' },
    ],
  }
}
