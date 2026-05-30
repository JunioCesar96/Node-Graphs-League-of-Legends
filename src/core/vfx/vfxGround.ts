import type { BufferGeometry } from 'three'

import groundScbUrl from '@/assets/ground/screen.scb?url'
import floorPngUrl from '@/assets/ground/floor.png'

import { parsedMeshToBufferGeometry } from './lolMeshGeometry'
import { parseScbBytes } from './lolMeshParse'

/** Espessura visual do chão no eixo Z (cima LoL). */
export const VFX_GROUND_MESH_THICKNESS = 0.01

/**
 * Tamanho mundial (Three) por 1.0 em `groundScale2d` (malha base 1×1 em XY).
 * `groundScale2d` [11, 11] → chão 11×11 no plano.
 */
export const GROUND_SCALE2D_WORLD_UNIT = 1

export const VFX_GROUND_SCB_URL = groundScbUrl
export const VFX_GROUND_TEXTURE_URL = floorPngUrl

/** Incrementar quando a pipeline de orientação/normalização mudar (invalida cache em memória). */
const GROUND_GEOMETRY_CACHE_VERSION = 5

let cachedGeometry: BufferGeometry | null = null
let cachedVersion = 0
let loadPromise: Promise<BufferGeometry> | null = null

export function parseGroundScbBytes(bytes: Uint8Array): BufferGeometry | null {
  const mesh = parseScbBytes(bytes)
  if (!mesh) return null
  return normalizeGroundGeometryToUnitSquare(
    orientGroundGeometryToXYPlane(parsedMeshToBufferGeometry(mesh)),
  )
}

/**
 * Centra no XY e escala para bbox 1×1 — `groundScale2d` passa a ser tamanho mundial proporcional.
 * Sem isto, `screen.scb` tem extensões LoL muito diferentes em X/Y e 2×2 no menu não forma quadrado.
 */
export function normalizeGroundGeometryToUnitSquare(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return geometry

  const cx = (box.min.x + box.max.x) * 0.5
  const cy = (box.min.y + box.max.y) * 0.5
  const cz = (box.min.z + box.max.z) * 0.5
  const extentX = Math.max(box.max.x - box.min.x, 1e-6)
  const extentY = Math.max(box.max.y - box.min.y, 1e-6)
  const extentZ = Math.max(box.max.z - box.min.z, 1e-6)
  const scaleZ =
    extentZ > VFX_GROUND_MESH_THICKNESS ? VFX_GROUND_MESH_THICKNESS / extentZ : 1

  const normalized = geometry.clone()
  normalized.translate(-cx, -cy, -cz)
  normalized.scale(1 / extentX, 1 / extentY, scaleZ)
  normalized.computeBoundingBox()
  normalized.computeVertexNormals()
  return normalized
}

const GROUND_PLANE_THIN_RATIO = 0.25

/** Placa fina: menor eixo ≪ maior (evita “fino” relativo com centenas de unidades em Z). */
function groundPlateAxis(
  extentX: number,
  extentY: number,
  extentZ: number,
): 'x' | 'y' | 'z' | null {
  const min = Math.min(extentX, extentY, extentZ)
  const max = Math.max(extentX, extentY, extentZ, 1e-6)
  if (min / max >= GROUND_PLANE_THIN_RATIO) return null
  if (min === extentZ) return 'z'
  if (min === extentY) return 'y'
  if (min === extentX) return 'x'
  return null
}

/**
 * Garante plano horizontal XY (normal +Z). Rotação do mesh no R3F fica (0,0,0).
 */
export function orientGroundGeometryToXYPlane(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return geometry

  const extentX = box.max.x - box.min.x
  const extentY = box.max.y - box.min.y
  const extentZ = box.max.z - box.min.z
  const plate = groundPlateAxis(extentX, extentY, extentZ)

  if (plate === 'z') {
    return geometry
  }

  const oriented = geometry.clone()
  if (plate === 'y') {
    oriented.rotateX(-Math.PI / 2)
  } else if (plate === 'x') {
    oriented.rotateX(Math.PI / 2)
  }
  oriented.computeVertexNormals()
  return oriented
}

export function loadVfxGroundGeometry(): Promise<BufferGeometry> {
  if (cachedGeometry && cachedVersion === GROUND_GEOMETRY_CACHE_VERSION) {
    return Promise.resolve(cachedGeometry)
  }
  if (cachedGeometry) {
    cachedGeometry.dispose()
    cachedGeometry = null
    loadPromise = null
  }

  if (!loadPromise) {
    loadPromise = fetch(VFX_GROUND_SCB_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Falha ao carregar ground SCB (${response.status})`)
        }
        const buffer = await response.arrayBuffer()
        const geometry = parseGroundScbBytes(new Uint8Array(buffer))
        if (!geometry) {
          throw new Error('screen.scb inválido ou não reconhecido')
        }
        cachedGeometry = geometry
        cachedVersion = GROUND_GEOMETRY_CACHE_VERSION
        return geometry
      })
      .catch((error) => {
        loadPromise = null
        throw error
      })
  }

  return loadPromise
}

/** Limpa cache (útil em testes). */
export function resetVfxGroundGeometryCache(): void {
  cachedGeometry?.dispose()
  cachedGeometry = null
  cachedVersion = 0
  loadPromise = null
}
