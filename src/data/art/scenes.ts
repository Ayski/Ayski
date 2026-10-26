import type { VectorPath } from '../../types'
import { bandedSun, circ, dots, ell, halftone, INK, perspectiveGrid, poly, rng, rrect, star, type Art } from './kit'

// ---- Comics ------------------------------------------------------------------
export function comicsBurst(): Art {
  const r = rng(21)
  const spiky = (cx: number, cy: number, ro: number, ri: number, nPts: number) => {
    const pts: number[] = []
    for (let i = 0; i < nPts * 2; i++) {
      const rad = i % 2 ? ri * (0.85 + r() * 0.3) : ro * (0.8 + r() * 0.35)
      const a = (i / (nPts * 2)) * Math.PI * 2
      pts.push(cx + rad * Math.cos(a), cy + rad * Math.sin(a) * 0.72)
    }
    return poly(pts)
  }
  return {
    viewW: 200,
    viewH: 150,
    paths: [
      { d: spiky(100, 75, 98, 62, 14), fill: '#e63946', stroke: INK, sw: 5 },
      { d: spiky(100, 75, 74, 48, 12), fill: '#ff9f1c' },
      { d: spiky(100, 75, 52, 34, 10), fill: '#ffe066' },
    ],
  }
}

export function comicsBackdrop(dot: string): Art {
  return { viewW: 160, viewH: 101, paths: [halftone(160, 101, 5, 2.3, dot)] }
}

export function actionLines(color = 'rgba(0,0,0,0.18)'): Art {
  let d = ''
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2
    d += `M${(80 + 40 * Math.cos(a)).toFixed(1)} ${(50 + 26 * Math.sin(a)).toFixed(1)}L${(80 + 130 * Math.cos(a)).toFixed(1)} ${(50 + 90 * Math.sin(a)).toFixed(1)}`
  }
  return { viewW: 160, viewH: 101, paths: [{ d, stroke: color, sw: 1.6 }] }
}

export function heroShield(): Art {
  return {
    viewW: 120,
    viewH: 130,
    paths: [
      { d: 'M60 4 L112 22 Q112 90 60 126 Q8 90 8 22 Z', fill: '#1d4ed8', stroke: INK, sw: 5 },
      { d: 'M60 16 L100 30 Q100 84 60 112 Q20 84 20 30 Z', fill: '#e63946', stroke: INK, sw: 3 },
      { d: poly([68, 28, 40, 72, 58, 72, 48, 104, 82, 54, 63, 54, 74, 28]), fill: '#ffe066', stroke: INK, sw: 3.5 },
    ],
  }
}

export function speechBubble(): Art {
  return {
    viewW: 140,
    viewH: 80,
    paths: [
      { d: 'M14 8 H126 Q134 8 134 16 V50 Q134 58 126 58 H52 L30 76 L36 58 H14 Q6 58 6 50 V16 Q6 8 14 8 Z', fill: '#ffffff', stroke: INK, sw: 4 },
    ],
  }
}

// ---- Synthwave ---------------------------------------------------------------
export function outrun(): Art {
  const sun = bandedSun(80, 50, 30, ['#ffe66d', '#ffc857', '#ffa45c', '#ff7d6b', '#ff5c8a', '#f43f9e', '#d62aa8'], 0.35)
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: dots(40, 3, 160, 46, 0.2, 0.6), fill: 'rgba(255,255,255,0.8)' },
      ...sun,
      { d: 'M0 62 L18 46 L30 54 L46 38 L62 54 L72 48 L80 56 L92 44 L108 56 L122 40 L140 56 L150 50 L160 58 L160 64 L0 64 Z', fill: '#2a0b4a', stroke: '#ff4fd8', sw: 0.9 },
      { d: 'M0 62 H160 V101 H0 Z', fill: '#120327' },
      perspectiveGrid(160, 101, 62, '#ff2e97', 0.8),
    ],
  }
}

export function palm(color = '#14051f'): Art {
  const frond = (a: number, len: number) => {
    const ax = 50 + len * Math.cos(a)
    const ay = 30 + len * Math.sin(a)
    const cx = 50 + len * 0.55 * Math.cos(a - 0.35)
    const cy = 30 + len * 0.55 * Math.sin(a - 0.35) - 8
    return `M50 30 Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ax.toFixed(1)} ${ay.toFixed(1)}`
  }
  let fronds = ''
  ;[-2.9, -2.4, -1.9, -1.3, -0.8, -0.3, 0.2].forEach((a, i) => (fronds += frond(a, 34 + (i % 3) * 5)))
  return {
    viewW: 100,
    viewH: 150,
    paths: [
      { d: 'M50 30 Q42 80 56 150', stroke: color, sw: 7 },
      { d: fronds, stroke: color, sw: 6 },
    ],
  }
}

// ---- Old-school tattoo -------------------------------------------------------
export function tattooHeart(): Art {
  return {
    viewW: 200,
    viewH: 170,
    paths: [
      { d: 'M150 14 L40 150', stroke: INK, sw: 11 },
      { d: 'M150 14 L40 150', stroke: '#c9ced6', sw: 7 },
      { d: 'M36 140 L56 156 M152 10 L162 2 L168 8 L160 18 Z', stroke: INK, sw: 5, fill: '#d4a017' },
      { d: 'M100 156 C30 110 18 70 46 46 C66 30 90 38 100 58 C110 38 134 30 154 46 C182 70 170 110 100 156 Z', fill: '#d62828', stroke: INK, sw: 6 },
      { d: 'M56 60 Q64 48 80 50', stroke: '#ffd6d6', sw: 6 },
      { d: 'M10 92 L40 84 L40 112 L10 120 L20 104 Z M190 92 L160 84 L160 112 L190 120 L180 104 Z', fill: '#1f6f8b', stroke: INK, sw: 4 },
      { d: 'M34 82 Q100 66 166 82 L166 112 Q100 96 34 112 Z', fill: '#f4e1b8', stroke: INK, sw: 4 },
    ],
  }
}

export function swallow(): Art {
  return {
    viewW: 200,
    viewH: 130,
    paths: [
      { d: 'M102 64 Q70 30 28 12 Q52 44 86 72 Z', fill: '#1d3557', stroke: INK, sw: 4 },
      { d: 'M118 60 Q150 26 192 10 Q172 46 128 74 Z', fill: '#1d3557', stroke: INK, sw: 4 },
      { d: 'M82 78 L16 98 L60 88 L24 122 L94 88 Z', fill: '#1d3557', stroke: INK, sw: 4 },
      { d: 'M78 80 Q96 56 132 58 Q156 60 160 72 Q152 88 130 90 Q104 94 78 80 Z', fill: '#1d3557', stroke: INK, sw: 4 },
      { d: 'M94 84 Q114 94 136 86 Q118 79 100 79 Z', fill: '#f4e1b8', stroke: INK, sw: 3 },
      { d: 'M138 60 Q157 62 160 72 Q152 83 137 81 Q130 70 138 60 Z', fill: '#d62828', stroke: INK, sw: 3 },
      { d: circ(147, 67, 3), fill: '#ffffff' },
      { d: circ(147.5, 67, 1.4), fill: INK },
      { d: poly([159, 70, 172, 72, 159, 76]), fill: INK },
      { d: 'M48 32 Q66 44 82 58 M150 34 Q136 46 124 58', stroke: '#457b9d', sw: 2.5 },
    ],
  }
}

export function tattooStars(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [{ d: star(18, 18, 7, 3) + star(142, 16, 6, 2.5) + star(146, 86, 5, 2) + star(14, 84, 5, 2), fill: '#d4a017', stroke: INK, sw: 1.6 }],
  }
}

// ---- Japan -----------------------------------------------------------------
export function greatWave(): Art {
  const r = rng(9)
  let claws = ''
  for (let i = 0; i < 9; i++) {
    const x = 50 + i * 7 + r() * 2
    const y = 34 + Math.sin(i / 2.2) * 6
    claws += `M${x.toFixed(1)} ${y.toFixed(1)} q3 -6 7 -2`
  }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: circ(126, 26, 14), fill: '#d7263d' },
      { d: 'M104 101 L122 74 L130 80 L138 72 L156 101 Z', fill: '#3d5a80', stroke: INK, sw: 1.2 },
      { d: 'M118 80 L122 74 L130 80 L138 72 L142 78 Q132 82 126 78 Q122 82 118 80 Z', fill: '#ffffff' },
      { d: 'M0 101 L0 70 Q18 38 50 32 Q82 26 98 46 Q106 58 96 64 Q88 60 86 54 Q76 46 66 54 Q58 62 70 74 Q88 88 112 82 Q132 76 142 90 L160 101 Z', fill: '#1d3f72', stroke: INK, sw: 1.6 },
      { d: 'M8 78 Q28 50 56 44 M14 90 Q36 64 68 66 M30 100 Q60 82 96 90', stroke: '#8fb8e8', sw: 1.4 },
      { d: claws + 'M86 54 q-4 -8 4 -10 M96 64 q6 -2 4 -8', stroke: '#ffffff', sw: 1.6 },
      { d: 'M110 101 Q126 90 142 96 Q150 100 160 98 L160 101 Z', fill: '#2c5aa0', stroke: INK, sw: 1.2 },
    ],
  }
}

export function koi(): Art {
  return {
    viewW: 200,
    viewH: 110,
    paths: [
      { d: 'M150 52 Q176 30 196 22 Q186 52 196 84 Q176 76 150 60 Z', fill: '#ff7b25', stroke: INK, sw: 4 },
      { d: 'M70 30 Q60 6 84 10 Q92 18 90 30 Z M78 82 Q68 104 92 100 Q98 92 94 80 Z', fill: '#ff9a4d', stroke: INK, sw: 3 },
      { d: 'M10 56 Q24 30 70 30 Q120 30 154 56 Q120 82 70 82 Q24 82 10 56 Z', fill: '#fff4ea', stroke: INK, sw: 4 },
      { d: 'M40 36 Q60 32 72 46 Q60 60 44 52 Z M96 34 Q122 36 132 50 Q118 62 102 52 Q92 44 96 34 Z M70 70 Q88 66 96 78 Q80 82 70 70 Z', fill: '#ff6a13' },
      { d: circ(110, 60, 3.4) + circ(128, 48, 2.6), fill: INK },
      { d: circ(26, 50, 4), fill: INK },
      { d: circ(27, 49, 1.3), fill: '#ffffff' },
      { d: 'M12 58 Q4 66 2 76 M14 60 Q10 70 12 80', stroke: INK, sw: 2.4 },
    ],
  }
}

export function ripples(): Art {
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: ell(30, 24, 18, 6) + ell(30, 24, 10, 3) + ell(132, 80, 20, 7) + ell(132, 80, 11, 4), stroke: 'rgba(255,255,255,0.4)', sw: 1.2 },
    ],
  }
}

// ---- Space -------------------------------------------------------------------
export function ringedPlanet(): Art {
  const back = 'M14 66 A86 22 0 0 1 186 66'
  const front = 'M186 66 A86 22 0 0 1 14 66'
  return {
    viewW: 200,
    viewH: 130,
    paths: [
      { d: back, stroke: INK, sw: 12 },
      { d: back, stroke: '#e9c46a', sw: 7 },
      { d: circ(100, 64, 46), fill: '#f4a261', stroke: INK, sw: 5 },
      { d: 'M58 50 Q100 60 142 46 M56 70 Q100 82 144 68 M62 90 Q100 100 136 88', stroke: '#e76f51', sw: 6 },
      { d: circ(84, 42, 5) + circ(118, 84, 3), fill: 'rgba(255,255,255,0.35)' },
      { d: front, stroke: INK, sw: 12 },
      { d: front, stroke: '#e9c46a', sw: 7 },
    ],
  }
}

export function rocket(): Art {
  return {
    viewW: 100,
    viewH: 170,
    paths: [
      { d: 'M36 128 Q50 172 64 128 Z', fill: '#ff9f1c' },
      { d: 'M42 128 Q50 156 58 128 Z', fill: '#ffe066' },
      { d: 'M28 92 L8 128 L32 118 Z M72 92 L92 128 L68 118 Z', fill: '#e63946', stroke: INK, sw: 4 },
      { d: 'M50 6 Q80 34 76 94 L72 124 L28 124 L24 94 Q20 34 50 6 Z', fill: '#f1f3f5', stroke: INK, sw: 5 },
      { d: 'M50 6 Q66 20 72 40 L28 40 Q34 20 50 6 Z', fill: '#e63946', stroke: INK, sw: 4 },
      { d: circ(50, 66, 13), fill: '#4dabf7', stroke: INK, sw: 4 },
      { d: 'M44 60 Q48 56 54 58', stroke: '#ffffff', sw: 3 },
      { d: 'M50 98 V122', stroke: INK, sw: 3 },
    ],
  }
}

// ---- Parody ID -----------------------------------------------------------------
export function idPattern(): Art {
  let d = ''
  for (let i = 0; i < 9; i++) {
    const y = 30 + i * 8
    d += `M0 ${y}`
    for (let x = 0; x <= 160; x += 8) d += `Q${x + 4} ${y + (i % 2 ? 3 : -3)} ${x + 8} ${y}`
  }
  const seal: VectorPath = { d: circ(140, 80, 13) + circ(140, 80, 9), stroke: 'rgba(29,78,216,0.45)', sw: 1.4 }
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d, stroke: 'rgba(29,78,216,0.08)', sw: 1 },
      seal,
      { d: star(140, 80, 6, 2.6), fill: 'rgba(29,78,216,0.4)' },
      { d: rrect(0, 0, 160, 22, 0), fill: '#1d4ed8' },
    ],
  }
}
