/** Resolve TransformPipelineDefinition a partir de features estruturais. */

import type { ParsedVfxEmitterFull } from '../vfxModel'
import { resolveBindWeight } from '../vfxBindWeight'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import {
  buildDefaultTransformPipeline,
  extractTransformFeatureFlags,
} from './vfxTransformFeatures'
import type { ComposableRenderPipeline } from './vfxSemanticTypes'
import type { TransformPipelineDefinition } from './vfxTransformTypes'

export function resolveTransformPipeline(
  raw: ParsedVfxEmitterFull,
  composablePipeline?: ComposableRenderPipeline,
): TransformPipelineDefinition {
  const features = extractEmitterFeatures(raw)
  const tf = extractTransformFeatureFlags(raw, features)
  const pipeline = buildDefaultTransformPipeline(features, tf)

  if (composablePipeline?.traits.includes('DirectionOriented') || raw.isDirectionOriented) {
    return {
      ...pipeline,
      orientationMode: 'DirectionAligned',
      billboardMode: 'velocity',
      simulationSpace: 'World',
    }
  }

  if (composablePipeline?.traits.includes('BeamExtruded') || features.primitiveMesh) {
    return {
      ...pipeline,
      orientationMode: 'MeshAttached',
      transformOrder: 'ScaleThenOrient',
    }
  }

  if (composablePipeline?.traits.includes('GroundProjected') && features.groundLayer) {
    return {
      ...pipeline,
      orientationMode: 'GroundAligned',
      scaleSpace: 'GroundPlane',
      transformOrder: 'GroundBasisFirst',
      billboardMode: 'none',
    }
  }

  if (raw.bindWeight != null && resolveBindWeight(raw.bindWeight) > 0) {
    return {
      ...pipeline,
      simulationSpace: 'EmitterAttached',
      useLeagueMatrixP: true,
    }
  }

  return pipeline
}
