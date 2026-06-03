/** Amostragem CPU de cor dominante em texturas (pixels com alpha / luminância). */

import type { RgbaColor } from '@/core/rgbaColor'

import {
  composeEmitterDisplayRgba,
  normalizeVec4Tuple,
  type VfxRgbaTuple,
  vfxRgbaToRgbaColor,
} from './vfxColor'

export type TextureColorSampleOptions = {
  alphaThreshold?: number
  luminanceThreshold?: number
  /** Grelha N×N de UVs em [0,1] (default 3). */
  gridSize?: number
}

const DEFAULT_ALPHA_THRESHOLD = 8 / 255
const DEFAULT_LUMINANCE_THRESHOLD = 0.02

function hasVisibleColor(r: number, g: number, b: number, a: number, options: TextureColorSampleOptions): boolean {
  if (a < (options.alphaThreshold ?? DEFAULT_ALPHA_THRESHOLD)) return false
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance >= (options.luminanceThreshold ?? DEFAULT_LUMINANCE_THRESHOLD)
}

/** Média ponderada por alpha a partir de ImageData. */
export function sampleDominantRgbaFromImageData(
  data: ImageData,
  options: TextureColorSampleOptions = {},
): VfxRgbaTuple | null {
  const pixels = data.data
  let sumR = 0
  let sumG = 0
  let sumB = 0
  let weight = 0

  for (let index = 0; index < pixels.length; index += 4) {
    const r = pixels[index]! / 255
    const g = pixels[index + 1]! / 255
    const b = pixels[index + 2]! / 255
    const a = pixels[index + 3]! / 255
    if (!hasVisibleColor(r, g, b, a, options)) continue
    const w = a
    sumR += r * w
    sumG += g * w
    sumB += b * w
    weight += w
  }

  if (weight <= 0) return null
  return normalizeVec4Tuple([sumR / weight, sumG / weight, sumB / weight, weight / (data.width * data.height)])
}

export async function sampleDominantRgbaFromImageUrl(
  url: string,
  options: TextureColorSampleOptions = {},
): Promise<VfxRgbaTuple | null> {
  if (!url.trim()) return null

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load texture for color sample'))
    img.src = url
  })

  const size = Math.min(64, Math.max(image.naturalWidth, image.naturalHeight, 1))
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  context.drawImage(image, 0, 0, size, size)
  const imageData = context.getImageData(0, 0, size, size)
  return sampleDominantRgbaFromImageData(imageData, options)
}

/** Amostra UV central (ou grelha) numa textura já carregada. */
export function sampleRgbaFromImageAtUv(
  image: HTMLImageElement | ImageBitmap,
  u: number,
  v: number,
  options: TextureColorSampleOptions = {},
): VfxRgbaTuple | null {
  const canvas = document.createElement('canvas')
  canvas.width = 1
  canvas.height = 1
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return null

  const w = 'naturalWidth' in image ? image.naturalWidth : image.width
  const h = 'naturalHeight' in image ? image.naturalHeight : image.height
  const sx = Math.min(w - 1, Math.max(0, Math.floor(u * w)))
  const sy = Math.min(h - 1, Math.max(0, Math.floor(v * h)))

  context.drawImage(image, sx, sy, 1, 1, 0, 0, 1, 1)
  const data = context.getImageData(0, 0, 1, 1)
  const r = data.data[0]! / 255
  const g = data.data[1]! / 255
  const b = data.data[2]! / 255
  const a = data.data[3]! / 255
  if (!hasVisibleColor(r, g, b, a, options)) return null
  return [r, g, b, a]
}

export async function estimateTextureColorsFromUrls(input: {
  textureUrl?: string | null
  colorTextureUrl?: string | null
  paletteTextureUrl?: string | null
  multTextureUrl?: string | null
  options?: TextureColorSampleOptions
}): Promise<{
  mainTexRgba: VfxRgbaTuple | null
  colorTexRgba: VfxRgbaTuple | null
  paletteRgba: VfxRgbaTuple | null
  multRgba: VfxRgbaTuple | null
}> {
  const options = input.options ?? {}
  const gridSize = options.gridSize ?? 3

  const sampleUrl = async (url: string | null | undefined): Promise<VfxRgbaTuple | null> => {
    if (!url?.trim()) return null
    try {
      const dominant = await sampleDominantRgbaFromImageUrl(url, options)
      if (dominant) return dominant

      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('load failed'))
        img.src = url
      })

      const samples: VfxRgbaTuple[] = []
      for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
          const u = (gx + 0.5) / gridSize
          const v = (gy + 0.5) / gridSize
          const sample = sampleRgbaFromImageAtUv(image, u, v, options)
          if (sample) samples.push(sample)
        }
      }
      if (!samples.length) return null

      const avg: VfxRgbaTuple = [0, 0, 0, 0]
      for (const sample of samples) {
        avg[0] += sample[0]
        avg[1] += sample[1]
        avg[2] += sample[2]
        avg[3] += sample[3]
      }
      const count = samples.length
      return normalizeVec4Tuple([avg[0] / count, avg[1] / count, avg[2] / count, avg[3] / count])
    } catch {
      return null
    }
  }

  const [mainTexRgba, colorTexRgba, paletteRgba, multRgba] = await Promise.all([
    sampleUrl(input.textureUrl),
    sampleUrl(input.colorTextureUrl),
    sampleUrl(input.paletteTextureUrl),
    sampleUrl(input.multTextureUrl),
  ])

  return { mainTexRgba, colorTexRgba, paletteRgba, multRgba }
}

export function estimateEmitterDisplayColor(input: {
  embedRgba: VfxRgbaTuple
  mainTexRgba?: VfxRgbaTuple | null
  colorTexRgba?: VfxRgbaTuple | null
  paletteRgba?: VfxRgbaTuple | null
  multRgba?: VfxRgbaTuple | null
  isAdditive?: boolean
}): RgbaColor {
  return vfxRgbaToRgbaColor(
    composeEmitterDisplayRgba({
      embedRgba: input.embedRgba,
      mainTexRgba: input.mainTexRgba,
      colorTexRgba: input.colorTexRgba,
      paletteRgba: input.paletteRgba,
      multRgba: input.multRgba,
      isAdditive: input.isAdditive,
    }),
  )
}
