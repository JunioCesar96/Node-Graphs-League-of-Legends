import { describe, expect, it } from 'vitest'

import { decodeTexBytesToRgba } from './lolTexDecode'

function buildBgra8Tex(width: number, height: number, fill: [number, number, number, number]): File {
  const header = new Uint8Array(12)
  const view = new DataView(header.buffer)
  view.setUint32(0, 0x00584554, true)
  view.setUint16(4, width, true)
  view.setUint16(6, height, true)
  view.setUint8(8, 0)
  view.setUint8(9, 20)
  view.setUint8(10, 0)
  view.setUint8(11, 0)

  const pixels = new Uint8Array(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    const offset = i * 4
    pixels[offset] = fill[2]
    pixels[offset + 1] = fill[1]
    pixels[offset + 2] = fill[0]
    pixels[offset + 3] = fill[3]
  }

  const bytes = new Uint8Array(header.length + pixels.length)
  bytes.set(header, 0)
  bytes.set(pixels, header.length)
  return bytes
}

import { mipLevelCount } from './lolTexDecode'

describe('lolTexDecode', () => {
  it('decodes BGRA8 .tex bytes to RGBA', () => {
    const bytes = buildBgra8Tex(4, 4, [10, 20, 30, 255])
    const decoded = decodeTexBytesToRgba(bytes)
    expect(decoded).not.toBeNull()
    expect(decoded?.width).toBe(4)
    expect(decoded?.height).toBe(4)
    expect(decoded?.rgba[0]).toBe(10)
    expect(decoded?.rgba[1]).toBe(20)
    expect(decoded?.rgba[2]).toBe(30)
    expect(decoded?.rgba[3]).toBe(255)
  })

  it('calcula mips como pyRitoFile', () => {
    expect(mipLevelCount(512, 512)).toBe(10)
    expect(mipLevelCount(4, 4)).toBe(3)
  })
})
