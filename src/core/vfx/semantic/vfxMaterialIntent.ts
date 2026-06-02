/** Material intent por sinais estruturais (sem textura/nome). */

import type { EmitterFeatures } from './vfxFeatureRegistry'
import type { MaterialIntent, MaterialStrategyId } from './vfxSemanticTypes'

export function resolveMaterialIntent(features: EmitterFeatures): MaterialIntent {
  if (features.erosion) return 'Dissolve'
  if (features.hasPaletteGradient) return 'GradientTint'
  if (features.hasTextureMult) return 'Layered'
  if (features.additiveBlend && (features.flipbook || features.uvScroll)) return 'Energy'
  if (features.alphaBlend && features.isHuge) return 'SoftAlpha'
  if (features.additiveBlend) return 'Energy'
  return 'Solid'
}

/** Cor placeholder estrutural (sem nome do emitter). */
export function placeholderColorForMaterialIntent(intent: MaterialIntent): [number, number, number] {
  switch (intent) {
    case 'Energy':
      return [0.95, 0.85, 0.55]
    case 'SoftAlpha':
      return [0.75, 0.78, 0.82]
    case 'Dissolve':
      return [0.55, 0.65, 0.7]
    case 'GradientTint':
      return [0.7, 0.55, 0.95]
    case 'Layered':
      return [0.65, 0.75, 0.9]
    case 'Solid':
    case 'Unknown':
    default:
      return [0.7, 0.7, 0.85]
  }
}

export function materialStrategiesFromTraits(
  activeTraits: import('./vfxSemanticTypes').RenderTraitId[],
  features: EmitterFeatures,
): MaterialStrategyId[] {
  const strategies = new Set<MaterialStrategyId>()

  if (activeTraits.includes('FlipbookAnimated') || features.flipbook) strategies.add('flipbookUv')
  if (activeTraits.includes('ErosionDissolve') || features.erosion) strategies.add('erosionMap')
  if (activeTraits.includes('AdditiveBlended') || features.additiveBlend) strategies.add('additiveEmissive')
  if (activeTraits.includes('PaletteGradient') || features.hasPaletteGradient) strategies.add('paletteLookup')
  if (activeTraits.includes('UvScrollFlow') || features.uvScroll) strategies.add('uvScrollMult')
  if (activeTraits.includes('TextureMultLayered') || features.hasTextureMult) strategies.add('uvScrollMult')
  if (activeTraits.includes('AlphaBlended') || activeTraits.includes('SoftParticle')) {
    strategies.add('alphaTestCutoff')
    if (features.isHuge) strategies.add('softAlphaBlend')
  }
  if (activeTraits.includes('DistortionWarp') || features.hasDistortion) strategies.add('distortionMap')
  if (activeTraits.includes('NavmeshGroundClip') || (features.groundLayer && features.navmeshMask)) {
    strategies.add('groundNavmeshClip')
  }
  if (activeTraits.includes('DepthBiasedDecal') || (features.groundLayer && features.hasDepthBias)) {
    strategies.add('depthBiasPolygonOffset')
  }
  if (features.alphaTest) strategies.add('alphaTestCutoff')

  return [...strategies]
}
