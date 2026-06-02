/** Camada 3 — estratégias de render (bundle legado + pipeline composto). */

import type { RawEmitterDefinition } from './vfxRawEmitter'
import { resolveComposablePipeline } from './vfxRenderTraits'
import type {
  ComposableRenderPipeline,
  RenderStrategyBundle,
  ScaleTransformStrategy,
  SemanticEmitterProfile,
} from './vfxSemanticTypes'

const pipelineCache = new WeakMap<RawEmitterDefinition, ComposableRenderPipeline>()

export function getComposablePipeline(raw: RawEmitterDefinition): ComposableRenderPipeline {
  const cached = pipelineCache.get(raw)
  if (cached) return cached
  const pipeline = resolveComposablePipeline(raw)
  pipelineCache.set(raw, pipeline)
  return pipeline
}

export function resolveScaleTransformFromProfile(
  profile: SemanticEmitterProfile,
  pipeline?: ComposableRenderPipeline,
): ScaleTransformStrategy {
  if (pipeline) return pipeline.scaleTransform
  const gk = profile.groundScaleKind
  if (gk === 'decal') return 'remapGroundDecal'
  if (gk === 'flipbookSquare') return 'remapFlipbookSquare'
  if (profile.geometry.kind === 'Billboard' || profile.geometry.kind === 'DirectionBillboard') {
    return 'fixBillboardZeroAxis'
  }
  return 'preserveLoL'
}

/** View simplificada para integrações legadas. */
export function resolveRenderStrategies(raw: RawEmitterDefinition): RenderStrategyBundle {
  const pipeline = getComposablePipeline(raw)
  return {
    profile: pipeline.profile,
    scaleTransform: pipeline.scaleTransform,
    geometry: pipeline.geometryKind,
    planeFacing: pipeline.planeFacing,
  }
}
