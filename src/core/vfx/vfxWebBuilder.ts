import type { ParsedVfxEmitterFull, ParsedVfxSystemFull, VfxCatalogEntry } from './vfxModel'
import { parseRitualVfx, parseRitualVfxCatalog } from './ritualParseVfx'
import { resolveEmitterSemanticAnalysis } from './semantic/emitterSemanticClassifier'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from './semantic/transformPipelineResolver'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'
import type { ComposableRenderPipeline, SemanticEmitterProfile } from './semantic/vfxSemanticTypes'
import { computeEmitterDuration } from './vfxWebAnimation'

export type VfxGeometryKind = 'cylinder' | 'plane' | 'sphere'

export type VfxWebEmitterBuilt = {
  id: string
  name: string
  parsed: ParsedVfxEmitterFull
  geometry: VfxGeometryKind
  isBillboard: boolean
  duration: number
  texturePath: string
  colorTexturePath: string
  textureMultPath: string
  meshPath: string | null
  skeletonPath: string | null
  animationPath: string | null
  /** Perfil semântico cacheado no build da cena (não reclassificar por frame). */
  semanticProfile: SemanticEmitterProfile
  /** Pipeline composto de traits/estratégias (Fase 2). */
  composablePipeline: ComposableRenderPipeline
  /** Pipeline de transformação semântica (Fase 5). */
  transformPipeline: TransformPipelineDefinition
}

export type VfxWebScene = {
  particleName: string
  particlePath: string
  lifetime: number
  emitters: VfxWebEmitterBuilt[]
  warnings: string[]
}

export function buildVfxWebSceneFromParsed(
  system: ParsedVfxSystemFull,
  extraWarnings: string[] = [],
): VfxWebScene {
  const warnings = [...system.warnings, ...extraWarnings]
  const emitters: VfxWebEmitterBuilt[] = system.emitters.map((emitter, index) => {
    const analysis = resolveEmitterSemanticAnalysis(emitter)
    const composablePipeline = getComposablePipeline(emitter)
    const transformPipeline = resolveTransformPipeline(emitter, composablePipeline)
    const semanticProfile = analysis.profile
    const geometry = composablePipeline.geometryKind
    const isBillboard = geometry === 'plane'

    return {
      id: `emitter-${index}-${emitter.name}`,
      name: emitter.name,
      parsed: emitter,
      geometry,
      isBillboard,
      duration: computeEmitterDuration(emitter),
      texturePath: emitter.texture,
      colorTexturePath: emitter.particleColorTexture,
      textureMultPath: emitter.textureMult?.texturePath ?? '',
      meshPath: emitter.meshPath,
      skeletonPath: emitter.skeletonPath,
      animationPath: emitter.animationPath,
      semanticProfile,
      composablePipeline,
      transformPipeline,
    }
  })

  const lifetime = emitters.reduce((max, entry) => Math.max(max, entry.duration), 1)

  return {
    particleName: system.particleName,
    particlePath: system.particlePath,
    lifetime,
    emitters,
    warnings,
  }
}

export type VfxWebCatalogBuilt = {
  entries: Array<VfxCatalogEntry & { scene: VfxWebScene }>
  warnings: string[]
}

export function buildVfxWebCatalogFromRitual(ritualText: string): VfxWebCatalogBuilt {
  const catalog = parseRitualVfxCatalog(ritualText)

  return {
    entries: catalog.entries.map((entry) => ({
      ...entry,
      scene: buildVfxWebSceneFromParsed(entry.system),
    })),
    warnings: [...catalog.warnings],
  }
}

export function buildVfxWebSceneFromRitual(
  ritualText: string,
  options?: { effectId?: string | null },
): VfxWebScene {
  const built = buildVfxWebCatalogFromRitual(ritualText)
  if (!built.entries.length) {
    return {
      particleName: '',
      particlePath: '',
      lifetime: 1,
      emitters: [],
      warnings: built.warnings,
    }
  }

  if (options?.effectId) {
    const match = built.entries.find((entry) => entry.id === options.effectId)
    if (match) return match.scene
  }

  return built.entries[0].scene
}
