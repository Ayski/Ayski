import type { ImageLayer, ShapeLayer, TextLayer } from '../types'
import { uid } from '../types'
import type { ImportedImage } from './image'

export function createImageLayer(img: ImportedImage): ImageLayer {
  return {
    id: uid(),
    type: 'image',
    name: 'Image',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    src: img.src,
    naturalWidth: img.width,
    naturalHeight: img.height,
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    preset: 'none',
    fit: 0.6,
  }
}

export function createTextLayer(text = 'Votre texte'): TextLayer {
  return {
    id: uid(),
    type: 'text',
    name: `Texte`,
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    text,
    fontFamily: 'Inter',
    fontSize: 0.1,
    color: '#F5F5F7',
    align: 'center',
    letterSpacing: 0,
    weight: 700,
    italic: false,
    shadow: false,
  }
}

export function createShapeLayer(): ShapeLayer {
  return {
    id: uid(),
    type: 'shape',
    name: 'Forme',
    x: 0.5,
    y: 0.5,
    scale: 1,
    rotation: 0,
    opacity: 1,
    locked: false,
    visible: true,
    shape: 'roundRect',
    width: 0.4,
    height: 0.3,
    fill: '#D9B45B',
    stroke: '#00000000',
    strokeWidth: 0,
    cornerRadius: 0.05,
  }
}

export const FONTS = [
  'Inter',
  'Playfair Display',
  'Oswald',
  'Space Grotesk',
  'DM Serif Display',
  'Georgia',
  'Courier New',
]
