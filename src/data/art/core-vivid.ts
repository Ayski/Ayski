import type { VectorPath } from '../../types'
import { bandedSun, blob, circ, dots, lin, perspectiveGrid, poly, rad, radLit, rect, rng, type Art } from './kit'

// Vivid artwork: cyberpunk, neon, abstract, marble and nature collections.

// Neon city skyline in two depth planes, lit windows, rain and a grid floor.
export function neonCity(): Art {
  const r = rng(404)
  const paths: VectorPath[] = []
  const skyline = (seed: number, baseY: number, minH: number, maxH: number) => {
    const rr = rng(seed)
    const pts: number[] = [0, baseY]
    const boxes: [number, number, number, number][] = []
    let x = 0
    while (x < 160) {
      const w = 6 + rr() * 12
      const h = minH + rr() * (maxH - minH)
      pts.push(x, baseY - h, x + w, baseY - h)
      boxes.push([x, baseY - h, w, h])
      x += w
    }
    pts.push(160, baseY)
    return { d: poly(pts), boxes }
  }
  const far = skyline(7, 64, 10, 34)
  const near = skyline(19, 64, 6, 22)
  paths.push({ d: rect(0, 40, 160, 26), fill: lin(0, 40, 0, 66, 0, 'rgba(255,46,151,0)', 1, 'rgba(255,46,151,0.35)') })
  paths.push({ d: far.d, fill: '#2a1250' })
  let winA = ''
  let winB = ''
  for (const [bx, by, bw] of near.boxes) {
    for (let wy = by + 2; wy < 62; wy += 3.2) {
      for (let wx = bx + 1.5; wx < bx + bw - 1.5; wx += 2.6) {
        const v = r()
        if (v < 0.22) winA += rect(wx, wy, 1.2, 1.4)
        else if (v < 0.32) winB += rect(wx, wy, 1.2, 1.4)
      }
    }
  }
  paths.push({ d: near.d, fill: '#120726' })
  paths.push({ d: winA, fill: '#5ef0ff', alpha: 0.85 }, { d: winB, fill: '#ff4fd8', alpha: 0.85 })
  paths.push({ d: rect(0, 64, 160, 40), fill: lin(0, 64, 0, 101, 0, '#1a0633', 1, '#05010d') })
  paths.push(perspectiveGrid(160, 101, 64, 'rgba(255,46,151,0.7)', 0.5))
  paths.push({ d: 'M0 64 H160', stroke: '#ff7ad9', sw: 0.8 })
  let rain = ''
  const rr = rng(88)
  for (let i = 0; i < 70; i++) {
    const x = rr() * 170
    const y = rr() * 101
    rain += `M${x.toFixed(1)} ${y.toFixed(1)}l-2 6`
  }
  paths.push({ d: rain, stroke: 'rgba(180,220,255,0.18)', sw: 0.35 })
  return { viewW: 160, viewH: 101, paths }
}

// Horizontal glitch slices, scanlines and pixel noise.
export function glitchField(): Art {
  const r = rng(3)
  const paths: VectorPath[] = []
  let cyan = ''
  let red = ''
  let white = ''
  for (let i = 0; i < 16; i++) {
    const y = r() * 101
    const h = 0.6 + r() * 3.5
    const x = r() * 120
    const w = 10 + r() * 60
    const pick = r()
    const d = rect(x, y, w, h)
    if (pick < 0.4) cyan += d
    else if (pick < 0.8) red += d
    else white += d
  }
  paths.push({ d: cyan, fill: 'rgba(0,240,255,0.22)' }, { d: red, fill: 'rgba(255,40,90,0.22)' }, { d: white, fill: 'rgba(255,255,255,0.12)' })
  let scan = ''
  for (let y = 0; y < 101; y += 1.6) scan += `M0 ${y.toFixed(1)}H160`
  paths.push({ d: scan, stroke: 'rgba(0,0,0,0.25)', sw: 0.5 })
  let px = ''
  for (let i = 0; i < 40; i++) px += rect(Math.floor(r() * 80) * 2, Math.floor(r() * 50) * 2, 2, 2)
  paths.push({ d: px, fill: 'rgba(255,255,255,0.25)' })
  return { viewW: 160, viewH: 101, paths }
}

// Glowing ECG heartbeat line inside a neon tube frame.
export function heartbeat(color = '#b6a8ff'): Art {
  let d = 'M12 58'
  for (let x = 12; x < 140; ) {
    d += `L${x + 14} 58L${x + 17} 52L${x + 20} 58L${x + 23} 58L${x + 25} 66L${x + 28} 30L${x + 31} 72L${x + 34} 58L${x + 44} 58`
    x += 44
  }
  d += 'L148 58'
  const frame = 'M14 10 H146 Q152 10 152 16 V85 Q152 91 146 91 H14 Q8 91 8 85 V16 Q8 10 14 10 Z'
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: frame, stroke: color, sw: 4, alpha: 0.12 },
      { d: frame, stroke: color, sw: 0.9, alpha: 0.8 },
      { d, stroke: color, sw: 6, alpha: 0.12 },
      { d, stroke: color, sw: 2.6, alpha: 0.35 },
      { d, stroke: '#ffffff', sw: 0.8 },
    ],
  }
}

// Sunset sea with banded sun, reflections and framing palm leaves.
export function miamiSunset(): Art {
  const sun = bandedSun(104, 52, 22, ['#fff1a8', '#ffd36b', '#ffb05c', '#ff8a6b', '#ff5f8f', '#f2449e'], 0.4)
  // Tapered frond blade with serrated leaflets along both edges.
  const leaf = (x0: number, y0: number, x1: number, y1: number, bend: number) => {
    const mx = (x0 + x1) / 2 + bend
    const my = (y0 + y1) / 2 - Math.abs(bend) * 0.6
    const N = 30
    const left: number[] = []
    const right: number[] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * mx + t * t * x1
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * my + t * t * y1
      const tx = 2 * (1 - t) * (mx - x0) + 2 * t * (x1 - mx)
      const ty = 2 * (1 - t) * (my - y0) + 2 * t * (y1 - my)
      const len = Math.hypot(tx, ty) || 1
      const nx = -ty / len
      const ny = tx / len
      const w = 6.5 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.08)), 0.8) * (i % 2 ? 1 : 0.72)
      left.push(px + nx * w, py + ny * w)
      right.unshift(px - nx * w, py - ny * w)
    }
    return poly([...left, ...right])
  }
  let refl = ''
  for (let i = 0; i < 9; i++) {
    const y = 76 + i * 2.6
    const w = 26 - i * 2.2
    refl += `M${(104 - w / 2).toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}`
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      ...sun,
      { d: rect(0, 74, 160, 30), fill: lin(0, 74, 0, 101, 0, '#5b2a86', 1, '#1d0b3a') },
      { d: refl, stroke: '#ffb05c', sw: 1, alpha: 0.7 },
      { d: 'M0 74 H160', stroke: 'rgba(255,190,220,0.6)', sw: 0.6 },
      { d: 'M157 101 Q147 62 151 14', stroke: '#14051f', sw: 3.4 },
      { d: leaf(151, 14, 108, 34, -10), fill: '#14051f' },
      { d: leaf(151, 14, 122, 56, 6), fill: '#1a0828' },
      { d: leaf(151, 14, 118, 4, -8), fill: '#14051f' },
      { d: leaf(151, 14, 176, 44, 8), fill: '#14051f' },
      { d: leaf(151, 14, 142, -12, -4), fill: '#1a0828' },
    ],
  }
}

// Glossy liquid-metal blobs.
export function liquidBlobs(): Art {
  const paths: VectorPath[] = []
  const blobs: [number, number, number, number, string, string, string][] = [
    [46, 34, 30, 3, '#c7b8ff', '#7c5cff', '#3b1fa8'],
    [112, 70, 34, 4, '#ffe6a3', '#e2a93a', '#8a5a10'],
    [128, 22, 16, 2, '#a6fff0', '#2fd3c0', '#0f7f74'],
    [70, 82, 14, 2, '#ffc2e2', '#ff6fb5', '#a8236a'],
  ]
  blobs.forEach(([x, y, rr, amp, a, b, c], i) => {
    const d = blob(x, y, rr, Math.min(amp, rr * 0.07), 2 + (i % 2), i * 1.3)
    paths.push({ d, fill: radLit(x, y, rr * 1.1, 0, a, 0.55, b, 1, c), alpha: 0.95 })
    paths.push({ d: `M${x - rr * 0.6} ${y - rr * 0.35} Q${x - rr * 0.3} ${y - rr * 0.75} ${x + rr * 0.15} ${y - rr * 0.72}`, stroke: 'rgba(255,255,255,0.7)', sw: Math.max(1.2, rr * 0.09) })
  })
  return { viewW: 160, viewH: 101, paths }
}

// Layered ocean wave bands with foam crests.
export function waveBands(): Art {
  const paths: VectorPath[] = []
  const colors = ['#5fd3e8', '#2fb2cf', '#1690b3', '#0d6f93', '#0a5373', '#073a52']
  colors.forEach((c, i) => {
    const y = 30 + i * 12
    let d = `M0 ${y}`
    for (let x = 0; x <= 160; x += 20) d += `Q${x + 10} ${y + (i % 2 ? 7 : -7)} ${x + 20} ${y}`
    paths.push({ d: d + 'L160 101L0 101Z', fill: lin(0, y - 8, 0, y + 30, 0, c, 1, '#052a3c') })
    paths.push({ d, stroke: 'rgba(255,255,255,0.55)', sw: 0.7 })
  })
  return { viewW: 160, viewH: 101, paths }
}

// Procedural marble: cloudy base plus branching veins.
export function marble(dark: boolean): Art {
  const r = rng(dark ? 61 : 29)
  const paths: VectorPath[] = []
  for (let i = 0; i < 9; i++) {
    paths.push({ d: blob(r() * 160, r() * 101, 18 + r() * 26, 4, 3, r() * 6), fill: dark ? 'rgba(255,255,255,0.025)' : 'rgba(120,120,130,0.05)' })
  }
  const vein = (x: number, y: number, a: number, steps: number): string => {
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`
    for (let k = 0; k < steps; k++) {
      a += (r() - 0.5) * 0.7
      x += Math.cos(a) * (4 + r() * 4)
      y += Math.sin(a) * (4 + r() * 4)
      d += `L${x.toFixed(1)} ${y.toFixed(1)}`
    }
    return d
  }
  let main = ''
  let fine = ''
  for (let i = 0; i < 4; i++) {
    const sx = -5 + r() * 40
    const sy = r() * 101
    main += vein(sx, sy, -0.25 + r() * 0.5, 26)
    for (let j = 0; j < 3; j++) fine += vein(sx + r() * 100, r() * 101, r() * 6.28, 8)
  }
  const veinColor = dark ? 'rgba(255,255,255,0.5)' : 'rgba(90,90,100,0.45)'
  paths.push({ d: main, stroke: dark ? 'rgba(255,255,255,0.045)' : 'rgba(80,80,90,0.05)', sw: 2.2 })
  paths.push({ d: main, stroke: veinColor, sw: 0.4 })
  paths.push({ d: fine, stroke: veinColor, sw: 0.3, alpha: 0.7 })
  let gold = ''
  for (let i = 0; i < 2; i++) gold += vein(r() * 60, r() * 101, -0.2 + r() * 0.4, 22)
  paths.push({ d: gold, stroke: '#e2b85a', sw: 0.7, alpha: 0.9 })
  return { viewW: 160, viewH: 101, paths }
}

// Misty pine forest in four depth planes under a moon.
export function pineForest(): Art {
  const ridge = (seed: number, base: number, h: number, step: number) => {
    const rr = rng(seed)
    const pts: number[] = [-5, 101, -5, base]
    for (let x = -5; x < 168; x += step) {
      const th = h * (0.6 + rr() * 0.6)
      const y = base + (rr() - 0.5) * 6
      pts.push(x, y, x + step * 0.5, y - th, x + step, y)
    }
    pts.push(168, base, 168, 101)
    return poly(pts)
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: circ(118, 26, 22), fill: rad(118, 26, 22, 0, 'rgba(255,248,220,0.35)', 1, 'rgba(255,248,220,0)') },
      { d: circ(118, 26, 8), fill: radLit(118, 26, 8, 0, '#fffbe8', 1, '#e8dcb0') },
      { d: ridge(3, 60, 14, 9), fill: '#4a6b6a' },
      { d: rect(0, 50, 160, 30), fill: lin(0, 50, 0, 80, 0, 'rgba(220,235,230,0)', 0.6, 'rgba(220,235,230,0.25)', 1, 'rgba(220,235,230,0)') },
      { d: ridge(9, 72, 18, 8), fill: '#2c4a45' },
      { d: rect(0, 66, 160, 22), fill: lin(0, 66, 0, 88, 0, 'rgba(210,230,225,0)', 0.6, 'rgba(210,230,225,0.2)', 1, 'rgba(210,230,225,0)') },
      { d: ridge(15, 86, 24, 10), fill: '#16302b' },
      { d: ridge(27, 100, 30, 13), fill: '#08150f' },
    ],
  }
}

// Sunset over the sea: sun, reflection, mountains and birds.
export function sunsetSea(): Art {
  let refl = ''
  for (let i = 0; i < 10; i++) {
    const y = 68 + i * 3
    const w = 30 - i * 2.4
    refl += `M${(96 - w / 2).toFixed(1)} ${y}h${w.toFixed(1)}`
  }
  const bird = (x: number, y: number, s: number) => `M${x - 4 * s} ${y - 1.5 * s}Q${x - 2 * s} ${y - 3 * s} ${x} ${y}Q${x + 2 * s} ${y - 3 * s} ${x + 4 * s} ${y - 1.5 * s}`
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: circ(96, 56, 40), fill: rad(96, 56, 40, 0, 'rgba(255,214,150,0.45)', 1, 'rgba(255,214,150,0)') },
      { d: circ(96, 56, 15), fill: lin(0, 41, 0, 71, 0, '#fff4c2', 1, '#ffb066') },
      { d: poly([0, 66, 14, 54, 26, 60, 42, 46, 60, 62, 72, 58, 80, 66]), fill: '#5a2a4a' },
      { d: poly([112, 66, 126, 52, 138, 58, 150, 48, 160, 54, 160, 66]), fill: '#4a2240' },
      { d: rect(0, 66, 160, 36), fill: lin(0, 66, 0, 101, 0, '#e07a6a', 0.4, '#7a3a6a', 1, '#2a1238') },
      { d: refl, stroke: '#ffd38a', sw: 1, alpha: 0.75 },
      { d: 'M0 66 H160', stroke: 'rgba(255,220,180,0.6)', sw: 0.5 },
      { d: bird(52, 30, 1) + bird(62, 24, 0.8) + bird(40, 22, 0.7), stroke: '#3a1830', sw: 0.9 },
      { d: dots(10, 9, 160, 30, 0.2, 0.4), fill: 'rgba(255,255,255,0.5)' },
    ],
  }
}
