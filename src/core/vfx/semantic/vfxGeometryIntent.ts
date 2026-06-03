/** Geometry intent formalizado → VfxGeometryKind Three. */

import type { EmitterFeatures } from './vfxFeatureRegistry'
import type { GeometryIntent, VfxGeometryKind } from './vfxSemanticTypes'

export function resolveGeometryIntent(features: EmitterFeatures): GeometryIntent {
  if (features.isDecalLike) return 'Decal'
  if (features.isRingLike) return 'Ring'
  if (features.isBeamLike) return 'Beam'
  if (features.primitiveTrail) return 'Trail'
  if (features.planeFacing === 'shockwave') return 'Shockwave'
  if (features.isMeshBased) return 'Mesh'
  if (features.dominantSingleAxis && features.directionOriented) return 'Ribbon'
  if (features.billboardCandidate && !features.directionOriented) return 'Billboard'
  return 'Unknown'
}

export function geometryIntentToThreeKind(intent: GeometryIntent): VfxGeometryKind {
  switch (intent) {
    case 'Mesh':
      return 'cylinder'
    case 'Decal':
    case 'Ring':
    case 'Beam':
    case 'Billboard':
    case 'Ribbon':
    case 'Shockwave':
    case 'Trail':
    case 'Unknown':
    default:
      return 'plane'
  }
}

export function resolveGeometryKindFromFeatures(features: EmitterFeatures): VfxGeometryKind {
  return geometryIntentToThreeKind(resolveGeometryIntent(features))
}
