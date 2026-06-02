/**
 * Transform Semantic Engine — pipeline de 6 espaços (Fase 5).
 * Substitui T+R+S monolítico por ordem semântica por primitivo.
 */

import type { ParsedVfxEmitterFull, VfxEmbedValue } from './vfxModel'
import { blendPositionWithBindWeight, resolveBindWeight } from './vfxBindWeight'
import { resolveEmitterAttachBoneName } from './vfxBoneTransform'
import { lolMeshToThreeCoords } from './lolCoords'
import { resolveOrbitalOmegaLol } from './vfxOrbitalMotion'
import { integrateVec3MotionWithDrag } from './vfxParticleMotion'
import { applyProbabilityToVec3 } from './vfxProbability'
import {
  birthRotationLolDegToViewDeg,
  birthRotationViewDegToMeshEulerRad,
  normalizeAngleDegrees,
  resolveBirthRotationBaselineLol,
} from './vfxBirthRotationView'
import {
  isGroundLikeBirthRotation,
  orbitalFacingBirthRotationLol,
  planeBaseRotation,
  resolvePlaneFacing,
} from './vfxPrimitives'
import type { ComposableRenderPipeline } from './semantic/vfxSemanticTypes'
import { getComposablePipeline } from './semantic/vfxRenderStrategy'
import { resolveTransformPipeline } from './semantic/transformPipelineResolver'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'
import { computeParticleSpawnOffsetLol } from './vfxSpawnShape'
import { remapLoLQuadScaleForPlane } from './vfxGroundScale'
import { composeParticleWorldMatrix, worldMatrixToFlat16 } from './vfxWorldMatrix'
import {
  resolveFlexShapeEmitOffsetMultiplier,
  resolveFlexShapeScaleMultiplier,
} from './vfxFlexShape'
import type { VfxCharacterBoneResolver } from './vfxWebAnimation'
import type { EmitterPrimitiveGeometryKind } from './semantic/vfxSemanticTypes'
import { executeGeometryStrategies } from './semantic/executors/geometryStrategyExecutor'
import { extractEmitterFeatures } from './semantic/vfxEmitterFeatures'
import {
  applyUvRotationSafeScaleCompensation,
  needsUvRotationSafeMarginForEmitter,
  resolveUvRotationSafeMarginG,
} from './vfxUvRotationSafeMargin'

function lolToThreeVec3(vec: [number, number, number], scale: number): [number, number, number] {
  const [x, y, z] = lolMeshToThreeCoords(vec[0], vec[1], vec[2])
  return [x * scale, y * scale, z * scale]
}

function applyUniformScale(scale: [number, number, number], uniform: boolean): [number, number, number] {
  if (!uniform) return scale
  const avg = (scale[0] + scale[1] + scale[2]) / 3
  return [avg, avg, avg]
}

function fixBillboardScaleVec3(scale: [number, number, number], minimum = 0.01): [number, number, number] {
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

export type ParticleTransformState = {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  planeFacing: ReturnType<typeof resolvePlaneFacing>
  planeBaseRotation: [number, number, number]
  transformPipeline: TransformPipelineDefinition
  /** Posição LoL após simulação (pré conversão P). */
  positionLol: [number, number, number]
  /** Rotação LoL graus ritual (birth + spin + rotation0). */
  rotationLolDeg: [number, number, number]
  /** Rotação exibida na view 3D (graus), após subtrair baseline. */
  rotationViewLolDeg: [number, number, number]
  /** Baseline LoL usado na conversão view (ex. {-90,-90,0}). */
  birthRotationBaselineLol: [number, number, number]
  /** Escala LoL antes de remap ground (unidades jogo). */
  scaleLol: [number, number, number]
  /** Matriz mundial 4×4 column-major (debug / render Fase 6). */
  worldMatrix?: number[]
}

export type ComputeParticleTransformInput = {
  emitter: ParsedVfxEmitterFull
  vfxScale: number
  particleTime: number
  particleNormalized: number
  seed: number
  lockMotion: boolean
  composablePipeline?: ComposableRenderPipeline
  transformPipeline?: TransformPipelineDefinition
  resolveBoneWorld?: VfxCharacterBoneResolver
  referenceBoneName?: string | null
  /** Bound do personagem na cena (unidades LoL) — FlexShapeDefinition. */
  boundObjectSizeLol?: [number, number, number] | null
  /** Baseline birthRotation LoL (desligar = euler ritual directo). */
  birthRotationLoLEnabled?: boolean
}

/** Gravidade LoL (eixo Y do jogo) — só para emitters aéreos sem `worldAcceleration` explícita. */
const DEFAULT_GRAVITY_LOL: [number, number, number] = [0, -1200, 0]

const ZERO_VEC3: [number, number, number] = [0, 0, 0]

/**
 * Decals `isGroundLayer` sem aceleração no ritual não devem cair.
 * LoL Y→Three Z via `lolMeshToThreeCoords`; o snap ao chão corrige Three Z.
 */
function resolveWorldAccelerationLol(
  emitter: ParsedVfxEmitterFull,
  particleNormalized: number,
): [number, number, number] {
  if (emitter.worldAcceleration?.dynamics?.times?.length) {
    return sampleDynamicsVec3(emitter.worldAcceleration, particleNormalized)
  }
  if (emitter.worldAcceleration?.constant != null) {
    return embedVec3(emitter.worldAcceleration, ZERO_VEC3)
  }
  if (emitter.isGroundLayer) {
    return ZERO_VEC3
  }
  return DEFAULT_GRAVITY_LOL
}

function embedVec3(embed: VfxEmbedValue | null, fallback: [number, number, number]): [number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return fallback
}

/** VFX editor serializa ValueVector3 como {X,Z,Y}; movimento usa apenas Z(editor). */
function resolveBirthVelocityZOnlyLol(
  emitter: ParsedVfxEmitterFull,
  seed: number,
): [number, number, number] {
  let raw = embedVec3(emitter.birthVelocity, [0, 0, 0])
  if (emitter.birthVelocity?.dynamics) {
    raw = applyProbabilityToVec3(raw, emitter.birthVelocity.dynamics.probabilityTables, seed + 2)
  }
  const zEditor = Number(raw[1] ?? 0)
  if (Math.abs(zEditor) <= 1e-6) return [0, 0, 0]
  return [0, zEditor, 0]
}

function resolveMatrix44TranslationXYLol(
  emitter: ParsedVfxEmitterFull,
): [number, number] | null {
  for (const [name, , value] of emitter.scalars) {
    const key = String(name).toLowerCase()
    if (!key.includes('matrix44')) continue
    const matches = String(value).match(/-?\d+(?:\.\d+)?/g) ?? []
    if (matches.length < 16) continue
    const tx = Number(matches[12] ?? 0)
    const ty = Number(matches[13] ?? 0)
    if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null
    if (Math.abs(tx) <= 1e-6 && Math.abs(ty) <= 1e-6) return null
    return [tx, ty]
  }
  return null
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

function sampleScale0(emitter: ParsedVfxEmitterFull, particleNormalized: number): [number, number, number] {
  return sampleDynamicsVec3(emitter.scale0, particleNormalized)
}

function applyUvRotationSafeMarginToParticleScale(
  emitter: ParsedVfxEmitterFull,
  composablePipeline: ComposableRenderPipeline,
  geometryKind: EmitterPrimitiveGeometryKind,
  scale: [number, number, number],
): [number, number, number] {
  if (!needsUvRotationSafeMarginForEmitter(emitter, geometryKind)) return scale
  const g = resolveUvRotationSafeMarginG(emitter.texDiv)
  return applyUvRotationSafeScaleCompensation(scale, g)
}

function resolveScale(
  emitter: ParsedVfxEmitterFull,
  vfxScale: number,
  seed: number,
  particleNormalized: number,
  pipeline: TransformPipelineDefinition,
  composablePipeline: ComposableRenderPipeline,
  minimum: number,
  boundObjectSizeLol: [number, number, number] | null | undefined,
): [number, number, number] {
  let birthScale = embedVec3(emitter.birthScale0, [1, 1, 1])
  if (emitter.birthScale0?.dynamics) {
    birthScale = applyProbabilityToVec3(birthScale, emitter.birthScale0.dynamics.probabilityTables, seed)
  }
  const flex = resolveFlexShapeScaleMultiplier(emitter.flexShape, boundObjectSizeLol)
  birthScale = [
    birthScale[0] * flex * vfxScale,
    birthScale[1] * flex * vfxScale,
    birthScale[2] * flex * vfxScale,
  ]

  let dynamicScale = sampleScale0(emitter, particleNormalized)
  dynamicScale = applyUniformScale(dynamicScale, emitter.isUniformScale)

  const combined: [number, number, number] = [
    birthScale[0] * dynamicScale[0],
    birthScale[1] * dynamicScale[1],
    birthScale[2] * dynamicScale[2],
  ]

  const geometryKind = executeGeometryStrategies(
    composablePipeline,
    extractEmitterFeatures(emitter),
  )

  let scaled: [number, number, number]
  if (pipeline.scaleSpace === 'GroundPlane') {
    scaled = remapLoLQuadScaleForPlane(combined, minimum, emitter.texDiv)
  } else if (pipeline.scaleSpace === 'WorldUniform' && emitter.isUniformScale) {
    const avg = (combined[0] + combined[1] + combined[2]) / 3
    scaled = [avg, avg, avg]
  } else {
    const isBillboard = ['plane', 'ray', 'arbitrary_quad', 'trail', 'beam', 'planar_projection'].includes(
      emitter.primitiveKind,
    )
    scaled =
      isBillboard && pipeline.transformOrder !== 'GroundBasisFirst'
        ? fixBillboardScaleVec3(combined, minimum)
        : combined
  }

  return applyUvRotationSafeMarginToParticleScale(
    emitter,
    composablePipeline,
    geometryKind,
    scaled,
  )
}

export function computeParticleTransform(input: ComputeParticleTransformInput): ParticleTransformState {
  const {
    emitter,
    vfxScale,
    particleTime,
    particleNormalized,
    seed,
    lockMotion,
  } = input

  const composablePipeline = input.composablePipeline ?? getComposablePipeline(emitter)
  const transformPipeline =
    input.transformPipeline ?? resolveTransformPipeline(emitter, composablePipeline)

  const motionTime = Math.max(particleTime, 0)
  const spawnMotionTime = lockMotion ? 0 : motionTime

  const bindWeightEarly = resolveBindWeight(emitter.bindWeight)
  const attachBoneEarly = resolveEmitterAttachBoneName(
    emitter.attachBoneName,
    input.referenceBoneName,
  )
  const boneWorldEarly =
    bindWeightEarly > 0 &&
    attachBoneEarly &&
    input.resolveBoneWorld &&
    transformPipeline.simulationSpace === 'EmitterAttached'
      ? input.resolveBoneWorld(attachBoneEarly)
      : null

  // 1 — Emitter space (LoL)
  const emitterPosLol: [number, number, number] = [
    emitter.emitterPosition[0],
    emitter.emitterPosition[1],
    emitter.emitterPosition[2],
  ]

  // 2 — Spawn space (LoL)
  const spawnLol = computeParticleSpawnOffsetLol(
    emitter,
    seed,
    spawnMotionTime,
    input.boundObjectSizeLol,
    particleNormalized,
  )

  let positionLol: [number, number, number] = [
    emitterPosLol[0] + spawnLol[0],
    emitterPosLol[1] + spawnLol[1],
    emitterPosLol[2] + spawnLol[2],
  ]

  const origin = lolToThreeVec3(emitterPosLol, vfxScale)
  const spawn = lolToThreeVec3(spawnLol, vfxScale)

  let position: [number, number, number] = [
    origin[0] + spawn[0],
    origin[1] + spawn[1],
    origin[2] + spawn[2] + emitter.pass * 0.001,
  ]

  if (boneWorldEarly) {
    const localLol: [number, number, number] = [
      emitterPosLol[0] + spawnLol[0],
      emitterPosLol[1] + spawnLol[1],
      emitterPosLol[2] + spawnLol[2],
    ]
    const localThree = lolToThreeVec3(localLol, vfxScale)
    position = [
      boneWorldEarly[0] + localThree[0],
      boneWorldEarly[1] + localThree[1],
      boneWorldEarly[2] + localThree[2] + emitter.pass * 0.001,
    ]
    positionLol = [
      localLol[0],
      localLol[1],
      localLol[2],
    ]
  }

  // Orientation inputs (ritual separado do yaw orbital — ω não reclassifica decals)
  let birthRotRitual = embedVec3(emitter.birthRotation0, [0, 0, 0])
  if (emitter.birthRotation0?.dynamics) {
    birthRotRitual = applyProbabilityToVec3(
      birthRotRitual,
      emitter.birthRotation0.dynamics.probabilityTables,
      seed + 1,
    )
  }

  const orbitalOmegaLol = resolveOrbitalOmegaLol(emitter, seed, particleNormalized, true)
  const groundLikeRitual = isGroundLikeBirthRotation(birthRotRitual)
  const orbitalFacingRot = groundLikeRitual
    ? ([0, 0, 0] as [number, number, number])
    : orbitalFacingBirthRotationLol(orbitalOmegaLol)

  const birthRotForRotation: [number, number, number] = [
    birthRotRitual[0] + orbitalFacingRot[0],
    birthRotRitual[1] + orbitalFacingRot[1],
    birthRotRitual[2] + orbitalFacingRot[2],
  ]

  const rotVelocity = embedVec3(emitter.birthRotationalVelocity0, [0, 0, 0])
  const continuousRot = emitter.rotation0
    ? sampleDynamicsVec3(emitter.rotation0, particleNormalized)
    : null

  const planeFacing = resolvePlaneFacing(
    birthRotRitual,
    emitter.isGroundLayer,
    groundLikeRitual ? null : orbitalOmegaLol,
  )
  const baseRot = planeBaseRotation(planeFacing)
  const birthRotationBaselineLol = resolveBirthRotationBaselineLol({
    isGroundLayer: emitter.isGroundLayer,
    planeFacing,
    birthRotationRitual: birthRotRitual,
  })

  const rotationLolDeg: [number, number, number] = [
    birthRotForRotation[0] + rotVelocity[0] * motionTime + (continuousRot?.[0] ?? 0) * motionTime,
    birthRotForRotation[1] + rotVelocity[1] * motionTime + (continuousRot?.[1] ?? 0) * motionTime,
    birthRotForRotation[2] + rotVelocity[2] * motionTime + (continuousRot?.[2] ?? 0) * motionTime,
  ]
  const birthRotationLoLEnabled = input.birthRotationLoLEnabled !== false
  const rotationViewLolDeg = birthRotationLoLEnabled
    ? birthRotationLolDegToViewDeg(rotationLolDeg, birthRotationBaselineLol)
    : [
        normalizeAngleDegrees(rotationLolDeg[0]),
        normalizeAngleDegrees(rotationLolDeg[1]),
        normalizeAngleDegrees(rotationLolDeg[2]),
      ]
  const rotation = birthRotationViewDegToMeshEulerRad(
    rotationViewLolDeg,
    transformPipeline.useLeagueMatrixP,
    birthRotationLoLEnabled && emitter.isGroundLayer,
  )

  // 3–4 — Scale / orientation order
  const minimum = 0.01
  let scale: [number, number, number]

  if (transformPipeline.transformOrder === 'GroundBasisFirst') {
    scale = resolveScale(
      emitter,
      vfxScale,
      seed,
      particleNormalized,
      transformPipeline,
      composablePipeline,
      minimum,
      input.boundObjectSizeLol,
    )
  } else if (transformPipeline.transformOrder === 'ScaleThenOrient') {
    scale = resolveScale(
      emitter,
      vfxScale,
      seed,
      particleNormalized,
      transformPipeline,
      composablePipeline,
      minimum,
      input.boundObjectSizeLol,
    )
  } else {
    scale = resolveScale(
      emitter,
      vfxScale,
      seed,
      particleNormalized,
      transformPipeline,
      composablePipeline,
      minimum,
      input.boundObjectSizeLol,
    )
  }

  // 5 — Simulation space
  let velocity = resolveBirthVelocityZOnlyLol(emitter, seed)
  // Regra do editor: birthVelocity move estritamente no eixo Z do Three.js,
  // portanto não passa por reorientação direcional do pipeline.

  const matrix44XY = resolveMatrix44TranslationXYLol(emitter)
  const hasBirthVelocityMotion = velocity.some((v) => Math.abs(v) > 1e-6)
  const hasMatrix44Motion = !!matrix44XY
  const hasEmitterMotionParams = hasBirthVelocityMotion || hasMatrix44Motion

  const hasMotion = !lockMotion && hasEmitterMotionParams

  if (hasMotion) {
    const displacementLol = integrateVec3MotionWithDrag(velocity, [0, 0, 0], [0, 0, 0], motionTime)
    positionLol = [
      positionLol[0] + displacementLol[0],
      positionLol[1] + displacementLol[1],
      positionLol[2] + displacementLol[2],
    ]
    const displacement = lolToThreeVec3(displacementLol, vfxScale)
    position = [
      position[0] + displacement[0],
      position[1] + displacement[1],
      position[2] + displacement[2],
    ]

    if (matrix44XY) {
      positionLol = [positionLol[0] + matrix44XY[0], positionLol[1] + matrix44XY[1], positionLol[2]]
      const matrix44Three = lolToThreeVec3([matrix44XY[0], matrix44XY[1], 0], vfxScale)
      position = [position[0] + matrix44Three[0], position[1] + matrix44Three[1], position[2]]
    }
  }

  let scaleLol: [number, number, number] = [
    scale[0] / Math.max(vfxScale, 1e-9),
    scale[1] / Math.max(vfxScale, 1e-9),
    scale[2] / Math.max(vfxScale, 1e-9),
  ]

  // 6 — Render / attach space (blend bind quando não EmitterAttached puro)
  const bindWeight = bindWeightEarly
  const attachBone = attachBoneEarly
  const boneWorld =
    bindWeight > 0 && attachBone && input.resolveBoneWorld && !boneWorldEarly
      ? input.resolveBoneWorld(attachBone)
      : boneWorldEarly

  const attachedPosition: [number, number, number] = [
    origin[0] + spawn[0],
    origin[1] + spawn[1],
    origin[2] + spawn[2],
  ]

  if (boneWorld && !boneWorldEarly) {
    const boneAttached: [number, number, number] = [
      boneWorld[0] + spawn[0],
      boneWorld[1] + spawn[1],
      boneWorld[2] + spawn[2],
    ]
    position = blendPositionWithBindWeight(position, boneAttached, bindWeight)
    const boneAttachedLol: [number, number, number] = [
      emitterPosLol[0] + spawnLol[0],
      emitterPosLol[1] + spawnLol[1],
      emitterPosLol[2] + spawnLol[2],
    ]
    positionLol = blendPositionWithBindWeight(positionLol, boneAttachedLol, bindWeight) as [
      number,
      number,
      number,
    ]
  } else if (bindWeight > 0 && !boneWorldEarly) {
    position = blendPositionWithBindWeight(position, attachedPosition, bindWeight)
  }

  const worldMatrix = composeParticleWorldMatrix({
    positionThree: position,
    rotationEulerRad: rotation,
    scaleThree: scale,
    planeBaseRotation: baseRot,
    pipeline: transformPipeline,
    primitiveKind: emitter.primitiveKind,
    positionLol,
    rotationLolDeg: rotationViewLolDeg,
    scaleLol,
    vfxScale,
  })

  return {
    position,
    rotation,
    scale,
    planeFacing,
    planeBaseRotation: baseRot,
    transformPipeline,
    positionLol,
    rotationLolDeg,
    rotationViewLolDeg,
    birthRotationBaselineLol,
    scaleLol,
    worldMatrix: worldMatrixToFlat16(worldMatrix),
  }
}
