import {
  Bone,
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Quaternion,
  Skeleton,
  SkinnedMesh,
  Vector3,
} from 'three'

import type { ParsedLolAnm } from './lolAnmParse'
import { buildDenseAnmClip, resolveAnmFrameIndex, type AnmDensePose } from './lolAnmSampling'
import { LOL_IMPORT_SCALE, nativeLeaguePoseToThree } from './lolCoords'
import { parsedMeshToBufferGeometry } from './lolMeshGeometry'
import type { ParsedLolSkn } from './lolSknParse'
import type { ParsedLolSkl, ParsedLolSklJoint } from './lolSklParse'

export type LolSkinnedMeshBundle = {
  mesh: SkinnedMesh
  skeleton: Skeleton
  bones: Bone[]
  bindGeometry: BufferGeometry
  /** Posições bind (Three) para skinning CPU. */
  restPositions: Float32Array
  boneIndices: Uint16Array
  boneWeights: Float32Array
  skl: ParsedLolSkl
}

/** Mapeia índice de influence SKN → joint id SKL (Aventurine import_skn). */
export function remapInfluenceToJointId(
  rawIndex: number,
  influences: number[],
  jointCount: number,
): number {
  if (rawIndex < 0) return 0
  if (influences.length > 0 && rawIndex < influences.length) {
    const mapped = influences[rawIndex]!
    return mapped >= 0 && mapped < jointCount ? mapped : 0
  }
  return rawIndex >= 0 && rawIndex < jointCount ? rawIndex : 0
}

function jointById(skl: ParsedLolSkl, id: number): ParsedLolSklJoint | undefined {
  return skl.joints.find((joint) => joint.id === id)
}

function composeJointMatrix(
  translation: [number, number, number],
  rotation: [number, number, number, number],
  scale: [number, number, number],
): Matrix4 {
  const [qw, qx, qy, qz] = rotation
  const matrix = new Matrix4()
  matrix.compose(
    new Vector3(translation[0], translation[1], translation[2]),
    new Quaternion(qx, qy, qz, qw),
    new Vector3(scale[0], scale[1], scale[2]),
  )
  return matrix
}

function bindNativePose(joint: ParsedLolSklJoint): AnmDensePose {
  const [rx, ry, rz, rw] = joint.rawRotation
  return {
    translation: [
      joint.rawTranslation[0] * LOL_IMPORT_SCALE,
      joint.rawTranslation[1] * LOL_IMPORT_SCALE,
      joint.rawTranslation[2] * LOL_IMPORT_SCALE,
    ],
    rotation: [rw, rx, ry, rz],
    scale: [...joint.rawScale],
  }
}

function resolveJointLocalMatrix(
  joint: ParsedLolSklJoint,
  skl: ParsedLolSkl,
  densePose: AnmDensePose | undefined,
): Matrix4 {
  if (!densePose) return getBindLocalMatrix(skl, joint)
  const pose = resolveAnmBoneLocalPose(joint, densePose)
  const [sx, sy, sz] = joint.localScale
  const translation = pose.useTranslation ? pose.translation : joint.localTranslation
  const rotation = pose.useRotation ? pose.rotation : joint.localRotation
  return composeJointMatrix(translation, rotation, [sx, sy, sz])
}

const bindLocalCache = new WeakMap<ParsedLolSkl, Map<number, Matrix4>>()

function getBindLocalMatrix(skl: ParsedLolSkl, joint: ParsedLolSklJoint): Matrix4 {
  let byId = bindLocalCache.get(skl)
  if (!byId) {
    byId = new Map()
    for (const entry of skl.joints) {
      byId.set(
        entry.id,
        composeJointMatrix(entry.localTranslation, entry.localRotation, entry.localScale),
      )
    }
    bindLocalCache.set(skl, byId)
  }
  return byId.get(joint.id)?.clone() ?? new Matrix4()
}

/**
 * Pose local absoluta (Three.js) — mesma convenção que SKL bind via leagueLocalToThree.
 * compute_basis do Aventurine é para matrix_basis do Blender; aqui os ossos guardam TRS absoluto.
 */
function resolveAnmBoneLocalPose(
  joint: ParsedLolSklJoint,
  densePose: AnmDensePose,
): {
  translation: [number, number, number]
  rotation: [number, number, number, number]
  useTranslation: boolean
  useRotation: boolean
} {
  const bind = bindNativePose(joint)
  const converted = nativeLeaguePoseToThree(
    densePose.translation ?? bind.translation,
    densePose.rotation ?? bind.rotation,
    densePose.scale ?? bind.scale,
  )
  return {
    translation: densePose.hasTranslation ? converted.translation : joint.localTranslation,
    rotation: densePose.hasRotation ? converted.rotation : joint.localRotation,
    useTranslation: densePose.hasTranslation,
    useRotation: densePose.hasRotation,
  }
}

function applyLocalPoseToBone(
  bone: Bone,
  joint: ParsedLolSklJoint,
  translation: [number, number, number],
  rotation: [number, number, number, number],
  jointId: number,
  quatSignCache: Map<number, Quaternion>,
) {
  const [qw, qx, qy, qz] = rotation
  const quat = new Quaternion(qx, qy, qz, qw)
  const previous = quatSignCache.get(jointId)
  if (previous && previous.dot(quat) < 0) {
    quat.x *= -1
    quat.y *= -1
    quat.z *= -1
    quat.w *= -1
  }
  quatSignCache.set(jointId, quat.clone())

  const [tx, ty, tz] = translation
  const [sx, sy, sz] = joint.localScale
  bone.position.set(tx, ty, tz)
  bone.quaternion.copy(quat)
  bone.scale.set(sx, sy, sz)
}

function computeBoneWorldMatrix(
  jointId: number,
  skl: ParsedLolSkl,
  poseByJointId: Map<number, AnmDensePose>,
  cache: Map<number, Matrix4>,
): Matrix4 {
  const cached = cache.get(jointId)
  if (cached) return cached

  const joint = jointById(skl, jointId)
  if (!joint) {
    const identity = new Matrix4()
    cache.set(jointId, identity)
    return identity
  }

  const local = resolveJointLocalMatrix(joint, skl, poseByJointId.get(joint.id))

  const world =
    joint.parent >= 0
      ? new Matrix4().multiplyMatrices(computeBoneWorldMatrix(joint.parent, skl, poseByJointId, cache), local)
      : local

  cache.set(jointId, world)
  return world
}

const denseClipCache = new WeakMap<ParsedLolAnm, WeakMap<ParsedLolSkl, ReturnType<typeof buildDenseAnmClip>>>()

function getDenseAnmClip(anm: ParsedLolAnm, skl: ParsedLolSkl) {
  let bySkl = denseClipCache.get(anm)
  if (!bySkl) {
    bySkl = new WeakMap()
    denseClipCache.set(anm, bySkl)
  }
  let dense = bySkl.get(skl)
  if (!dense) {
    dense = buildDenseAnmClip(anm, skl)
    bySkl.set(skl, dense)
  }
  return dense
}

function buildPoseByJointId(skl: ParsedLolSkl, anm: ParsedLolAnm | null, frame: number): Map<number, AnmDensePose> {
  const poseByJointId = new Map<number, AnmDensePose>()
  if (!anm) return poseByJointId

  const dense = getDenseAnmClip(anm, skl)
  for (const track of anm.tracks) {
    const jointId = skl.hashToJointId.get(track.jointHash)
    if (jointId == null) continue
    const pose = dense.trackPoses.get(track.jointHash)?.[frame]
    if (pose) poseByJointId.set(jointId, pose)
  }
  return poseByJointId
}

/** Tracks ANM cujo hash existe no SKL (diagnóstico). */
export function countMatchedAnmTracks(skl: ParsedLolSkl, anm: ParsedLolAnm): number {
  let matched = 0
  for (const track of anm.tracks) {
    if (skl.hashToJointId.has(track.jointHash)) matched++
  }
  return matched
}

/** Matrizes world dos ossos (bind ou animados) — hierarquia memoizada como Aventurine create_armature. */
export function evaluateBoneWorldMatrices(
  skl: ParsedLolSkl,
  anm: ParsedLolAnm | null,
  timeSeconds: number,
): Map<number, Matrix4> | null {
  if (!skl.joints.length) return null

  const frame = anm ? resolveAnmFrameIndex(anm, timeSeconds, true) : 0
  const poseByJointId = buildPoseByJointId(skl, anm, frame)
  const cache = new Map<number, Matrix4>()
  const worldById = new Map<number, Matrix4>()

  for (const joint of skl.joints) {
    worldById.set(joint.id, computeBoneWorldMatrix(joint.id, skl, poseByJointId, cache))
  }

  return worldById
}

function computeBindWorldMatrices(skl: ParsedLolSkl): Map<number, Matrix4> {
  return evaluateBoneWorldMatrices(skl, null, 0) ?? new Map()
}

/** Skinning CPU — world * inverseBind (Aventurine / Quartz). */
export function evaluateSkinningMatrices(
  skl: ParsedLolSkl,
  anm: ParsedLolAnm | null,
  timeSeconds: number,
): Map<number, Matrix4> | null {
  const worldById = evaluateBoneWorldMatrices(skl, anm, timeSeconds)
  if (!worldById) return null

  const bindWorld = computeBindWorldMatrices(skl)
  const skinByJointId = new Map<number, Matrix4>()

  for (const joint of skl.joints) {
    const world = worldById.get(joint.id)
    const bind = bindWorld.get(joint.id)
    if (!world || !bind) continue
    const invBind = new Matrix4().copy(bind).invert()
    skinByJointId.set(joint.id, new Matrix4().multiplyMatrices(world, invBind))
  }

  return skinByJointId
}

export function boneWorldPositionFromMatrix(matrix: Matrix4): [number, number, number] {
  const point = new Vector3()
  matrix.decompose(point, new Quaternion(), new Vector3())
  return [point.x, point.y, point.z]
}

export function deformPositionsWithSkinning(
  restPositions: Float32Array,
  boneIndices: Uint16Array,
  boneWeights: Float32Array,
  skinningMatrices: Map<number, Matrix4>,
): Float32Array {
  const out = new Float32Array(restPositions.length)
  const vertex = new Vector3()
  const transformed = new Vector3()
  const acc = new Vector3()
  const vertexCount = restPositions.length / 3

  for (let vi = 0; vi < vertexCount; vi++) {
    const ox = restPositions[vi * 3]!
    const oy = restPositions[vi * 3 + 1]!
    const oz = restPositions[vi * 3 + 2]!
    vertex.set(ox, oy, oz)
    acc.set(0, 0, 0)
    let total = 0

    for (let k = 0; k < 4; k++) {
      const weight = boneWeights[vi * 4 + k]!
      if (weight <= 0.0001) continue
      const jointId = boneIndices[vi * 4 + k]!
      const matrix = skinningMatrices.get(jointId)
      if (!matrix) continue
      transformed.copy(vertex).applyMatrix4(matrix)
      acc.addScaledVector(transformed, weight)
      total += weight
    }

    if (total > 0.0001) {
      if (Math.abs(total - 1) > 0.001) acc.multiplyScalar(1 / total)
      out[vi * 3] = acc.x
      out[vi * 3 + 1] = acc.y
      out[vi * 3 + 2] = acc.z
    } else {
      out[vi * 3] = ox
      out[vi * 3 + 1] = oy
      out[vi * 3 + 2] = oz
    }
  }

  return out
}

export function evaluateSkeletonSegments(
  skl: ParsedLolSkl,
  anm: ParsedLolAnm | null,
  timeSeconds: number,
): Float32Array {
  const worldById = evaluateBoneWorldMatrices(skl, anm, timeSeconds)
  if (!worldById) return new Float32Array(0)

  const positions: number[] = []
  const head = new Vector3()
  const parentHead = new Vector3()

  for (const joint of skl.joints) {
    if (joint.parent < 0) continue
    const world = worldById.get(joint.id)
    const parentWorld = worldById.get(joint.parent)
    if (!world || !parentWorld) continue
    head.setFromMatrixPosition(world)
    parentHead.setFromMatrixPosition(parentWorld)
    positions.push(parentHead.x, parentHead.y, parentHead.z, head.x, head.y, head.z)
  }

  return new Float32Array(positions)
}

export function buildSkinnedMeshFromSknSkl(
  skn: ParsedLolSkn,
  skl: ParsedLolSkl,
): LolSkinnedMeshBundle | null {
  if (!skn.verticesSkn.length || !skl.joints.length) return null

  const bindGeometry = parsedMeshToBufferGeometry(skn)
  const geometry = bindGeometry.clone()

  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const skinIndices: number[] = []
  const skinWeights: number[] = []

  const jointCount = Math.max(...skl.joints.map((joint) => joint.id), 0) + 1

  for (let f = 0; f < skn.indices.length; f += 3) {
    const baseVertex = positions.length / 3
    const uvBase = f

    for (let corner = 0; corner < 3; corner++) {
      const vertexIndex = skn.indices[f + corner]!
      const vertex = skn.verticesSkn[vertexIndex]
      if (!vertex) continue

      positions.push(...vertex.position)
      const uv = skn.uvs[uvBase + corner] ?? vertex.uv
      uvs.push(uv[0], 1 - uv[1])

      const weightMap = new Map<number, number>()
      for (let k = 0; k < 4; k++) {
        const weight = vertex.weights[k] ?? 0
        if (weight <= 0.0001) continue
        const jointId = remapInfluenceToJointId(vertex.influences[k] ?? 0, skl.influences, jointCount)
        weightMap.set(jointId, (weightMap.get(jointId) ?? 0) + weight)
      }

      const weights = [...weightMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
      while (weights.length < 4) weights.push([0, 0])

      let total = weights.reduce((sum, [, weight]) => sum + weight, 0)
      if (total <= 0) total = 1

      skinIndices.push(weights[0]![0], weights[1]![0], weights[2]![0], weights[3]![0])
      skinWeights.push(
        weights[0]![1] / total,
        weights[1]![1] / total,
        weights[2]![1] / total,
        weights[3]![1] / total,
      )
    }

    indices.push(baseVertex, baseVertex + 1, baseVertex + 2)
  }

  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setAttribute('skinIndex', new BufferAttribute(new Uint16Array(skinIndices), 4))
  geometry.setAttribute('skinWeight', new BufferAttribute(new Float32Array(skinWeights), 4))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()

  const maxJointId = Math.max(...skl.joints.map((joint) => joint.id), 0)
  const bones: Bone[] = Array.from({ length: maxJointId + 1 }, (_, id) => {
    const joint = jointById(skl, id)
    const bone = new Bone()
    bone.name = joint?.name ?? `bone_${id}`
    return bone
  })

  for (const joint of skl.joints) {
    const bone = bones[joint.id]
    if (!bone) continue
    const [tx, ty, tz] = joint.localTranslation
    const [qw, qx, qy, qz] = joint.localRotation
    const [sx, sy, sz] = joint.localScale
    bone.position.set(tx, ty, tz)
    bone.quaternion.set(qx, qy, qz, qw)
    bone.scale.set(sx, sy, sz)
    if (joint.parent >= 0 && bones[joint.parent]) {
      bones[joint.parent]!.add(bone)
    }
  }

  const rootBones = bones.filter((bone) => bone.parent === null || bone.parent.type !== 'Bone')
  if (!rootBones.length && bones[0]) rootBones.push(bones[0])

  const skeleton = new Skeleton(bones.filter(Boolean))
  skeleton.calculateInverses()

  const mesh = new SkinnedMesh(geometry, undefined as never)
  mesh.add(...rootBones)
  mesh.bind(skeleton)
  mesh.name = skn.name

  return {
    mesh,
    skeleton,
    bones,
    bindGeometry,
    restPositions: new Float32Array(positions),
    boneIndices: new Uint16Array(skinIndices),
    boneWeights: new Float32Array(skinWeights),
    skl,
  }
}

/** Repõe ossos Three na bind pose do SKL. */
export function applyBindPoseToBones(bones: Bone[], skl: ParsedLolSkl) {
  for (const joint of skl.joints) {
    const bone = bones[joint.id]
    if (!bone) continue
    const [tx, ty, tz] = joint.localTranslation
    const [qw, qx, qy, qz] = joint.localRotation
    const [sx, sy, sz] = joint.localScale
    bone.position.set(tx, ty, tz)
    bone.quaternion.set(qx, qy, qz, qw)
    bone.scale.set(sx, sy, sz)
  }
  updateBoneHierarchyWorld(bones)
}

function updateBoneHierarchyWorld(bones: Bone[]) {
  for (const bone of bones) {
    if (!bone || (bone.parent && bone.parent.type === 'Bone')) continue
    bone.updateMatrixWorld(true)
  }
}

const anmQuatSignCache = new WeakMap<ParsedLolAnm, Map<number, Quaternion>>()

function getAnmQuatSignCache(anm: ParsedLolAnm): Map<number, Quaternion> {
  let cache = anmQuatSignCache.get(anm)
  if (!cache) {
    cache = new Map()
    anmQuatSignCache.set(anm, cache)
  }
  return cache
}

/** Aplica pose ANM em ossos Three (GPU skinning) — compute_basis Aventurine. */
export function applyAnmPoseToBones(
  bones: Bone[],
  skl: ParsedLolSkl,
  anm: ParsedLolAnm,
  frameIndex: number,
) {
  const frame = Math.max(0, Math.min(anm.frameCount - 1, Math.round(frameIndex)))
  const dense = getDenseAnmClip(anm, skl)
  const quatSignCache = getAnmQuatSignCache(anm)
  const animatedJointIds = new Set<number>()

  for (const track of anm.tracks) {
    const jointId = skl.hashToJointId.get(track.jointHash)
    if (jointId == null) continue
    const densePose = dense.trackPoses.get(track.jointHash)?.[frame]
    if (!densePose) continue

    const bone = bones[jointId]
    const joint = jointById(skl, jointId)
    if (!bone || !joint) continue

    animatedJointIds.add(jointId)
    const pose = resolveAnmBoneLocalPose(joint, densePose)
    applyLocalPoseToBone(bone, joint, pose.translation, pose.rotation, jointId, quatSignCache)
  }

  for (const joint of skl.joints) {
    if (animatedJointIds.has(joint.id)) continue
    const bone = bones[joint.id]
    if (!bone) continue
    const [tx, ty, tz] = joint.localTranslation
    const [qw, qx, qy, qz] = joint.localRotation
    const [sx, sy, sz] = joint.localScale
    bone.position.set(tx, ty, tz)
    bone.quaternion.set(qx, qy, qz, qw)
    bone.scale.set(sx, sy, sz)
  }

  updateBoneHierarchyWorld(bones)
}

export function buildSkeletonHelperPositions(skl: ParsedLolSkl): Float32Array {
  return evaluateSkeletonSegments(skl, null, 0)
}

export function disposeSkinnedBundle(bundle: LolSkinnedMeshBundle) {
  bundle.mesh.geometry.dispose()
  bundle.bindGeometry.dispose()
}
