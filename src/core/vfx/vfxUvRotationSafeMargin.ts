/**
 * Margem de geometria/UV para rotação de textura em quads planos (√2 para 360°).
 */

import type { VfxEmbedValue } from './vfxModel'
import type { ParsedVfxEmitterFull } from './vfxModel'
import { embedVec3 } from './vfxEmbedSample'
import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'

export const UV_ROTATION_SAFE_MARGIN_DEFAULT_G = Math.SQRT2

const EPS = 1e-6

export function supportsUvRotationSafeMarginGeometry(kind: EmitterPrimitiveGeometryKind): boolean {
  return kind === 'plane' || kind === 'planar'
}

function maxOrbitalOmegaMagnitude(orbital: VfxEmbedValue | null): number {
  if (!orbital) return 0
  let max = 0
  const c = embedVec3(orbital, [0, 0, 0])
  max = Math.max(max, Math.hypot(c[0], c[1], c[2]))
  const values = orbital.dynamics?.values
  if (values) {
    for (const entry of values) {
      if (!Array.isArray(entry) || entry.length < 3) continue
      max = Math.max(
        max,
        Math.hypot(Number(entry[0]), Number(entry[1]), Number(entry[2])),
      )
    }
  }
  return max
}

export function emitterNeedsUvRotationSafeMargin(emitter: ParsedVfxEmitterFull): boolean {
  if (Math.abs(emitter.uvRotation) > EPS) return true
  return maxOrbitalOmegaMagnitude(emitter.birthOrbitalVelocity) > EPS
}

/** Fator de expansão da malha (quadrado: √2; retângulo via texDiv). */
export function resolveUvRotationSafeMarginG(
  texDiv: [number, number] | null,
  g: number = UV_ROTATION_SAFE_MARGIN_DEFAULT_G,
): number {
  if (!texDiv) return g
  const w = Math.max(texDiv[0], EPS)
  const h = Math.max(texDiv[1], EPS)
  const m = Math.min(w, h)
  return Math.sqrt(w * w + h * h) / m
}

export function needsUvRotationSafeMarginForEmitter(
  emitter: ParsedVfxEmitterFull,
  geometryKind: EmitterPrimitiveGeometryKind,
): boolean {
  return (
    emitterNeedsUvRotationSafeMargin(emitter) && supportsUvRotationSafeMarginGeometry(geometryKind)
  )
}

/**
 * UV a partir da posição local do plano expandido.
 * Região visual central 1×1 ([-0.5, 0.5]) → UV [0, 1].
 * Bordas (malha maior) → UV fora de [0, 1] (padding / clamp na textura).
 */
export function uvFromExpandedPlaneLocalPosition(
  localX: number,
  localY: number,
  innerHalfSize = 0.5,
): [number, number] {
  return [localX / (innerHalfSize * 2) + 0.5, localY / (innerHalfSize * 2) + 0.5]
}

/** Meia-extensão da malha expandida (Three PlaneGeometry g×g). */
export function expandedPlaneHalfExtent(
  g: number = UV_ROTATION_SAFE_MARGIN_DEFAULT_G,
): number {
  return g / 2
}

/** Compensa escala mundial para manter footprint visual com malha expandida. */
export function applyUvRotationSafeScaleCompensation(
  scale: [number, number, number],
  g: number = UV_ROTATION_SAFE_MARGIN_DEFAULT_G,
): [number, number, number] {
  if (g <= EPS) return scale
  return [scale[0] / g, scale[1] / g, scale[2]]
}

/** Rotação UV no shader (espelho GLSL para testes). */
export function rotateUvAroundCenter(uv: [number, number], angleRad: number): [number, number] {
  const c = Math.cos(angleRad)
  const s = Math.sin(angleRad)
  const cx = uv[0] - 0.5
  const cy = uv[1] - 0.5
  return [c * cx - s * cy + 0.5, s * cx + c * cy + 0.5]
}

/** Cantos UV 0–1 da região visual central (antes da rotação no shader). */
export function uvRotationSafeInnerCorners(): Array<[number, number]> {
  return [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ]
}

/** Cantos da malha expandida: UV de padding fora de [0, 1]. */
export function uvRotationSafeOuterCornerUv(
  g: number = UV_ROTATION_SAFE_MARGIN_DEFAULT_G,
): [number, number] {
  const h = expandedPlaneHalfExtent(g)
  return uvFromExpandedPlaneLocalPosition(h, h)
}
