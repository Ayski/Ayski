import type { Paint, VectorPath } from '../../types'
import { circ, dots, ell, gloss, INK, lin, poly, rad, radLit, rect, rng, rrect, shade, type Art } from './kit'

// Parody illustrations of well-known cartoon universes, drawn as "3D-ish"
// cartoon renders: one key light per card, form shading and core shadows
// (multiply, clipped to each shape), rim lights on the side away from the key,
// specular highlights, cast shadows / contact occlusion and emissive glows.
// Original drawings — no official logos, names or artwork.

// ---- Local drawing helpers --------------------------------------------------
const q2 = (v: number) => Math.round(v * 100) / 100
const T = 'rgba(255,255,255,0)' // neutral stop: no effect under multiply or screen
const BIG = rect(-400, -400, 1200, 1200)

// Paint a gradient only inside `clip`, composited with `blend`.
function inside(clip: string, fill: Paint, blend: GlobalCompositeOperation = 'multiply', alpha = 1): VectorPath {
  return { d: BIG, fill, clip, blend, alpha }
}

// Rim light: the inner half of a gradient stroke along the contour, screened.
function rimLight(shape: string, paint: Paint, w: number): VectorPath {
  return { d: shape, stroke: paint, sw: w * 2, clip: shape, blend: 'screen' }
}

// Translate a path (absolute commands are offset, relative ones kept).
function shift(d: string, dx: number, dy: number): string {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)/g) ?? []
  const arity: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }
  let out = ''
  let i = 0
  while (i < tok.length) {
    const c = tok[i++]
    out += c
    const up = c.toUpperCase()
    const n = arity[up]
    if (!n) continue
    while (i < tok.length && !/[a-zA-Z]/.test(tok[i])) {
      const a = tok.slice(i, i + n).map(Number)
      i += n
      if (c === up) {
        if (up === 'H') a[0] += dx
        else if (up === 'V') a[0] += dy
        else if (up === 'A') {
          a[5] += dx
          a[6] += dy
        } else for (let k = 0; k < n; k += 2) {
          a[k] += dx
          a[k + 1] += dy
        }
      }
      out += a.map(q2).join(' ') + ' '
    }
  }
  return out
}

// Smooth curve through points (Catmull-Rom converted to cubic Béziers).
function smooth(pts: number[], close = true): string {
  const P: [number, number][] = []
  for (let i = 0; i < pts.length; i += 2) P.push([pts[i], pts[i + 1]])
  const n = P.length
  const at = (i: number) => (close ? P[(i + n) % n] : P[Math.max(0, Math.min(n - 1, i))])
  let d = `M${q2(P[0][0])} ${q2(P[0][1])}`
  for (let i = 0; i < (close ? n : n - 1); i++) {
    const a = at(i - 1)
    const b = at(i)
    const c = at(i + 1)
    const e = at(i + 2)
    d += `C${q2(b[0] + (c[0] - a[0]) / 6)} ${q2(b[1] + (c[1] - a[1]) / 6)} ${q2(c[0] - (e[0] - b[0]) / 6)} ${q2(c[1] - (e[1] - b[1]) / 6)} ${q2(c[0])} ${q2(c[1])}`
  }
  return close ? d + 'Z' : d
}

// Open arc along an ellipse; angles in degrees (0 = right, 90 = down).
function arcAlong(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, steps = 18): string {
  const pts: number[] = []
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180
    pts.push(cx + rx * Math.cos(a), cy + ry * Math.sin(a))
  }
  return poly(pts, false)
}

// Elliptical glow pool: many faint stacked ellipses (a radial gradient can't be squashed).
function glowPool(cx: number, cy: number, rx: number, ry: number, alpha: number, color: string, steps = 16, blend?: GlobalCompositeOperation): VectorPath[] {
  return Array.from({ length: steps }, (_, i) => {
    const k = 1 - i / steps
    return { d: ell(cx, cy, rx * k, ry * k), fill: `rgba(${color},${(alpha / steps).toFixed(3)})`, blend }
  })
}

// Smoother soft shadow than the kit's (more, fainter rings: no visible banding).
function softShade(cx: number, cy: number, rx: number, ry: number, alpha = 0.3, color = '0,0,0', steps = 14): VectorPath[] {
  return Array.from({ length: steps }, (_, i) => {
    const k = 1 - i / steps
    return { d: ell(cx, cy, rx * (0.35 + 0.65 * k), ry * (0.35 + 0.65 * k)), fill: `rgba(${color},${(alpha / steps).toFixed(3)})` }
  })
}

// Soft shadow restricted to a surface (so it never spills past it).
function shadowOn(surface: string, cx: number, cy: number, rx: number, ry: number, alpha: number, color: string): VectorPath[] {
  return softShade(cx, cy, rx, ry, alpha, color).map((p) => ({ ...p, clip: surface, blend: 'multiply' as GlobalCompositeOperation }))
}

// Four-point twinkle with concave sides.
function sparkle(cx: number, cy: number, r: number, k = 0.2): string {
  const q = r * k
  return (
    `M${q2(cx)} ${q2(cy - r)}Q${q2(cx + q)} ${q2(cy - q)} ${q2(cx + r)} ${q2(cy)}` +
    `Q${q2(cx + q)} ${q2(cy + q)} ${q2(cx)} ${q2(cy + r)}Q${q2(cx - q)} ${q2(cy + q)} ${q2(cx - r)} ${q2(cy)}` +
    `Q${q2(cx - q)} ${q2(cy - q)} ${q2(cx)} ${q2(cy - r)}Z`
  )
}

// Tapered lens between two points (fur stripes, wisps).
function lens(x0: number, y0: number, x1: number, y1: number, w: number): string {
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  const len = Math.hypot(x1 - x0, y1 - y0) || 1
  const nx = (-(y1 - y0) / len) * w
  const ny = ((x1 - x0) / len) * w
  return `M${q2(x0)} ${q2(y0)}Q${q2(mx + nx)} ${q2(my + ny)} ${q2(x1)} ${q2(y1)}Q${q2(mx - nx)} ${q2(my - ny)} ${q2(x0)} ${q2(y0)}Z`
}

// Shaded sphere (bubble of goo, hand, bead): base, core shadow, rim, ink, specular.
function sphere(x: number, y: number, r: number, lit: string, mid: string, dark: string, rimCol: string, ink = 2.2, key: [number, number] = [-1, -1]): VectorPath[] {
  const C = circ(x, y, r)
  const kx = x + key[0] * r * 0.4
  const ky = y + key[1] * r * 0.4
  return [
    { d: C, fill: rad(kx, ky, r * 1.5, 0, lit, 0.5, mid, 1, dark) },
    rimLight(C, lin(x + key[0] * r, y + key[1] * r, x - key[0] * r, y - key[1] * r, 0, T, 0.6, T, 1, rimCol), r * 0.22),
    { d: C, stroke: INK, sw: ink },
    { d: ell(x + key[0] * r * 0.38, y + key[1] * r * 0.42, r * 0.3, r * 0.2), fill: 'rgba(255,255,255,0.9)' },
  ]
}

// Union of circles / ellipses (all wound the same way, so they also work as a clip).
const union = (parts: string[]) => parts.join('')

// ---- Sea sponge in square pants -------------------------------------------
// Key light: sunlight from the upper-left through the water surface.
// Cyan rim from the water on the right, warm bounce from the sand below.
export function sponge(): Art {
  const BODYD =
    'M40 24 Q50 14 62 20 Q74 12 86 20 Q98 13 110 20 Q122 12 134 19 Q148 12 160 24 Q166 40 162 56 Q168 72 163 88 Q168 104 164 120 Q166 132 162 144 L38 146 Q34 132 37 120 Q32 104 37 88 Q32 72 37 56 Q32 40 40 24 Z'
  const SIDE = 'M160 24 L169 19 Q175 35 171 51 Q177 67 172 83 Q177 99 173 115 Q175 127 171 139 L162 144 Q166 132 164 120 Q168 104 163 88 Q168 72 162 56 Q166 40 160 24 Z'
  const SIDE_SHIRT = 'M162 144 L171 139 L171 152 L162 157 Z'
  const SIDE_PANTS = 'M162 157 L171 152 L169 175 L160 182 Z'
  const SHIRT = 'M38 146 L162 144 L162 157 L38 159 Z'
  const topSegs = [[50, 14, 62, 20], [74, 12, 86, 20], [98, 13, 110, 20], [122, 12, 134, 19], [148, 12, 160, 24]]
  let TOP = 'M40 24' + topSegs.map(([a, b, c, e]) => `Q${a} ${b} ${c} ${e}`).join('') + 'L169 19'
  for (let k = topSegs.length - 1; k >= 0; k--) {
    const [a, b] = topSegs[k]
    const [px, py] = k > 0 ? [topSegs[k - 1][2], topSegs[k - 1][3]] : [40, 24]
    TOP += `Q${a + 9} ${b - 5} ${px + 9} ${py - 5}`
  }
  TOP += 'Z'
  const PANTS = 'M38 159 L162 157 L160 182 L40 184 Z'
  const NOSE = 'M100 72 Q128 70 125 87 Q121 97 104 89 Z'
  const MOUTH = 'M58 98 Q100 142 142 98 Q100 116 58 98 Z'
  const YEL = '#ffe14f'
  const BODY = lin(30, 0, 175, 0, 0, '#fff694', 0.45, '#ffe14f', 1, '#f6cd3d')
  const CYAN = (x0: number, y0: number, x1: number, y1: number) => lin(x0, y0, x1, y1, 0, T, 0.6, T, 1, 'rgba(140,238,255,0.95)')
  const limb = (d: string): VectorPath[] => [
    { d, stroke: INK, sw: 7.5 },
    { d, stroke: YEL, sw: 3.6 },
    { d: shift(d, 0.75, 0.85), stroke: 'rgba(200,128,10,0.6)', sw: 1.3 },
    { d: shift(d, -0.6, -0.7), stroke: 'rgba(255,255,235,0.85)', sw: 1.1 },
  ]
  const pores: [number, number, number, number][] = [
    [56, 36, 7, 6], [146, 40, 8, 7], [104, 28, 5, 4], [50, 116, 5, 6], [152, 92, 5, 4], [70, 132, 6, 5], [142, 126, 7, 5], [126, 34, 4, 3],
  ]
  const eye = (cx: number, ix: number): VectorPath[] => {
    const E = circ(cx, 64, 22)
    const I = circ(ix, 67, 10.5)
    return [
      { d: E, fill: radLit(cx, 64, 24, 0, '#ffffff', 0.55, '#f2f6fb', 1, '#d3deea') },
      inside(E, rad(cx - 9, 55, 36, 0, T, 0.62, T, 1, '#9db6d4')),
      { d: I, fill: radLit(ix, 67, 10.5, 0, '#b0e4ff', 0.55, '#3f92d4', 1, '#1b5796') },
      inside(I, lin(0, 56.5, 0, 66, 0, 'rgba(10,40,90,0.65)', 1, 'rgba(10,40,90,0)')),
      { d: arcAlong(ix, 67, 7, 7, 25, 125, 10), stroke: 'rgba(190,240,255,0.75)', sw: 1.6, clip: I, blend: 'screen' },
      { d: I, stroke: INK, sw: 2 },
      { d: circ(ix, 67, 4.8), fill: INK },
      { d: E, stroke: INK, sw: 3.5 },
      { d: ell(cx - 9, 53, 7, 4), fill: 'rgba(255,255,255,0.8)' },
      { d: circ(ix - 3.6, 63, 2.8), fill: '#ffffff' },
      { d: circ(ix + 3.4, 71, 1.2), fill: 'rgba(255,255,255,0.85)' },
    ]
  }
  const shoe = (x: number): VectorPath[] => {
    const S = `M${x - 18} 205 Q${x - 18} 197 ${x - 4} 197 Q${x + 12} 197 ${x + 13} 205 Q${x + 13} 211 ${x - 3} 211 Q${x - 18} 211 ${x - 18} 205 Z`
    return [
      { d: S, fill: lin(0, 196, 0, 212, 0, '#55555c', 1, '#0c0c10') },
      rimLight(S, CYAN(x - 18, 197, x + 13, 211), 1.4),
      { d: S, stroke: INK, sw: 2.5 },
      { d: ell(x - 8, 200.5, 6, 1.8), fill: 'rgba(255,255,255,0.7)' },
      { d: circ(x + 4, 200, 1), fill: 'rgba(255,255,255,0.8)' },
    ]
  }
  const sock = (x: number): VectorPath[] => {
    const S = rrect(x - 8, 186, 16, 12, 2)
    return [
      { d: S, fill: '#ffffff' },
      { d: `M${x - 8} 190 H${x + 8}`, stroke: '#e2392f', sw: 2 },
      { d: `M${x - 8} 194 H${x + 8}`, stroke: '#2f6fc0', sw: 2 },
      inside(S, lin(x - 8, 0, x + 8, 0, 0, T, 0.45, T, 1, '#9aaac4')),
      { d: S, stroke: INK, sw: 2.5 },
    ]
  }
  const paths: VectorPath[] = [
    // cast shadow on the sand (light from the upper-left) + contact occlusion
    ...softShade(118, 211, 78, 9, 0.55, '6,40,70'),
    ...softShade(72, 209.5, 18, 3, 0.6, '4,24,40'),
    ...softShade(124, 209.5, 18, 3, 0.6, '4,24,40'),
    // arms + hands (behind body)
    ...limb('M39 100 Q17 108 21 132'),
    ...limb('M161 100 Q183 108 179 130'),
    ...sphere(21, 135, 6.5, '#fff7a0', '#ffe14f', '#d9a828', 'rgba(140,238,255,0.9)', 3),
    ...sphere(179, 133, 6.5, '#fff7a0', '#ffe14f', '#d9a828', 'rgba(140,238,255,0.9)', 3),
    // legs, socks, shoes
    ...limb('M74 180 L74 198'),
    ...limb('M126 180 L126 198'),
    ...sock(74),
    ...sock(126),
    ...shoe(74),
    ...shoe(130),
    // top and right faces: the sponge is a box seen slightly from above-left
    { d: TOP, fill: lin(0, 7, 0, 24, 0, '#fffbc0', 1, '#ffe874') },
    { d: TOP, stroke: INK, sw: 3.5 },
    { d: SIDE, fill: lin(0, 19, 0, 144, 0, '#e9b93a', 1, '#c8921f') },
    { d: ell(169, 60, 2.5, 5) + ell(171, 104, 2, 4), fill: 'rgba(150,100,10,0.55)' },
    rimLight(SIDE, CYAN(160, 0, 175, 0), 2.2),
    { d: SIDE, stroke: INK, sw: 3.5 },
    { d: SIDE_SHIRT, fill: '#b7c2d0', stroke: INK, sw: 3 },
    { d: SIDE_PANTS, fill: lin(0, 152, 0, 182, 0, '#6e4520', 1, '#4a2c12'), stroke: INK, sw: 3 },
    // spongy body: base, core shadow, sand bounce, top light
    { d: BODYD, fill: BODY },
    inside(BODYD, rad(64, 40, 150, 0, T, 0.5, T, 0.82, '#f0b54c', 1, '#dc9c35')),
    inside(BODYD, lin(0, 118, 0, 146, 0, T, 1, '#e3a94a'), 'multiply', 0.8),
    inside(BODYD, rad(56, 30, 70, 0, 'rgba(255,255,225,0.75)', 1, 'rgba(255,255,225,0)'), 'screen'),
    // pores are craters: shadowed upper-left wall, lit lower-right lip
    { d: pores.map(([x, y, rx, ry]) => ell(x, y, rx, ry)).join(''), fill: '#dcb52d' },
    { d: pores.map(([x, y, rx, ry]) => ell(x - rx * 0.18, y - ry * 0.2, rx * 0.72, ry * 0.66)).join(''), fill: '#b48c18' },
    { d: pores.map(([x, y, rx, ry]) => arcAlong(x, y, rx, ry, 10, 110, 8)).join(''), stroke: 'rgba(255,252,210,0.9)', sw: 1.2 },
    // shadows cast by the eyes and nose onto the face
    { d: shift(circ(78, 64, 22) + circ(122, 64, 22), 3.5, 4.5), fill: 'rgba(176,110,0,0.38)', clip: BODYD, blend: 'multiply' },
    { d: BODYD, stroke: INK, sw: 4.5 },
    gloss('M47 36 Q53 27 66 27', 4.5, 0.9),
    // shirt, collar, tie
    { d: SHIRT, fill: lin(0, 144, 0, 159, 0, '#ffffff', 1, '#e1e6ee') },
    inside(SHIRT, lin(0, 144, 0, 150, 0, 'rgba(110,110,140,0.55)', 1, T)),
    inside(SHIRT, lin(38, 0, 162, 0, 0, T, 0.6, T, 1, '#c3cad8')),
    { d: SHIRT, stroke: INK, sw: 3.5 },
    { d: 'M80 145 L94 156 L100 145 Z M120 145 L106 156 L100 145 Z', fill: '#ffffff', stroke: INK, sw: 2.5 },
    { d: rrect(95, 146, 10, 6, 2), fill: '#c7261e', stroke: INK, sw: 2 },
    { d: 'M96 152 L104 152 L107 161 L100 174 L93 161 Z', fill: lin(93, 0, 107, 0, 0, '#ff5a4d', 1, '#a81d16'), stroke: INK, sw: 2.5 },
    { d: 'M97.5 155 L99 162', stroke: 'rgba(255,255,255,0.7)', sw: 1.2 },
    // square pants with belt
    { d: PANTS, fill: lin(0, 157, 0, 184, 0, '#b07640', 1, '#7a4a20') },
    inside(PANTS, lin(0, 157, 0, 163, 0, 'rgba(40,20,0,0.5)', 1, T)),
    inside(PANTS, lin(38, 0, 162, 0, 0, T, 0.55, T, 1, '#9a6a52')),
    { d: PANTS, stroke: INK, sw: 3.5 },
    { d: 'M48 165 H60 M72 165 H84 M116 165 H128 M140 165 H152', stroke: INK, sw: 3.5 },
    { d: 'M100 168 V182', stroke: 'rgba(0,0,0,0.25)', sw: 2 },
    { d: 'M44 161 H96', stroke: 'rgba(255,220,180,0.35)', sw: 1.2 },
    // eyes and lashes
    ...eye(78, 82),
    ...eye(122, 118),
    { d: 'M64 46 Q61 39 58 34 M77 42 Q77 35 76 29 M90 45 Q93 38 97 33 M110 45 Q107 38 103 33 M123 42 Q123 35 124 29 M136 46 Q139 39 142 34', stroke: INK, sw: 3.2 },
    // rosy cheeks + freckles
    { d: circ(52, 98, 12), fill: rad(52, 98, 12, 0, 'rgba(255,110,110,0.55)', 1, 'rgba(255,110,110,0)') },
    { d: circ(148, 98, 12), fill: rad(148, 98, 12, 0, 'rgba(255,110,110,0.5)', 1, 'rgba(255,110,110,0)') },
    { d: circ(48, 95, 1.5) + circ(54, 100, 1.5) + circ(50, 103, 1.5) + circ(146, 95, 1.5) + circ(152, 99, 1.5) + circ(148, 103, 1.5), fill: '#b5443f' },
    // open smile: deep interior, tongue, teeth, occlusion under the lip
    { d: MOUTH, fill: lin(0, 100, 0, 126, 0, '#3a0808', 1, '#8a2424') },
    { d: 'M82 120 Q100 110 118 120 Q100 128 82 120 Z', fill: lin(0, 112, 0, 126, 0, '#ff8a7c', 1, '#c94a42'), clip: MOUTH },
    { d: ell(94, 117, 4, 1.4), fill: 'rgba(255,255,255,0.55)', clip: MOUTH },
    { d: rrect(88.5, 106, 10.5, 12, 2) + rrect(101, 106, 10.5, 12, 2), fill: lin(0, 106, 0, 118, 0, '#ffffff', 1, '#d9dde4'), stroke: INK, sw: 2.2 },
    inside(MOUTH, lin(0, 98, 0, 112, 0, 'rgba(0,0,0,0.45)', 1, T)),
    { d: MOUTH, stroke: INK, sw: 3.8 },
    { d: 'M53 94 Q55 100 60 100 M147 94 Q145 100 140 100', stroke: INK, sw: 2.5 },
    // long nose: cast shadow, rounded shading, specular
    { d: shift(NOSE, 3, 6), fill: 'rgba(160,96,0,0.4)', clip: BODYD, blend: 'multiply' },
    { d: NOSE, fill: BODY },
    inside(NOSE, rad(108, 76, 24, 0, T, 0.45, T, 1, '#e09a36')),
    rimLight(NOSE, CYAN(104, 72, 126, 92), 1.6),
    { d: 'M100 72 Q128 70 125 87 Q121 97 104 89', stroke: INK, sw: 3.5 },
    { d: ell(110, 76.5, 5, 2.4), fill: 'rgba(255,255,255,0.85)' },
  ]
  return { viewW: 200, viewH: 220, paths }
}

// Underwater backdrop: surface glow, god rays, a hazy far reef, rock + coral
// + seaweed in the mid plane, bubbles, lit sand with caustics, vignette.
export function seaBackdrop(): Art {
  const paths: VectorPath[] = []
  // surface glow and rippling surface light
  paths.push({ d: rect(0, 0, 160, 46), fill: lin(0, 0, 0, 46, 0, 'rgba(200,248,255,0.55)', 1, 'rgba(200,248,255,0)'), blend: 'screen' })
  const sr0 = rng(21)
  let ripple = ''
  for (let i = 0; i < 9; i++) {
    const x = sr0() * 160
    const y = 2 + sr0() * 8
    ripple += `M${q2(x)} ${q2(y)}q4 -1.6 8 0t8 0`
  }
  paths.push({ d: ripple, stroke: 'rgba(230,252,255,0.45)', sw: 0.7, blend: 'screen' })
  // god rays from the upper-left
  const rays: [number, number, number][] = [[38, 6, 0.32], [50, 4, 0.22], [60, 8, 0.3], [72, 5, 0.2], [84, 7, 0.26], [97, 4, 0.18]]
  rays.forEach(([deg, w, a]) => {
    const A = (deg * Math.PI) / 180
    const W = (w * Math.PI) / 180
    const ox = 20
    const oy = -40
    paths.push({
      d: poly([ox, oy, ox + 200 * Math.cos(A - W / 2), oy + 200 * Math.sin(A - W / 2), ox + 200 * Math.cos(A + W / 2), oy + 200 * Math.sin(A + W / 2)]),
      fill: rad(ox, oy, 175, 0, `rgba(225,250,255,${a})`, 0.45, `rgba(225,250,255,${a * 0.6})`, 1, 'rgba(225,250,255,0)'),
      blend: 'screen',
    })
  })
  // faint flower-shaped "sky" spots
  const spots: [number, number, number, string][] = [[14, 14, 7, '#bfefff'], [132, 10, 6, '#c8ffe4'], [150, 46, 4.5, '#bfefff'], [104, 30, 4, '#e0d4ff'], [30, 44, 3.6, '#c8ffe4']]
  spots.forEach(([x, y, r, c]) => {
    let d = ''
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      d += circ(x + r * 0.6 * Math.cos(a), y + r * 0.6 * Math.sin(a), r * 0.55)
    }
    paths.push({ d, fill: c, alpha: 0.38 }, { d: circ(x, y, r * 0.32), fill: '#ffffff', alpha: 0.45 })
  })
  // far reef silhouette, swallowed by haze
  const fr = rng(13)
  const reef: number[] = []
  for (let x = -6; x <= 168; x += 8) reef.push(x, 70 - fr() * 9 - (x > 50 && x < 80 ? 6 : 0))
  paths.push({ d: smooth(reef, false) + 'L168 101L-6 101Z', fill: '#2a86bf' })
  paths.push({ d: rect(0, 52, 160, 49), fill: lin(0, 52, 0, 101, 0, 'rgba(60,160,215,0)', 1, 'rgba(60,160,215,0.35)') })
  // far seaweed (dim)
  const strand = (x: number, h: number, sway: number, base = 101) => {
    const pts: number[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway - 2 * (1 - t), base - h * t)
    }
    for (let i = 12; i >= 0; i--) {
      const t = i / 12
      pts.push(x + Math.sin(t * 5 + x) * sway + 2 * (1 - t) + 0.6, base - h * t)
    }
    return poly(pts)
  }
  paths.push({ d: [58, 66, 96, 104, 118].map((x, i) => strand(x, 26 + (i % 3) * 8, 2.2, 92)).join(''), fill: 'rgba(14,90,120,0.55)' })
  // mid-plane boulders (left): key light from the upper-left, cyan rim, moss
  const boulder = (pts: number[], kx: number, ky: number, r: number) => {
    const B = smooth(pts)
    paths.push({ d: B, fill: radLit(kx, ky, r, 0, '#8fb9c4', 0.5, '#4f7d8c', 1, '#244656') })
    paths.push(inside(B, rad(kx - r * 0.3, ky - r * 0.35, r * 1.4, 0, T, 0.5, T, 1, '#4a5a8a')))
    paths.push(rimLight(B, lin(kx - r, ky - r, kx + r, ky + r, 0, T, 0.62, T, 1, 'rgba(140,238,255,0.85)'), 0.9))
    paths.push({ d: B, stroke: 'rgba(8,30,50,0.75)', sw: 0.7 })
    paths.push({ d: ell(kx - r * 0.35, ky - r * 0.42, r * 0.3, r * 0.12), fill: 'rgba(220,250,255,0.45)', clip: B, blend: 'screen' })
  }
  boulder([30, 92, 28, 80, 34, 72, 44, 70, 52, 76, 54, 88, 50, 94], 40, 78, 18)
  boulder([-8, 96, -6, 76, 4, 66, 18, 63, 30, 68, 36, 80, 34, 94, 20, 98], 16, 74, 26)
  paths.push(...softShade(26, 96, 34, 3, 0.45, '4,30,50'))
  // branching coral (right)
  const coral = 'M140 90 Q139 80 134 74 M139 82 Q144 76 146 68 M137 78 Q131 72 132 64 M145 72 Q150 68 151 61'
  paths.push({ d: coral, stroke: 'rgba(8,30,50,0.75)', sw: 4.2 })
  paths.push({ d: coral, stroke: lin(130, 60, 152, 92, 0, '#ffb3c6', 1, '#d9577d'), sw: 3 })
  paths.push({ d: shift(coral, -0.5, -0.5), stroke: 'rgba(255,235,240,0.75)', sw: 0.8 })
  // near seaweed with light across the blades
  paths.push({ d: [10, 16, 150, 156].map((x, i) => strand(x, 40 + i * 5, 3)).join(''), fill: lin(0, 101, 0, 46, 0, '#1a7a50', 1, '#4cd08a'), stroke: 'rgba(6,40,30,0.7)', sw: 0.6 })
  paths.push({ d: [10, 16, 150, 156].map((x, i) => strand(x - 0.6, 40 + i * 5, 3)).join(''), fill: lin(0, 0, 160, 0, 0, 'rgba(200,255,220,0.25)', 1, 'rgba(200,255,220,0)'), blend: 'screen' })
  // bubbles: transparent spheres with rim + specular
  const r = rng(11)
  let bub = ''
  let hl = ''
  for (let i = 0; i < 16; i++) {
    const left = i < 5
    const bx = left ? 6 + r() * 40 : 108 + r() * 48
    const by = 10 + r() * 66
    const br = 1 + r() * 2.6
    bub += circ(bx, by, br)
    hl += circ(bx - br * 0.38, by - br * 0.38, br * 0.28)
  }
  paths.push({ d: bub, fill: 'rgba(255,255,255,0.1)', stroke: 'rgba(235,252,255,0.8)', sw: 0.55 }, { d: hl, fill: 'rgba(255,255,255,0.95)' })
  // sand dune: lit crest, shaded hollow, ripples and caustics
  const SAND = 'M-2 87 Q30 80 64 85 Q100 91 130 86 Q148 83 162 85 L162 101 L-2 101 Z'
  paths.push({ d: SAND, fill: lin(0, 82, 0, 101, 0, '#fbe6a8', 1, '#d2a75c') })
  paths.push(inside(SAND, rad(30, 84, 120, 0, T, 0.45, T, 1, '#b99a78')))
  paths.push({ d: 'M-2 87 Q30 80 64 85 Q100 91 130 86 Q148 83 162 85', stroke: 'rgba(255,255,235,0.75)', sw: 0.9 })
  let rip = ''
  for (let i = 0; i < 7; i++) rip += `M${8 + i * 22} ${93 + (i % 2) * 3}q5 -1.6 10 0`
  paths.push({ d: rip, stroke: 'rgba(160,110,50,0.4)', sw: 0.6 }, { d: shift(rip, -0.4, -0.6), stroke: 'rgba(255,250,220,0.6)', sw: 0.5 })
  const cr = rng(31)
  let caus = ''
  for (let i = 0; i < 14; i++) {
    const cx = cr() * 160
    const cy = 88 + cr() * 11
    const s = 2.5 + cr() * 3
    caus += smooth([cx - s, cy, cx - s * 0.1, cy - s * 0.18, cx + s, cy - s * 0.05], false)
  }
  paths.push({ d: caus, stroke: 'rgba(255,255,230,0.22)', sw: 0.6, clip: SAND, blend: 'screen' })
  const sr = rng(5)
  let sand = ''
  for (let i = 0; i < 40; i++) sand += circ(sr() * 160, 89 + sr() * 11, 0.3 + sr() * 0.45)
  paths.push({ d: sand, fill: '#b48843', alpha: 0.6 })
  // pebbles with soft shading
  ;[[40, 95, 2.4], [108, 97, 1.8], [134, 93, 1.4]].forEach(([x, y, s]) => {
    paths.push(...softShade(x + 0.8, y + s * 0.6, s * 1.2, s * 0.35, 0.35))
    paths.push({ d: ell(x, y, s, s * 0.62), fill: radLit(x, y, s, 0, '#ffffff', 0.5, '#e8d4b8', 1, '#a38a6a') })
  })
  // vignette
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(80, 46, 104, 0, T, 0.6, T, 1, 'rgba(0,30,70,0.55)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// ---- Pink frosted donut on a cloud ----------------------------------------
// Key light: the sun, upper-left. Sky-blue rim on the lower-right.

// Cartoon cloud with volume: one ink contour, lit top-left, blue core shadow,
// soft rim on the lower-right.
function puffCloud(cx: number, cy: number, s: number, ink = true): VectorPath[] {
  const U = union([
    circ(cx - 15 * s, cy + 3 * s, 10 * s),
    circ(cx - 2 * s, cy - 6 * s, 13.5 * s),
    circ(cx + 13 * s, cy - 1 * s, 10 * s),
    circ(cx + 23 * s, cy + 6 * s, 6.5 * s),
    ell(cx + 1 * s, cy + 8 * s, 27 * s, 6.5 * s),
  ])
  const out: VectorPath[] = []
  if (ink) out.push({ d: U, stroke: INK, sw: 4.6 * s })
  out.push(
    { d: U, fill: '#ffffff' },
    inside(U, rad(cx - 12 * s, cy - 14 * s, 44 * s, 0, T, 0.45, T, 0.8, '#c9dcf6', 1, '#a9c2ea')),
    inside(U, lin(0, cy + 2 * s, 0, cy + 15 * s, 0, T, 1, '#b4cbee'), 'multiply', 0.8),
    inside(U, lin(cx - 20 * s, cy - 15 * s, cx + 26 * s, cy + 15 * s, 0, T, 0.78, T, 1, 'rgba(255,246,220,0.55)'), 'screen'),
    { d: arcAlong(cx - 15 * s, cy + 3 * s, 10 * s, 10 * s, -50, 30, 10) + arcAlong(cx + 13 * s, cy - 1 * s, 10 * s, 10 * s, 150, 215, 10), stroke: 'rgba(150,180,225,0.6)', sw: 1.5 * s },
  )
  return out
}

export function sunnySky(): Art {
  const paths: VectorPath[] = []
  // sun in the top-left corner: hot core, bloom, rays fanning down-right
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(12, 4, 90, 0, 'rgba(255,250,215,0.95)', 0.12, 'rgba(255,240,180,0.6)', 0.4, 'rgba(255,230,170,0.18)', 1, 'rgba(255,230,170,0)'), blend: 'screen' })
  const rays: [number, number][] = [[12, 18], [26, 31], [40, 46], [55, 59], [68, 73]]
  rays.forEach(([a, b]) => {
    const A = (a * Math.PI) / 180
    const B = (b * Math.PI) / 180
    paths.push({ d: poly([12, 4, 12 + 200 * Math.cos(A), 4 + 200 * Math.sin(A), 12 + 200 * Math.cos(B), 4 + 200 * Math.sin(B)]), fill: rad(12, 4, 170, 0, 'rgba(255,252,230,0.32)', 1, 'rgba(255,252,230,0)'), blend: 'screen' })
  })
  paths.push({ d: circ(12, 4, 9), fill: rad(12, 4, 9, 0, '#ffffff', 0.6, 'rgba(255,250,220,0.9)', 1, 'rgba(255,240,190,0)') })
  // far clouds: no ink, hazy
  paths.push(...puffCloud(118, 22, 0.32, false).map((p) => ({ ...p, alpha: 0.55 })))
  paths.push(...puffCloud(40, 46, 0.24, false).map((p) => ({ ...p, alpha: 0.45 })))
  // cloud banks: far (hazy, bluish) then near (bright, shaded)
  const bank = (seed: number, y: number, rmin: number, rmax: number) => {
    const r = rng(seed)
    const parts: string[] = []
    for (let x = -6; x < 170; x += 9 + r() * 5) parts.push(circ(x, y - r() * 4, rmin + r() * (rmax - rmin)))
    parts.push(ell(80, y + 14, 130, 16))
    return union(parts)
  }
  const FAR = bank(3, 90, 7, 12)
  paths.push({ d: FAR, fill: '#cfe9fd' }, inside(FAR, lin(0, 80, 0, 101, 0, T, 1, '#a9cdf0')))
  const NEAR = bank(8, 98, 6, 10)
  paths.push({ d: NEAR, fill: '#ffffff' }, inside(NEAR, lin(0, 88, 0, 101, 0, T, 0.4, T, 1, '#b9d6f4')))
  paths.push(inside(NEAR, lin(0, 86, 0, 93, 0, 'rgba(255,250,230,0.6)', 1, T), 'screen'))
  // drifting sprinkles: big + sharp near, small + faded far
  const pal = ['#fff06a', '#52c8ff', '#ff8fc0', '#7ee787', '#b693ff', '#ff8a4c']
  const sr = rng(41)
  for (let i = 0; i < 16; i++) {
    const x = 6 + sr() * 150
    const y = 8 + sr() * 70
    if (x > 52 && x < 120 && y > 14) continue
    const near = sr() > 0.6
    const L = near ? 2.2 : 1.3
    const t = sr() * Math.PI
    const d = `M${q2(x - L * Math.cos(t))} ${q2(y - L * Math.sin(t))}L${q2(x + L * Math.cos(t))} ${q2(y + L * Math.sin(t))}`
    const c = pal[i % pal.length]
    if (near) paths.push({ d, stroke: INK, sw: 2.3 }, { d, stroke: c, sw: 1.3 }, { d: shift(d, -0.25, -0.3), stroke: 'rgba(255,255,255,0.7)', sw: 0.4 })
    else paths.push({ d, stroke: c, sw: 1, alpha: 0.55 })
  }
  return { viewW: 160, viewH: 101, paths }
}

export function donut(haze = 0): Art {
  const CX = 100
  const CY = 84
  // frosting outline: wavy outer edge with drips, inner hole wound the other way
  const drips: [number, number, number][] = [[0.38, 10, 0.12], [0.92, 20, 0.13], [1.46, 13, 0.15], [2.02, 23, 0.12], [2.6, 11, 0.14]]
  const frost = (ox: number, oy: number) => {
    const pts: number[] = []
    const N = 280
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2
      const w = 1 + 0.03 * Math.sin(a * 7 + 0.6) + 0.018 * Math.sin(a * 12 + 1.3)
      let dy = 0
      for (const [a0, h, wd] of drips) {
        const u = (a - a0) / wd
        if (Math.abs(u) < 1) dy += h * Math.pow(1 - u * u, 0.7)
      }
      pts.push(CX + ox + 73 * w * Math.cos(a), CY + oy + 46 * w * Math.sin(a) + dy)
    }
    const hole: number[] = []
    for (let i = 90; i > 0; i--) {
      const a = (i / 90) * Math.PI * 2
      const w = 1 + 0.05 * Math.sin(a * 6 + 0.3)
      hole.push(CX + ox + 31 * w * Math.cos(a), CY - 3 + oy + 18 * w * Math.sin(a))
    }
    return poly(pts) + poly(hole)
  }
  const FROST = frost(0, 0)
  const DOUGH = 'M18 86 A82 54 0 0 1 182 86 L182 110 A82 54 0 0 1 18 110 Z'
  const SIDE = 'M18 86 A82 54 0 0 0 182 86 L182 110 A82 54 0 0 1 18 110 Z'
  const HOLE = ell(100, 80, 22, 12.5)

  // sprinkles, spread over the frosting ring without touching each other
  const pal = ['#fff06a', '#52c8ff', '#ffffff', '#7ee787', '#b693ff', '#ff8a4c']
  const rr = rng(7)
  const placed: [number, number][] = []
  let inkD = ''
  const byC = new Map<string, string>()
  for (let guard = 0; placed.length < 32 && guard < 3000; guard++) {
    const a = rr() * Math.PI * 2
    const rho = 0.6 + rr() * 0.3
    const x = CX + 73 * rho * Math.cos(a)
    const y = CY - 1 + 46 * rho * Math.sin(a)
    if (placed.some(([px, py]) => Math.hypot(px - x, (py - y) * 1.45) < 12)) continue
    placed.push([x, y])
    const t = rr() * Math.PI
    const L = 4.3
    const d = `M${q2(x - L * Math.cos(t))} ${q2(y - L * 0.62 * Math.sin(t))}L${q2(x + L * Math.cos(t))} ${q2(y + L * 0.62 * Math.sin(t))}`
    inkD += d
    const c = pal[placed.length % pal.length]
    byC.set(c, (byC.get(c) ?? '') + d)
  }
  const tips = drips.map(([a0, h]) => circ(CX + 73 * Math.cos(a0) - 1.8, CY + 46 * Math.sin(a0) + h - 4.5, 1.6)).join('')

  const BACK = union([circ(26, 166, 20), circ(52, 150, 26), circ(100, 140, 32), circ(150, 148, 27), circ(176, 164, 20), ell(100, 176, 94, 17)])
  const FRONT = union([circ(34, 182, 15), circ(62, 184, 17), circ(98, 186, 19), circ(136, 184, 17), circ(166, 181, 15), ell(100, 190, 82, 8)])
  const cloudShade = (U: string, y0: number, y1: number): VectorPath[] => [
    { d: U, fill: '#ffffff' },
    inside(U, lin(0, y0, 0, y1, 0, T, 0.35, T, 1, '#a4bfe8')),
    inside(U, lin(10, 0, 190, 0, 0, T, 0.6, T, 1, '#c3d4f0')),
    inside(U, lin(40, y0, 190, y1, 0, T, 0.8, T, 1, 'rgba(255,246,220,0.5)'), 'screen'),
  ]
  const paths: VectorPath[] = [
    // cloud cushion
    { d: BACK, stroke: INK, sw: 9 },
    ...cloudShade(BACK, 118, 194),
    // donut shadow on the cloud: offset to the lower-right, contact darker
    ...shadowOn(BACK, 112, 164, 84, 14, 0.5, '40,70,140'),
    ...shadowOn(BACK, 104, 160, 70, 7, 0.4, '30,50,110'),
    // dough: golden top, toasted side, pale equator band
    { d: DOUGH, fill: lin(0, 32, 0, 164, 0, '#ffd590', 0.5, '#eaa257', 1, '#b4652a') },
    { d: SIDE, fill: lin(0, 120, 0, 164, 0, T, 1, 'rgba(90,30,0,0.3)'), blend: 'multiply' },
    { d: arcAlong(100, 99, 82, 54, 8, 172, 40), stroke: 'rgba(255,230,175,0.7)', sw: 5, clip: DOUGH },
    inside(DOUGH, rad(64, 62, 150, 0, T, 0.5, T, 0.82, '#d68a52', 1, '#a95a30')),
    inside(DOUGH, rad(56, 58, 60, 0, 'rgba(255,240,200,0.6)', 1, 'rgba(255,240,200,0)'), 'screen'),
    rimLight(DOUGH, lin(40, 40, 180, 160, 0, T, 0.68, T, 1, 'rgba(165,220,255,0.95)'), 3),
    { d: DOUGH, stroke: INK, sw: 4.5 },
    // frosting: cast shadow, fill, core shadow, specular, rim, ink
    { d: frost(2.5, 4.5), fill: 'rgba(100,35,10,0.45)', clip: DOUGH, blend: 'multiply' },
    { d: FROST, fill: radLit(90, 72, 96, 0, '#ffd3e6', 0.45, '#f985bb', 1, '#d64a8c') },
    inside(FROST, rad(74, 60, 120, 0, T, 0.5, T, 0.85, '#d9579a', 1, '#b23a78')),
    { d: ell(66, 64, 26, 11), fill: rad(66, 64, 26, 0, 'rgba(255,255,255,0.7)', 1, 'rgba(255,255,255,0)'), clip: FROST, blend: 'screen' },
    rimLight(FROST, lin(50, 40, 175, 150, 0, T, 0.7, T, 1, 'rgba(190,230,255,0.9)'), 2.4),
    // the hole: deep, occluded
    { d: HOLE, fill: lin(0, 67, 0, 93, 0, '#2e1404', 0.5, '#6e3814', 1, '#c98843') },
    inside(HOLE, rad(100, 76, 22, 0, T, 0.5, T, 1, 'rgba(40,10,0,0.6)')),
    { d: FROST, stroke: INK, sw: 4 },
    { d: HOLE, stroke: INK, sw: 3.5 },
    // sprinkles: little shadow, ink, colour, tube highlight
    { d: shift(inkD, 1.1, 1.6), stroke: 'rgba(120,20,60,0.4)', sw: 4.2, clip: FROST, blend: 'multiply' },
    { d: inkD, stroke: INK, sw: 5.6 },
    ...[...byC.entries()].map(([c, d]) => ({ d, stroke: c, sw: 3.1 })),
    { d: shift(inkD, -0.55, -0.7), stroke: 'rgba(255,255,255,0.65)', sw: 1 },
    // speculars
    gloss(arcAlong(100, 84, 62, 37, 196, 246, 16), 5, 0.9),
    gloss(arcAlong(100, 81, 37, 22.5, 112, 150, 8), 2.6, 0.55),
    { d: tips + circ(37, 88, 2.2), fill: 'rgba(255,255,255,0.85)' },
    // front puffs tuck the donut into the cloud
    { d: FRONT, stroke: INK, sw: 8 },
    ...cloudShade(FRONT, 166, 199),
    { d: arcAlong(62, 184, 17, 17, 200, 250, 8) + arcAlong(98, 186, 19, 19, 200, 250, 8) + arcAlong(136, 184, 17, 17, 200, 250, 8), stroke: 'rgba(255,255,255,0.95)', sw: 2.4 },
    // twinkles
    { d: sparkle(24, 30, 9) + sparkle(192, 98, 5), fill: '#ffffff', stroke: INK, sw: 2.2 },
  ]
  if (haze > 0) paths.push({ d: BIG, fill: `rgba(178,218,250,${haze})`, blend: 'source-atop' })
  return { viewW: 200, viewH: 200, paths }
}

export function skyClouds(spots: [number, number, number][] = [[150, 12, 0.38], [88, 8, 0.3], [148, 90, 0.32]]): Art {
  return { viewW: 160, viewH: 101, paths: spots.flatMap(([x, y, s]) => puffCloud(x, y, s)) }
}

// ---- Green swirling portal + lab flask --------------------------------------
// Key light: the portal itself (emissive green, centre of the card); a cool
// ambient from the upper-left. Objects get green light on the side facing it.
export function alienWorld(): Art {
  const paths: VectorPath[] = []
  // nebula haze
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(96, 34, 80, 0, 'rgba(130,70,220,0.36)', 0.5, 'rgba(90,50,180,0.12)', 1, 'rgba(60,40,140,0)'), blend: 'screen' })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(150, 10, 50, 0, 'rgba(50,190,210,0.2)', 1, 'rgba(50,190,210,0)'), blend: 'screen' })
  // ringed planet, top-left, lit from the upper-left
  const P = circ(22, 20, 10)
  paths.push({ d: ell(22, 20, 19, 4.6), stroke: 'rgba(255,214,170,0.45)', sw: 1.4 })
  paths.push({ d: P, fill: radLit(22, 20, 10, 0, '#ffe2c0', 0.5, '#e08a6a', 1, '#7a3a5a') })
  paths.push({ d: 'M12 17 Q22 14 32 17 M12.5 23 Q22 21 31.5 24', stroke: 'rgba(120,50,70,0.35)', sw: 1.2, clip: P })
  paths.push(inside(P, rad(17, 14, 17, 0, T, 0.55, T, 1, '#3a2060')))
  paths.push(rimLight(P, lin(14, 12, 30, 28, 0, T, 0.7, T, 1, 'rgba(150,240,255,0.8)'), 1))
  paths.push({ d: arcAlong(22, 20, 19, 4.6, 0, 180, 16), stroke: 'rgba(255,220,180,0.85)', sw: 1.4 })
  // ridges: far (dim, hazy) then mid
  const ridge = (seed: number, base: number, amp: number, step: number) => {
    const r = rng(seed)
    const pts: number[] = []
    for (let x = -10; x <= 172; x += step) pts.push(x, base - r() * amp)
    return smooth(pts, false) + `L172 101L-10 101Z`
  }
  const R1 = ridge(4, 76, 12, 14)
  paths.push({ d: R1, fill: '#30286a' })
  paths.push({ d: rect(0, 60, 160, 41), fill: lin(0, 60, 0, 90, 0, 'rgba(120,100,220,0)', 1, 'rgba(120,100,220,0.25)'), blend: 'screen' })
  const R2 = ridge(9, 84, 8, 18)
  paths.push({ d: R2, fill: '#221a4c' })
  paths.push(inside(R2, rad(80, 84, 60, 0, 'rgba(150,255,90,0.35)', 1, 'rgba(150,255,90,0)'), 'screen'))
  // near ground, lit by the portal
  const GROUND = 'M-2 87 Q40 82 80 86 Q118 90 162 84 L162 101 L-2 101 Z'
  paths.push({ d: GROUND, fill: lin(0, 82, 0, 101, 0, '#3d2f73', 1, '#130d2a') })
  paths.push(inside(GROUND, rad(80, 87, 70, 0, 'rgba(170,255,100,0.55)', 0.4, 'rgba(140,240,90,0.18)', 1, 'rgba(140,240,90,0)'), 'screen'))
  paths.push(...glowPool(80, 88.5, 38, 6, 0.75, '200,255,130', 30, 'screen'))
  paths.push({ d: 'M-2 87 Q40 82 80 86 Q118 90 162 84', stroke: lin(0, 0, 160, 0, 0, 'rgba(190,170,255,0.3)', 0.5, 'rgba(210,255,150,0.75)', 1, 'rgba(190,170,255,0.3)'), sw: 0.7 })
  // craters: rim lit on the side facing the portal
  const crater = (x: number, y: number, rx: number) => {
    const C = ell(x, y, rx, rx * 0.28)
    return [
      { d: C, fill: 'rgba(10,6,30,0.6)' },
      inside(C, lin(x - rx, 0, x + rx, 0, 0, x < 80 ? T : 'rgba(170,255,120,0.35)', 0.5, T, 1, x < 80 ? 'rgba(170,255,120,0.35)' : T), 'screen'),
      { d: arcAlong(x, y, rx, rx * 0.28, 20, 160, 10), stroke: 'rgba(200,180,255,0.25)', sw: 0.5 },
    ]
  }
  paths.push(...crater(18, 95, 7), ...crater(52, 98, 4), ...crater(140, 94, 5), ...crater(116, 98.5, 3.4))
  paths.push({ d: ell(96, 93, 2.4, 1.3) + ell(130, 97, 1.8, 1) + ell(30, 90, 1.6, 0.9), fill: '#4b3d86' })
  // vignette
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(80, 50, 100, 0, T, 0.6, T, 1, 'rgba(0,0,20,0.6)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// Faceted crystals; the portal is to their right, so right facets glow green.
export function crystals(): Art {
  const paths: VectorPath[] = [...softShade(46, 104, 52, 6, 0.6, '0,0,10'), ...softShade(24, 104, 40, 4, 0.4, '0,0,10')]
  const xs: [number, number, number, number, number][] = [
    // base x, base y, height, half width, tilt
    [22, 104, 46, 7, -0.28], [72, 104, 40, 6.5, 0.32], [40, 104, 78, 10, -0.06], [58, 104, 58, 8.5, 0.16], [86, 104, 24, 5, 0.5],
  ]
  xs.forEach(([bx, by, h, w, t]) => {
    const ux = Math.sin(t)
    const uy = -Math.cos(t)
    const px = Math.cos(t)
    const py = Math.sin(t)
    const at = (u: number, v: number): [number, number] => [bx + ux * u + px * v, by + uy * u + py * v]
    const bl = at(0, -w)
    const br = at(0, w)
    const sl = at(h * 0.78, -w)
    const sr = at(h * 0.78, w)
    const tip = at(h, w * 0.15)
    const ridgeB = at(0, w * 0.25)
    const ridgeS = at(h * 0.8, w * 0.3)
    const L = poly([...bl, ...sl, ...tip, ...ridgeS, ...ridgeB])
    const R = poly([...ridgeB, ...ridgeS, ...tip, ...sr, ...br])
    const ALL = poly([...bl, ...sl, ...tip, ...sr, ...br])
    paths.push(
      { d: L, fill: lin(bl[0], bl[1], tip[0], tip[1], 0, '#1f1650', 1, '#4a3a9a') },
      { d: R, fill: lin(br[0], br[1], tip[0], tip[1], 0, '#2f9a66', 0.6, '#8af0b0', 1, '#e4ffd0') },
      inside(ALL, lin(0, by - h * 0.3, 0, by, 0, T, 1, 'rgba(20,10,50,0.65)')),
      { d: poly([...ridgeB, ...ridgeS], false), stroke: 'rgba(230,255,220,0.7)', sw: 1 },
      { d: poly([...sl, ...ridgeS, ...sr], false), stroke: 'rgba(200,180,255,0.35)', sw: 0.8 },
      rimLight(ALL, lin(bl[0], 0, br[0], 0, 0, T, 0.65, T, 1, 'rgba(190,255,140,0.9)'), 1.6),
      { d: ALL, stroke: INK, sw: 2.4 },
    )
  })
  paths.push({ d: sparkle(64, 34, 3.5) + sparkle(30, 58, 2.6), fill: '#f0ffd8' })
  return { viewW: 100, viewH: 110, paths }
}

export function portal(): Art {
  const CX = 100
  const CY = 106
  const ring = (rx: number, ry: number, amp: number, freq: number, ph: number) => {
    const pts: number[] = []
    for (let i = 0; i < 140; i++) {
      const a = (i / 140) * Math.PI * 2
      const k = 1 + amp * Math.sin(a * freq + ph) + amp * 0.5 * Math.sin(a * (freq * 2 + 1) + ph * 1.3)
      pts.push(CX + rx * k * Math.cos(a), CY + ry * k * Math.sin(a))
    }
    return poly(pts)
  }
  // tapered spiral arm; its centre drifts down-right so the vortex reads as a tunnel
  const arm = (phase: number, turns: number, wmax: number) => {
    const out: number[] = []
    const back: number[] = []
    const S = 56
    for (let i = 0; i <= S; i++) {
      const t = i / S
      const r = 0.05 + 0.9 * t
      const th = phase + t * turns * Math.PI * 2
      const w = wmax * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.85)
      const ox = CX + 7 * (1 - r)
      const oy = CY + 9 * (1 - r)
      out.push(ox + r * 64 * Math.cos(th), oy + r * 78 * Math.sin(th))
      back.push(ox + r * 64 * Math.cos(th - w), oy + r * 78 * Math.sin(th - w))
    }
    for (let i = back.length - 2; i >= 0; i -= 2) out.push(back[i], back[i + 1])
    return poly(out)
  }
  const RIM = ring(84, 98, 0.035, 9, 0.4)
  const DISC = ring(67, 81, 0.03, 11, 1.2)
  let darkArms = ''
  let lightArms = ''
  for (let k = 0; k < 3; k++) {
    darkArms += arm((k * 2 * Math.PI) / 3 + 0.9, 1.05, 0.62)
    lightArms += arm((k * 2 * Math.PI) / 3, 1.05, 0.5)
  }
  const drip = (x: number, len: number) => {
    const D = `M${x - 6} 196 Q${x - 5} ${204 + len * 0.5} ${x - 3.5} ${200 + len} Q${x} ${206 + len} ${x + 3.5} ${200 + len} Q${x + 5} ${204 + len * 0.5} ${x + 6} 196 Z`
    return [
      { d: D, fill: lin(0, 196, 0, 206 + len, 0, '#4fd23a', 1, '#2a9e35'), stroke: INK, sw: 2.4 },
      { d: ell(x - 1.6, 198 + len, 1.3, 2), fill: 'rgba(255,255,255,0.85)' },
    ] as VectorPath[]
  }
  const paths: VectorPath[] = [
    // emitted light, additive
    { d: ell(CX, CY, 108, 118), fill: rad(CX, CY, 106, 0, 'rgba(160,255,80,0.5)', 0.6, 'rgba(160,255,80,0.28)', 1, 'rgba(160,255,80,0)'), blend: 'lighter' },
    ...drip(76, 10),
    ...drip(126, 6),
    // gooey torus rim: form shading, outer occlusion, inner edge lit by the vortex
    { d: RIM, fill: radLit(CX - 8, CY - 16, 122, 0, '#c4ff78', 0.5, '#4fd23a', 1, '#12722b') },
    inside(RIM, rad(CX - 26, CY - 34, 150, 0, T, 0.55, T, 0.85, '#3a8a5a', 1, '#1d4a3a')),
    { d: DISC, stroke: 'rgba(210,255,140,0.9)', sw: 12, clip: RIM, blend: 'screen' },
    rimLight(RIM, lin(40, 30, 185, 205, 0, T, 0.72, T, 1, 'rgba(120,255,230,0.75)'), 3),
    { d: ell(CX - 48, CY - 56, 22, 12), fill: rad(CX - 48, CY - 56, 22, 0, 'rgba(255,255,240,0.85)', 1, 'rgba(255,255,240,0)'), clip: RIM, blend: 'screen' },
    { d: RIM, stroke: INK, sw: 4.5 },
    // vortex: tunnel rings, arms, white-hot core
    { d: DISC, fill: rad(CX + 7, CY + 9, 86, 0, '#fbffe2', 0.16, '#e6ff8e', 0.5, '#74de3e', 0.82, '#2a9e35', 1, '#0f5a22') },
    { d: ell(CX + 3, CY + 4, 52, 64) + ell(CX + 5, CY + 6, 36, 45), stroke: 'rgba(10,70,25,0.3)', sw: 2, clip: DISC },
    { d: darkArms, fill: 'rgba(16,100,36,0.45)', clip: DISC, blend: 'multiply' },
    { d: lightArms, fill: 'rgba(240,255,190,0.7)', clip: DISC, blend: 'screen' },
    inside(DISC, rad(CX + 7, CY + 9, 82, 0, T, 0.7, T, 1, 'rgba(0,40,10,0.7)')),
    { d: circ(CX + 7, CY + 9, 26), fill: rad(CX + 7, CY + 9, 26, 0, '#ffffff', 0.35, 'rgba(255,255,225,0.85)', 1, 'rgba(255,255,225,0)'), blend: 'lighter' },
    { d: DISC, stroke: 'rgba(8,50,18,0.85)', sw: 2.6 },
    // sharp gloss on the rim
    gloss(arcAlong(CX, CY, 77, 91, 198, 246, 16), 4, 0.9),
    gloss(arcAlong(CX, CY, 77, 91, 256, 266, 4), 2.6, 0.7),
    // floating goo spheres + sparks
    ...sphere(14, 126, 6.5, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2.2, [1, -0.4]),
    ...sphere(188, 140, 7, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2.2, [-1, -0.4]),
    ...sphere(30, 196, 4.5, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2, [1, -0.6]),
    ...sphere(180, 34, 4.5, '#efffb0', '#7fe04a', '#1f7a2c', 'rgba(220,255,160,0.9)', 2, [-1, 0.6]),
    { d: sparkle(20, 52, 7) + sparkle(188, 86, 5.5) + sparkle(160, 208, 4.5), fill: '#efffbf', stroke: INK, sw: 1.8 },
  ]
  return { viewW: 200, viewH: 220, paths }
}

// Glass flask, lit by the portal on its left.
export function flask(): Art {
  const GLASS = 'M31 16 H49 V44 Q49 47 51 50 L71 96 Q76 110 62 110 H18 Q4 110 9 96 L29 50 Q31 47 31 44 Z'
  const LIQ = 'M21.5 70 Q40 66.5 58.5 70 L68 95.5 Q71.5 106.5 61 106.5 H19 Q8.5 106.5 12 95.5 Z'
  return {
    viewW: 80,
    viewH: 120,
    paths: [
      // cast shadow away from the portal + contact occlusion + green spill
      ...softShade(58, 112, 38, 5, 0.55, '0,0,10'),
      ...softShade(40, 110.5, 32, 3, 0.5, '0,0,10'),
      ...glowPool(36, 110, 34, 6, 0.5, '170,255,90', 30, 'screen'),
      { d: GLASS, fill: lin(8, 0, 72, 0, 0, 'rgba(200,255,200,0.5)', 0.5, 'rgba(170,200,255,0.22)', 1, 'rgba(60,70,140,0.55)') },
      { d: LIQ, fill: lin(0, 66, 0, 107, 0, '#d8ff7a', 0.6, '#5fd23e', 1, '#23902f') },
      inside(LIQ, lin(10, 0, 70, 0, 0, T, 0.55, T, 1, 'rgba(10,60,40,0.6)')),
      { d: LIQ, fill: rad(34, 92, 24, 0, 'rgba(240,255,190,0.65)', 1, 'rgba(240,255,190,0)'), clip: LIQ, blend: 'screen' },
      { d: ell(40, 70, 18.5, 3.2), fill: '#e8ffae', stroke: 'rgba(30,110,40,0.6)', sw: 1.2 },
      { d: circ(30, 92, 3.6) + circ(44, 84, 2.6) + circ(52, 97, 2.2) + circ(38, 100, 1.6), fill: 'rgba(255,255,255,0.25)', stroke: 'rgba(255,255,255,0.9)', sw: 1.2 },
      { d: 'M58 80 h-6 M61.5 88 h-6 M65 96 h-6', stroke: 'rgba(27,23,18,0.45)', sw: 1.6 },
      rimLight(GLASS, lin(6, 0, 74, 0, 0, 'rgba(200,255,140,0.95)', 0.25, T), 3),
      { d: GLASS, stroke: INK, sw: 4 },
      { d: rrect(27, 12, 26, 7, 3), fill: lin(27, 0, 53, 0, 0, '#e8ffe0', 1, '#8aa2c8'), stroke: INK, sw: 3 },
      { d: rrect(30.5, 1.5, 19, 12, 3), fill: lin(30, 0, 50, 0, 0, '#e2c07c', 1, '#7a4a27'), stroke: INK, sw: 3 },
      { d: circ(36, 6, 0.9) + circ(43, 9, 0.9) + circ(45, 5, 0.7), fill: 'rgba(80,40,10,0.5)' },
      gloss('M25.5 58 L15 90', 3.2, 0.9),
      gloss('M36 22 V38', 2.6, 0.8),
      { d: ell(20, 99, 1.4, 3), fill: 'rgba(255,255,255,0.7)' },
    ],
  }
}

export function starfield(seed: number, count = 70): Art {
  const r = rng(seed)
  let dim = ''
  let mid = ''
  const paths: VectorPath[] = []
  const bright: [number, number][] = []
  for (let i = 0; i < count; i++) {
    const x = r() * 160
    const y = r() * 101
    const k = r()
    if (k < 0.6) dim += circ(x, y, 0.2 + r() * 0.22)
    else if (k < 0.93) mid += circ(x, y, 0.38 + r() * 0.3)
    else bright.push([x, y])
  }
  paths.push({ d: dim, fill: 'rgba(196,212,255,0.55)' }, { d: mid, fill: 'rgba(255,255,255,0.9)' })
  bright.forEach(([x, y]) => {
    paths.push({ d: circ(x, y, 3), fill: rad(x, y, 3, 0, 'rgba(200,220,255,0.55)', 1, 'rgba(200,220,255,0)') }, { d: circ(x, y, 0.8), fill: '#ffffff' })
  })
  // a few twinkles, kept to the right so titles stay clean
  for (let i = 0; i < 3; i++) {
    const x = 78 + r() * 78
    const y = 6 + r() * 88
    const s = 1.8 + r() * 1.4
    paths.push({ d: circ(x, y, s * 1.8), fill: rad(x, y, s * 1.8, 0, 'rgba(210,230,255,0.45)', 1, 'rgba(210,230,255,0)') }, { d: sparkle(x, y, s, 0.12), fill: '#ffffff' })
  }
  return { viewW: 160, viewH: 101, paths }
}

// ---- Lazy orange cat + lasagna ---------------------------------------------
// Key light: morning sun through the window, upper-left. Cool blue rim from
// the wall on the right, warm bounce from the tablecloth below.
export function kitchenWall(): Art {
  const paths: VectorPath[] = []
  // wallpaper: soft stripes with tiny diamonds
  let st = ''
  for (let x = 3; x < 160; x += 12) st += rect(x, 0, 5, 101)
  paths.push({ d: st, fill: 'rgba(255,255,255,0.1)' })
  let dd = ''
  for (let y = 6; y < 74; y += 12) for (let x = 11.5; x < 160; x += 12) dd += poly([x, y - 1.2, x + 1, y, x, y + 1.2, x - 1, y])
  paths.push({ d: dd, fill: 'rgba(255,255,255,0.22)' })
  // light falling off away from the window
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(26, 26, 140, 0, 'rgba(255,248,225,0.45)', 0.35, 'rgba(255,248,225,0.12)', 1, 'rgba(255,248,225,0)'), blend: 'screen' })
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(40, 30, 150, 0, T, 0.55, T, 1, 'rgba(20,60,90,0.6)'), blend: 'multiply' })
  // window (upper-left): deep reveal, bright sky, mullions, sill, curtains
  const WIN = rrect(8, 6, 38, 44, 3)
  const SKY = rrect(12, 10, 30, 36, 1.5)
  paths.push({ d: shift(WIN, 1.6, 2), fill: 'rgba(10,40,60,0.3)' })
  paths.push({ d: WIN, fill: lin(8, 0, 46, 0, 0, '#ffffff', 1, '#dfe8ee'), stroke: INK, sw: 1.1 })
  paths.push({ d: SKY, fill: lin(0, 10, 0, 46, 0, '#fffbe6', 0.35, '#cdeeff', 1, '#8fd0f2') })
  paths.push({ d: ell(20, 18, 14, 10), fill: rad(20, 18, 14, 0, 'rgba(255,255,240,0.95)', 1, 'rgba(255,255,240,0)'), clip: SKY, blend: 'screen' })
  paths.push({ d: smooth([12, 40, 20, 35, 28, 38, 36, 34, 42, 37, 42, 46, 12, 46]), fill: 'rgba(120,190,140,0.55)', clip: SKY })
  paths.push({ d: SKY, stroke: 'rgba(27,23,18,0.55)', sw: 0.6 })
  paths.push({ d: 'M27 10 V46 M12 28 H42', stroke: '#ffffff', sw: 1.6 })
  paths.push({ d: 'M27 10 V46 M12 28 H42', stroke: 'rgba(27,23,18,0.3)', sw: 0.3 })
  paths.push({ d: rrect(5, 49, 44, 3.4, 1.2), fill: lin(0, 49, 0, 52.4, 0, '#ffffff', 1, '#c9d3dc'), stroke: INK, sw: 0.9 })
  paths.push(...softShade(28, 53.6, 22, 1.4, 0.35, '10,40,60'))
  const curtain = (x0: number, dir: number) => {
    const C = `M${x0} 3 Q${x0 + dir * 9} 3 ${x0 + dir * 10} 6 Q${x0 + dir * 6} 30 ${x0 + dir * 9} 58 L${x0} 58 Z`
    return [
      { d: C, fill: lin(x0, 0, x0 + dir * 10, 0, 0, '#ff8f7a', 1, '#d9483a') },
      inside(C, lin(x0, 0, x0 + dir * 10, 0, 0, T, 0.5, 'rgba(120,20,10,0.5)', 1, T)),
      { d: `M${x0 + dir * 3} 6 Q${x0 + dir * 3.5} 30 ${x0 + dir * 3} 56`, stroke: 'rgba(255,230,220,0.6)', sw: 0.6 },
      { d: C, stroke: INK, sw: 1 },
    ] as VectorPath[]
  }
  paths.push(...curtain(3, 1), ...curtain(51, -1))
  paths.push({ d: rrect(1, 1.5, 52, 2.4, 1.2), fill: lin(0, 1.5, 0, 3.9, 0, '#f0d9a8', 1, '#a8824a'), stroke: INK, sw: 0.7 })
  // wall clock stuck at 7 o'clock, with its shadow on the wall
  const cx = 144
  const cy = 16
  const RIMC = circ(cx, cy, 9.2)
  paths.push(...softShade(cx + 2.4, cy + 2.8, 10, 10, 0.4, '10,40,60'))
  paths.push({ d: RIMC, fill: radLit(cx, cy, 9.2, 0, '#ff9a80', 0.5, '#e04a33', 1, '#a82416') })
  paths.push(rimLight(RIMC, lin(cx - 9, cy - 9, cx + 9, cy + 9, 0, T, 0.7, T, 1, 'rgba(170,230,255,0.9)'), 0.8))
  paths.push({ d: RIMC, stroke: INK, sw: 1.1 })
  const FACE = circ(cx, cy, 7)
  paths.push({ d: FACE, fill: radLit(cx, cy, 7, 0, '#ffffff', 1, '#e6dcc4') })
  paths.push(inside(FACE, rad(cx - 3, cy - 3, 10, 0, T, 0.6, T, 1, 'rgba(100,70,40,0.5)')))
  paths.push({ d: FACE, stroke: INK, sw: 0.7 })
  let ticks = ''
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    const r0 = i % 3 === 0 ? 4.9 : 5.5
    ticks += `M${q2(cx + r0 * Math.cos(a))} ${q2(cy + r0 * Math.sin(a))}L${q2(cx + 6.2 * Math.cos(a))} ${q2(cy + 6.2 * Math.sin(a))}`
  }
  paths.push({ d: ticks, stroke: INK, sw: 0.5 })
  const ha = (120 * Math.PI) / 180
  const hands = `M${cx} ${cy}L${q2(cx + 3.4 * Math.cos(ha))} ${q2(cy + 3.4 * Math.sin(ha))}M${cx} ${cy}L${cx} ${cy - 5}`
  paths.push({ d: shift(hands, 0.5, 0.6), stroke: 'rgba(60,40,20,0.3)', sw: 0.8 })
  paths.push({ d: hands, stroke: INK, sw: 0.8 })
  paths.push({ d: circ(cx, cy, 0.8), fill: '#c4321f' })
  paths.push({ d: ell(cx - 3.4, cy - 3.6, 2.6, 1.3), fill: 'rgba(255,255,255,0.8)' })
  // table edge shadow on the wall
  paths.push({ d: rect(0, 66, 160, 10), fill: lin(0, 66, 0, 76, 0, T, 1, 'rgba(10,40,60,0.45)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}

// Sunbeam from the window across wall and table (drawn above the table,
// below the characters).
export function sunbeam(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: poly([12, 10, 42, 10, 118, 101, 46, 101]), fill: lin(20, 10, 80, 101, 0, 'rgba(255,246,210,0.42)', 0.6, 'rgba(255,246,210,0.18)', 1, 'rgba(255,246,210,0)'), blend: 'screen' },
      { d: poly([36, 76, 90, 76, 108, 96, 50, 96]), fill: rad(68, 86, 36, 0, 'rgba(255,240,200,0.5)', 1, 'rgba(255,240,200,0)'), blend: 'screen' },
    ],
  }
}

// Red-and-white checked tablecloth seen in perspective (top + front drop).
export function checks(color = '#e0483a'): Art {
  const VX = 80
  const VY = -95
  const TOP = 17
  const H = 27
  const s = (y: number) => (y - VY) / -VY
  const X = (xb: number, y: number) => VX + (xb - VX) * s(y)
  const rows = [0, 3.4, 7.4, 12, TOP]
  let red = ''
  for (let j = 0; j < rows.length - 1; j++) {
    for (let i = -3; i < 19; i++) {
      if ((i + j) % 2 !== 0) continue
      const xb = i * 10
      const y0 = rows[j]
      const y1 = rows[j + 1]
      red += poly([X(xb, y0), y0, X(xb + 10, y0), y0, X(xb + 10, y1), y1, X(xb, y1), y1])
    }
  }
  const drop = [TOP, 22, H]
  for (let j = 0; j < 2; j++) {
    for (let i = -3; i < 19; i++) {
      if ((i + j + 4) % 2 !== 0) continue
      red += rect(X(i * 10, TOP), drop[j], X((i + 1) * 10, TOP) - X(i * 10, TOP), drop[j + 1] - drop[j])
    }
  }
  return {
    viewW: 160,
    viewH: H,
    paths: [
      { d: rect(-2, 0, 164, H), fill: lin(0, 0, 0, TOP, 0, '#f6efe2', 1, '#fffaf2') },
      { d: red, fill: color },
      { d: rect(-2, 0, 164, TOP), fill: lin(0, 0, 160, 0, 0, 'rgba(255,250,235,0.3)', 0.45, 'rgba(255,250,235,0)'), blend: 'screen' },
      { d: rect(-2, 0, 164, TOP), fill: lin(0, 0, 160, 0, 0, T, 0.5, T, 1, 'rgba(60,40,80,0.35)'), blend: 'multiply' },
      { d: rect(-2, 0, 164, 3), fill: lin(0, 0, 0, 3, 0, 'rgba(60,20,10,0.35)', 1, T), blend: 'multiply' },
      { d: rect(-2, TOP, 164, H - TOP), fill: lin(0, TOP, 0, H, 0, 'rgba(90,30,30,0.35)', 1, 'rgba(50,20,30,0.6)'), blend: 'multiply' },
      { d: `M-2 ${TOP}H162`, stroke: 'rgba(255,255,255,0.65)', sw: 0.6 },
      { d: 'M-2 0.2H162', stroke: 'rgba(40,15,5,0.35)', sw: 0.5 },
    ],
  }
}

export function lazyCat(): Art {
  const O = lin(30, 0, 190, 0, 0, '#ffc463', 0.5, '#f69a2c', 1, '#e07a1c')
  const HEAD_FILL = radLit(104, 64, 96, 0, '#ffcd78', 0.55, '#f69a2c', 1, '#d8721a')
  const CREAM = lin(0, 92, 0, 118, 0, '#fff8e4', 1, '#f3d79e')
  const STRIPE = '#3a1f0c'
  const CORE = (x: number, y: number, r: number) => rad(x, y, r, 0, T, 0.5, T, 0.8, '#d77a3a', 1, '#b4552a')
  const RIM = (x0: number, x1: number) => lin(x0, 0, x1, 0, 0, T, 0.66, T, 1, 'rgba(150,225,255,0.95)')
  const HEAD = smooth([
    110, 26, 142, 28, 166, 40, 180, 62, 186, 78, 198, 86, 184, 93, 192, 104, 172, 111, 150, 123, 110, 129, 70, 123, 48, 111, 28, 104, 36, 93, 22, 86, 34, 78, 40, 62, 54, 40, 78, 28,
  ])
  const BODY = smooth([66, 112, 110, 106, 154, 112, 176, 140, 182, 170, 172, 186, 110, 191, 48, 186, 38, 170, 44, 140])
  const BELLY = ell(110, 160, 34, 26)
  const ARM_L = 'M58 122 Q42 158 56 184 L92 184 Q86 156 86 126 Z'
  const ARM_R = 'M162 122 Q178 158 164 184 L128 184 Q134 156 134 126 Z'
  const EARS = 'M42 66 L47 24 Q49 10 61 16 L98 40 Z M178 66 L173 24 Q171 10 159 16 L122 40 Z'
  const TAIL = 'M166 182 Q214 184 206 146 Q202 124 216 108'
  const lid = (cx: number): string => {
    const e = Math.asin(3 / 23)
    const pts: number[] = []
    for (let i = 0; i <= 24; i++) {
      const a = Math.PI - e + (i / 24) * (Math.PI + 2 * e)
      pts.push(cx + 19 * Math.cos(a), 76 + 23 * Math.sin(a))
    }
    return poly(pts, false) + `Q${cx} 84 ${q2(pts[0])} ${q2(pts[1])}Z`
  }
  const eye = (cx: number, ix: number): VectorPath[] => {
    const E = ell(cx, 76, 19, 23)
    const I = circ(ix, 86, 9.5)
    return [
      { d: E, fill: radLit(cx, 76, 26, 0, '#ffffff', 0.7, '#f2f5f9', 1, '#cdd6e2') },
      inside(E, rad(cx - 6, 70, 30, 0, T, 0.6, T, 1, '#a9b6d0')),
      { d: I, fill: radLit(ix, 86, 9.5, 0, '#f4ff9a', 0.6, '#9cc232', 1, '#5e8a18') },
      { d: arcAlong(ix, 86, 6.5, 6.5, 20, 130, 10), stroke: 'rgba(255,255,200,0.7)', sw: 1.4, clip: I, blend: 'screen' },
      { d: I, stroke: INK, sw: 2 },
      { d: circ(ix, 87, 4.6), fill: INK },
      // the heavy lid casts a shadow onto the eyeball
      { d: shift(lid(cx), 0, 3.5), fill: 'rgba(60,40,90,0.42)', clip: E, blend: 'multiply' },
      { d: circ(ix - 3, 84.6, 2.3), fill: '#ffffff' },
      { d: circ(ix + 3, 90.5, 1.1), fill: 'rgba(255,255,255,0.85)' },
      { d: E, stroke: INK, sw: 3.5 },
      { d: lid(cx), fill: HEAD_FILL },
      inside(lid(cx), lin(0, 53, 0, 81, 0, T, 0.6, T, 1, '#d98a4a')),
      { d: lid(cx), stroke: INK, sw: 3.5 },
      { d: arcAlong(cx, 76, 15, 19, 205, 245, 8), stroke: 'rgba(255,240,200,0.7)', sw: 1.6 },
    ]
  }
  const puff = (x: number): VectorPath[] => {
    const P = ell(x, 105, 14, 10.5)
    return [{ d: P, fill: CREAM }, inside(P, rad(x - 5, 100, 18, 0, T, 0.55, T, 1, '#e3b98a'))]
  }
  const paw = (x: number): VectorPath[] => {
    const P = ell(x, 184, 21, 11)
    return [
      { d: P, fill: lin(0, 173, 0, 195, 0, '#ffc870', 1, '#e07f1e') },
      inside(P, CORE(x - 8, 178, 26)),
      rimLight(P, RIM(x - 21, x + 21), 2),
      { d: P, stroke: INK, sw: 4 },
      { d: `M${x - 6} 187 V193 M${x + 4} 187 V193`, stroke: INK, sw: 2.2 },
      { d: ell(x - 8, 179.5, 6, 2.2), fill: 'rgba(255,255,240,0.7)' },
    ]
  }
  const paths: VectorPath[] = [
    // cast shadow on the table (to the lower-right) + contact occlusion
    ...softShade(130, 193, 100, 11, 0.6, '60,20,30'),
    ...softShade(112, 190, 80, 5, 0.55, '60,20,30'),
    // tail curling up behind
    { d: TAIL, stroke: INK, sw: 19 },
    { d: TAIL, stroke: lin(160, 0, 216, 0, 0, '#f69a2c', 1, '#d87016'), sw: 13 },
    { d: shift(TAIL, -2, -2), stroke: 'rgba(255,220,150,0.6)', sw: 3 },
    { d: shift(TAIL, 3, 2), stroke: 'rgba(150,225,255,0.6)', sw: 2 },
    { d: lens(198, 172, 212, 166, 2.2) + lens(200, 146, 214, 144, 2.2) + lens(203, 126, 216, 124, 2), fill: STRIPE },
    // body: base, belly, stripes, head shadow, core shadow, rim
    { d: BODY, fill: O },
    { d: BELLY, fill: CREAM, clip: BODY },
    { d: lens(40, 146, 60, 150, 3) + lens(39, 160, 58, 163, 3) + lens(180, 146, 160, 150, 3) + lens(181, 160, 162, 163, 3), fill: STRIPE },
    inside(BODY, CORE(84, 120, 110)),
    { d: shift(HEAD, 6, 11), fill: 'rgba(130,40,10,0.45)', clip: BODY, blend: 'multiply' },
    { d: shift(ARM_L, 5, 2) + shift(ARM_R, 5, 2), fill: 'rgba(130,40,10,0.35)', clip: BODY, blend: 'multiply' },
    rimLight(BODY, RIM(50, 184), 3.4),
    { d: BODY, stroke: INK, sw: 4.5 },
    // ears (behind head)
    { d: EARS, fill: HEAD_FILL },
    { d: 'M55 52 L57 30 Q58 24 64 28 L84 41 Z M165 52 L163 30 Q162 24 156 28 L136 41 Z', fill: lin(0, 24, 0, 52, 0, '#ffc4c4', 1, '#e48690') },
    inside(EARS, lin(0, 24, 0, 66, 0, T, 0.6, T, 1, 'rgba(120,40,20,0.55)')),
    rimLight(EARS, RIM(42, 180), 1.6),
    { d: EARS, stroke: INK, sw: 4.5 },
    // head: base, core shadow, top light, rim, stripes
    { d: HEAD, fill: HEAD_FILL },
    inside(HEAD, CORE(88, 52, 132)),
    inside(HEAD, rad(80, 40, 50, 0, 'rgba(255,245,210,0.6)', 1, 'rgba(255,245,210,0)'), 'screen'),
    { d: lens(110, 27, 110, 49, 3.4) + lens(97, 29, 100, 46, 2.7) + lens(123, 29, 120, 46, 2.7), fill: STRIPE },
    { d: lens(25, 87, 46, 88, 2.4) + lens(33, 99, 50, 97, 2.2) + lens(195, 87, 174, 88, 2.4) + lens(187, 99, 170, 97, 2.2), fill: STRIPE },
    // occlusion under the muzzle and eyes
    { d: ell(110, 112, 34, 14), fill: rad(110, 112, 34, 0, 'rgba(150,60,10,0.4)', 1, 'rgba(150,60,10,0)'), clip: HEAD, blend: 'multiply' },
    rimLight(HEAD, RIM(30, 198), 3.4),
    { d: HEAD, stroke: INK, sw: 4.8 },
    gloss(arcAlong(110, 74, 62, 40, 205, 245, 14), 4.2, 0.7),
    // sleepy eyes, looking at the lasagna
    ...eye(91.5, 86),
    ...eye(128.5, 120),
    // muzzle, nose, bored mouth, whiskers
    { d: ell(99, 105, 14, 10.5) + ell(121, 105, 14, 10.5), stroke: INK, sw: 6 },
    ...puff(99),
    ...puff(121),
    { d: 'M110 99 Q111 106 110 113', stroke: INK, sw: 2.4 },
    { d: circ(95, 106, 1.1) + circ(101, 109, 1.1) + circ(96, 111, 1.1) + circ(125, 106, 1.1) + circ(119, 109, 1.1) + circ(124, 111, 1.1), fill: 'rgba(120,60,20,0.6)' },
    { d: shift('M103 95 Q110 90.5 117 95 Q114.5 101.5 110 102.5 Q105.5 101.5 103 95 Z', 1.5, 2.5), fill: 'rgba(140,80,40,0.35)', blend: 'multiply' },
    { d: 'M103 95 Q110 90.5 117 95 Q114.5 101.5 110 102.5 Q105.5 101.5 103 95 Z', fill: radLit(110, 96, 8, 0, '#ffc0d2', 1, '#d84a76'), stroke: INK, sw: 2.4 },
    { d: ell(107, 94.6, 2, 1.1), fill: 'rgba(255,255,255,0.9)' },
    { d: 'M103 120.5 Q110 117.5 117 120.5', stroke: INK, sw: 2.6 },
    { d: 'M85 102 Q68 98 50 100 M85 108 Q68 108 49 113 M135 102 Q152 98 170 100 M135 108 Q152 108 171 113', stroke: INK, sw: 1.8 },
    // arms + paws resting on the table
    { d: ARM_L, fill: O },
    { d: lens(46, 150, 62, 152, 2.4) + lens(47, 166, 62, 167, 2.4), fill: STRIPE, clip: ARM_L },
    inside(ARM_L, lin(46, 0, 92, 0, 0, 'rgba(255,240,200,0.5)', 0.4, T)),
    inside(ARM_L, lin(46, 0, 92, 0, 0, T, 0.55, T, 1, '#d98a4a')),
    { d: ARM_L, stroke: INK, sw: 4.2 },
    { d: ARM_R, fill: O },
    { d: lens(174, 150, 158, 152, 2.4) + lens(173, 166, 158, 167, 2.4), fill: STRIPE, clip: ARM_R },
    inside(ARM_R, lin(128, 0, 176, 0, 0, T, 0.45, T, 1, '#c9682e')),
    rimLight(ARM_R, RIM(128, 178), 2.6),
    { d: ARM_R, stroke: INK, sw: 4.2 },
    ...paw(74),
    ...paw(146),
  ]
  return { viewW: 220, viewH: 200, paths }
}

export function lasagna(): Art {
  // slice in 3/4 view: front face, right side face, cheesy top
  const L = 30
  const R = 94
  const Tp = 48
  const B = 80
  const DX = 18
  const DY = -10
  const layers: [number, string][] = [
    [Tp, '#e9a33c'], [Tp + 5, '#f8db7c'], [Tp + 9.5, '#c8361f'], [Tp + 15, '#fff2d0'], [Tp + 18.5, '#f8db7c'], [Tp + 23, '#c8361f'], [Tp + 28, '#f8db7c'],
  ]
  const front: VectorPath[] = []
  const side: VectorPath[] = []
  layers.forEach(([y0, c], i) => {
    const y1 = i + 1 < layers.length ? layers[i + 1][0] : B
    front.push({ d: rect(L, y0, R - L, y1 - y0), fill: c })
    side.push({ d: poly([R, y0, R + DX, y0 + DY, R + DX, y1 + DY, R, y1]), fill: shade(c, -0.3) })
  })
  const FRONT = rect(L, Tp, R - L, B - Tp)
  const SIDEF = poly([R, Tp, R + DX, Tp + DY, R + DX, B + DY, R, B])
  const SLICE = poly([L, Tp, L + DX, Tp + DY, R + DX, Tp + DY, R + DX, B + DY, R, B, L, B])
  const TOPFACE = poly([L, Tp, L + DX, Tp + DY, R + DX, Tp + DY, R, Tp])
  const PLATE = ell(70, 82, 64, 15)
  return {
    viewW: 140,
    viewH: 100,
    paths: [
      // plate shadow on the table (lower-right)
      ...softShade(80, 90, 66, 9, 0.45, '60,20,30'),
      { d: PLATE, fill: lin(0, 67, 0, 97, 0, '#ffffff', 1, '#c9d2de') },
      inside(PLATE, lin(6, 0, 134, 0, 0, T, 0.55, T, 1, '#a9b4cc')),
      { d: ell(70, 81, 48, 10), fill: lin(0, 71, 0, 91, 0, '#dfe6ef', 1, '#ffffff'), stroke: 'rgba(27,23,18,0.18)', sw: 1.5 },
      { d: PLATE, stroke: INK, sw: 3.5 },
      { d: arcAlong(70, 82, 58, 12, 190, 240, 10), stroke: 'rgba(255,255,255,0.95)', sw: 2 },
      // slice shadow on the plate + contact occlusion
      ...shadowOn(ell(70, 81, 48, 10), 84, 83, 46, 7, 0.75, '90,40,30'),
      { d: rect(L, B - 1, R - L + 4, 2.4), fill: 'rgba(60,20,10,0.3)' },
      // slice
      ...front,
      ...side,
      inside(FRONT, lin(0, Tp, 0, B, 0, T, 0.5, T, 1, 'rgba(120,40,30,0.4)')),
      inside(FRONT, lin(L, 0, R, 0, 0, 'rgba(255,245,210,0.35)', 0.4, T), 'screen'),
      inside(SIDEF, lin(R, 0, R + DX, 0, 0, T, 1, 'rgba(80,30,60,0.35)')),
      { d: TOPFACE, fill: lin(0, Tp + DY, 0, Tp, 0, '#ffe58a', 1, '#f6c24e') },
      { d: ell(52, 43, 4, 1.6) + ell(80, 41, 5, 1.8) + ell(98, 42, 3, 1.2) + ell(66, 45, 2.6, 1), fill: 'rgba(196,110,30,0.75)' },
      { d: ell(60, 41, 2.6, 1.1) + ell(90, 44.5, 2.4, 1), fill: '#c8361f' },
      // cheese drips over the front edge
      { d: `M${L} ${Tp}H${R}V${Tp + 3}Q${R - 4} ${Tp + 3} ${R - 6} ${Tp + 8}Q${R - 8} ${Tp + 12} ${R - 10} ${Tp + 7}Q${R - 13} ${Tp + 3} ${R - 20} ${Tp + 4}Q${R - 26} ${Tp + 4} ${R - 28} ${Tp + 10}Q${R - 30} ${Tp + 15} ${R - 33} ${Tp + 9}Q${R - 36} ${Tp + 3} ${R - 44} ${Tp + 4}Q${R - 50} ${Tp + 5} ${R - 52} ${Tp + 8}Q${R - 54} ${Tp + 11} ${R - 56} ${Tp + 6}Q${R - 58} ${Tp + 3} ${L} ${Tp + 3}Z`, fill: lin(0, Tp, 0, Tp + 14, 0, '#ffd760', 1, '#f2a93a') },
      { d: circ(R - 7.6, Tp + 9, 0.9) + circ(R - 29.6, Tp + 11, 0.9) + circ(R - 53.6, Tp + 8, 0.8), fill: 'rgba(255,255,255,0.9)' },
      { d: `M${R} ${Tp}V${B}M${L} ${Tp}H${R}L${R + DX} ${Tp + DY}`, stroke: INK, sw: 2.2 },
      { d: SLICE, stroke: INK, sw: 3.6 },
      // oily specular glints on the cheese
      { d: ell(46, 45.5, 5, 1.1) + ell(76, 43.2, 3, 0.8) + circ(88, 40.6, 0.8), fill: 'rgba(255,255,255,0.85)' },
      gloss(`M${L + 8} ${Tp - 3} L${L + 22} ${Tp - 7}`, 2.2, 0.8),
      // basil leaf
      { d: 'M70 40 Q78 32 88 36 Q80 44 70 40 Z', fill: lin(70, 34, 88, 42, 0, '#8fe36a', 1, '#2f8a32'), stroke: INK, sw: 2 },
      { d: 'M72 39.5 Q79 37 85 37', stroke: 'rgba(255,255,255,0.7)', sw: 1 },
      // steam, glowing in the sunbeam
      { d: 'M48 30 Q42 22 48 15 Q54 8 48 0 M68 27 Q62 18 68 11 Q74 4 69 -3 M88 29 Q82 21 88 14 Q94 7 89 1', stroke: 'rgba(255,255,255,0.35)', sw: 7 },
      { d: 'M48 30 Q42 22 48 15 Q54 8 48 0 M68 27 Q62 18 68 11 Q74 4 69 -3 M88 29 Q82 21 88 14 Q94 7 89 1', stroke: 'rgba(255,255,255,0.8)', sw: 3 },
    ],
  }
}

// ---- Flower-power mystery van -----------------------------------------------
// Key light: the full moon, upper-right (cool white). Purple ambient, pink rim
// on the left; the headlight and the mansion windows emit warm light.
function powerFlower(cx: number, cy: number, r: number): VectorPath[] {
  const petals: string[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    petals.push(circ(cx + r * 0.6 * Math.cos(a), cy + r * 0.6 * Math.sin(a), r * 0.48))
  }
  const U = union(petals)
  return [
    { d: U, stroke: INK, sw: Math.max(2.4, r * 0.36) },
    { d: U, fill: rad(cx + r * 0.4, cy - r * 0.4, r * 1.6, 0, '#ffd88a', 0.5, '#ff9b2e', 1, '#c4501a') },
    { d: circ(cx, cy, r * 0.36), fill: rad(cx + r * 0.1, cy - r * 0.12, r * 0.4, 0, '#fff7a8', 1, '#e0a01c'), stroke: INK, sw: Math.max(1.4, r * 0.15) },
    { d: circ(cx + r * 0.42, cy - r * 0.62, r * 0.13), fill: 'rgba(255,255,255,0.85)' },
  ]
}

export function mysteryVan(): Art {
  const BODY = 'M18 104 Q14 104 14 98 L14 40 Q14 21 34 21 L170 20 Q184 20 192 30 L214 60 Q230 64 232 80 L232 98 Q232 104 226 104 Z'
  const LOWER = 'M14 72 H229.8 Q232 76 232 82 L232 98 Q232 104 226 104 H18 Q14 104 14 98 Z'
  const GLASSP = lin(0, 30, 0, 58, 0, '#d9f2ff', 0.45, '#7cbde6', 1, '#355f9e')
  const wins = [rrect(28, 30, 40, 26, 6), rrect(76, 30, 40, 26, 6), rrect(124, 30, 32, 26, 6)]
  const SHIELD = 'M167 30 H185 Q189 30 191 33 L207 56 Q208.5 58.5 205 58.5 H171 Q167 58.5 167 54.5 Z'
  const GLASS = wins.join('') + SHIELD
  const MOONRIM = (x0: number, y0: number, x1: number, y1: number) => lin(x0, y0, x1, y1, 0, T, 0.65, T, 1, 'rgba(235,240,255,0.95)')
  const wheel = (x: number): VectorPath[] => {
    const W = circ(x, 107, 18)
    const H = circ(x, 107, 9.5)
    return [
      { d: W, fill: rad(x + 6, 101, 26, 0, '#5a5a6a', 0.6, '#1c1c24', 1, '#0a0a10') },
      { d: arcAlong(x, 107, 15, 15, 280, 350, 10), stroke: 'rgba(220,230,255,0.55)', sw: 2.4 },
      { d: W, stroke: INK, sw: 3.5 },
      { d: H, fill: lin(x - 9, 116, x + 9, 98, 0, '#7d8696', 0.55, '#d8dee6', 1, '#ffffff') },
      { d: arcAlong(x, 107, 6.5, 6.5, 290, 340, 6), stroke: '#ffffff', sw: 1.4 },
      { d: H, stroke: INK, sw: 2.2 },
      { d: circ(x, 107, 2.8), fill: '#5f6874' },
      { d: circ(x + 3.8, 103.4, 1.2), fill: '#ffffff' },
    ]
  }
  return {
    viewW: 300,
    viewH: 136,
    paths: [
      // headlight beam + pool of light on the road (additive)
      { d: poly([229, 76, 300, 64, 300, 126, 229, 86]), fill: lin(229, 0, 300, 0, 0, 'rgba(255,236,160,0.6)', 1, 'rgba(255,236,160,0)'), blend: 'screen' },
      ...glowPool(272, 125, 34, 6, 0.6, '255,230,150', 30, 'screen'),
      // moon shadow falls to the lower-left; occlusion right under the chassis
      ...softShade(104, 126, 120, 8, 0.6, '5,0,20'),
      ...softShade(122, 122, 100, 4, 0.55, '0,0,10'),
      // roof rack + luggage
      { d: rrect(48, 3, 30, 11, 2.5), fill: lin(48, 14, 78, 3, 0, '#7a4a20', 1, '#e0a868'), stroke: INK, sw: 2.4 },
      { d: 'M63 3 V14 M56 3 Q56 0 63 0 Q70 0 70 3', stroke: INK, sw: 1.8 },
      { d: rrect(86, 4, 36, 10, 5), fill: lin(0, 14, 0, 4, 0, '#a8304e', 1, '#ff9aaa'), stroke: INK, sw: 2.4 },
      { d: 'M96 4.5 V13.5 M112 4.5 V13.5', stroke: 'rgba(255,255,255,0.75)', sw: 1.6 },
      { d: 'M34 21 V14 M158 20 V14', stroke: INK, sw: 3 },
      { d: 'M28 14 H164', stroke: INK, sw: 4 },
      { d: 'M28 14 H164', stroke: lin(28, 0, 164, 0, 0, '#8a92a6', 1, '#f2f6ff'), sw: 1.6 },
      // body: teal top, blue skirt, orange stripe
      { d: BODY, fill: lin(0, 20, 0, 72, 0, '#8ff0d8', 1, '#2fb398') },
      { d: LOWER, fill: lin(0, 72, 0, 104, 0, '#5c9ef6', 1, '#264fae') },
      { d: 'M14 72 H229.8', stroke: INK, sw: 6.5 },
      { d: 'M14 72 H229.8', stroke: '#ffa133', sw: 3.4 },
      // glass with moon reflections
      { d: GLASS, fill: GLASSP },
      { d: poly([150, 30, 160, 30, 136, 58, 126, 58]) + poly([190, 30, 197, 30, 180, 58, 173, 58]) + poly([102, 30, 107, 30, 83, 58, 78, 58]), fill: 'rgba(255,255,255,0.45)', clip: GLASS, blend: 'screen' },
      { d: circ(196, 40, 3.2), fill: rad(196, 40, 6, 0, 'rgba(255,250,220,0.95)', 1, 'rgba(255,250,220,0)'), clip: GLASS, blend: 'screen' },
      inside(GLASS, lin(0, 30, 0, 58, 0, T, 0.55, T, 1, 'rgba(20,10,60,0.45)')),
      { d: GLASS, stroke: INK, sw: 3.5 },
      // door, handle, mirror
      { d: 'M162 25 V101', stroke: INK, sw: 2.6 },
      { d: rrect(149, 62, 9, 3.4, 1.7), fill: lin(0, 62, 0, 65.4, 0, '#ffffff', 1, '#8a94a4'), stroke: INK, sw: 1.8 },
      { d: 'M209 52 L213 47', stroke: INK, sw: 2.4 },
      { d: rrect(210, 40, 7, 9, 2.5), fill: lin(210, 0, 217, 0, 0, '#2a8c78', 1, '#7ff0d8'), stroke: INK, sw: 2.2 },
      // flowers
      ...powerFlower(24, 88, 7),
      ...powerFlower(98, 87, 10.5),
      ...powerFlower(132, 82, 7.5),
      ...powerFlower(152, 94, 6),
      ...powerFlower(50, 64, 5.5),
      ...powerFlower(142, 64, 5),
      // volume: moonlit top, core shadow toward the left and the bottom
      inside(BODY, lin(0, 20, 0, 40, 0, 'rgba(225,235,255,0.55)', 1, T), 'screen'),
      inside(BODY, lin(232, 0, 14, 0, 0, T, 0.45, T, 1, 'rgba(70,40,140,0.6)')),
      inside(BODY, lin(0, 20, 0, 104, 0, T, 0.6, T, 1, 'rgba(40,20,90,0.6)')),
      rimLight(BODY, lin(14, 0, 232, 0, 0, 'rgba(255,140,230,0.95)', 0.1, T), 2.8),
      rimLight(BODY, MOONRIM(60, 104, 232, 20), 2.6),
      // wheel arches
      { d: 'M33 104 A23 23 0 0 1 79 104 Z M165 104 A23 23 0 0 1 211 104 Z', fill: '#0e0920' },
      { d: BODY, stroke: INK, sw: 4.6 },
      { d: 'M33 104 A23 23 0 0 1 79 104 M165 104 A23 23 0 0 1 211 104', stroke: INK, sw: 3.6 },
      gloss('M60 26 L166 25.5 Q182 25.5 188 33', 2.6, 0.8),
      ...wheel(56),
      ...wheel(188),
      // chrome bumpers and lights
      { d: rrect(7, 94, 13, 9, 3) + rrect(223, 94, 15, 9, 3), fill: lin(0, 94, 0, 103, 0, '#ffffff', 0.45, '#c3cbd6', 1, '#5c6474'), stroke: INK, sw: 2.6 },
      { d: ell(232, 96, 3, 0.9) + ell(15, 96, 2.4, 0.8), fill: '#ffffff' },
      { d: rrect(12, 76, 5, 10, 2), fill: lin(0, 76, 0, 86, 0, '#ff8a7a', 1, '#c7261e'), stroke: INK, sw: 2 },
      { d: circ(14.5, 81, 7), fill: rad(14.5, 81, 7, 0, 'rgba(255,80,80,0.5)', 1, 'rgba(255,80,80,0)'), blend: 'screen' },
      { d: circ(229, 80, 22), fill: rad(229, 80, 22, 0, 'rgba(255,244,190,0.9)', 0.35, 'rgba(255,230,150,0.35)', 1, 'rgba(255,230,150,0)'), blend: 'screen' },
      { d: circ(228.5, 80, 5), fill: rad(228, 79.5, 5, 0, '#ffffff', 0.6, '#fff4b0', 1, '#f2c21c'), stroke: INK, sw: 2.4 },
    ],
  }
}

export function ghost(): Art {
  const BODY = 'M14 42 Q14 8 40 8 Q66 8 66 42 L66 74 Q63 81 58 76 Q53 71 48 77 Q44 82 40 77 Q36 71 32 77 Q27 82 22 76 Q17 71 14 76 Z'
  const ARMS = 'M15 46 Q4 46 6 56 Q12 57 16 52 Z M65 46 Q76 44 75 34 Q69 34 65 40 Z'
  return {
    viewW: 80,
    viewH: 90,
    paths: [
      { d: ell(40, 46, 40, 44), fill: rad(40, 46, 42, 0, 'rgba(210,200,255,0.55)', 1, 'rgba(210,200,255,0)'), blend: 'screen' },
      { d: ARMS, fill: '#eceeff' },
      inside(ARMS, lin(0, 34, 0, 57, 0, T, 1, '#b7b4e6')),
      { d: ARMS, stroke: INK, sw: 3 },
      { d: BODY, fill: lin(14, 0, 66, 0, 0, '#c9c6f0', 0.45, '#f4f4ff', 1, '#ffffff') },
      inside(BODY, rad(56, 18, 64, 0, T, 0.55, T, 1, '#a9a2e0')),
      rimLight(BODY, lin(66, 10, 14, 70, 0, T, 0.7, T, 1, 'rgba(255,160,240,0.85)'), 2.4),
      { d: BODY, stroke: INK, sw: 3.6 },
      gloss('M59 34 Q58 17 45 14', 3.2, 0.95),
      { d: ell(31, 38, 5, 7) + ell(49, 38, 5, 7), fill: INK },
      { d: circ(33, 35.5, 1.9) + circ(51, 35.5, 1.9), fill: '#ffffff' },
      { d: ell(40, 52, 4, 5), fill: lin(0, 47, 0, 57, 0, '#1a0614', 1, '#5a2040'), stroke: INK, sw: 2 },
      { d: circ(25, 47, 4.5), fill: rad(25, 47, 4.5, 0, 'rgba(255,120,170,0.55)', 1, 'rgba(255,120,170,0)') },
      { d: circ(55, 47, 4.5), fill: rad(55, 47, 4.5, 0, 'rgba(255,120,170,0.55)', 1, 'rgba(255,120,170,0)') },
    ],
  }
}

export function hauntedNight(): Art {
  // bat silhouette: pointed wing tips, scalloped trailing edge, little ears
  const bat = (x: number, y: number, k: number) => {
    const P = (px: number, py: number) => `${q2(x + px * k)} ${q2(y + py * k)}`
    return (
      `M${P(0, -1)}Q${P(4, -5)} ${P(9, -5.5)}Q${P(13, -6)} ${P(16, -3.5)}Q${P(13, -2.5)} ${P(12, 1)}Q${P(10, -0.5)} ${P(7.5, 2)}` +
      `Q${P(5.5, 0.5)} ${P(3, 3)}Q${P(1.5, 2)} ${P(0, 4)}Q${P(-1.5, 2)} ${P(-3, 3)}Q${P(-5.5, 0.5)} ${P(-7.5, 2)}Q${P(-10, -0.5)} ${P(-12, 1)}` +
      `Q${P(-13, -2.5)} ${P(-16, -3.5)}Q${P(-13, -6)} ${P(-9, -5.5)}Q${P(-4, -5)} ${P(0, -1)}Z` +
      `M${P(-1.8, 0)}L${P(-1.5, -3.6)}L${P(-0.5, -1.6)}L${P(0.5, -1.6)}L${P(1.5, -3.6)}L${P(1.8, 0)}Q${P(1.8, 3)} ${P(0, 3.4)}Q${P(-1.8, 3)} ${P(-1.8, 0)}Z`
    )
  }
  const MX = 128
  const MY = 22
  const paths: VectorPath[] = []
  paths.push({ d: dots(46, 9, 160, 58, 0.18, 0.5), fill: 'rgba(255,255,255,0.55)' })
  // moon: wide bloom, faint moonbeams, craters with lit lower-left rims
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(MX, MY, 70, 0, 'rgba(255,240,200,0.55)', 0.2, 'rgba(230,210,255,0.25)', 1, 'rgba(200,180,255,0)'), blend: 'screen' })
  ;[[120, 128], [138, 146], [154, 160]].forEach(([a, b]) => {
    const A = (a * Math.PI) / 180
    const B = (b * Math.PI) / 180
    paths.push({ d: poly([MX, MY, MX + 160 * Math.cos(A), MY + 160 * Math.sin(A), MX + 160 * Math.cos(B), MY + 160 * Math.sin(B)]), fill: rad(MX, MY, 120, 0, 'rgba(230,225,255,0.16)', 1, 'rgba(230,225,255,0)'), blend: 'screen' })
  })
  const MOON = circ(MX, MY, 15)
  paths.push({ d: MOON, fill: rad(MX + 4, MY - 4, 20, 0, '#fffdf0', 0.6, '#ffefb8', 1, '#e2bf6a') })
  ;[[122, 17, 3, 2.6], [133.5, 26, 3.8, 3.3], [124.5, 29, 2, 1.7], [134, 15.5, 1.6, 1.4]].forEach(([x, y, rx, ry]) => {
    paths.push({ d: ell(x, y, rx, ry), fill: 'rgba(196,156,80,0.4)' }, { d: arcAlong(x, y, rx, ry, 100, 190, 8), stroke: 'rgba(255,255,240,0.6)', sw: 0.4 })
  })
  paths.push({ d: lens(100, 31, 148, 31.5, 2.4) + lens(118, 36, 158, 36, 1.8) + lens(92, 26.5, 114, 26, 1.2), fill: 'rgba(52,36,104,0.82)' })
  paths.push({ d: lens(100, 30, 148, 30.5, 0.8) + lens(118, 35.3, 158, 35.3, 0.6), fill: 'rgba(255,240,210,0.35)', blend: 'screen' })
  // far hills, then haze
  paths.push({ d: 'M-2 66 Q22 58 46 63 Q70 69 92 60 Q122 50 162 58 L162 101 L-2 101 Z', fill: '#2f2466' })
  paths.push({ d: rect(0, 55, 160, 46), fill: lin(0, 55, 0, 85, 0, 'rgba(150,130,230,0.05)', 1, 'rgba(150,130,230,0.3)'), blend: 'screen' })
  // mid hill with the mansion in front of the moon
  const HILL = 'M70 101 L70 80 Q96 60 118 58 Q142 57 162 66 L162 101 Z'
  paths.push({ d: HILL, fill: '#1f1748' })
  paths.push(rimLight(HILL, lin(70, 60, 162, 60, 0, T, 0.4, 'rgba(220,220,255,0.35)', 1, 'rgba(220,220,255,0.5)'), 0.8))
  const HOUSE =
    rect(104, 44, 26, 16) + poly([101.5, 44.5, 117, 34, 132.5, 44.5]) + rect(99, 36, 7, 24) + poly([98, 36.5, 102.5, 24, 107, 36.5]) +
    rect(126, 30, 8, 30) + poly([125, 30.5, 130, 15, 135, 30.5]) + rect(113, 32, 3, 6) + rect(96, 58, 42, 3)
  paths.push({ d: HOUSE, fill: '#150e33' })
  paths.push(inside(HOUSE, lin(96, 0, 136, 0, 0, T, 0.75, T, 1, 'rgba(230,220,255,0.3)'), 'screen'))
  const lit = rect(101, 40, 2.6, 3.4) + rect(108, 48, 3.4, 4) + rect(120, 48, 3.4, 4) + rect(128.6, 35, 2.8, 3.6) + rect(114.5, 53, 3.6, 7)
  ;[[102.3, 41.7], [109.7, 50], [121.7, 50], [130, 36.8], [116.3, 56.5]].forEach(([x, y]) => paths.push({ d: circ(x, y, 6), fill: rad(x, y, 6, 0, 'rgba(255,200,90,0.5)', 1, 'rgba(255,200,90,0)'), blend: 'screen' }))
  paths.push({ d: lit, fill: '#ffd47a' })
  // graveyard on the left, stones lit on their moon side
  const stone = (x: number, y: number, w: number, h: number) => `M${x} ${y}V${y - h + w / 2}Q${x} ${y - h} ${x + w / 2} ${y - h}Q${x + w} ${y - h} ${x + w} ${y - h + w / 2}V${y}Z`
  const STONES = stone(3, 71, 6, 8) + stone(13, 70, 5, 6.5) + stone(26, 72, 5.5, 7) + rect(21.2, 61.5, 1.6, 9.5) + rect(19, 63.6, 6, 1.6)
  paths.push({ d: STONES, fill: '#271e5a' })
  paths.push(inside(STONES, lin(0, 60, 32, 74, 0, T, 0.55, T, 1, 'rgba(200,200,255,0.35)'), 'screen'))
  paths.push(...softShade(14, 71.5, 20, 1.4, 0.5, '5,0,20'))
  // fog between the planes, then the road, then low fog
  paths.push({ d: lens(-10, 79, 72, 79, 3) + lens(56, 83, 130, 83, 2.6) + lens(104, 76.5, 170, 76.5, 2.6), fill: 'rgba(200,185,255,0.2)' })
  const ROAD = 'M-2 88 Q50 83 100 87 Q130 89.5 162 85.5 L162 101 L-2 101 Z'
  paths.push({ d: ROAD, fill: lin(0, 84, 0, 101, 0, '#2a1f58', 1, '#100a24') })
  paths.push(inside(ROAD, rad(MX, 80, 60, 0, 'rgba(210,200,255,0.2)', 1, 'rgba(210,200,255,0)'), 'screen'))
  paths.push({ d: 'M-2 88 Q50 83 100 87 Q130 89.5 162 85.5', stroke: 'rgba(200,190,255,0.35)', sw: 0.6 })
  paths.push({ d: lens(-8, 94, 66, 94, 2.2) + lens(70, 97, 170, 97, 2.2), fill: 'rgba(200,185,255,0.14)' })
  paths.push({ d: bat(MX - 4, 14, 0.42) + bat(100, 9, 0.36) + bat(150, 44, 0.32) + bat(62, 20, 0.3), fill: '#110a26' })
  // vignette
  paths.push({ d: rect(0, 0, 160, 101), fill: rad(96, 40, 110, 0, T, 0.55, T, 1, 'rgba(5,0,20,0.6)'), blend: 'multiply' })
  return { viewW: 160, viewH: 101, paths }
}
