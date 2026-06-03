/** Parser SKN — port de Aventurine import_skn.read_skn */

import { LolBinaryStream } from './lolBinaryStream'
import { sknPositionToThree } from './lolCoords'
import type { ParsedLolMesh } from './lolMeshParse'

export type ParsedLolSknVertex = {
  position: [number, number, number]
  influences: [number, number, number, number]
  weights: [number, number, number, number]
  uv: [number, number]
}

export type ParsedLolSkn = ParsedLolMesh & {
  verticesSkn: ParsedLolSknVertex[]
  submeshNames: string[]
}

const SKN_MAGIC = 0x00112233

export function parseSknBytes(bytes: Uint8Array): ParsedLolSkn | null {
  const bs = LolBinaryStream.fromBuffer(bytes)
  const magic = bs.readUint32() as number
  if (magic !== SKN_MAGIC) return null

  const major = bs.readUint16() as number
  const minor = bs.readUint16() as number

  const submeshes: Array<{
    name: string
    vertexStart: number
    vertexCount: number
    indexStart: number
    indexCount: number
  }> = []

  let indexCount = 0
  let vertexCount = 0
  let vertexType = 0

  if (major === 0) {
    indexCount = bs.readUint32() as number
    vertexCount = bs.readUint32() as number
    submeshes.push({
      name: 'Base',
      vertexStart: 0,
      vertexCount,
      indexStart: 0,
      indexCount,
    })
  } else {
    const submeshCount = bs.readUint32() as number
    for (let i = 0; i < submeshCount; i++) {
      submeshes.push({
        name: bs.readPaddedAscii(64) || `Submesh_${i}`,
        vertexStart: bs.readUint32() as number,
        vertexCount: bs.readUint32() as number,
        indexStart: bs.readUint32() as number,
        indexCount: bs.readUint32() as number,
      })
    }
    if (major >= 4) bs.skip(4)
    indexCount = bs.readUint32() as number
    vertexCount = bs.readUint32() as number
    if (major >= 4) {
      bs.skip(4)
      vertexType = bs.readUint32() as number
      bs.skip(40)
    }
  }

  const indices: number[] = []
  const faceCount = Math.floor(indexCount / 3)
  for (let i = 0; i < faceCount; i++) {
    const face = bs.readUint16(3) as number[]
    if (face[0] === face[1] || face[1] === face[2] || face[2] === face[0]) continue
    indices.push(face[0]!, face[1]!, face[2]!)
  }

  const verticesSkn: ParsedLolSknVertex[] = []
  const vertices: Array<[number, number, number]> = []
  const uvs: Array<[number, number]> = []

  for (let i = 0; i < vertexCount; i++) {
    const pos = bs.readVec3()
    const influences = bs.readBytes(4)
    const weights = bs.readFloat(4) as number[]
    bs.skip(12)
    const uv = bs.readVec2()

    if (vertexType >= 1) bs.skip(4)
    if (vertexType === 2) bs.skip(16)

    const position = sknPositionToThree(pos[0], pos[1], pos[2])
    verticesSkn.push({
      position,
      influences: [influences[0]!, influences[1]!, influences[2]!, influences[3]!],
      weights: [weights[0]!, weights[1]!, weights[2]!, weights[3]!],
      uv,
    })
    vertices.push(position)
  }

  for (let f = 0; f < indices.length; f += 3) {
    const i0 = indices[f]!
    const i1 = indices[f + 1]!
    const i2 = indices[f + 2]!
    uvs.push(verticesSkn[i0]?.uv ?? [0, 0], verticesSkn[i1]?.uv ?? [0, 0], verticesSkn[i2]?.uv ?? [0, 0])
  }

  if (!vertices.length || !indices.length) return null

  return {
    name: 'skn_mesh',
    vertices,
    indices,
    uvs,
    material: submeshes[0]?.name ?? 'lambert1',
    central: [0, 0, 0],
    verticesSkn,
    submeshNames: submeshes.map((sub) => sub.name),
  }
}

export function isSknFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.skn')
}
