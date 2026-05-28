import { resolveEmitterEmbedRgba } from './vfxColor'
import type { ParsedVfxEmitterFull, VfxEmbedValue } from './vfxModel'
import {
  deriveGroundScaleKind,
  isFlipbookTexDiv,
  LOL_GROUND_QUAD_SCALE_THRESHOLDS,
  sortedAbsScale,
} from './semantic/vfxEmitterFeatures'
import { getComposablePipeline, resolveScaleTransformFromProfile } from './semantic/vfxRenderStrategy'
import type { ComposableRenderPipeline } from './semantic/vfxSemanticTypes'
import type { LoLGroundQuadScaleKind } from './semantic/vfxSemanticTypes'
import { sampleErosionDrive } from './vfxAlphaErosion'
import { sampleDistortionDrive } from './vfxDistortion'
import { blendPositionWithBindWeight, resolveBindWeight } from './vfxBindWeight'
import { resolveEmitterAttachBoneName } from './vfxBoneTransform'
import { lolMeshToThreeCoords } from './lolCoords'
import { resolveOrbitalOmegaLol } from './vfxOrbitalMotion'
import { lolRotationDegreesToThreeEuler } from './vfxGlobalRotation'
import { integrateVec3MotionWithDrag } from './vfxParticleMotion'
import { applyProbabilityToVec3 } from './vfxProbability'
import { birthRotationGroundInPlaneEuler } from './vfxPrimitives'
import { remapLoLQuadScaleForPlane } from './vfxGroundScale'
import { computeParticleTransform } from './vfxTransformEngine'
import { computeParticleSpawnOffsetLol } from './vfxSpawnShape'

export const DEFAULT_VFX_FPS = 30
const DEG2RAD = Math.PI / 180
const DEFAULT_GRAVITY_LOL: [number, number, number] = [0, -1200, 0]

export type VfxEmitterFrameState = {
  position: [number, number, number]
  scale: [number, number, number]
  rotation: [number, number, number]
  color: [number, number, number, number]
  /** Offset na folha de sprites (col, row) */
  spriteOffset: [number, number]
  /** Scroll UV contínuo (u, v) */
  uvScroll: [number, number]
  /** Rotação UV contínua (radianos). */
  uvRotation?: number
  opacity: number
  /** Drive 0–1 para alpha erosion (1 = opaco). */
  erosionDrive: number
  /** Drive 0–1 para distortion warp. */
  distortionDrive: number
  visible: boolean
  /** Classificação de birthScale para ground quads (debug / inspector). */
  groundScaleKind?: LoLGroundQuadScaleKind
  /** Pipeline de transformação (Fase 5 debug). */
  transformPipeline?: import('./semantic/vfxTransformTypes').TransformPipelineDefinition
  /** Matriz mundial 4×4 (Fase 6 render). */
  worldMatrix?: number[]
  /** Rotação ritual LoL (graus) — valor do BIN. */
  rotationLolDeg?: [number, number, number]
  /** Rotação na view 3D (graus) = ritual − baseline. */
  rotationViewLolDeg?: [number, number, number]
  birthRotationBaselineLol?: [number, number, number]
}

function embedVec3(embed: VfxEmbedValue | null, fallback: [number, number, number]): [number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return fallback
}

function sampleDynamicsVec3(embed: VfxEmbedValue | null, normalizedT: number): [number, number, number] {
  if (!embed?.dynamics?.times?.length) return embedVec3(embed, [1, 1, 1])

  const { times, values } = embed.dynamics
  let value: unknown = values[values.length - 1]

  if (normalizedT <= (times[0] ?? 0)) value = values[0]
  else if (normalizedT >= (times[times.length - 1] ?? 1)) value = values[values.length - 1]
  else {
    for (let index = 0; index < times.length - 1; index++) {
      const left = times[index] ?? 0
      const right = times[index + 1] ?? 1
      if (normalizedT >= left && normalizedT <= right) {
        const span = right - left
        const factor = span > 0 ? (normalizedT - left) / span : 0
        const leftVal = values[index] as [number, number, number]
        const rightVal = values[index + 1] as [number, number, number]
        value = [
          leftVal[0] + (rightVal[0] - leftVal[0]) * factor,
          leftVal[1] + (rightVal[1] - leftVal[1]) * factor,
          leftVal[2] + (rightVal[2] - leftVal[2]) * factor,
        ]
        break
      }
    }
  }

  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return [1, 1, 1]
}

/**
 * LoL usa 0 num eixo de birthScale em billboards para indicar o eixo normal ao quad.
 * Os outros dois eixos definem largura/altura do sprite (ex.: Splat 25×100×0, hoop 0×300×300).
 */

export { LOL_GROUND_QUAD_SCALE_THRESHOLDS, isFlipbookTexDiv }
export type { LoLGroundQuadScaleKind }

/** @deprecated Preferir `classifyEmitter(raw).groundScaleKind`. */
export function classifyLoLGroundQuadScale(
  scale: [number, number, number],
  texDiv?: [number, number] | null,
): LoLGroundQuadScaleKind {
  return deriveGroundScaleKind(scale, texDiv)
}

export { remapLoLQuadScaleForPlane } from './vfxGroundScale'

function fixBillboardScaleVec3(
  scale: [number, number, number],
  minimum = 0.01,
): [number, number, number] {
  const axes = scale.map((component) => {
    const value = Number(component)
    if (Math.abs(value) < 1e-6) return 0
    return Math.max(Math.abs(value), minimum)
  }) as [number, number, number]

  const [x, y, z] = axes
  if (x > 0 && y > 0 && z > 0) return [x, y, z]
  if (x === 0 && y > 0 && z > 0) return [y, z, 1]
  if (y === 0 && x > 0 && z > 0) return [x, z, 1]
  if (z === 0 && x > 0 && y > 0) return [x, y, 1]

  const fallback = Math.max(x, y, z, minimum)
  return [fallback, fallback, 1]
}

function fixScaleVec3(
  scale: [number, number, number],
  emitter: ParsedVfxEmitterFull,
  isBillboard: boolean,
  pipeline: ComposableRenderPipeline,
  minimum = 0.01,
): [number, number, number] {
  const strategy = pipeline.scaleTransform
  if (emitter.isGroundLayer) {
    if (strategy === 'remapGroundDecal' || strategy === 'remapFlipbookSquare') {
      return remapLoLQuadScaleForPlane(scale, minimum, emitter.texDiv)
    }
    return normalizeLoLQuadScale(scale, minimum)
  }
  if (isBillboard && strategy === 'fixBillboardZeroAxis') {
    return fixBillboardScaleVec3(scale, minimum)
  }

  return scale.map((component) => {
    const value = Number(component)
    return Math.max(Math.abs(value), minimum)
  }) as [number, number, number]
}

function applyUniformScale(scale: [number, number, number], uniform: boolean): [number, number, number] {
  if (!uniform) return scale
  const avg = (scale[0] + scale[1] + scale[2]) / 3
  return [avg, avg, avg]
}

/** LoL → Three.js: X=X, Y LoL→Z Three, Z LoL→Y Three. */
export function lolToThreeVec3(vec: [number, number, number], scale: number): [number, number, number] {
  const [x, y, z] = lolMeshToThreeCoords(vec[0], vec[1], vec[2])
  return [x * scale, y * scale, z * scale]
}

/** Ordem de euler alinhada ao Blender (lol_to_blender_euler): (x, z, y) em radianos. */
export function lolToThreeEulerDegrees(vec: [number, number, number]): [number, number, number] {
  return [vec[0] * DEG2RAD, vec[2] * DEG2RAD, vec[1] * DEG2RAD]
}

export function computeEmitterDuration(emitter: ParsedVfxEmitterFull): number {
  return (
    Math.max(emitter.lifetime, emitter.emitterLinger) +
    emitter.particleLifetime +
    emitter.particleLinger
  )
}

function resolveSpriteOffset(
  emitter: ParsedVfxEmitterFull,
  particleNormalized: number,
  seed: number,
): [number, number] {
  const texDiv = emitter.texDiv ?? [1, 1]
  const cols = Math.max(1, Math.round(texDiv[0]))
  const rows = Math.max(1, Math.round(texDiv[1]))
  const sheetFrames = cols * rows
  const frameCount = Math.max(1, emitter.numFrames ?? sheetFrames)

  if (frameCount <= 1 && sheetFrames <= 1) return [0, 0]

  const startFrame = Math.max(0, emitter.startFrame ?? 0)
  let frameIndex =
    startFrame + Math.min(frameCount - 1, Math.floor(particleNormalized * frameCount))
  frameIndex = Math.min(frameIndex, sheetFrames - 1)
  if (emitter.isRandomStartFrame) {
    frameIndex = (frameIndex + (seed % frameCount)) % Math.max(1, frameCount)
    frameIndex = Math.min(startFrame + frameIndex, sheetFrames - 1)
  }

  const col = frameIndex % cols
  const row = Math.floor(frameIndex / cols) % rows
  return [col, row]
}

function resolveUvScroll(
  emitter: ParsedVfxEmitterFull,
  particleTime: number,
  particleNormalized: number,
): [number, number] {
  const scrollEmbed = emitter.birthUvScrollRate
  const offsetEmbed = emitter.birthUvOffset

  let scroll: [number, number] = [0, 0]
  if (scrollEmbed?.dynamics?.times?.length) {
    const sampled = sampleDynamicsVec3(scrollEmbed, particleNormalized)
    scroll = [sampled[0], sampled[1]]
  } else if (scrollEmbed?.constant && Array.isArray(scrollEmbed.constant)) {
    scroll = [Number(scrollEmbed.constant[0]), Number(scrollEmbed.constant[1])]
  }

  let offset: [number, number] = [0, 0]
  if (offsetEmbed?.constant && Array.isArray(offsetEmbed.constant)) {
    offset = [Number(offsetEmbed.constant[0]), Number(offsetEmbed.constant[1])]
  }

  const particleScroll = emitter.particleUVScrollRate
  if (particleScroll?.dynamics?.times?.length) {
    const sampled = sampleDynamicsVec3(particleScroll, particleNormalized)
    scroll = [scroll[0] + sampled[0] * particleTime, scroll[1] + sampled[1] * particleTime]
  } else if (particleScroll?.constant && Array.isArray(particleScroll.constant)) {
    scroll = [
      scroll[0] + Number(particleScroll.constant[0]) * particleTime,
      scroll[1] + Number(particleScroll.constant[1]) * particleTime,
    ]
  }

  if (emitter.textureMult?.uvScroll) {
    const multScroll = emitter.textureMult.uvScroll
    if (multScroll.dynamics?.times?.length) {
      const sampled = sampleDynamicsVec3(multScroll, particleNormalized)
      scroll = [scroll[0] + sampled[0], scroll[1] + sampled[1]]
    } else if (multScroll.constant && Array.isArray(multScroll.constant)) {
      scroll = [
        scroll[0] + Number(multScroll.constant[0]),
        scroll[1] + Number(multScroll.constant[1]),
      ]
    }
  }

  return [offset[0] + scroll[0] * particleTime, offset[1] + scroll[1] * particleTime]
}

function resolveUvRotation(
  emitter: ParsedVfxEmitterFull,
  particleTime: number,
  particleNormalized: number,
  seed: number,
): number {
  const baseRotationRad = (emitter.uvRotation * Math.PI) / 180
  const omega = resolveOrbitalOmegaLol(emitter, seed, particleNormalized, true)
  const degPerFrame = omega[0] + omega[1] + omega[2]
  const frames = particleTime * DEFAULT_VFX_FPS
  return baseRotationRad + (degPerFrame * frames * Math.PI) / 180
}

export type VfxCharacterBoneResolver = (
  boneName: string,
) => [number, number, number] | null

export type ComputeEmitterFrameOptions = {
  /** Tempo desde o nascimento desta partícula (sobrepõe cálculo por sceneTime). */
  particleTime?: number
  /** Osso de referência global (personagem na cena). */
  referenceBoneName?: string | null
  /** Resolve posição Three do osso (personagem instanciado). */
  resolveBoneWorld?: VfxCharacterBoneResolver | null
  /** Usa leagueLocalToThree para rotação (alinhado às posições). */
  vfxGlobalRotationEnabled?: boolean
  vfxGlobalRotationOffsetDegrees?: [number, number, number]
  /** Congela deslocamento das partículas no espaço 3D. */
  vfxLockMotionEnabled?: boolean
  /** Baseline birthRotation LoL (preview 3D Scene). */
  vfxBirthRotationLoLEnabled?: boolean
  /** Pipeline cacheado no build (evita reclassificar por frame). */
  composablePipeline?: ComposableRenderPipeline
  /** Pipeline de transformação cacheado (Fase 5). */
  transformPipeline?: import('./semantic/vfxTransformTypes').TransformPipelineDefinition
  /** Bound do personagem (FlexShape — Fase 8). */
  boundObjectSizeLol?: [number, number, number] | null
}

export function computeEmitterFrameState(
  emitter: ParsedVfxEmitterFull,
  vfxScale: number,
  timeSeconds: number,
  seed: number,
  options?: ComputeEmitterFrameOptions,
): VfxEmitterFrameState {
  const particleLifetime = Math.max(emitter.particleLifetime, 0.001)
  const particleTime =
    options?.particleTime ?? timeSeconds - emitter.timeBeforeFirstEmission
  const visible = particleTime >= 0 && particleTime <= particleLifetime + emitter.particleLinger
  const particleNormalized = Math.min(Math.max(particleTime / particleLifetime, 0), 1)

  const composablePipeline = options?.composablePipeline ?? getComposablePipeline(emitter)
  const groundScaleKind = composablePipeline.profile.groundScaleKind

  const particle = computeParticleTransform({
    emitter,
    vfxScale,
    particleTime,
    particleNormalized,
    seed,
    lockMotion: options?.vfxLockMotionEnabled === true,
    composablePipeline,
    transformPipeline: options?.transformPipeline,
    resolveBoneWorld: options?.resolveBoneWorld,
    referenceBoneName: options?.referenceBoneName,
    boundObjectSizeLol: options?.boundObjectSizeLol,
    birthRotationLoLEnabled: options?.vfxBirthRotationLoLEnabled,
  })

  const rgba = resolveEmitterEmbedRgba(emitter.color, emitter.birthColor, particleNormalized)
  const opacity = visible ? Math.max(rgba[3], 0.02) : 0
  const motionTime = Math.max(particleTime, 0)

  const spriteOffset = resolveSpriteOffset(emitter, particleNormalized, seed)
  const uvScroll = resolveUvScroll(emitter, motionTime, particleNormalized)
  const uvRotation = resolveUvRotation(emitter, motionTime, particleNormalized, seed)
  const erosionDrive = sampleErosionDrive(emitter.alphaErosion, particleNormalized)
  const distortionDrive = sampleDistortionDrive(emitter.distortionDefinition, particleNormalized, motionTime)
  const erosionOpacity = emitter.alphaErosion ? opacity * erosionDrive : opacity

  return {
    position: particle.position,
    scale: particle.scale,
    rotation: particle.rotation,
    color: [rgba[0], rgba[1], rgba[2], erosionOpacity],
    spriteOffset,
    uvScroll,
    uvRotation,
    opacity: erosionOpacity,
    erosionDrive,
    distortionDrive,
    visible,
    groundScaleKind,
    transformPipeline: particle.transformPipeline,
    worldMatrix: particle.worldMatrix,
    rotationLolDeg: particle.rotationLolDeg,
    rotationViewLolDeg: particle.rotationViewLolDeg,
    birthRotationBaselineLol: particle.birthRotationBaselineLol,
  }
}
