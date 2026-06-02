/** Parser SCB (binário) e SCO (texto) — port de Aventurine import_scb / import_sco. */

import { lolMeshToThreeCoords } from './lolCoords'

export type ParsedLolMesh = {
  name: string
  vertices: Array<[number, number, number]>
  indices: number[]
  /** 3 UVs por face (índice linear com indices) */
  uvs: Array<[number, number]>
  material: string
  central: [number, number, number]
}

function lolToThreeCoords(x: number, y: number, z: number): [number, number, number] {
  return lolMeshToThreeCoords(x, y, z)
}

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  return new TextDecoder('ascii').decode(bytes.subarray(offset, offset + length)).replace(/\0/g, '')
}

export function parseScbBytes(bytes: Uint8Array): ParsedLolMesh | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (bytes.byteLength < 8) return null

  const magic = readAscii(bytes, 0, 8)
  if (magic !== 'r3d2Mesh') return null

  const major = view.getUint16(8, true)
  const minor = view.getUint16(10, true)
  if (major !== 2 && major !== 3) return null

  let offset = 12 + 128
  const vertexCount = view.getUint32(offset, true)
  offset += 4
  const faceCount = view.getUint32(offset, true)
  offset += 4
  offset += 4 // scb_flag
  offset += 24 // bbox

  let vertexType = 0
  if (major === 3 && minor === 2) {
    vertexType = view.getUint32(offset, true)
    offset += 4
  }

  const vertices: Array<[number, number, number]> = []
  for (let i = 0; i < vertexCount; i++) {
    const x = view.getFloat32(offset, true)
    const y = view.getFloat32(offset + 4, true)
    const z = view.getFloat32(offset + 8, true)
    offset += 12
    vertices.push(lolToThreeCoords(x, y, z))
  }

  if (vertexType === 1) {
    offset += vertexCount * 4
  }

  const cx = view.getFloat32(offset, true)
  const cy = view.getFloat32(offset + 4, true)
  const cz = view.getFloat32(offset + 8, true)
  offset += 12
  const central = lolToThreeCoords(cx, cy, cz)

  const indices: number[] = []
  const uvs: Array<[number, number]> = []
  let material = 'lambert69'

  for (let face = 0; face < faceCount; face++) {
    const i0 = view.getUint32(offset, true)
    const i1 = view.getUint32(offset + 4, true)
    const i2 = view.getUint32(offset + 8, true)
    offset += 12

    const materialBytes = bytes.subarray(offset, offset + 64)
    offset += 64
    const uvData = [
      view.getFloat32(offset, true),
      view.getFloat32(offset + 4, true),
      view.getFloat32(offset + 8, true),
      view.getFloat32(offset + 12, true),
      view.getFloat32(offset + 16, true),
      view.getFloat32(offset + 20, true),
    ]
    offset += 24

    if (i0 === i1 || i1 === i2 || i2 === i0) continue

    if (face === 0) {
      material = readAscii(materialBytes, 0, materialBytes.length).trim() || material
    }

    indices.push(i0, i1, i2)
    uvs.push([uvData[0], uvData[3]], [uvData[1], uvData[4]], [uvData[2], uvData[5]])
  }

  if (!vertices.length || !indices.length) return null

  const nameOffset = 12
  const name = readAscii(bytes, nameOffset, 128).trim() || 'scb_mesh'

  return { name, vertices, indices, uvs, material, central }
}

export function parseScoText(text: string): ParsedLolMesh | null {
  const lines = text.split(/\r?\n/).map((line) => line.trim())
  if (!lines.length || lines[0] !== '[ObjectBegin]') return null

  const data: ParsedLolMesh = {
    name: 'sco_mesh',
    vertices: [],
    indices: [],
    uvs: [],
    material: 'lambert1',
    central: [0, 0, 0],
  }

  let i = 1
  while (i < lines.length) {
    const line = lines[i] ?? ''
    const parts = line.split(/\s+/).filter(Boolean)

    if (line.startsWith('Name=')) {
      data.name = line.slice('Name='.length).trim()
    } else if (line.startsWith('CentralPoint=') && parts.length >= 4) {
      data.central = lolToThreeCoords(Number(parts[1]), Number(parts[2]), Number(parts[3]))
    } else if (line.startsWith('Verts=') && parts.length >= 2) {
      const count = Number.parseInt(parts[1] ?? '0', 10)
      for (let v = 0; v < count; v++) {
        i += 1
        const vp = (lines[i] ?? '').split(/\s+/).filter(Boolean)
        if (vp.length < 3) continue
        data.vertices.push(lolToThreeCoords(Number(vp[0]), Number(vp[1]), Number(vp[2])))
      }
    } else if (line.startsWith('Faces=') && parts.length >= 2) {
      const count = Number.parseInt(parts[1] ?? '0', 10)
      for (let f = 0; f < count; f++) {
        i += 1
        const fp = (lines[i] ?? '').replace(/\t/g, ' ').split(/\s+/).filter(Boolean)
        if (fp.length < 11) continue

        const idx = [Number.parseInt(fp[1] ?? '0', 10), Number.parseInt(fp[2] ?? '0', 10), Number.parseInt(fp[3] ?? '0', 10)]
        if (idx[0] === idx[1] || idx[1] === idx[2] || idx[0] === idx[2]) continue

        data.indices.push(idx[0]!, idx[1]!, idx[2]!)
        if (f === 0) data.material = fp[4] ?? data.material
        data.uvs.push(
          [Number.parseFloat(fp[5] ?? '0'), Number.parseFloat(fp[6] ?? '0')],
          [Number.parseFloat(fp[7] ?? '0'), Number.parseFloat(fp[8] ?? '0')],
          [Number.parseFloat(fp[9] ?? '0'), Number.parseFloat(fp[10] ?? '0')],
        )
      }
    }

    i += 1
  }

  if (!data.vertices.length || !data.indices.length) return null
  return data
}

export function isScbFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.scb')
}

export function isScoFileName(name: string): boolean {
  return name.toLowerCase().endsWith('.sco')
}

export function isLolMeshFileName(name: string): boolean {
  return isScbFileName(name) || isScoFileName(name) || name.toLowerCase().endsWith('.skn')
}
