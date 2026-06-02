/**
 * Geometrias Three.js alinhadas aos eixos LoL (Z-up no preview).
 *
 * Three: X = LoL X, Y = LoL Z (profundidade), Z = LoL Y (cima).
 * Args de box/cylinder usam [largura X, profundidade Y, altura Z].
 */

import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'
import type { VfxPlaneFacing } from './vfxPrimitives'

const HALF_PI = Math.PI / 2

/** Dimensões de caixa: eixo longo em LoL Y → Three Z. */
export function primitiveBoxArgs(
  kind: Extract<EmitterPrimitiveGeometryKind, 'beam' | 'ray' | 'trail'>,
): [number, number, number] {
  switch (kind) {
    case 'beam':
      return [0.2, 0.2, 4]
    case 'ray':
      return [0.12, 0.12, 2.5]
    case 'trail':
      return [0.04, 0.06, 4]
    default:
      return [0.2, 0.2, 4]
  }
}

/**
 * Rotação Euler XYZ (rad) da malha built-in Three → frame local LoL.
 * Complementa `planeBaseRotation` (quads) sem duplicar o caso ground/shockwave.
 */
export function primitiveLocalRotation(
  kind: EmitterPrimitiveGeometryKind,
  facing: VfxPlaneFacing,
): [number, number, number] {
  switch (kind) {
    case 'plane':
    case 'planar':
      if (facing === 'ground') return [0, 0, 0]
      if (facing === 'shockwave') return [0, 0, 0]
      return [-HALF_PI, 0, 0]
    case 'cylinder':
      return facing === 'ground' ? [HALF_PI, 0, 0] : [-HALF_PI, 0, 0]
    case 'beam':
    case 'ray':
    case 'trail':
    case 'sphere':
    case 'ring':
    case 'mesh':
      return [0, 0, 0]
    default:
      return [0, 0, 0]
  }
}
