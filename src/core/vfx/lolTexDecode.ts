/** Decodificador .tex LoL (DXT1 / DXT5 / BGRA8) — alinhado com pyRitoFile / Blender. */



const TEX_SIGNATURE = 0x00584554

const TEX_FORMAT_ETC1 = 1

const TEX_FORMAT_DXT1 = 10

const TEX_FORMAT_DXT5 = 12

const TEX_FORMAT_BGRA8 = 20



export const TEX_FORMAT_NAMES: Record<number, string> = {

  [TEX_FORMAT_ETC1]: 'ETC1',

  [TEX_FORMAT_DXT1]: 'DXT1',

  [TEX_FORMAT_DXT5]: 'DXT5',

  [TEX_FORMAT_BGRA8]: 'BGRA8',

}



const WEB_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tga'])



function unpackRgb565(value: number): [number, number, number] {

  const r = (((value >> 11) & 0x1f) * 255) / 31

  const g = (((value >> 5) & 0x3f) * 255) / 63

  const b = ((value & 0x1f) * 255) / 31

  return [r, g, b]

}



function lerp(a: number, b: number, t: number): number {

  return (a * (255 - t) + b * t) / 255

}



function decodeDxt1Block(block: Uint8Array, alpha = false): Array<[number, number, number, number]> {

  const view = new DataView(block.buffer, block.byteOffset, block.byteLength)

  const c0 = view.getUint16(0, true)

  const c1 = view.getUint16(2, true)

  const bits = view.getUint32(4, true)



  const colors = [...unpackRgb565(c0), 255]

  const colors2 = [...unpackRgb565(c1), 255]



  let palette: Array<[number, number, number, number]>

  if (c0 > c1) {

    palette = [

      colors as [number, number, number, number],

      colors2 as [number, number, number, number],

      [lerp(colors[0], colors2[0], 85), lerp(colors[1], colors2[1], 85), lerp(colors[2], colors2[2], 85), 255],

      [lerp(colors[0], colors2[0], 170), lerp(colors[1], colors2[1], 170), lerp(colors[2], colors2[2], 170), 255],

    ]

  } else {

    palette = [

      colors as [number, number, number, number],

      colors2 as [number, number, number, number],

      [lerp(colors[0], colors2[0], 128), lerp(colors[1], colors2[1], 128), lerp(colors[2], colors2[2], 128), 255],

      [0, 0, 0, alpha ? 0 : 255],

    ]

  }



  const pixels: Array<[number, number, number, number]> = []

  for (let index = 0; index < 16; index++) {

    const code = (bits >> (2 * index)) & 0x3

    pixels.push(palette[code] ?? [255, 0, 255, 255])

  }

  return pixels

}



function decodeDxt5AlphaBlock(block: Uint8Array): number[] {

  const alpha0 = block[0] ?? 0

  const alpha1 = block[1] ?? 0

  let bits = 0n

  for (let i = 2; i < 8; i++) {

    bits |= BigInt(block[i] ?? 0) << BigInt((i - 2) * 8)

  }



  const alphas = [alpha0, alpha1]

  if (alpha0 > alpha1) {

    for (let step = 1; step < 7; step++) {

      alphas.push(Math.floor(((7 - step) * alpha0 + step * alpha1) / 7))

    }

  } else {

    for (let step = 1; step < 5; step++) {

      alphas.push(Math.floor(((5 - step) * alpha0 + step * alpha1) / 5))

    }

    alphas.push(0, 255)

  }



  const result: number[] = []

  for (let index = 0; index < 16; index++) {

    const code = Number((bits >> BigInt(3 * index)) & 0x7n)

    result.push(alphas[code] ?? 255)

  }

  return result

}



function decodeDxt5Block(block: Uint8Array): Array<[number, number, number, number]> {

  const alpha = decodeDxt5AlphaBlock(block.subarray(0, 8))

  const colorPixels = decodeDxt1Block(block.subarray(8, 16), true)

  return colorPixels.map((pixel, index) => [pixel[0], pixel[1], pixel[2], alpha[index] ?? 255])

}



function decodeDxtImage(data: Uint8Array, width: number, height: number, dxt5: boolean): Uint8Array {

  const blockBytes = dxt5 ? 16 : 8

  const blocksX = Math.max(Math.floor((width + 3) / 4), 1)

  const blocksY = Math.max(Math.floor((height + 3) / 4), 1)

  const rgba = new Uint8Array(width * height * 4)

  let offset = 0



  for (let blockY = 0; blockY < blocksY; blockY++) {

    for (let blockX = 0; blockX < blocksX; blockX++) {

      const block = data.subarray(offset, offset + blockBytes)

      offset += blockBytes

      const padded =

        block.length < blockBytes

          ? (() => {

              const next = new Uint8Array(blockBytes)

              next.set(block)

              return next

            })()

          : block

      const pixels = dxt5 ? decodeDxt5Block(padded) : decodeDxt1Block(padded)



      for (let row = 0; row < 4; row++) {

        for (let col = 0; col < 4; col++) {

          const px = blockX * 4 + col

          const py = blockY * 4 + row

          if (px >= width || py >= height) continue

          const pixel = pixels[row * 4 + col] ?? [255, 255, 255, 255]

          const index = (py * width + px) * 4

          rgba[index] = pixel[0]

          rgba[index + 1] = pixel[1]

          rgba[index + 2] = pixel[2]

          rgba[index + 3] = pixel[3]

        }

      }

    }

  }



  return rgba

}



function decodeBgra8(data: Uint8Array, width: number, height: number): Uint8Array {

  const expected = width * height * 4

  const rgba = new Uint8Array(expected)

  const raw = data.subarray(0, expected)

  for (let index = 0; index < raw.length; index += 4) {

    rgba[index] = raw[index + 2] ?? 0

    rgba[index + 1] = raw[index + 1] ?? 0

    rgba[index + 2] = raw[index] ?? 0

    rgba[index + 3] = raw[index + 3] ?? 255

  }

  return rgba

}



/** Contagem de mips igual ao pyRitoFile (tex.py). */

export function mipLevelCount(width: number, height: number): number {

  const maxDim = Math.max(width, height, 1)

  const padded = maxDim.toString(2).padStart(32, '0')

  const firstOne = padded.indexOf('1')

  return firstOne === -1 ? 1 : 32 - firstOne

}



function readMip0Payload(bytes: Uint8Array, width: number, height: number, format: number, mipmaps: boolean): Uint8Array {

  const headerSize = 12

  if (bytes.length <= headerSize) return new Uint8Array()



  if (!mipmaps || format === TEX_FORMAT_ETC1) {

    return bytes.subarray(headerSize)

  }



  if (format !== TEX_FORMAT_DXT1 && format !== TEX_FORMAT_DXT5 && format !== TEX_FORMAT_BGRA8) {

    return bytes.subarray(headerSize)

  }



  const blockSize = format === TEX_FORMAT_BGRA8 ? 1 : 4

  const bytesPerBlock = format === TEX_FORMAT_DXT1 ? 8 : format === TEX_FORMAT_DXT5 ? 16 : 4

  const mipmapCount = mipLevelCount(width, height)

  let offset = headerSize

  const chain: Uint8Array[] = []



  for (let level = mipmapCount - 1; level >= 0; level--) {

    const currentWidth = Math.max(Math.floor(width / (1 << level)), 1)

    const currentHeight = Math.max(Math.floor(height / (1 << level)), 1)

    const blockWidth = Math.floor((currentWidth + blockSize - 1) / blockSize)

    const blockHeight = Math.floor((currentHeight + blockSize - 1) / blockSize)

    const currentSize = bytesPerBlock * blockWidth * blockHeight

    chain.push(bytes.subarray(offset, offset + currentSize))

    offset += currentSize

  }



  return chain.length ? chain[chain.length - 1]! : bytes.subarray(headerSize)

}



export function decodeTexBytesToRgba(bytes: Uint8Array): { width: number; height: number; rgba: Uint8Array; format: number } | null {

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)

  if (view.byteLength < 12) return null

  if (view.getUint32(0, true) !== TEX_SIGNATURE) return null



  const width = view.getUint16(4, true)

  const height = view.getUint16(6, true)

  const format = view.getUint8(9)

  const mipmaps = view.getUint8(11) !== 0



  if (width <= 0 || height <= 0) return null



  const mip0 = readMip0Payload(bytes, width, height, format, mipmaps)

  let rgba: Uint8Array



  if (format === TEX_FORMAT_DXT1) {

    rgba = decodeDxtImage(mip0, width, height, false)

  } else if (format === TEX_FORMAT_DXT5) {

    rgba = decodeDxtImage(mip0, width, height, true)

  } else if (format === TEX_FORMAT_BGRA8) {

    rgba = decodeBgra8(mip0, width, height)

  } else {

    return null

  }



  return { width, height, rgba, format }

}



export async function rgbaToPngBlobUrl(rgba: Uint8Array, width: number, height: number): Promise<string | null> {

  const canvas = document.createElement('canvas')

  canvas.width = width

  canvas.height = height

  const ctx = canvas.getContext('2d')

  if (!ctx) return null



  const clamped = new Uint8ClampedArray(rgba.length)

  clamped.set(rgba)

  const imageData = new ImageData(clamped, width, height)

  ctx.putImageData(imageData, 0, 0)



  const blob = await new Promise<Blob | null>((resolve) => {

    canvas.toBlob((result) => resolve(result), 'image/png')

  })

  if (!blob) return null

  return URL.createObjectURL(blob)

}



export async function decodeTexFileToBlobUrl(file: File): Promise<string | null> {

  try {

    const buffer = await file.arrayBuffer()

    const decoded = decodeTexBytesToRgba(new Uint8Array(buffer))

    if (!decoded) return null

    return rgbaToPngBlobUrl(decoded.rgba, decoded.width, decoded.height)

  } catch {

    return null

  }

}



export function isTexFileName(path: string): boolean {

  return path.toLowerCase().endsWith('.tex')

}



export function isWebImageFileName(path: string): boolean {

  const dot = path.lastIndexOf('.')

  if (dot < 0) return false

  return WEB_IMAGE_EXTENSIONS.has(path.slice(dot).toLowerCase())

}


