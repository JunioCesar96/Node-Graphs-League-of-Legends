/** Tamanho do bound object (malha skinned) em unidades LoL. */

import { Box3, Vector3, type Object3D } from 'three'

import type { LolSkinnedMeshBundle } from './lolSkinnedMesh'

const _box = new Box3()
const _size = new Vector3()

const DEFAULT_BOUND_SIZE_LOL: [number, number, number] = [100, 100, 100]

/**
 * Extensão AABB da geometria em bind pose (unidades do ficheiro .skn — alinhado ao ritual LoL).
 */
export function getBoundObjectSizeLol(bundle: LolSkinnedMeshBundle): [number, number, number] {
  const geometry = bundle.bindGeometry
  if (!geometry.boundingBox) geometry.computeBoundingBox()
  const bb = geometry.boundingBox
  if (!bb) return DEFAULT_BOUND_SIZE_LOL

  _box.copy(bb)
  _box.getSize(_size)
  return [_size.x, _size.y, _size.z]
}

/**
 * AABB de um Object3D GLTF (Three) → extensão em unidades LoL.
 * Inverso de lolMeshToThreeCoords: Three (x,y,z) → LoL (x, z, y), dividido por engineScale.
 */
export function getBoundObjectSizeLolFromObject3D(
  root: Object3D,
  engineScale: number,
): [number, number, number] {
  const scale = Math.max(engineScale, 1e-9)
  _box.setFromObject(root)
  if (_box.isEmpty()) return DEFAULT_BOUND_SIZE_LOL

  _box.getSize(_size)
  if (_size.x <= 0 && _size.y <= 0 && _size.z <= 0) return DEFAULT_BOUND_SIZE_LOL

  return [_size.x / scale, _size.z / scale, _size.y / scale]
}
