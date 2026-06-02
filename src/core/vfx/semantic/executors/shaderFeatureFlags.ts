/** Deriva ShaderFeatureFlags a partir do pipeline composto. */

import type { ComposableRenderPipeline, ShaderFeatureFlags } from '../vfxSemanticTypes'
import type { EmitterFeatures } from '../vfxFeatureRegistry'

export function buildShaderFeatureFlags(
  pipeline: ComposableRenderPipeline,
  features: EmitterFeatures,
): ShaderFeatureFlags {
  const traits = new Set(pipeline.traits)
  const mat = new Set(pipeline.material)
  const motion = new Set(pipeline.motion)

  return {
    flipbook: mat.has('flipbookUv') || traits.has('FlipbookAnimated'),
    erosion: mat.has('erosionMap') || traits.has('ErosionDissolve'),
    palette: mat.has('paletteLookup') || traits.has('PaletteGradient'),
    uvScrollMult: mat.has('uvScrollMult') || traits.has('UvScrollFlow'),
    additiveEmissive: mat.has('additiveEmissive') || traits.has('AdditiveBlended'),
    alphaTest: mat.has('alphaTestCutoff'),
    softAlpha: mat.has('softAlphaBlend') || traits.has('SoftParticle'),
    distortion: mat.has('distortionMap') || traits.has('DistortionWarp'),
    groundNavmeshClip:
      mat.has('groundNavmeshClip') || traits.has('NavmeshGroundClip') || motion.has('groundNavmeshSnap'),
    depthBias: mat.has('depthBiasPolygonOffset') || traits.has('DepthBiasedDecal'),
  }
}
