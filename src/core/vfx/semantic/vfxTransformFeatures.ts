/** Features de transformação derivadas do BIN (Fase 5). */

import type { ParsedVfxEmitterFull } from '../vfxModel'
import type { EmitterFeatures } from './vfxEmitterFeatures'
import type {
  OrientationMode,
  ScaleSpace,
  SimulationSpace,
  TransformOrder,
  TransformPipelineDefinition,
} from './vfxTransformTypes'

export type TransformFeatureFlags = {
  hasRotation0: boolean
  continuousSpin: boolean
  boneAttached: boolean
  localParticleOrientation: boolean
  groundAligned: boolean
}

export function extractTransformFeatureFlags(
  raw: ParsedVfxEmitterFull,
  features: EmitterFeatures,
): TransformFeatureFlags {
  return {
    hasRotation0: raw.rotation0 != null,
    continuousSpin: raw.isRotationEnabled && raw.rotation0 != null,
    boneAttached: raw.bindWeight != null,
    localParticleOrientation: raw.particleIsLocalOrientation || raw.isLocalOrientation,
    groundAligned:
      raw.isGroundLayer &&
      (features.primitiveArbitraryQuad || features.primitivePlanarProjection),
  }
}

export function resolveOrientationMode(
  features: EmitterFeatures,
  tf: TransformFeatureFlags,
): OrientationMode {
  if (tf.groundAligned) return 'GroundAligned'
  if (features.primitiveMesh || features.hasMeshAsset || features.primitiveBeam) return 'MeshAttached'
  if (features.directionOriented || features.primitiveRay) return 'DirectionAligned'
  if (features.planeFacing === 'shockwave') return 'ShockwaveRadial'
  if (features.groundLikeBirthRotation && features.primitiveArbitraryQuad) return 'LocalOrientation'
  if (tf.localParticleOrientation) return 'LocalOrientation'
  if (features.billboardCandidate) return 'BillboardCamera'
  return 'BillboardCamera'
}

export function buildDefaultTransformPipeline(
  features: EmitterFeatures,
  tf: TransformFeatureFlags,
): TransformPipelineDefinition {
  const orientationMode = resolveOrientationMode(features, tf)

  let scaleSpace: ScaleSpace = 'PrimitiveLocal'
  let transformOrder: TransformOrder = 'OrientThenScale'

  if (orientationMode === 'GroundAligned') {
    scaleSpace = 'GroundPlane'
    transformOrder = 'GroundBasisFirst'
  } else if (orientationMode === 'MeshAttached') {
    transformOrder = 'ScaleThenOrient'
  }

  const simulationSpace: SimulationSpace = tf.boneAttached ? 'EmitterAttached' : 'World'

  return {
    orientationMode,
    scaleSpace,
    simulationSpace,
    transformOrder,
    billboardMode:
      orientationMode === 'DirectionAligned'
        ? 'velocity'
        : orientationMode === 'BillboardCamera'
          ? 'camera'
          : 'none',
    useLeagueMatrixP:
      orientationMode !== 'GroundAligned' &&
      (features.billboardCandidate ||
        features.directionOriented ||
        features.groundLikeBirthRotation),
  }
}
