import { describe, expect, it } from 'vitest'

import { estimateEmitterDisplayColor, sampleDominantRgbaFromImageData } from './vfxTextureColorSample'

function makeImageData(width: number, height: number, fill?: (pixels: Uint8ClampedArray) => void): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  fill?.(data)
  return { width, height, data } as ImageData
}

describe('sampleDominantRgbaFromImageData', () => {
  it('ignora pixels transparentes e calcula média ponderada', () => {
    const data = makeImageData(2, 2, (pixels) => {
      // visible red at (1,1)
      pixels[12] = 255
      pixels[13] = 0
      pixels[14] = 0
      pixels[15] = 255
    })

    const result = sampleDominantRgbaFromImageData(data)
    expect(result).not.toBeNull()
    expect(result![0]).toBeCloseTo(1, 2)
    expect(result![1]).toBeCloseTo(0, 2)
    expect(result![2]).toBeCloseTo(0, 2)
  })

  it('retorna null sem cor visível', () => {
    const data = makeImageData(1, 1)
    expect(sampleDominantRgbaFromImageData(data)).toBeNull()
  })
})

describe('estimateEmitterDisplayColor', () => {
  it('combina embed com textura de cor', () => {
    const color = estimateEmitterDisplayColor({
      embedRgba: [0.847, 0.847, 0.847, 1],
      mainTexRgba: [1, 1, 1, 1],
      colorTexRgba: [0.2, 0.4, 0.9, 1],
    })
    expect(color.r).toBeCloseTo(0.2 * 0.847, 3)
    expect(color.g).toBeCloseTo(0.4 * 0.847, 3)
    expect(color.b).toBeCloseTo(0.9 * 0.847, 3)
  })
})
