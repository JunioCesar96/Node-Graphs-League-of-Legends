/** Executa estratégias de geometria — sem heurística por nome. */

import type { ComposableRenderPipeline, EmitterPrimitiveGeometryKind } from '../vfxSemanticTypes'
import type { EmitterFeatures } from '../vfxFeatureRegistry'

export function executeGeometryStrategies(
  pipeline: ComposableRenderPipeline,
  features: EmitterFeatures,
): EmitterPrimitiveGeometryKind {
  const intent = pipeline.geometryIntent

  if (intent === 'Beam' || features.primitiveRay || features.primitiveBeam) return 'beam'
  if (intent === 'Trail' || features.primitiveTrail) return 'trail'
  if (features.primitiveRay) return 'ray'
  if (intent === 'Mesh' || features.isMeshBased) return 'mesh'
  if (intent === 'Ring' && pipeline.traits.includes('GroundProjected')) return 'ring'
  if (features.primitivePlanarProjection) return 'planar'
  if (intent === 'Billboard' || intent === 'Ribbon' || intent === 'Decal' || intent === 'Shockwave') {
    return 'plane'
  }

  switch (pipeline.geometryKind) {
    case 'cylinder':
      return 'cylinder'
    case 'sphere':
      return 'sphere'
    default:
      return 'plane'
  }
}
