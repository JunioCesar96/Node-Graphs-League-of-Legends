/** Trait → estratégias modulares de render (pipeline composto). */

import { birthRotationConstant, resolvePlaneFacing } from '../vfxPrimitives'
import type { EmitterFeatures } from './vfxFeatureRegistry'
import { resolveGeometryKindFromFeatures } from './vfxGeometryIntent'
import { materialStrategiesFromTraits } from './vfxMaterialIntent'
import { extractEmitterFeatures } from './vfxEmitterFeatures'
import { resolveEmitterTraits } from './vfxTraitScoring'
import type { RawEmitterDefinition } from './vfxRawEmitter'
import type {
  ComposableRenderPipeline,
  GeometryStrategyId,
  MotionStrategyId,
  RenderTraitId,
  ScaleTransformStrategy,
} from './vfxSemanticTypes'

function geometryStrategiesFromTraits(
  active: RenderTraitId[],
  features: EmitterFeatures,
): GeometryStrategyId[] {
  const strategies = new Set<GeometryStrategyId>()

  if (active.includes('GroundProjected') || features.groundLayer) {
    if (features.groundScaleKind === 'decal') strategies.add('groundQuadRemapDecal')
    else if (features.groundScaleKind === 'flipbookSquare') strategies.add('groundQuadRemapFlipbookSquare')
    else strategies.add('groundQuadPreserveScale')
  }
  if (active.includes('BillboardCamera') || (features.billboardCandidate && !features.groundLayer)) {
    strategies.add('billboardZeroAxis')
  }
  if (
    active.includes('BeamExtruded') ||
    active.includes('TrailRibbon') ||
    (!features.groundLayer && !strategies.size)
  ) {
    strategies.add('preserveScale')
  }

  if (strategies.size === 0) strategies.add('preserveScale')
  return [...strategies]
}

function motionStrategiesFromTraits(
  active: RenderTraitId[],
  features: EmitterFeatures,
): MotionStrategyId[] {
  const strategies = new Set<MotionStrategyId>()

  if (active.includes('DirectionOriented') || features.directionOriented) {
    strategies.add('velocityAlignedRotation')
    strategies.add('directionalVelocity')
  }
  if (active.includes('OrbitalMotion') || features.orbitalVelocity) strategies.add('orbitalOffset')
  if (active.includes('RotationalSpin') || features.rotationalVelocity) strategies.add('rotationalSpin')
  if (active.includes('GroundProjected') || features.groundLayer) strategies.add('staticGround')
  if (active.includes('NavmeshGroundClip') || (features.groundLayer && features.navmeshMask)) {
    strategies.add('groundNavmeshSnap')
  }
  if (active.includes('VelocityMotion') || features.birthVelocity || features.worldAcceleration) {
    strategies.add('directionalVelocity')
  }

  return [...strategies]
}

function resolveScaleTransformFromTraits(
  active: RenderTraitId[],
  features: EmitterFeatures,
): ScaleTransformStrategy {
  if (features.groundLayer && features.groundScaleKind === 'decal') return 'remapGroundDecal'
  if (features.groundLayer && features.groundScaleKind === 'flipbookSquare') return 'remapFlipbookSquare'
  if (active.includes('BillboardCamera') || features.billboardCandidate) return 'fixBillboardZeroAxis'
  return 'preserveLoL'
}

export function resolveComposablePipeline(raw: RawEmitterDefinition): ComposableRenderPipeline {
  const features = extractEmitterFeatures(raw)
  const resolved = resolveEmitterTraits(features)
  const traits = resolved.active
  const birthRot = birthRotationConstant(raw.birthRotation0)
  const planeFacing = resolvePlaneFacing(birthRot, raw.isGroundLayer)

  return {
    traits,
    geometry: geometryStrategiesFromTraits(traits, features),
    material: materialStrategiesFromTraits(traits, features),
    motion: motionStrategiesFromTraits(traits, features),
    geometryKind: resolveGeometryKindFromFeatures(features),
    scaleTransform: resolveScaleTransformFromTraits(traits, features),
    planeFacing,
    profile: resolved.profile,
    materialIntent: resolved.materialIntent,
    geometryIntent: resolved.geometryIntent,
  }
}
