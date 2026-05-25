import type { ParsedVfxEmitterFull, VfxEmbedValue } from './vfxModel'
import { sampleErosionDrive } from './vfxAlphaErosion'
import { blendPositionWithBindWeight, resolveBindWeight } from './vfxBindWeight'
import { resolveEmitterAttachBoneName } from './vfxBoneTransform'
import { lolMeshToThreeCoords } from './lolCoords'
import { lolRotationDegreesToThreeEuler } from './vfxGlobalRotation'
import { integrateVec3MotionWithDrag } from './vfxParticleMotion'
import { applyProbabilityToVec3 } from './vfxProbability'
import { birthRotationGroundInPlaneEuler } from './vfxPrimitives'
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
  opacity: number
  /** Drive 0–1 para alpha erosion (1 = opaco). */
  erosionDrive: number
  visible: boolean
}

function embedVec3(embed: VfxEmbedValue | null, fallback: [number, number, number]): [number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0]), Number(value[1]), Number(value[2])]
  }
  return fallback
}

function embedVec4(
  embed: VfxEmbedValue | null,
  fallback: [number, number, number, number],
): [number, number, number, number] {
  if (!embed?.constant) return fallback
  const value = embed.constant
  if (Array.isArray(value) && value.length >= 4) {
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])]
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

function sampleDynamicsVec4(
  embed: VfxEmbedValue | null,
  normalizedT: number,
): [number, number, number, number] {
  if (!embed?.dynamics?.times?.length) return embedVec4(embed, [1, 1, 1, 1])

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
        const leftVal = values[index] as [number, number, number, number]
        const rightVal = values[index + 1] as [number, number, number, number]
        value = [
          leftVal[0] + (rightVal[0] - leftVal[0]) * factor,
          leftVal[1] + (rightVal[1] - leftVal[1]) * factor,
          leftVal[2] + (rightVal[2] - leftVal[2]) * factor,
          leftVal[3] + (rightVal[3] - leftVal[3]) * factor,
        ]
        break
      }
    }
  }

  if (Array.isArray(value) && value.length >= 4) {
    return [Number(value[0]), Number(value[1]), Number(value[2]), Number(value[3])]
  }
  return embedVec4(embed, [1, 1, 1, 1])
}

/**
 * LoL usa 0 num eixo de birthScale em billboards para indicar o eixo normal ao quad.
 * Os outros dois eixos definem largura/altura do sprite (ex.: Splat 25×100×0, hoop 0×300×300).
 */
/** Menor eixo LoL = espessura; os dois maiores = largura/altura do plano XY antes de deitar no chão. */
export function remapLoLQuadScaleForPlane(
  scale: [number, number, number],
  minimum = 0.01,
): [number, number, number] {
  const values = scale.map((component) => {
    const value = Math.abs(Number(component))
    if (value < 1e-6) return 0
    return Math.max(value, minimum)
  }) as [number, number, number]

  const indexed = values.map((value, index) => ({ value, index }))
  const sorted = [...indexed].sort((a, b) => b.value - a.value)
  const smallest = sorted[2]!
  const largest = sorted[0]!.value

  if (largest <= 0) return [minimum, minimum, 1]

  const thicknessRatio = smallest.value / largest
  if (thicknessRatio >= 0.2) return values

  const plane: number[] = []
  for (let index = 0; index < 3; index++) {
    if (index !== smallest.index) plane.push(values[index]!)
  }
  return [plane[0]!, plane[1]!, 1]
}

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
  isBillboard: boolean,
  isGroundLayer: boolean,
  minimum = 0.01,
): [number, number, number] {
  if (isGroundLayer) return remapLoLQuadScaleForPlane(scale, minimum)
  if (isBillboard) return fixBillboardScaleVec3(scale, minimum)

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

/** LoL → Three.js com a mesma base que meshes SCB/SKN (-x, -z, y). */
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
}

export function computeEmitterFrameState(
  emitter: ParsedVfxEmitterFull,
  vfxScale: number,
  timeSeconds: number,
  seed: number,
  options?: ComputeEmitterFrameOptions,
): VfxEmitterFrameState {
  const isBillboard = ['plane', 'ray', 'arbitrary_quad', 'trail', 'beam', 'planar_projection'].includes(
    emitter.primitiveKind,
  )
  const particleLifetime = Math.max(emitter.particleLifetime, 0.001)
  const particleTime =
    options?.particleTime ?? timeSeconds - emitter.timeBeforeFirstEmission
  const visible = particleTime >= 0 && particleTime <= particleLifetime + emitter.particleLinger
  const particleNormalized = Math.min(Math.max(particleTime / particleLifetime, 0), 1)

  let birthScale = embedVec3(emitter.birthScale0, [1, 1, 1])
  if (emitter.birthScale0?.dynamics) {
    birthScale = applyProbabilityToVec3(birthScale, emitter.birthScale0.dynamics.probabilityTables, seed)
  }

  // Preview sem bound object: igual ao Blender (flex = 1.0). flexShapeScale só faz sentido in-game.
  const flex = 1
  birthScale = [
    birthScale[0] * flex * vfxScale,
    birthScale[1] * flex * vfxScale,
    birthScale[2] * flex * vfxScale,
  ]

  let dynamicScale = sampleDynamicsVec3(emitter.scale0, particleNormalized)
  dynamicScale = applyUniformScale(dynamicScale, emitter.isUniformScale)

  const scale = fixScaleVec3(
    [
      birthScale[0] * dynamicScale[0],
      birthScale[1] * dynamicScale[1],
      birthScale[2] * dynamicScale[2],
    ],
    isBillboard,
    emitter.isGroundLayer,
  )

  const colorRgba = sampleDynamicsVec4(emitter.color, particleNormalized)
  const birthRgba = sampleDynamicsVec4(emitter.birthColor, particleNormalized)
  const rgba: [number, number, number, number] = [
    colorRgba[0] * birthRgba[0],
    colorRgba[1] * birthRgba[1],
    colorRgba[2] * birthRgba[2],
    colorRgba[3] * birthRgba[3],
  ]
  const opacity = visible ? Math.max(rgba[3], 0.02) : 0

  const lockMotion = options?.vfxLockMotionEnabled === true
  const motionTime = Math.max(particleTime, 0)
  const spawnMotionTime = lockMotion ? 0 : motionTime
  const origin = lolToThreeVec3(emitter.emitterPosition, vfxScale)
  const spawn = lolToThreeVec3(
    computeParticleSpawnOffsetLol(emitter, seed, spawnMotionTime),
    vfxScale,
  )
  let position: [number, number, number] = [
    origin[0] + spawn[0],
    origin[1] + spawn[1] + emitter.pass * 0.001,
    origin[2] + spawn[2],
  ]
  let birthRot = embedVec3(emitter.birthRotation0, [0, 0, 0])
  if (emitter.birthRotation0?.dynamics) {
    birthRot = applyProbabilityToVec3(birthRot, emitter.birthRotation0.dynamics.probabilityTables, seed + 1)
  }

  let velocity = embedVec3(emitter.birthVelocity, [0, 0, 0])
  if (emitter.birthVelocity?.dynamics) {
    velocity = applyProbabilityToVec3(velocity, emitter.birthVelocity.dynamics.probabilityTables, seed + 2)
  }

  let acceleration = embedVec3(emitter.worldAcceleration, DEFAULT_GRAVITY_LOL)
  if (emitter.worldAcceleration?.dynamics?.times?.length) {
    acceleration = sampleDynamicsVec3(emitter.worldAcceleration, particleNormalized)
  }

  const birthAccel = embedVec3(emitter.birthAcceleration, [0, 0, 0])
  acceleration = [
    acceleration[0] + birthAccel[0],
    acceleration[1] + birthAccel[1],
    acceleration[2] + birthAccel[2],
  ]

  if (emitter.isDirectionOriented) {
    const speed = Math.hypot(velocity[0], velocity[1], velocity[2])
    if (speed > 1e-6) {
      const facing = [
        Math.sin(birthRot[2] * DEG2RAD),
        Math.sin(birthRot[0] * DEG2RAD),
        Math.cos(birthRot[2] * DEG2RAD),
      ] as [number, number, number]
      const len = Math.hypot(facing[0], facing[1], facing[2]) || 1
      velocity = [(facing[0] / len) * speed, (facing[1] / len) * speed, (facing[2] / len) * speed]
    }
  }

  let drag = embedVec3(emitter.birthDrag, [0, 0, 0])
  if (emitter.birthDrag?.dynamics) {
    drag = applyProbabilityToVec3(drag, emitter.birthDrag.dynamics.probabilityTables, seed + 3)
  }
  if (emitter.birthDrag?.dynamics?.times?.length) {
    drag = sampleDynamicsVec3(emitter.birthDrag, particleNormalized)
  }

  const hasMotion =
    velocity.some((v) => Math.abs(v) > 1e-6) ||
    acceleration.some((v) => Math.abs(v) > 1e-6) ||
    drag.some((v) => Math.abs(v) > 1e-6)

  const attachedPosition: [number, number, number] = [origin[0] + spawn[0], origin[1] + spawn[1], origin[2] + spawn[2]]

  if (hasMotion && !lockMotion) {
    const displacementLol = integrateVec3MotionWithDrag(velocity, acceleration, drag, motionTime)
    const displacement = lolToThreeVec3(displacementLol, vfxScale)
    position = [
      position[0] + displacement[0],
      position[1] + displacement[1],
      position[2] + displacement[2],
    ]
  }

  const bindWeight = resolveBindWeight(emitter.bindWeight)
  const attachBone = resolveEmitterAttachBoneName(
    emitter.attachBoneName,
    options?.referenceBoneName,
  )
  const boneWorld =
    bindWeight > 0 && attachBone && options?.resolveBoneWorld
      ? options.resolveBoneWorld(attachBone)
      : null

  if (boneWorld) {
    const boneAttached: [number, number, number] = [
      boneWorld[0] + spawn[0],
      boneWorld[1] + spawn[1],
      boneWorld[2] + spawn[2],
    ]
    position = blendPositionWithBindWeight(position, boneAttached, bindWeight)
  } else if (bindWeight > 0) {
    position = blendPositionWithBindWeight(position, attachedPosition, bindWeight)
  }

  const rotVelocity = embedVec3(emitter.birthRotationalVelocity0, [0, 0, 0])
  const rotation = emitter.isGroundLayer
    ? birthRotationGroundInPlaneEuler(birthRot, rotVelocity, motionTime)
    : lolRotationDegreesToThreeEuler(
        [
          birthRot[0] + rotVelocity[0] * motionTime,
          birthRot[1] + rotVelocity[1] * motionTime,
          birthRot[2] + rotVelocity[2] * motionTime,
        ],
        options?.vfxGlobalRotationEnabled === true,
        options?.vfxGlobalRotationOffsetDegrees ?? [0, 0, 0],
      )

  const spriteOffset = resolveSpriteOffset(emitter, particleNormalized, seed)
  const uvScroll = resolveUvScroll(emitter, motionTime, particleNormalized)
  const erosionDrive = sampleErosionDrive(emitter.alphaErosion, particleNormalized)
  const erosionOpacity = emitter.alphaErosion ? opacity * erosionDrive : opacity

  return {
    position,
    scale,
    rotation,
    color: [rgba[0], rgba[1], rgba[2], erosionOpacity],
    spriteOffset,
    uvScroll,
    opacity: erosionOpacity,
    erosionDrive,
    visible,
  }
}
