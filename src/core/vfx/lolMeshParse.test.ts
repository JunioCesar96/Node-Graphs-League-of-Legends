import { describe, expect, it } from 'vitest'

import { parsedMeshToBufferGeometry, parsedScbScoToBufferGeometry } from './lolMeshGeometry'
import { parseScbBytes, parseScoText } from './lolMeshParse'

const SCO_FIXTURE = `[ObjectBegin]
Name=TestMesh
CentralPoint= 0.000000 0.000000 0.000000
PivotPoint= 0.000000 0.000000 0.000000
Verts= 4
0.000000 1.000000 0.000000
1.000000 0.000000 0.000000
0.000000 -1.000000 0.000000
-1.000000 0.000000 0.000000
Faces= 2
4 0 1 2 lambert1 0.000000 0.000000 1.000000 0.000000 0.500000 1.000000
4 0 2 3 lambert1 0.000000 0.000000 0.500000 1.000000 1.000000 1.000000
[ObjectEnd]
`

describe('parseScoText', () => {
  it('lê vértices, faces e UVs', () => {
    const mesh = parseScoText(SCO_FIXTURE)
    expect(mesh).not.toBeNull()
    expect(mesh?.vertices).toHaveLength(4)
    expect(mesh?.indices).toEqual([0, 1, 2, 0, 2, 3])
    expect(mesh?.uvs).toHaveLength(6)
  })

  it('gera BufferGeometry válida', () => {
    const mesh = parseScoText(SCO_FIXTURE)
    expect(mesh).not.toBeNull()
    const geometry = parsedMeshToBufferGeometry(mesh!)
    expect(geometry.getAttribute('position').count).toBeGreaterThan(0)
    expect(geometry.getAttribute('uv').count).toBeGreaterThan(0)
    geometry.dispose()
  })

  it('parsedScbScoToBufferGeometry: placa fina com normal +Z', () => {
    const mesh = parseScoText(SCO_FIXTURE)
    expect(mesh).not.toBeNull()
    const geometry = parsedScbScoToBufferGeometry(mesh!)
    geometry.computeBoundingBox()
    const box = geometry.boundingBox!
    const extentZ = box.max.z - box.min.z
    const extentX = box.max.x - box.min.x
    const extentY = box.max.y - box.min.y
    expect(extentZ).toBeLessThan(extentX)
    expect(extentZ).toBeLessThan(extentY)
    geometry.dispose()
  })
})

function writeAscii(view: DataView, offset: number, text: string, length: number) {
  for (let i = 0; i < length; i++) {
    view.setUint8(offset + i, i < text.length ? text.charCodeAt(i) : 0)
  }
}

function buildMinimalScb(): Uint8Array {
  const vertexCount = 3
  const faceCount = 1
  const headerSize = 12 + 128 + 12 + 24
  const vertexBytes = vertexCount * 12
  const centralBytes = 12
  const faceBytes = 12 + 64 + 24
  const total = headerSize + vertexBytes + centralBytes + faceBytes
  const bytes = new Uint8Array(total)
  const view = new DataView(bytes.buffer)

  writeAscii(view, 0, 'r3d2Mesh', 8)
  view.setUint16(8, 2, true)
  view.setUint16(10, 0, true)
  let offset = 12 + 128
  view.setUint32(offset, vertexCount, true)
  offset += 4
  view.setUint32(offset, faceCount, true)
  offset += 4
  offset += 4
  offset += 24

  const verts: Array<[number, number, number]> = [
    [0, 1, 0],
    [1, 0, 0],
    [0, -1, 0],
  ]
  for (const [x, y, z] of verts) {
    view.setFloat32(offset, x, true)
    view.setFloat32(offset + 4, y, true)
    view.setFloat32(offset + 8, z, true)
    offset += 12
  }

  offset += 12

  view.setUint32(offset, 0, true)
  view.setUint32(offset + 4, 1, true)
  view.setUint32(offset + 8, 2, true)
  offset += 12
  writeAscii(view, offset, 'lambert1', 64)
  offset += 64
  const uvs = [0, 0, 1, 0, 0.5, 1]
  for (let i = 0; i < uvs.length; i++) {
    view.setFloat32(offset + i * 4, uvs[i]!, true)
  }

  return bytes
}

describe('parseScbBytes', () => {
  it('lê mesh SCB mínimo', () => {
    const mesh = parseScbBytes(buildMinimalScb())
    expect(mesh).not.toBeNull()
    expect(mesh?.vertices).toHaveLength(3)
    expect(mesh?.indices).toEqual([0, 1, 2])
    expect(mesh?.uvs).toHaveLength(3)
  })
})
