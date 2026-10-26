import type { VectorPath } from '../../types'
import { blob, circ, cloud, dots, ell, flower, gloss, INK, lin, poly, rad, radLit, rect, rng, rrect, softShadow, spiral, star, type Art } from './kit'

// Hand-drawn parody doodles of well-known cartoon universes.
// Original drawings — no official logos, names or artwork.

// ---- Sea sponge in square pants -------------------------------------------
// Reference piece for the "clean" art style: light from the upper-left, a
// shaded base fill per shape, gloss highlights, consistent 3.5–5 unit ink.
export function sponge(): Art {
  const BODY = lin(30, 0, 175, 0, 0, '#fff27e', 0.5, '#ffe14f', 1, '#efc535')
  const pores: [number, number, number, number][] = [
    [56, 36, 7, 6], [148, 40, 8, 7], [104, 28, 5, 4], [50, 116, 5, 6], [156, 92, 5, 4], [70, 132, 6, 5], [144, 126, 7, 5], [126, 34, 4, 3],
  ]
  const limb = (d: string): VectorPath[] => [
    { d, stroke: INK, sw: 7.5 },
    { d, stroke: '#ffe14f', sw: 3.6 },
  ]
  const paths: VectorPath[] = [
    ...softShadow(100, 210, 62, 7, 0.32, '6,40,70'),
    // arms + hands (behind body)
    ...limb('M39 100 Q17 108 21 132'),
    ...limb('M161 100 Q183 108 179 130'),
    { d: circ(21, 135, 6.5) + circ(179, 133, 6.5), fill: '#ffe14f', stroke: INK, sw: 3 },
    // legs, socks, shoes
    ...limb('M74 180 L74 198'),
    ...limb('M126 180 L126 198'),
    { d: rrect(66, 186, 16, 12, 2) + rrect(118, 186, 16, 12, 2), fill: '#ffffff', stroke: INK, sw: 2.5 },
    { d: 'M66 190 H82 M118 190 H134', stroke: '#e2392f', sw: 2 },
    { d: 'M66 194 H82 M118 194 H134', stroke: '#2f6fc0', sw: 2 },
    { d: 'M56 205 Q56 197 70 197 Q86 197 87 205 Q87 211 71 211 Q56 211 56 205 Z M113 205 Q114 197 130 197 Q144 197 144 205 Q144 211 129 211 Q113 211 113 205 Z', fill: lin(0, 196, 0, 212, 0, '#4a4a4f', 1, '#0d0d10'), stroke: INK, sw: 2.5 },
    { d: 'M62 201 Q68 198 76 199 M119 200 Q126 198 134 199', stroke: 'rgba(255,255,255,0.55)', sw: 2 },
    // spongy body with shaded right side
    { d: 'M40 24 Q50 14 62 20 Q74 12 86 20 Q98 13 110 20 Q122 12 134 19 Q148 12 160 24 Q166 40 162 56 Q168 72 163 88 Q168 104 164 120 Q166 132 162 144 L38 146 Q34 132 37 120 Q32 104 37 88 Q32 72 37 56 Q32 40 40 24 Z', fill: BODY, stroke: INK, sw: 4.5 },
    { d: 'M146 22 Q156 18 160 24 Q166 40 162 56 Q168 72 163 88 Q168 104 164 120 Q166 132 162 144 L148 144 Q152 112 150 80 Q152 50 146 22 Z', fill: 'rgba(196,140,10,0.28)' },
    gloss('M47 36 Q53 27 66 27', 4.5, 0.85),
    { d: pores.map(([x, y, rx, ry]) => ell(x, y, rx, ry)).join(''), fill: '#d8b42a' },
    { d: pores.map(([x, y, rx, ry]) => ell(x + rx * 0.25, y + ry * 0.3, rx * 0.62, ry * 0.55)).join(''), fill: '#b9951c' },
    // shirt, collar, tie
    { d: 'M38 146 L162 144 L162 157 L38 159 Z', fill: lin(0, 144, 0, 159, 0, '#ffffff', 1, '#dfe4ea'), stroke: INK, sw: 3.5 },
    { d: 'M80 145 L94 156 L100 145 Z M120 145 L106 156 L100 145 Z', fill: '#ffffff', stroke: INK, sw: 2.5 },
    { d: rrect(95, 146, 10, 6, 2), fill: '#c7261e', stroke: INK, sw: 2 },
    { d: 'M96 152 L104 152 L107 161 L100 174 L93 161 Z', fill: lin(93, 0, 107, 0, 0, '#ef4a3f', 1, '#b3211a'), stroke: INK, sw: 2.5 },
    // square pants with belt
    { d: 'M38 159 L162 157 L160 182 L40 184 Z', fill: lin(0, 157, 0, 184, 0, '#a56d38', 1, '#7a4a20'), stroke: INK, sw: 3.5 },
    { d: 'M48 165 H60 M72 165 H84 M116 165 H128 M140 165 H152', stroke: INK, sw: 3.5 },
    { d: 'M100 168 V182', stroke: 'rgba(0,0,0,0.25)', sw: 2 },
    // eyes
    { d: circ(78, 64, 22) + circ(122, 64, 22), fill: radLit(100, 64, 60, 0, '#ffffff', 1, '#dfe7f1'), stroke: INK, sw: 3.5 },
    { d: circ(82, 67, 10.5), fill: radLit(82, 67, 10.5, 0, '#8fd0f7', 1, '#2a74b8'), stroke: INK, sw: 2 },
    { d: circ(118, 67, 10.5), fill: radLit(118, 67, 10.5, 0, '#8fd0f7', 1, '#2a74b8'), stroke: INK, sw: 2 },
    { d: circ(82, 67, 4.8) + circ(118, 67, 4.8), fill: INK },
    { d: circ(85.5, 63, 2.7) + circ(121.5, 63, 2.7), fill: '#ffffff' },
    { d: circ(79, 71, 1.2) + circ(115, 71, 1.2), fill: 'rgba(255,255,255,0.8)' },
    { d: 'M64 46 Q61 39 58 34 M77 42 Q77 35 76 29 M90 45 Q93 38 97 33 M110 45 Q107 38 103 33 M123 42 Q123 35 124 29 M136 46 Q139 39 142 34', stroke: INK, sw: 3.2 },
    // rosy cheeks + freckles
    { d: circ(52, 98, 12), fill: rad(52, 98, 12, 0, 'rgba(255,110,110,0.55)', 1, 'rgba(255,110,110,0)') },
    { d: circ(148, 98, 12), fill: rad(148, 98, 12, 0, 'rgba(255,110,110,0.55)', 1, 'rgba(255,110,110,0)') },
    { d: circ(48, 95, 1.5) + circ(54, 100, 1.5) + circ(50, 103, 1.5) + circ(146, 95, 1.5) + circ(152, 99, 1.5) + circ(148, 103, 1.5), fill: '#b5443f' },
    // open smile: interior, tongue, teeth, then the outline on top
    { d: 'M58 98 Q100 142 142 98 Q100 116 58 98 Z', fill: '#6e1a1a' },
    { d: 'M82 120 Q100 110 118 120 Q100 128 82 120 Z', fill: '#e8675d' },
    { d: rrect(88.5, 106, 10.5, 12, 2) + rrect(101, 106, 10.5, 12, 2), fill: '#ffffff', stroke: INK, sw: 2.2 },
    { d: 'M58 98 Q100 142 142 98 Q100 116 58 98 Z', stroke: INK, sw: 3.8 },
    { d: 'M53 94 Q55 100 60 100 M147 94 Q145 100 140 100', stroke: INK, sw: 2.5 },
    // long nose drawn last so it overlaps the smile
    { d: 'M100 72 Q128 70 125 87 Q121 97 104 89', fill: BODY, stroke: INK, sw: 3.5 },
    gloss('M106 76 Q116 75 120 80', 2.2, 0.75),
  ]
  return { viewW: 200, viewH: 220, paths }
}

// Underwater backdrop: light shafts, two seaweed depth planes, bubbles, sand.
export function seaBackdrop(): Art {
  const paths: VectorPath[] = []
  // light shafts from the surface
  ;[
    [18, 30, 0.1], [52, 62, 0.07], [96, 104, 0.09], [130, 142, 0.06],
  ].forEach(([a, b, o]) => paths.push({ d: poly([a, 0, b, 0, b + 34, 101, a + 18, 101]), fill: `rgba(255,255,255,${o})` }))
  // flower-shaped "sky" spots, faint
  const spots: [number, number, number, string][] = [
    [16, 14, 7, '#bfefff'], [128, 10, 6, '#c8ffe4'], [150, 52, 5, '#bfefff'], [106, 36, 4, '#e0d4ff'],
  ]
  spots.forEach(([x, y, r, c]) => {
    let d = ''
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      d += circ(x + r * 0.6 * Math.cos(a), y + r * 0.6 * Math.sin(a), r * 0.55)
    }
    paths.push({ d, fill: c, alpha: 0.45 }, { d: circ(x, y, r * 0.32), fill: '#ffffff', alpha: 0.5 })
  })
  // seaweed: far plane (dim) then near plane
  const strand = (x: number, h: number, sway: number) => {
    const pts: number[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway - 2 * (1 - t), 101 - h * t)
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway + 2 * (1 - t) + 0.6, 101 - h * t)
    }
    return poly(pts)
  }
  paths.push({ d: [96, 104, 118, 150, 156].map((x, i) => strand(x, 30 + (i % 3) * 9, 2.4)).join(''), fill: 'rgba(8,70,110,0.45)' })
  paths.push({ d: [140, 147].map((x, i) => strand(x, 42 + i * 8, 3)).join(''), fill: lin(0, 101, 0, 50, 0, '#1f8a5b', 1, '#3fc07d'), stroke: 'rgba(10,50,40,0.6)', sw: 0.6 })
  // bubbles with highlights
  const r = rng(11)
  let bub = ''
  let hl = ''
  for (let i = 0; i < 12; i++) {
    const bx = 112 + r() * 44
    const by = 14 + r() * 66
    const br = 1.2 + r() * 2.8
    bub += circ(bx, by, br)
    hl += circ(bx - br * 0.35, by - br * 0.35, br * 0.28)
  }
  paths.push({ d: bub, fill: 'rgba(255,255,255,0.12)', stroke: 'rgba(255,255,255,0.75)', sw: 0.6 }, { d: hl, fill: 'rgba(255,255,255,0.9)' })
  // sand with a lit edge and speckles
  paths.push({ d: 'M0 86 Q40 80 80 86 Q120 92 160 84 L160 101 L0 101 Z', fill: lin(0, 82, 0, 101, 0, '#f8e2a0', 1, '#d6ad62') })
  paths.push({ d: 'M0 86 Q40 80 80 86 Q120 92 160 84', stroke: 'rgba(255,255,255,0.6)', sw: 0.8 })
  const sr = rng(5)
  let sand = ''
  for (let i = 0; i < 40; i++) sand += circ(sr() * 160, 89 + sr() * 11, 0.3 + sr() * 0.45)
  paths.push({ d: sand, fill: '#b98d45', alpha: 0.7 })
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
