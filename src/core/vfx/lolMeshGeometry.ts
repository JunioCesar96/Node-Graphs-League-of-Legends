import { BufferAttribute, BufferGeometry } from 'three'

import type { ParsedLolMesh } from './lolMeshParse'

const PLATE_THIN_RATIO = 0.25

type MeshAxis = 'x' | 'y' | 'z'

function pickAxis(extentX: number, extentY: number, extentZ: number, pickLargest: boolean): MeshAxis {
  const axes: Array<{ axis: MeshAxis; extent: number }> = [
    { axis: 'x', extent: extentX },
    { axis: 'y', extent: extentY },
    { axis: 'z', extent: extentZ },
  ]
  const target = pickLargest
    ? Math.max(extentX, extentY, extentZ)
    : Math.min(extentX, extentY, extentZ)
  const relTol = Math.max(target * 0.02, 1e-5)
  const tied = axes.filter((entry) => Math.abs(entry.extent - target) <= relTol)

  if (pickLargest) {
    if (tied.length === 1) return tied[0]!.axis
    // Bbox ambíguo (ex. funil + disco): priorizar X→Y como eixo a alinhar em +Z
    if (tied.some((entry) => entry.axis === 'x')) return 'x'
    if (tied.some((entry) => entry.axis === 'y')) return 'y'
    return 'z'
  }

  if (tied.some((entry) => entry.axis === 'z')) return 'z'
  axes.sort((left, right) => left.extent - right.extent)
  return axes[0]!.axis
}

/** Eixo com maior dispersão de vértices (melhor que bbox em malhas assimétricas). */
function principalVarianceAxis(geometry: BufferGeometry): MeshAxis {
  const position = geometry.getAttribute('position')
  if (!position || position.count === 0) return 'z'

  const count = position.count
  let cx = 0
  let cy = 0
  let cz = 0
  for (let i = 0; i < count; i++) {
    cx += position.getX(i)
    cy += position.getY(i)
    cz += position.getZ(i)
  }
  cx /= count
  cy /= count
  cz /= count

  let vx = 0
  let vy = 0
  let vz = 0
  for (let i = 0; i < count; i++) {
    const dx = position.getX(i) - cx
    const dy = position.getY(i) - cy
    const dz = position.getZ(i) - cz
    vx += dx * dx
    vy += dy * dy
    vz += dz * dz
  }

  if (vx >= vy && vx >= vz) return 'x'
  if (vy >= vx && vy >= vz) return 'y'
  return 'z'
}

/** Malha alongada: eixo longo → +Z Three. */
function rotateElongatedAxisToZ(geometry: BufferGeometry, from: MeshAxis): BufferGeometry {
  if (from === 'z') return geometry
  const oriented = geometry.clone()
  if (from === 'y') {
    oriented.rotateX(Math.PI / 2)
  } else {
    oriented.rotateY(-Math.PI / 2)
  }
  oriented.computeBoundingBox()
  oriented.computeVertexNormals()
  return oriented
}

/** Placa fina: eixo fino → +Z (normal ao chão), igual `orientGroundGeometryToXYPlane`. */
function rotatePlateThinAxisToZ(geometry: BufferGeometry, from: MeshAxis): BufferGeometry {
  if (from === 'z') return geometry
  const oriented = geometry.clone()
  if (from === 'y') {
    oriented.rotateX(-Math.PI / 2)
  } else if (from === 'x') {
    oriented.rotateX(Math.PI / 2)
  }
  oriented.computeBoundingBox()
  oriented.computeVertexNormals()
  return oriented
}

/**
 * Qualquer .scb/.sco: eixo longo em +Z Three (LoL Y); placas finas com normal +Z.
 * Não usar em .skn (personagem) nem no chão (`vfxGround`).
 */
export function orientLoadedMeshAlongZ(geometry: BufferGeometry): BufferGeometry {
  geometry.computeBoundingBox()
  const box = geometry.boundingBox
  if (!box) return geometry

  const extentX = box.max.x - box.min.x
  const extentY = box.max.y - box.min.y
  const extentZ = box.max.z - box.min.z
  const sorted = [extentX, extentY, extentZ].sort((left, right) => left - right)
  const minExtent = sorted[0]!
  const midExtent = sorted[1]!
  /** Placa: um eixo fino; cilindro (secção compacta) não é placa. */
  const isPlate = minExtent / Math.max(midExtent, 1e-6) < PLATE_THIN_RATIO

  const currentAxis = isPlate
    ? pickAxis(extentX, extentY, extentZ, false)
    : principalVarianceAxis(geometry)

  if (currentAxis === 'z') return geometry

  if (isPlate) {
    return rotatePlateThinAxisToZ(geometry, currentAxis)
  }

  let oriented = rotateElongatedAxisToZ(geometry, currentAxis)

  oriented.computeBoundingBox()
  const ob = oriented.boundingBox
  if (ob) {
    const oz = ob.max.z - ob.min.z
    const ox = ob.max.x - ob.min.x
    const oy = ob.max.y - ob.min.y
    if (oz + 1e-5 < Math.max(ox, oy)) {
      oriented.dispose()
      const fallback: MeshAxis = ox >= oy ? 'x' : 'y'
      oriented = rotateElongatedAxisToZ(geometry, fallback)
    }
  }

  return oriented
}

/** Converte mesh LoL para BufferGeometry (expande vértices por face para UVs correctos). */
export function parsedMeshToBufferGeometry(mesh: ParsedLolMesh): BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let f = 0; f < mesh.indices.length; f += 3) {
    const baseVertex = positions.length / 3
    const uvBase = f

    for (let corner = 0; corner < 3; corner++) {
      const vertexIndex = mesh.indices[f + corner]!
      const vertex = mesh.vertices[vertexIndex]
      if (!vertex) continue
      positions.push(vertex[0], vertex[1], vertex[2])

      const uv = mesh.uvs[uvBase + corner] ?? [0, 0]
      uvs.push(uv[0], 1 - uv[1])
    }

    indices.push(baseVertex, baseVertex + 1, baseVertex + 2)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.name = mesh.name
  return geometry
}

/** Entrada única para assets `.scb` / `.sco` (sempre alinhados a +Z). */
export function parsedScbScoToBufferGeometry(mesh: ParsedLolMesh): BufferGeometry {
  return orientLoadedMeshAlongZ(parsedMeshToBufferGeometry(mesh))
}
