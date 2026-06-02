/** Classificador semântico de emitters VFX — traits multi-label + perfil legado. */

import type { RawEmitterDefinition } from './vfxRawEmitter'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import { resolveEmitterTraits } from './vfxTraitScoring'
import type { ResolvedEmitterTraits, SemanticEmitterProfile } from './vfxSemanticTypes'

const analysisCache = new WeakMap<RawEmitterDefinition, ResolvedEmitterTraits>()
const profileCache = new WeakMap<RawEmitterDefinition, SemanticEmitterProfile>()

export function resolveEmitterSemanticAnalysis(raw: RawEmitterDefinition): ResolvedEmitterTraits {
  const cached = analysisCache.get(raw)
  if (cached) return cached

  const features = extractEmitterFeatures(raw)
  const resolved = resolveEmitterTraits(features)
  analysisCache.set(raw, resolved)
  profileCache.set(raw, resolved.profile)
  return resolved
}

/** Perfil winner-take-all (compatibilidade UI / legado). */
export function classifyEmitter(raw: RawEmitterDefinition): SemanticEmitterProfile {
  const cached = profileCache.get(raw)
  if (cached) return cached
  return resolveEmitterSemanticAnalysis(raw).profile
}

export function getEmitterActiveTraits(raw: RawEmitterDefinition): ResolvedEmitterTraits['active'] {
  return resolveEmitterSemanticAnalysis(raw).active
}

export function getEmitterTraitScores(raw: RawEmitterDefinition): ResolvedEmitterTraits['scores'] {
  return resolveEmitterSemanticAnalysis(raw).scores
}
