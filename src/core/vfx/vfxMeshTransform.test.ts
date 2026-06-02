import { describe, expect, it } from 'vitest'
import { Euler, Group, Matrix4, Mesh, PlaneGeometry, Quaternion, Vector3 } from 'three'

import { applyParticleWorldTransform, composeEmitterMeshQuaternion } from './vfxMeshTransform'
import { composeParticleWorldMatrix, worldMatrixToFlat16 } from './vfxWorldMatrix'
import type { TransformPipelineDefinition } from './semantic/vfxTransformTypes'

describe('composeEmitterMeshQuaternion', () => {
  const cameraQuat = new Quaternion()

  it('ground: ignora inclinação X/Y e planeBase shockwave', () => {
    const quat = composeEmitterMeshQuaternion({
      geometryKind: 'plane',
      planeFacing: 'shockwave',
      isGroundLayer: true,
      planeBaseRotation: [-Math.PI / 2, 0, Math.PI / 2],
      rotationEulerRad: [0.5, 0.4, 0],
      isBillboard: true,
      cameraQuaternion: cameraQuat,
      vfxCamLockEnabled: true,
    })
    const euler = new Euler().setFromQuaternion(quat, 'XYZ')
    expect(euler.x).toBeCloseTo(0, 4)
    expect(euler.y).toBeCloseTo(0, 4)
    expect(euler.z).toBeCloseTo(0, 4)
  })

  it('ground: preserva spin no plano (Z)', () => {
    const quat = composeEmitterMeshQuaternion({
      geometryKind: 'plane',
      planeFacing: 'ground',
      isGroundLayer: true,
      planeBaseRotation: [0, 0, 0],
      rotationEulerRad: [0, 0, Math.PI / 4],
      isBillboard: true,
      cameraQuaternion: cameraQuat,
      vfxCamLockEnabled: true,
    })
    const euler = new Euler().setFromQuaternion(quat, 'XYZ')
    expect(euler.z).toBeCloseTo(Math.PI / 4, 4)
    expect(euler.x).toBeCloseTo(0, 4)
    expect(euler.y).toBeCloseTo(0, 4)
  })

  it('billboard câmara: aplica rotação base vertical (plano XZ)', () => {
    const quat = composeEmitterMeshQuaternion({
      geometryKind: 'plane',
      planeFacing: 'camera',
      isGroundLayer: false,
      planeBaseRotation: [0, 0, 0],
      rotationEulerRad: [0, 0, 0],
      isBillboard: false,
      cameraQuaternion: cameraQuat,
      vfxCamLockEnabled: false,
    })
    const euler = new Euler().setFromQuaternion(quat, 'XYZ')
    expect(euler.x).toBeCloseTo(-Math.PI / 2, 4)
  })

})

describe('applyParticleWorldTransform', () => {
  const cameraQuat = new Quaternion()

  it('useLeagueMatrixP: TRS no group (não S no group + R no mesh)', () => {
    const worldM = new Matrix4().makeRotationY(0.42)
    const worldMatrix = worldMatrixToFlat16(worldM)
    const expectedQuat = new Quaternion()
    worldM.decompose(new Vector3(), expectedQuat, new Vector3())

    const group = new Group()
    const mesh = new Mesh(new PlaneGeometry(1, 1))

    applyParticleWorldTransform({
      group,
      mesh,
      position: [0, 0, 0],
      scale: [1, 1, 1],
      rotationEulerRad: [0, 0, 0],
      geometryKind: 'plane',
      planeFacing: 'ground',
      planeBaseRotation: [0, 0, 0],
      isGroundLayer: false,
      isBillboard: false,
      cameraQuaternion: cameraQuat,
      vfxCamLockEnabled: false,
      worldMatrix,
      useLeagueMatrixP: true,
    })

    group.updateMatrixWorld(true)
    expect(group.quaternion.angleTo(expectedQuat)).toBeLessThan(0.001)
    expect(mesh.quaternion.angleTo(new Quaternion())).toBeLessThan(0.001)
    expect(group.scale.x).toBe(1)
    expect(group.scale.y).toBe(1)
    expect(group.scale.z).toBe(1)
  })

  it('useLeagueMatrixP: escala vem de frame.scale (regras), não da decomposição da matriz', () => {
    const pipeline: TransformPipelineDefinition = {
      orientationMode: 'LocalOrientation',
      scaleSpace: 'PrimitiveLocal',
      simulationSpace: 'World',
      transformOrder: 'OrientThenScale',
      billboardMode: 'none',
      useLeagueMatrixP: true,
    }
    const semanticScale: [number, number, number] = [2.56, 2.56, 0.07]
    const worldMatrix = worldMatrixToFlat16(
      composeParticleWorldMatrix({
        positionThree: [0, 0, 0],
        rotationEulerRad: [0, 0, 0],
        scaleThree: semanticScale,
        planeBaseRotation: [0, 0, 0],
        pipeline,
        primitiveKind: 'arbitrary_quad',
        positionLol: [0, 0, 0],
        rotationLolDeg: [-90, -90, 0],
        scaleLol: [256, 256, 7],
        vfxScale: 0.01,
      }),
    )

    const group = new Group()
    const mesh = new Mesh(new PlaneGeometry(1, 1))
    applyParticleWorldTransform({
      group,
      mesh,
      position: [0, 0, 0],
      scale: semanticScale,
      rotationEulerRad: [0, 0, 0],
      geometryKind: 'plane',
      planeFacing: 'ground',
      planeBaseRotation: [0, 0, 0],
      isGroundLayer: false,
      isBillboard: false,
      cameraQuaternion: cameraQuat,
      vfxCamLockEnabled: false,
      worldMatrix,
      useLeagueMatrixP: true,
    })

    expect(group.scale.x).toBeCloseTo(2.56, 4)
    expect(group.scale.y).toBeCloseTo(2.56, 4)
    expect(group.scale.z).toBeCloseTo(0.07, 4)
  })

  it('birthScale 256×256 simétrico: vértices do plano formam paralelogramo reto (quadrado)', () => {
    const pipeline: TransformPipelineDefinition = {
      orientationMode: 'LocalOrientation',
      scaleSpace: 'PrimitiveLocal',
      simulationSpace: 'World',
      transformOrder: 'OrientThenScale',
      billboardMode: 'none',
      useLeagueMatrixP: true,
    }
    const worldMatrix = worldMatrixToFlat16(
      composeParticleWorldMatrix({
        positionThree: [0, 0, 0],
        rotationEulerRad: [0, 0, 0],
        scaleThree: [2.56, 2.56, 0.07],
        planeBaseRotation: [0, 0, 0],
        pipeline,
        primitiveKind: 'arbitrary_quad',
        positionLol: [0, 0, 0],
        rotationLolDeg: [-90, -90, 0],
        scaleLol: [256, 256, 7],
        vfxScale: 0.01,
      }),
    )

    const group = new Group()
    const mesh = new Mesh(new PlaneGeometry(1, 1))
    applyParticleWorldTransform({
      group,
      mesh,
      position: [0, 0, 0],
      scale: [2.56, 2.56, 0.07],
      rotationEulerRad: [0, 0, 0],
      geometryKind: 'plane',
      planeFacing: 'ground',
      planeBaseRotation: [0, 0, 0],
      isGroundLayer: false,
      isBillboard: false,
      cameraQuaternion: cameraQuat,
      vfxCamLockEnabled: false,
      worldMatrix,
      useLeagueMatrixP: true,
    })

    mesh.updateMatrixWorld(true)
    const corners = [
      new Vector3(-0.5, -0.5, 0),
      new Vector3(0.5, -0.5, 0),
      new Vector3(0.5, 0.5, 0),
      new Vector3(-0.5, 0.5, 0),
    ].map((v) => v.applyMatrix4(mesh.matrixWorld))

    const edge = (a: Vector3, b: Vector3) => a.distanceTo(b)
    const e0 = edge(corners[0]!, corners[1]!)
    const e1 = edge(corners[1]!, corners[2]!)
    const e2 = edge(corners[2]!, corners[3]!)
    const e3 = edge(corners[3]!, corners[0]!)
    const diagA = edge(corners[0]!, corners[2]!)
    const diagB = edge(corners[1]!, corners[3]!)

    expect(e0).toBeCloseTo(e2, 3)
    expect(e1).toBeCloseTo(e3, 3)
    expect(diagA).toBeCloseTo(diagB, 3)
    expect(e0).toBeCloseTo(e1, 3)
  })
})
