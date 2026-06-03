/** Tipos da camada de análise semântica VFX (pipeline de render, não rótulos artísticos). */

export type GeometrySemanticKind =
  | 'GroundDecal'
  | 'GroundRing'
  | 'Billboard'
  | 'DirectionBillboard'
  | 'Ribbon'
  | 'Beam'
  | 'Mesh'
  | 'Trail'
  | 'Shockwave'
  | 'Unknown'

export type MaterialSemanticKind =
  | 'Flipbook'
  | 'Noise'
  | 'Erosion'
  | 'Distortion'
  | 'Mask'
  | 'Gradient'
  | 'Flow'
  | 'Solid'
  | 'Unknown'

export type MotionSemanticKind =
  | 'Static'
  | 'VelocityAligned'
  | 'Orbiting'
  | 'Scrolling'
  | 'Rotating'
  | 'Expanding'
  | 'Unknown'

export type LoLGroundQuadScaleKind = 'decal' | 'flipbookSquare' | 'strip' | 'neutral'

export type SemanticClassificationSlot<T extends string> = {
  kind: T
  score: number
  reasons: string[]
}

export type SemanticEmitterProfile = {
  geometry: SemanticClassificationSlot<GeometrySemanticKind>
  material: SemanticClassificationSlot<MaterialSemanticKind>
  motion: SemanticClassificationSlot<MotionSemanticKind>
  /** Escala ground quad — derivada de features estruturais. */
  groundScaleKind?: LoLGroundQuadScaleKind
  confidence: number
}

export type ScaleTransformStrategy =
  | 'remapGroundDecal'
  | 'remapFlipbookSquare'
  | 'preserveLoL'
  | 'fixBillboardZeroAxis'

export type VfxGeometryKind = 'cylinder' | 'plane' | 'sphere'

export type VfxPlaneFacing = 'camera' | 'ground' | 'shockwave'

export type RenderStrategyBundle = {
  scaleTransform: ScaleTransformStrategy
  geometry: VfxGeometryKind
  planeFacing: VfxPlaneFacing
  profile: SemanticEmitterProfile
}

/** Traits compostos (multi-label) — Fase 2. */
export type RenderTraitId =
  | 'GroundProjected'
  | 'FlipbookAnimated'
  | 'AdditiveBlended'
  | 'AlphaBlended'
  | 'DirectionOriented'
  | 'ErosionDissolve'
  | 'UvScrollFlow'
  | 'PaletteGradient'
  | 'TextureMultLayered'
  | 'BeamExtruded'
  | 'TrailRibbon'
  | 'BillboardCamera'
  | 'SoftParticle'
  | 'ShockwaveRadial'
  | 'MeshBased'
  | 'OrbitalMotion'
  | 'RotationalSpin'
  | 'VelocityMotion'
  | 'NavmeshGroundClip'
  | 'DistortionWarp'
  | 'DepthBiasedDecal'
  | 'GroundAlignedOrientation'
  | 'ContinuousSpin'
  | 'BoneAttachedSimulation'
  | 'LocalParticleOrientation'

export type EmitterPrimitiveGeometryKind =
  | 'plane'
  | 'planar'
  | 'beam'
  | 'trail'
  | 'ray'
  | 'sphere'
  | 'cylinder'
  | 'ring'
  | 'mesh'

export type ShaderFeatureFlags = {
  flipbook: boolean
  erosion: boolean
  palette: boolean
  uvScrollMult: boolean
  additiveEmissive: boolean
  alphaTest: boolean
  softAlpha: boolean
  distortion: boolean
  groundNavmeshClip: boolean
  depthBias: boolean
}

export type GeometryStrategyId =
  | 'groundQuadRemapDecal'
  | 'groundQuadRemapFlipbookSquare'
  | 'groundQuadPreserveScale'
  | 'billboardZeroAxis'
  | 'preserveScale'

export type MaterialStrategyId =
  | 'flipbookUv'
  | 'erosionMap'
  | 'additiveEmissive'
  | 'alphaTestCutoff'
  | 'paletteLookup'
  | 'uvScrollMult'
  | 'softAlphaBlend'
  | 'distortionMap'
  | 'groundNavmeshClip'
  | 'depthBiasPolygonOffset'

export type MotionStrategyId =
  | 'velocityAlignedRotation'
  | 'orbitalOffset'
  | 'rotationalSpin'
  | 'staticGround'
  | 'directionalVelocity'
  | 'groundNavmeshSnap'

export type MaterialIntent =
  | 'Energy'
  | 'SoftAlpha'
  | 'Dissolve'
  | 'GradientTint'
  | 'Layered'
  | 'Solid'
  | 'Unknown'

export type GeometryIntent =
  | 'Decal'
  | 'Beam'
  | 'Billboard'
  | 'Ribbon'
  | 'Shockwave'
  | 'Trail'
  | 'Mesh'
  | 'Ring'
  | 'Unknown'

export type ResolvedEmitterTraits = {
  scores: Record<RenderTraitId, number>
  active: RenderTraitId[]
  profile: SemanticEmitterProfile
  materialIntent: MaterialIntent
  geometryIntent: GeometryIntent
}

export type ComposableRenderPipeline = {
  traits: RenderTraitId[]
  geometry: GeometryStrategyId[]
  material: MaterialStrategyId[]
  motion: MotionStrategyId[]
  geometryKind: VfxGeometryKind
  scaleTransform: ScaleTransformStrategy
  planeFacing: VfxPlaneFacing
  profile: SemanticEmitterProfile
  materialIntent: MaterialIntent
  geometryIntent: GeometryIntent
}
