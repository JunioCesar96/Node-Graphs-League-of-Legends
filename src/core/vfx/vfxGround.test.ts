import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  normalizeGroundGeometryToUnitSquare,
  orientGroundGeometryToXYPlane,
  parseGroundScbBytes,
} from './vfxGround'
import { parseScbBytes } from './lolMeshParse'
import { parsedMeshToBufferGeometry } from './lolMeshGeometry'

const groundScbPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../assets/ground/screen.scb',
)

describe('vfxGround', () => {
  it('parseia screen.scb embutido com geometria válida', () => {
    const bytes = readFileSync(groundScbPath)
    const geometry = parseGroundScbBytes(new Uint8Array(bytes))
    expect(geometry).not.toBeNull()
    expect(geometry!.getAttribute('position').count).toBeGreaterThan(0)
    expect(geometry!.getAttribute('uv').count).toBeGreaterThan(0)
    geometry!.dispose()
  })

  it('parseGroundScbBytes: bbox XY ~1×1 após normalizar', () => {
    const bytes = readFileSync(groundScbPath)
    const geometry = parseGroundScbBytes(new Uint8Array(bytes))
    expect(geometry).not.toBeNull()
    geometry!.computeBoundingBox()
    const box = geometry!.boundingBox!
    const extentX = box.max.x - box.min.x
    const extentY = box.max.y - box.min.y
    expect(extentX).toBeCloseTo(1, 3)
    expect(extentY).toBeCloseTo(1, 3)
    geometry!.dispose()
  })

  it('parseGroundScbBytes: plano horizontal (eixo Z fino) — mesh.rotation 0,0,0', () => {
    const bytes = readFileSync(groundScbPath)
    const geometry = parseGroundScbBytes(new Uint8Array(bytes))
    expect(geometry).not.toBeNull()
    geometry!.computeBoundingBox()
    const box = geometry!.boundingBox!
    const extentX = box.max.x - box.min.x
    const extentY = box.max.y - box.min.y
    const extentZ = box.max.z - box.min.z
    expect(extentZ).toBeLessThan(Math.min(extentX, extentY) * 0.5)
    geometry!.dispose()
  })

  it('orientGroundGeometryToXYPlane: malha fina em Y vira plano XY', () => {
    const bytes = readFileSync(groundScbPath)
    const mesh = parseScbBytes(new Uint8Array(bytes))
    expect(mesh).not.toBeNull()
    const raw = parsedMeshToBufferGeometry(mesh!)
    const oriented = orientGroundGeometryToXYPlane(raw)
    oriented.computeBoundingBox()
    const box = oriented.boundingBox!
    const extentX = box.max.x - box.min.x
    const extentY = box.max.y - box.min.y
    const extentZ = box.max.z - box.min.z
    expect(extentZ).toBeLessThan(Math.min(extentX, extentY) * 0.5)
    raw.dispose()
    oriented.dispose()
  })
})
