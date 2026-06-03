export type { RawEmitterDefinition } from './vfxRawEmitter'
export type { EmitterFeatures } from './vfxFeatureRegistry'
export { FEATURE_DEFINITIONS, enrichEmitterFeatures } from './vfxFeatureRegistry'
export {
  classifyEmitter,
  getEmitterActiveTraits,
  getEmitterTraitScores,
  resolveEmitterSemanticAnalysis,
} from './emitterSemanticClassifier'
export {
  deriveGroundScaleKind,
  extractEmitterFeatures,
  isFlipbookTexDiv,
  LOL_GROUND_QUAD_SCALE_THRESHOLDS,
  sortedAbsScale,
} from './vfxEmitterFeatures'
export type { EmitterFeatureVector } from './vfxEmitterFeatures'
export {
  getComposablePipeline,
  resolveRenderStrategies,
  resolveScaleTransformFromProfile,
} from './vfxRenderStrategy'
export { resolveComposablePipeline } from './vfxRenderTraits'
export {
  activeTraitsFromScores,
  resolveEmitterTraits,
  TRAIT_ACTIVATION_THRESHOLD,
} from './vfxTraitScoring'
export {
  geometryIntentToThreeKind,
  resolveGeometryIntent,
  resolveGeometryKindFromFeatures,
} from './vfxGeometryIntent'
export {
  materialStrategiesFromTraits,
  placeholderColorForMaterialIntent,
  resolveMaterialIntent,
} from './vfxMaterialIntent'
export {
  executeGeometryStrategies,
} from './executors/geometryStrategyExecutor'
export {
  executeMaterialStrategies,
  type BuildShaderDescriptorInput,
} from './executors/materialStrategyExecutor'
export {
  applyMotionAdjustments,
  executeMotionStrategies,
  VFX_GROUND_PLANE_Z,
} from './executors/motionStrategyExecutor'
export { buildShaderFeatureFlags } from './executors/shaderFeatureFlags'
export { resolveTransformPipeline } from './transformPipelineResolver'
export {
  buildDefaultTransformPipeline,
  extractTransformFeatureFlags,
  resolveOrientationMode,
} from './vfxTransformFeatures'
export type {
  OrientationMode,
  ScaleSpace,
  SimulationSpace,
  TransformOrder,
  TransformPipelineDefinition,
} from './vfxTransformTypes'
export type {
  ComposableRenderPipeline,
  EmitterPrimitiveGeometryKind,
  GeometryIntent,
  GeometrySemanticKind,
  GeometryStrategyId,
  LoLGroundQuadScaleKind,
  MaterialIntent,
  MaterialSemanticKind,
  MaterialStrategyId,
  MotionSemanticKind,
  MotionStrategyId,
  RenderStrategyBundle,
  RenderTraitId,
  ResolvedEmitterTraits,
  ScaleTransformStrategy,
  SemanticEmitterProfile,
  ShaderFeatureFlags,
} from './vfxSemanticTypes'
