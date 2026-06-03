/** Regras heurísticas com pesos para classificação semântica por scoring. */

import type {
  GeometrySemanticKind,
  MaterialSemanticKind,
  MotionSemanticKind,
  SemanticClassificationSlot,
} from './vfxSemanticTypes'
import type { EmitterFeatures } from './vfxFeatureRegistry'
import type { RenderTraitId } from './vfxSemanticTypes'

export type SemanticRule = {
  id: string
  when: (f: EmitterFeatures) => boolean
  geometry?: Partial<Record<GeometrySemanticKind, number>>
  material?: Partial<Record<MaterialSemanticKind, number>>
  motion?: Partial<Record<MotionSemanticKind, number>>
  traits?: Partial<Record<RenderTraitId, number>>
  reason: string
}

function initScores<T extends string>(kinds: readonly T[]): Record<T, number> {
  return Object.fromEntries(kinds.map((k) => [k, 0])) as Record<T, number>
}

const GEOMETRY_KINDS: GeometrySemanticKind[] = [
  'GroundDecal',
  'GroundRing',
  'Billboard',
  'DirectionBillboard',
  'Ribbon',
  'Beam',
  'Mesh',
  'Trail',
  'Shockwave',
  'Unknown',
]

const MATERIAL_KINDS: MaterialSemanticKind[] = [
  'Flipbook',
  'Noise',
  'Erosion',
  'Distortion',
  'Mask',
  'Gradient',
  'Flow',
  'Solid',
  'Unknown',
]

const MOTION_KINDS: MotionSemanticKind[] = [
  'Static',
  'VelocityAligned',
  'Orbiting',
  'Scrolling',
  'Rotating',
  'Expanding',
  'Unknown',
]

export const SEMANTIC_RULES: SemanticRule[] = [
  {
    id: 'ground_decal',
    when: (f) => f.isDecalLike,
    geometry: { GroundDecal: 15 },
    traits: { GroundProjected: 15 },
    reason: 'groundLayer+arbitraryQuad+flat+twoLargeAxes',
  },
  {
    id: 'ground_ring_flipbook',
    when: (f) => f.isRingLike || (f.groundLayer && f.flipbook && (f.dominantSingleAxis || f.groundScaleKind === 'flipbookSquare')),
    geometry: { GroundRing: 12 },
    material: { Flipbook: 8 },
    traits: { GroundProjected: 12, FlipbookAnimated: 10 },
    reason: 'groundLayer+flipbook+dominantAxis',
  },
  {
    id: 'ground_ring_strip',
    when: (f) => f.groundLayer && f.primitiveArbitraryQuad && f.groundScaleKind === 'strip',
    geometry: { GroundRing: 10, Ribbon: 4 },
    reason: 'groundLayer+strip scale',
  },
  {
    id: 'spark_direction_billboard',
    when: (f) => f.directionOriented && f.additiveBlend && f.flipbook && f.isTiny,
    geometry: { DirectionBillboard: 12 },
    material: { Flipbook: 6 },
    motion: { VelocityAligned: 8 },
    traits: { DirectionOriented: 12, AdditiveBlended: 8, FlipbookAnimated: 6 },
    reason: 'directionOriented+additive+flipbook+tiny',
  },
  {
    id: 'direction_billboard',
    when: (f) => f.directionOriented && f.billboardCandidate,
    geometry: { DirectionBillboard: 10 },
    motion: { VelocityAligned: 6 },
    traits: { DirectionOriented: 10, VelocityMotion: 6 },
    reason: 'directionOriented+billboard',
  },
  {
    id: 'beam_ray',
    when: (f) => f.primitiveRay || f.primitiveBeam,
    geometry: { Beam: 15 },
    traits: { BeamExtruded: 15 },
    reason: 'primitiveRay|beam',
  },
  {
    id: 'beam_extreme_axis',
    when: (f) => f.isBeamLike && !f.groundLayer,
    geometry: { Beam: 12 },
    traits: { BeamExtruded: 12 },
    reason: 'extremeLengthAxis',
  },
  {
    id: 'trail_primitive',
    when: (f) => f.primitiveTrail,
    geometry: { Trail: 20 },
    material: { Flow: 4 },
    traits: { TrailRibbon: 20, UvScrollFlow: 4 },
    reason: 'primitiveTrail',
  },
  {
    id: 'shockwave_facing',
    when: (f) => f.planeFacing === 'shockwave',
    geometry: { Shockwave: 10 },
    traits: { ShockwaveRadial: 10 },
    reason: 'planeFacing shockwave',
  },
  {
    id: 'mesh_asset',
    when: (f) => f.isMeshBased,
    geometry: { Mesh: 14 },
    traits: { MeshBased: 14 },
    reason: 'primitiveMesh|hasMeshAsset',
  },
  {
    id: 'billboard_default',
    when: (f) => f.billboardCandidate && !f.directionOriented,
    geometry: { Billboard: 5 },
    traits: { BillboardCamera: 5 },
    reason: 'billboardCandidate',
  },
  {
    id: 'material_flipbook',
    when: (f) => f.flipbook,
    material: { Flipbook: 10 },
    traits: { FlipbookAnimated: 10 },
    reason: 'flipbook UV',
  },
  {
    id: 'material_erosion',
    when: (f) => f.erosion,
    material: { Erosion: 12 },
    traits: { ErosionDissolve: 12 },
    reason: 'alphaErosion',
  },
  {
    id: 'material_gradient',
    when: (f) => f.hasPaletteGradient,
    material: { Gradient: 10 },
    traits: { PaletteGradient: 10 },
    reason: 'paletteDefinition',
  },
  {
    id: 'material_flow',
    when: (f) => f.uvScroll,
    material: { Flow: 6 },
    motion: { Scrolling: 6 },
    traits: { UvScrollFlow: 6 },
    reason: 'uvScroll',
  },
  {
    id: 'trait_additive',
    when: (f) => f.additiveBlend,
    traits: { AdditiveBlended: 8 },
    reason: 'additive blendMode',
  },
  {
    id: 'trait_alpha',
    when: (f) => f.alphaBlend && !f.additiveBlend,
    traits: { AlphaBlended: 6, SoftParticle: 4 },
    reason: 'alpha blendMode',
  },
  {
    id: 'trait_soft_huge',
    when: (f) => f.alphaBlend && f.isHuge,
    traits: { SoftParticle: 10 },
    reason: 'large alpha particle',
  },
  {
    id: 'trait_texture_mult',
    when: (f) => f.hasTextureMult,
    traits: { TextureMultLayered: 8 },
    reason: 'textureMult',
  },
  {
    id: 'motion_orbital',
    when: (f) => f.orbitalVelocity,
    motion: { Orbiting: 12 },
    traits: { OrbitalMotion: 12 },
    reason: 'birthOrbitalVelocity',
  },
  {
    id: 'motion_rotating',
    when: (f) => f.rotationalVelocity,
    motion: { Rotating: 10 },
    traits: { RotationalSpin: 10 },
    reason: 'birthRotationalVelocity',
  },
  {
    id: 'motion_velocity',
    when: (f) => f.birthVelocity || f.worldAcceleration,
    motion: { Expanding: 6, VelocityAligned: 4 },
    reason: 'velocity/acceleration',
  },
  {
    id: 'ground_static',
    when: (f) => f.groundLayer,
    motion: { Static: 8 },
    reason: 'groundLayer static',
  },
  {
    id: 'navmesh_ground_clip',
    when: (f) => f.groundLayer && f.navmeshMask,
    traits: { NavmeshGroundClip: 14, GroundProjected: 8 },
    material: { Mask: 4 },
    reason: 'useNavmeshMask+groundLayer',
  },
  {
    id: 'distortion_warp',
    when: (f) => f.hasDistortion,
    material: { Distortion: 14 },
    traits: { DistortionWarp: 14 },
    reason: 'distortionDefinition',
  },
  {
    id: 'depth_biased_decal',
    when: (f) => f.groundLayer && f.hasDepthBias,
    traits: { DepthBiasedDecal: 12, GroundProjected: 6 },
    material: { Mask: 4 },
    reason: 'depthBiasFactors+groundLayer',
  },
  {
    id: 'ground_aligned_orientation',
    when: (f) => f.groundLayer && (f.primitiveArbitraryQuad || f.primitivePlanarProjection),
    traits: { GroundAlignedOrientation: 14, GroundProjected: 10 },
    geometry: { GroundDecal: 8 },
    reason: 'groundLayer+quad',
  },
  {
    id: 'continuous_spin',
    when: (f) => f.isRotationEnabled && f.hasRotation0,
    traits: { ContinuousSpin: 12, RotationalSpin: 8 },
    reason: 'rotation0+isRotationEnabled',
  },
  {
    id: 'bone_attached_sim',
    when: (f) => f.bindWeight,
    traits: { BoneAttachedSimulation: 10 },
    reason: 'bindWeight',
  },
  {
    id: 'local_particle_orientation',
    when: (f) => f.particleLocalOrientation || f.isLocalOrientation,
    traits: { LocalParticleOrientation: 8 },
    reason: 'local orientation flags',
  },
]

const TRAIT_KINDS: RenderTraitId[] = [
  'GroundProjected',
  'FlipbookAnimated',
  'AdditiveBlended',
  'AlphaBlended',
  'DirectionOriented',
  'ErosionDissolve',
  'UvScrollFlow',
  'PaletteGradient',
  'TextureMultLayered',
  'BeamExtruded',
  'TrailRibbon',
  'BillboardCamera',
  'SoftParticle',
  'ShockwaveRadial',
  'MeshBased',
  'OrbitalMotion',
  'RotationalSpin',
  'VelocityMotion',
  'NavmeshGroundClip',
  'DistortionWarp',
  'DepthBiasedDecal',
  'GroundAlignedOrientation',
  'ContinuousSpin',
  'BoneAttachedSimulation',
  'LocalParticleOrientation',
]

export type SemanticScoreMaps = {
  geometry: Record<GeometrySemanticKind, number>
  material: Record<MaterialSemanticKind, number>
  motion: Record<MotionSemanticKind, number>
  traits: Record<RenderTraitId, number>
  reasons: string[]
}

export function scoreEmitterFeatures(features: EmitterFeatures): SemanticScoreMaps {
  const geometry = initScores(GEOMETRY_KINDS)
  const material = initScores(MATERIAL_KINDS)
  const motion = initScores(MOTION_KINDS)
  const traits = initScores(TRAIT_KINDS)
  const reasons: string[] = []

  for (const rule of SEMANTIC_RULES) {
    if (!rule.when(features)) continue
    reasons.push(`${rule.id}: ${rule.reason}`)
    if (rule.geometry) {
      for (const [kind, weight] of Object.entries(rule.geometry) as [GeometrySemanticKind, number][]) {
        geometry[kind] += weight
      }
    }
    if (rule.material) {
      for (const [kind, weight] of Object.entries(rule.material) as [MaterialSemanticKind, number][]) {
        material[kind] += weight
      }
    }
    if (rule.motion) {
      for (const [kind, weight] of Object.entries(rule.motion) as [MotionSemanticKind, number][]) {
        motion[kind] += weight
      }
    }
    if (rule.traits) {
      for (const [kind, weight] of Object.entries(rule.traits) as [RenderTraitId, number][]) {
        traits[kind] += weight
      }
    }
  }

  return { geometry, material, motion, traits, reasons }
}

export function pickBestKind<T extends string>(
  scores: Record<T, number>,
  unknownKind: T,
): SemanticClassificationSlot<T> {
  let bestKind = unknownKind
  let bestScore = scores[unknownKind] ?? 0
  const reasons: string[] = []

  for (const [kind, score] of Object.entries(scores) as [T, number][]) {
    if (kind === unknownKind) continue
    if (score > bestScore) {
      bestScore = score
      bestKind = kind
    }
  }

  if (bestScore > 0) {
    reasons.push(`score=${bestScore}`)
  }

  return { kind: bestKind, score: bestScore, reasons }
}
