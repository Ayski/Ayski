import type { VectorPath } from '../../types'
import { circ, cloud, ell, flames, INK, pixels, rect, rng, rrect, type Art } from './kit'

// Hand-made parody art of classic video-game universes (original drawings,
// no official logos, sprites ripped from games, or trademarked names).

// ---- One-eyed floating demon (pixel art) + hellfire -------------------------
export function pixelDemon(): Art {
  const map = [
    '....D..DD..D....',
    '...DRD.DD.DRD...',
    '..DRRRDRRDRRRD..',
    '.DRRRRRRRRRRRRD.',
    'DRRRRRWWWWRRRRRD',
    'DRRRRWGGGGWRRRRD',
    'DRRRRWGKKGWRRRRD',
    'DRRRRWGGGGWRRRRD',
    'DRRORRWWWWRRRORD',
    'DRRRRRRRRRRRRRRD',
    'DRRKKKKKKKKKKRRD',
    'DRKWKWKMMKWKWKRD',
    'DRKMMMMMMMMMMKRD',
    '.DRKWKWKKWKWKRD.',
    '..DRRRRRRRRRRD..',
    '...DDDDDDDDDD...',
  ]
  return {
    viewW: 160,
    viewH: 160,
    paths: pixels(map, { D: '#4a0710', R: '#c8102e', O: '#ff7a45', W: '#f5f5f5', G: '#55ff55', K: '#140405', M: '#6e0a14' }),
  }
}

export function hellfire(): Art {
  return {
    viewW: 160,
    viewH: 50,
    paths: [
      { d: flames(160, 46, 50, 9, 3), fill: '#b3121f' },
      { d: flames(160, 34, 50, 11, 8), fill: '#ff5a1f' },
      { d: flames(160, 20, 50, 13, 15), fill: '#ffc93c' },
    ],
  }
}

// ---- Blue speedy hedgehog ----------------------------------------------------
export function hedgehog(): Art {
  const B = '#1f5fd1'
  const P = '#f6c79a'
  return {
    viewW: 200,
    viewH: 190,
    paths: [
      { d: 'M10 66 H50 M0 96 H38 M14 128 H48', stroke: 'rgba(255,255,255,0.9)', sw: 5 },
      { d: 'M150 68 L44 32 L92 76 L12 80 L84 102 L22 138 L94 122 L60 170 L120 130 Q150 148 170 124 Z', fill: B, stroke: INK, sw: 5 },
      { d: circ(132, 98, 44), fill: B, stroke: INK, sw: 5 },
      { d: 'M106 66 L110 30 L138 56 Z', fill: B, stroke: INK, sw: 4 },
      { d: 'M112 58 L114 42 L128 55 Z', fill: P },
      { d: 'M128 110 Q150 96 176 104 Q190 114 178 128 Q152 140 132 126 Q122 118 128 110 Z', fill: P, stroke: INK, sw: 4 },
      { d: 'M118 78 Q128 62 142 74 Q156 60 168 76 Q175 94 160 100 Q146 96 143 90 Q136 102 124 98 Q111 90 118 78 Z', fill: '#fff', stroke: INK, sw: 4 },
      { d: ell(134, 84, 6, 9) + ell(158, 84, 6, 9), fill: '#2ea44f' },
      { d: ell(136, 85, 3, 5) + ell(160, 85, 3, 5), fill: INK },
      { d: circ(138, 81, 1.6) + circ(162, 81, 1.6), fill: '#fff' },
      { d: ell(184, 106, 7, 6), fill: INK },
      { d: 'M150 122 Q162 128 173 118', stroke: INK, sw: 4 },
      { d: 'M118 72 L141 66', stroke: INK, sw: 4 },
    ],
  }
}

export function goldRings(): Art {
  const ring = (x: number, y: number, rx: number, ry: number): VectorPath[] => [
    { d: ell(x, y, rx, ry), stroke: INK, sw: 9 },
    { d: ell(x, y, rx, ry), stroke: '#f5c518', sw: 6 },
    { d: `M${x - rx * 0.5} ${y - ry * 0.75} Q${x} ${y - ry * 1.05} ${x + rx * 0.5} ${y - ry * 0.75}`, stroke: '#fff6c4', sw: 2 },
  ]
  return { viewW: 100, viewH: 40, paths: [...ring(16, 20, 11, 13), ...ring(50, 20, 8, 13), ...ring(84, 20, 3.5, 13)] }
}

// Rolling hills with a checkered dirt bank.
export function checkerHills(): Art {
  let checks = ''
  for (let y = 0; y < 3; y++) for (let x = 0; x < 17; x++) if ((x + y) % 2 === 0) checks += rect(x * 10, 74 + y * 10, 10, 10)
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      ...cloud(148, 12, 0.35),
      ...cloud(97, 8, 0.28),
      { d: 'M-10 74 Q20 48 50 70 Q80 44 112 68 Q140 50 170 70 L170 101 L-10 101 Z', fill: '#2f9e44', stroke: INK, sw: 1.4 },
      { d: rect(0, 74, 160, 30), fill: '#b5651d' },
      { d: checks, fill: '#e08a3c' },
      { d: 'M0 74 Q10 70 20 74 Q30 70 40 74 Q50 70 60 74 Q70 70 80 74 Q90 70 100 74 Q110 70 120 74 Q130 70 140 74 Q150 70 160 74 L160 78 L0 78 Z', fill: '#4cd137', stroke: INK, sw: 1.2 },
    ],
  }
}

// ---- 1-UP mushroom and "?" block (pixel art) ---------------------------------
export function pixelMushroom(): Art {
  const map = [
    '.....KKKKKK.....',
    '...KKGGWWWWKK...',
    '..KGGGGWWWWGGK..',
    '.KWGGGGGGGGGWWK.',
    '.KWWGGGGGGGWWWK.',
    'KWWWGGWWWGGGWWWK',
    'KWWGGWWWWWGGGWWK',
    'KGGGGWWWWWGGGGGK',
    'KGGGGWWWWWGGGGGK',
    'KWGGGGWWWGGGGWWK',
    '.KKKKKKKKKKKKKK.',
    '..KCCCKCCKCCCK..',
    '..KCCCKCCKCCCK..',
    '..KCCCCCCCCCCK..',
    '...KCCCCCCCCK...',
    '....KKKKKKKK....',
  ]
  return { viewW: 160, viewH: 160, paths: pixels(map, { K: '#141414', G: '#2bb24c', W: '#f7f7f7', C: '#f8d6a8' }) }
}

export function questionBlock(): Art {
  return {
    viewW: 100,
    viewH: 100,
    paths: [
      { d: rect(4, 4, 92, 92), fill: '#f8b800', stroke: INK, sw: 6 },
      { d: rect(10, 10, 80, 6) + rect(10, 10, 6, 80), fill: '#ffd860' },
      { d: rect(10, 84, 80, 6) + rect(84, 10, 6, 80), fill: '#c07800' },
      { d: rect(14, 14, 7, 7) + rect(79, 14, 7, 7) + rect(14, 79, 7, 7) + rect(79, 79, 7, 7), fill: INK },
    ],
  }
}

export function brickGround(): Art {
  let mortar = ''
  for (let row = 0; row < 2; row++) {
    const y = row * 10
    mortar += `M0 ${y}H160`
    for (let x = row % 2 ? 10 : 0; x < 160; x += 20) mortar += `M${x} ${y}V${y + 10}`
  }
  return {
    viewW: 160,
    viewH: 20,
    paths: [
      { d: rect(0, 0, 160, 20), fill: '#c84c0c' },
      { d: mortar + 'M0 20H160', stroke: '#2a0d00', sw: 1.4 },
      { d: rect(0, 1, 160, 1.5), fill: '#ffa070' },
    ],
  }
}

// ---- Hungry yellow eater in a maze ------------------------------------------
export function glouton(): Art {
  return {
    viewW: 300,
    viewH: 120,
    paths: [
      { d: circ(170, 60, 6) + circ(205, 60, 6) + circ(240, 60, 6), fill: '#ffd8a8' },
      { d: circ(282, 60, 12), fill: '#ffd8a8' },
      { d: 'M60 60 L108 32 A56 56 0 1 0 108 88 Z', fill: '#ffe600', stroke: INK, sw: 4 },
      { d: circ(66, 30, 6), fill: INK },
    ],
  }
}

export function ghost(color = '#ff3b3b'): Art {
  return {
    viewW: 100,
    viewH: 108,
    paths: [
      { d: 'M10 100 L10 50 A40 40 0 0 1 90 50 L90 100 L76 88 L63 100 L50 88 L37 100 L24 88 Z', fill: color, stroke: INK, sw: 4 },
      { d: ell(36, 50, 10, 13) + ell(64, 50, 10, 13), fill: '#fff' },
      { d: circ(40, 54, 5) + circ(68, 54, 5), fill: '#2340ff' },
    ],
  }
}

export function maze(): Art {
  const walls = rrect(3, 3, 154, 95, 8) + rrect(20, 18, 34, 12, 6) + rrect(106, 18, 34, 12, 6) + rrect(20, 72, 34, 12, 6) + rrect(106, 72, 34, 12, 6) + rrect(66, 14, 28, 10, 5) + rrect(66, 78, 28, 10, 5)
  return {
    viewW: 160,
    viewH: 101,
    paths: [
      { d: walls, stroke: '#2340ff', sw: 3.2 },
      { d: walls, stroke: '#000000', sw: 1.4 },
    ],
  }
}

// ---- Grass block + diamond pickaxe (pixel art) -------------------------------
export function grassBlock(): Art {
  const r = rng(42)
  const rows: string[] = []
  for (let y = 0; y < 16; y++) {
    let row = ''
    for (let x = 0; x < 16; x++) {
      const drip = y === 4 && r() < 0.45
      if (y < 4 || drip) row += r() < 0.25 ? 'L' : r() < 0.2 ? 'g' : 'G'
      else row += r() < 0.18 ? 'b' : r() < 0.14 ? 'd' : r() < 0.05 ? 's' : 'B'
    }
    rows.push(row)
  }
  return {
    viewW: 160,
    viewH: 160,
    paths: [
      ...pixels(rows, { G: '#5fa83b', L: '#7cc24f', g: '#47862b', B: '#8b5a2b', b: '#a5713f', d: '#6b4320', s: '#9b9b9b' }),
      { d: rect(0, 0, 160, 160), stroke: 'rgba(0,0,0,0.35)', sw: 3 },
    ],
  }
}

export function pickaxe(): Art {
  const map = [
    '....KKKKK.......',
    '...KdDDDdKK.....',
    '....KKKdDDdK....',
    '.......KKdDdK...',
    '........KHdDK...',
    '.......KHHKdDK..',
    '......KHHK.KdDK.',
    '.....KHHK...KdK.',
    '....KHHK....KdK.',
    '...KHHK......KK.',
    '..KHHK..........',
    '.KHHK...........',
    'KHHK............',
    'KHK.............',
    '.K..............',
    '................',
  ]
  return { viewW: 160, viewH: 160, paths: pixels(map, { K: '#0d1b1a', d: '#33ebcb', D: '#9ffff0', H: '#8b5a2b' }) }
}

// ---- Suspicious space crewmate ----------------------------------------------
export function crewmate(color = '#d7263d', shade = '#8f1528'): Art {
  return {
    viewW: 150,
    viewH: 170,
    paths: [
      { d: rrect(10, 62, 28, 62, 11), fill: shade, stroke: INK, sw: 5 },
      { d: 'M36 150 L36 62 Q36 14 84 14 Q132 14 132 62 L132 150 Q132 160 120 160 L104 160 Q94 160 94 150 L94 138 L74 138 L74 150 Q74 160 64 160 L48 160 Q36 160 36 150 Z', fill: color, stroke: INK, sw: 6 },
      { d: 'M120 46 Q130 80 126 146', stroke: shade, sw: 7 },
      { d: 'M72 40 L120 40 Q140 40 140 60 Q140 80 120 80 L72 80 Q58 80 58 60 Q58 40 72 40 Z', fill: '#9fd9f2', stroke: INK, sw: 5 },
      { d: 'M78 74 Q100 82 130 72', stroke: '#5aa9c9', sw: 5 },
      { d: 'M86 52 L116 52', stroke: '#ffffff', sw: 6 },
    ],
  }
}
