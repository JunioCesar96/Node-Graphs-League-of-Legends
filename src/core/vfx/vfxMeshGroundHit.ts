/** Raycast vertical (eixo -Z) contra malhas da cena (chão + personagem). */



import type { Object3D } from 'three'

import { Raycaster, Vector3 } from 'three'



import type { VfxGroundHit, VfxGroundHitResolver } from './vfxGroundHit'

import { groundPlaneHitResolver } from './vfxGroundHit'



const RAY_ORIGIN_Z = 64

const _origin = new Vector3()

const _direction = new Vector3(0, 0, -1)

const _normal = new Vector3()

const _raycaster = new Raycaster()



export function raycastMeshGroundHit(

  roots: Object3D[],

  x: number,

  y: number,

): VfxGroundHit | null {

  if (!roots.length) return null



  _origin.set(x, y, RAY_ORIGIN_Z)

  _raycaster.set(_origin, _direction)

  const hits = _raycaster.intersectObjects(roots, true)

  if (!hits.length) return null



  const hit = hits[0]!

  if (hit.face) {

    _normal.copy(hit.face.normal)

    if (hit.object) {

      _normal.transformDirection(hit.object.matrixWorld)

    }

    _normal.normalize()

  } else {

    _normal.set(0, 0, 1)

  }



  return {

    z: hit.point.z,

    normal: [_normal.x, _normal.y, _normal.z],

    fromMesh: true,

  }

}



/**

 * Resolver que lê `rootsRef` em cada amostra (malhas actualizadas no Canvas sem re-build do preview).

 */

export function createDynamicMeshGroundHitResolver(

  rootsRef: { current: Object3D[] },

  planeZ: number,

): VfxGroundHitResolver {

  const plane = groundPlaneHitResolver(planeZ)

  return (x: number, y: number) => {

    const roots = rootsRef.current

    if (!roots.length) return plane(x, y)

    const meshHit = raycastMeshGroundHit(roots, x, y)

    if (meshHit) return meshHit

    const fallback = plane(x, y)!

    return { ...fallback, fromMesh: false }

  }

}

