import type { BufferGeometry } from 'three'

import type { VfxAssetFileIndex } from '@/core/vfx/vfxAssetIndex'
import { lookupTextureForRitual } from '@/core/vfx/vfxAssetIndex'
import {
  lookupAnm,
  lookupMeshGeometry,
  lookupSkinnedBundle,
  lookupSkl,
  type VfxLolAssetCaches,
} from '@/core/vfx/vfxMeshCache'
import type { ParsedLolAnm } from '@/core/vfx/lolAnmParse'
import type { LolSkinnedMeshBundle } from '@/core/vfx/lolSkinnedMesh'
import type { ParsedLolSkl } from '@/core/vfx/lolSklParse'
import { applyVfxPositionOffset } from '@/core/vfx/vfxViewportPreferences'
import { computeEmitterFrameState } from '@/core/vfx/vfxWebAnimation'
import { computeParticleInstances } from '@/core/vfx/vfxParticleInstances'
import type { VfxEmitterFrameState } from '@/core/vfx/vfxWebAnimation'
import { buildShaderMaterialDescriptor } from '@/core/vfx/vfxWebMaterials'
import type { ShaderMaterialDescriptor } from '@/core/vfx/vfxWebMaterials'
import {
  applyMotionAdjustments,
  executeMotionStrategies,
  type MotionStrategyOptions,
} from '@/core/vfx/semantic/executors/motionStrategyExecutor'
import type { VfxGroundHitResolver } from '@/core/vfx/vfxGroundHit'
import type { VfxCharacterBoneResolver } from '@/core/vfx/vfxWebAnimation'
import { extractEmitterFeatures } from '@/core/vfx/semantic/vfxEmitterFeatures'
import type { ParsedVfxEmitterFull } from '@/core/vfx/vfxModel'
import type { VfxWebEmitterBuilt } from '@/core/vfx/vfxWebBuilder'
import type { ComposableRenderPipeline, SemanticEmitterProfile } from '@/core/vfx/semantic/vfxSemanticTypes'
import type { TransformPipelineDefinition } from '@/core/vfx/semantic/vfxTransformTypes'

export type VfxEmitterPreviewEntry = {
  id: string
  name: string
  particleIndex: number
  /** Tempo desde o nascimento desta partícula (s). */
  particleTime: number
  /** Idade normalizada [0, 1] relativamente a particleLifetime. */
  particleNormalized: number
  visible: boolean
  parsed: ParsedVfxEmitterFull
  frame: VfxEmitterFrameState
  semanticProfile: SemanticEmitterProfile
  composablePipeline: ComposableRenderPipeline
  transformPipeline: TransformPipelineDefinition
  material: ShaderMaterialDescriptor
  meshGeometry: BufferGeometry | null
  meshPath: string | null
  skeletonPath: string | null
  animationPath: string | null
  skinnedBundle: LolSkinnedMeshBundle | null
  skl: ParsedLolSkl | null
  anm: ParsedLolAnm | null
  skinnedAnimFrame: number
}

export type BuildEmitterPreviewEntriesOptions = {
  emitters: VfxWebEmitterBuilt[]
  sampleTime: number
  visibilityKey: (emitterId: string) => string
  entryIdPrefix: (emitterId: string) => string
  emitterVisibility: Record<string, boolean>
  vfxScale: number
  assetIndex: VfxAssetFileIndex | null
  lolCaches: VfxLolAssetCaches | null
  vfxPositionEnabled: boolean
  vfxPositionOffset: [number, number, number]
  vfxGlobalRotationEnabled?: boolean
  vfxGlobalRotationOffsetDegrees?: [number, number, number]
  vfxLockMotionEnabled?: boolean
  vfxBirthRotationLoLEnabled?: boolean
  seedBase?: number
  groundHitResolver?: VfxGroundHitResolver | null
  resolveBoneWorld?: VfxCharacterBoneResolver | null
  referenceBoneName?: string | null
  boundObjectSizeLol?: [number, number, number] | null
}

export function buildEmitterPreviewEntries(
  options: BuildEmitterPreviewEntriesOptions,
): VfxEmitterPreviewEntry[] {
  const {
    emitters,
    sampleTime,
    visibilityKey,
    entryIdPrefix,
    emitterVisibility,
    vfxScale,
    assetIndex,
    lolCaches,
    vfxPositionEnabled,
    vfxPositionOffset,
    vfxGlobalRotationEnabled = false,
    vfxGlobalRotationOffsetDegrees = [0, 0, 0],
    vfxLockMotionEnabled = false,
    vfxBirthRotationLoLEnabled = true,
    seedBase = 42,
    groundHitResolver = null,
    resolveBoneWorld = null,
    referenceBoneName = null,
    boundObjectSizeLol = null,
  } = options

  const motionOptions: MotionStrategyOptions = { groundHitResolver }

  const visibleEmitters = emitters.filter(
    (emitter) => emitterVisibility[visibilityKey(emitter.id)] !== false,
  )

  return visibleEmitters
    .flatMap((emitter, emitterIndex) => {
      const instances = computeParticleInstances(
        emitter.parsed,
        sampleTime,
        seedBase + emitterIndex * 100,
      )

      const mainHit =
        assetIndex && emitter.texturePath
          ? lookupTextureForRitual(assetIndex, emitter.texturePath)
          : null
      const colorHit =
        assetIndex && emitter.colorTexturePath
          ? lookupTextureForRitual(assetIndex, emitter.colorTexturePath)
          : null
      const multHit =
        assetIndex && emitter.textureMultPath
          ? lookupTextureForRitual(assetIndex, emitter.textureMultPath)
          : null
      const reflectionPath = emitter.parsed.reflection?.reflectionMapTexture?.trim() ?? ''
      const reflectionHit =
        assetIndex && reflectionPath
          ? lookupTextureForRitual(assetIndex, reflectionPath)
          : null
      const palettePath = emitter.parsed.paletteDefinition?.paletteTexture.trim() ?? ''
      const paletteHit =
        assetIndex && palettePath ? lookupTextureForRitual(assetIndex, palettePath) : null
      const erosionPath = emitter.parsed.alphaErosion?.erosionMapName.trim() ?? ''
      const erosionHit =
        assetIndex && erosionPath ? lookupTextureForRitual(assetIndex, erosionPath) : null
      const distortionPath = emitter.parsed.distortionDefinition?.normalMapTexture.trim() ?? ''
      const distortionHit =
        assetIndex && distortionPath ? lookupTextureForRitual(assetIndex, distortionPath) : null

      const meshPath = emitter.meshPath?.trim() || null
      const skeletonPath = emitter.skeletonPath?.trim() || null
      const animationPath = emitter.animationPath?.trim() || null
      const meshGeometry =
        lolCaches && meshPath ? lookupMeshGeometry(lolCaches.meshes, meshPath) : null
      const skinnedBundle =
        lolCaches && meshPath ? lookupSkinnedBundle(lolCaches, meshPath) : null
      const skl =
        lolCaches && skeletonPath
          ? lookupSkl(lolCaches, skeletonPath)
          : lolCaches && meshPath
            ? lookupSkl(lolCaches, meshPath.replace(/\.skn$/i, '.skl'))
            : null
      const anm =
        lolCaches && animationPath
          ? lookupAnm(lolCaches, animationPath)
          : lolCaches && meshPath
            ? lookupAnm(lolCaches, meshPath.replace(/\.skn$/i, '.anm'))
            : null

      const skinnedAnimFrame =
        anm && anm.frameCount > 0
          ? Math.max(0, Math.min(anm.frameCount - 1, Math.floor(sampleTime * anm.fps)))
          : 0

      return instances
        .map((instance) => {
          const rawFrame = computeEmitterFrameState(
            emitter.parsed,
            vfxScale,
            sampleTime,
            instance.seed,
            {
              particleTime: instance.particleTime,
              vfxGlobalRotationEnabled,
              vfxGlobalRotationOffsetDegrees,
              vfxLockMotionEnabled,
              vfxBirthRotationLoLEnabled,
              composablePipeline: emitter.composablePipeline,
              transformPipeline: emitter.transformPipeline,
              resolveBoneWorld: resolveBoneWorld ?? undefined,
              referenceBoneName,
              boundObjectSizeLol: boundObjectSizeLol ?? undefined,
            },
          )
          const motionAdjustments = executeMotionStrategies(
            emitter.composablePipeline,
            rawFrame,
            motionOptions,
          )
          const motionAdjusted = applyMotionAdjustments(rawFrame, motionAdjustments)
          const frame = {
            ...motionAdjusted,
            position: applyVfxPositionOffset(
              motionAdjusted.position,
              vfxPositionEnabled,
              vfxPositionOffset,
            ),
          }

          const particleNormalized = Math.min(
            Math.max(instance.particleTime / Math.max(emitter.parsed.particleLifetime, 0.001), 0),
            1,
          )

          const material = buildShaderMaterialDescriptor({
            emitter: emitter.parsed,
            frame,
            pipeline: emitter.composablePipeline,
            features: extractEmitterFeatures(emitter.parsed),
            textureUrl: mainHit?.url ?? null,
            textureIsDds: mainHit?.isDds ?? false,
            colorTextureUrl: colorHit?.url ?? null,
            colorTextureIsDds: colorHit?.isDds ?? false,
            textureMultUrl: multHit?.url ?? null,
            textureMultIsDds: multHit?.isDds ?? false,
            reflectionCubeUrl: reflectionHit?.url ?? null,
            reflectionCubeIsDds: reflectionHit?.isDds ?? false,
            paletteTextureUrl: paletteHit?.url ?? null,
            paletteTextureIsDds: paletteHit?.isDds ?? false,
            erosionTextureUrl: erosionHit?.url ?? null,
            erosionTextureIsDds: erosionHit?.isDds ?? false,
            distortionTextureUrl: distortionHit?.url ?? null,
            distortionTextureIsDds: distortionHit?.isDds ?? false,
            groundClipZ: motionAdjustments.groundClipZ,
            renderOptions: { particleIndex: instance.index, particleNormalized },
          })

          const visKey = visibilityKey(emitter.id)
          return {
            id: `${entryIdPrefix(emitter.id)}-p${instance.index}`,
            name: emitter.name,
            particleIndex: instance.index,
            particleTime: instance.particleTime,
            particleNormalized,
            parsed: emitter.parsed,
            visible: emitterVisibility[visKey] !== false && frame.visible,
            frame,
            semanticProfile: emitter.semanticProfile,
            composablePipeline: emitter.composablePipeline,
            transformPipeline: emitter.transformPipeline,
            material,
            meshGeometry,
            meshPath,
            skeletonPath,
            animationPath,
            skinnedBundle,
            skl,
            anm,
            skinnedAnimFrame,
          }
        })
        .filter((entry) => entry.visible)
    })
    .sort((left, right) => left.material.renderOrder - right.material.renderOrder)
}
