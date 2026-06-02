/** Trait score engine multi-label (Fase 2). */

import type { EmitterFeatures } from './vfxFeatureRegistry'
import { pickBestKind, scoreEmitterFeatures } from './vfxSemanticRules'
import { resolveGeometryIntent } from './vfxGeometryIntent'
import { resolveMaterialIntent } from './vfxMaterialIntent'
import type { RenderTraitId, ResolvedEmitterTraits, SemanticEmitterProfile } from './vfxSemanticTypes'

export const TRAIT_ACTIVATION_THRESHOLD = 5

export function activeTraitsFromScores(
  scores: Record<RenderTraitId, number>,
  threshold = TRAIT_ACTIVATION_THRESHOLD,
): RenderTraitId[] {
  return (Object.entries(scores) as [RenderTraitId, number][])
    .filter(([, score]) => score >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id)
}

export function buildSemanticProfile(
  scores: ReturnType<typeof scoreEmitterFeatures>,
  features: EmitterFeatures,
): SemanticEmitterProfile {
  const geometry = pickBestKind(scores.geometry, 'Unknown')
  const material = pickBestKind(scores.material, 'Unknown')
  const motion = pickBestKind(scores.motion, 'Unknown')

  const topScores = [geometry.score, material.score, motion.score].filter((s) => s > 0)
  const confidence =
    topScores.length > 0 ? Math.min(1, topScores.reduce((a, b) => a + b, 0) / 40) : 0

  return {
    geometry,
    material,
    motion,
    groundScaleKind: features.groundScaleKind,
    confidence,
  }
}

export function resolveEmitterTraits(features: EmitterFeatures): ResolvedEmitterTraits {
  const scores = scoreEmitterFeatures(features)
  const active = activeTraitsFromScores(scores.traits)
  const profile = buildSemanticProfile(scores, features)

  return {
    scores: scores.traits,
    active,
    profile,
    materialIntent: resolveMaterialIntent(features),
    geometryIntent: resolveGeometryIntent(features),
  }
}
