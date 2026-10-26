import { circ, ell, INK, poly, rect, rrect, star, type Art } from './kit'

// Original characters for the collectible "character cards".

export function knight(): Art {
  return {
    viewW: 120,
    viewH: 150,
    paths: [
      { d: 'M58 34 Q38 8 62 3 Q90 4 82 22 Q76 30 68 34 Z', fill: '#d6342c', stroke: INK, sw: 4 },
      { d: 'M64 10 Q74 14 76 24', stroke: '#ff8a7a', sw: 3 },
      { d: 'M18 84 Q18 32 60 30 Q102 32 102 84 L102 132 Q60 148 18 132 Z', fill: '#b9c0c9', stroke: INK, sw: 5 },
      { d: 'M60 32 L60 140', stroke: '#8a929c', sw: 3 },
      { d: rrect(26, 70, 68, 12, 4), fill: INK },
      { d: 'M36 96 V112 M48 98 V116 M72 98 V116 M84 96 V112', stroke: INK, sw: 3.5 },
      { d: 'M30 44 Q40 36 52 36', stroke: '#ffffff', sw: 4 },
      { d: circ(48, 76, 2.4) + circ(72, 76, 2.4), fill: '#ffd36b' },
    ],
  }
}

export function wizard(): Art {
  return {
    viewW: 120,
    viewH: 150,
    paths: [
      { d: 'M16 74 L60 4 L104 74 Z', fill: '#4b3bb3', stroke: INK, sw: 5 },
      { d: star(52, 40, 7, 3) + star(74, 58, 5, 2) + star(46, 64, 4, 1.6), fill: '#ffd84d' },
      { d: 'M70 26 A8 8 0 1 0 74 40 A6 6 0 1 1 70 26 Z', fill: '#ffd84d' },
      { d: ell(60, 76, 54, 12), fill: '#3a2d8c', stroke: INK, sw: 5 },
      { d: circ(60, 100, 24), fill: '#f2c9a0', stroke: INK, sw: 4 },
      { d: circ(51, 96, 3) + circ(69, 96, 3), fill: INK },
      { d: 'M34 104 Q38 150 60 146 Q84 150 86 104 Q60 120 34 104 Z', fill: '#f2f2f2', stroke: INK, sw: 4 },
      { d: 'M50 112 Q60 118 70 112', stroke: INK, sw: 3 },
      { d: 'M44 88 L56 90 M64 90 L76 88', stroke: '#e8e8e8', sw: 4 },
    ],
  }
}

export function ninja(): Art {
  return {
    viewW: 130,
    viewH: 140,
    paths: [
      { d: 'M102 52 Q126 46 120 28 M102 58 Q130 64 122 80', stroke: INK, sw: 9 },
      { d: 'M102 52 Q126 46 120 28 M102 58 Q130 64 122 80', stroke: '#d6342c', sw: 6 },
      { d: circ(60, 74, 46), fill: '#22222a', stroke: INK, sw: 5 },
      { d: 'M18 64 Q60 52 102 64 L102 86 Q60 76 18 86 Z', fill: '#f2c9a0', stroke: INK, sw: 3.5 },
      { d: 'M30 70 L54 74 L50 80 L30 76 Z M90 70 L66 74 L70 80 L90 76 Z', fill: INK },
      { d: 'M14 48 Q60 34 106 48 L106 58 Q60 46 14 58 Z', fill: '#d6342c', stroke: INK, sw: 4 },
      { d: 'M38 30 Q48 24 58 24', stroke: '#4a4a56', sw: 4 },
    ],
  }
}

export function robot(): Art {
  return {
    viewW: 120,
    viewH: 140,
    paths: [
      { d: 'M60 36 V14', stroke: INK, sw: 5 },
      { d: circ(60, 12, 7), fill: '#ff5a5a', stroke: INK, sw: 3 },
      { d: rrect(6, 62, 12, 26, 4) + rrect(102, 62, 12, 26, 4), fill: '#7d8896', stroke: INK, sw: 3.5 },
      { d: rrect(14, 36, 92, 80, 14), fill: '#9aa6b2', stroke: INK, sw: 5 },
      { d: circ(30, 106, 4) + circ(84, 48, 5) + circ(92, 102, 3), fill: '#c8743a' },
      { d: circ(42, 70, 14) + circ(78, 70, 14), fill: INK },
      { d: circ(42, 70, 7) + circ(78, 70, 7), fill: '#5ef0ff' },
      { d: circ(45, 67, 2) + circ(81, 67, 2), fill: '#ffffff' },
      { d: rrect(34, 92, 52, 14, 4), fill: INK },
      { d: 'M46 92 V106 M58 92 V106 M70 92 V106', stroke: '#9aa6b2', sw: 2.5 },
      { d: circ(22, 46, 2.4) + circ(98, 46, 2.4) + circ(22, 106, 2.4) + circ(98, 108, 2.4), fill: '#4b5562' },
    ],
  }
}

export function dragon(): Art {
  return {
    viewW: 140,
    viewH: 140,
    paths: [
      // swept-back curved horns and side fins
      { d: 'M38 46 Q20 30 22 4 Q34 24 56 34 Z M102 46 Q120 30 118 4 Q106 24 84 34 Z', fill: '#f3e4b0', stroke: INK, sw: 4 },
      { d: 'M20 70 L2 58 L8 78 L0 92 L20 90 Z M120 70 L138 58 L132 78 L140 92 L120 90 Z', fill: '#c4580f', stroke: INK, sw: 3.5 },
      { d: poly([48, 32, 56, 16, 64, 30, 70, 12, 76, 30, 84, 16, 92, 32]), fill: '#c4580f', stroke: INK, sw: 3 },
      { d: 'M18 82 Q18 30 70 28 Q122 30 122 82 Q122 112 104 118 L36 118 Q18 112 18 82 Z', fill: '#e6a817', stroke: INK, sw: 5 },
      // scales
      { d: 'M56 44 q4 5 8 0 q4 5 8 0 q4 5 8 0 M50 52 q4 5 8 0 q4 5 8 0 q4 5 8 0 q4 5 8 0', stroke: '#b9790a', sw: 2.4 },
      // reptile eyes
      { d: ell(48, 74, 12, 13) + ell(92, 74, 12, 13), fill: '#ffe066', stroke: INK, sw: 3 },
      { d: ell(49, 75, 2.6, 10) + ell(93, 75, 2.6, 10), fill: INK },
      { d: 'M32 58 L60 66 M108 58 L80 66', stroke: INK, sw: 4.5 },
      // long snout with nostril smoke
      { d: 'M34 104 Q34 88 70 88 Q106 88 106 104 Q106 128 70 130 Q34 128 34 104 Z', fill: '#f2c14e', stroke: INK, sw: 4 },
      { d: ell(58, 100, 3.5, 4.5) + ell(82, 100, 3.5, 4.5), fill: INK },
      { d: 'M56 92 Q50 84 56 78 M84 92 Q90 84 84 78', stroke: 'rgba(80,80,80,0.6)', sw: 2.4 },
      { d: 'M44 118 Q70 126 96 118', stroke: INK, sw: 3 },
      { d: poly([52, 119, 56, 128, 60, 121]) + poly([80, 121, 84, 128, 88, 119]), fill: '#ffffff', stroke: INK, sw: 2 },
      { d: 'M28 66 Q32 52 44 46', stroke: '#fff2b0', sw: 3 },
    ],
  }
}

export function pirateGhost(): Art {
  return {
    viewW: 120,
    viewH: 150,
    paths: [
      { d: 'M20 142 L20 72 Q20 28 60 28 Q100 28 100 72 L100 142 Q90 130 80 142 Q70 130 60 142 Q50 130 40 142 Q30 130 20 142 Z', fill: 'rgba(232,241,255,0.95)', stroke: INK, sw: 5 },
      { d: 'M28 92 Q24 112 32 132', stroke: 'rgba(120,150,200,0.5)', sw: 4 },
      { d: circ(78, 76, 8), fill: INK },
      { d: circ(80, 73, 2), fill: '#ffffff' },
      { d: 'M22 60 L104 86', stroke: INK, sw: 4 },
      { d: circ(42, 76, 11), fill: INK },
      { d: ell(62, 106, 9, 12), fill: INK },
      { d: 'M8 42 Q60 -4 112 42 Q100 32 60 34 Q20 32 8 42 Z', fill: INK },
      { d: circ(60, 22, 6), fill: '#ffffff' },
      { d: 'M54 31 L66 37 M66 31 L54 37', stroke: '#ffffff', sw: 2.4 },
      { d: rect(56, 25, 3, 2) + rect(61, 25, 3, 2), fill: INK },
    ],
  }
}
