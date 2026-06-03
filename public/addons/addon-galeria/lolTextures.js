/**
 * Decodificação .tex (LoL) e .dds (DXT1/DXT5/BGRA8) para object URLs PNG — uso na galeria.
 * Alinhado com src/core/vfx/lolTexDecode.ts
 */

const TEX_SIGNATURE = 0x00584554
const TEX_FORMAT_DXT1 = 10
const TEX_FORMAT_DXT5 = 12
const TEX_FORMAT_BGRA8 = 20

const DDS_MAGIC = 0x20534444
const FOURCC_DXT1 = 0x31545844
const FOURCC_DXT5 = 0x35545844
const FOURCC_DX10 = 0x30315844
const DXGI_BC1_UNORM = 71
const DXGI_BC3_UNORM = 77
const DDPF_RGB = 0x40

const WEB_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp', '.gif', '.tga'])
const GALLERY_TEXTURE_EXTENSIONS = new Set(['.tex', '.dds', '.dss'])

function fileExt(path) {
  const dot = path.lastIndexOf('.')
  return dot < 0 ? '' : path.slice(dot).toLowerCase()
}

export function isGalleryTextureFile(file) {
  const ext = fileExt(file.name)
  if (GALLERY_TEXTURE_EXTENSIONS.has(ext)) return true
  if (WEB_IMAGE_EXTENSIONS.has(ext)) return true
  return file.type.startsWith('image/')
}

/** @param {File | { file?: File, relativePath?: string, absolutePath?: string }} entry */
export function isGalleryTextureEntry(entry) {
  const file = entry instanceof File ? entry : entry?.file
  if (file instanceof File) {
    return isGalleryTextureFile(file)
  }
  const pathHint = entry?.relativePath || entry?.absolutePath || ''
  const ext = fileExt(pathHint)
  if (GALLERY_TEXTURE_EXTENSIONS.has(ext)) return true
  if (WEB_IMAGE_EXTENSIONS.has(ext)) return true
  return false
}

function unpackRgb565(value) {
  const r = (((value >> 11) & 0x1f) * 255) / 31
  const g = (((value >> 5) & 0x3f) * 255) / 63
  const b = ((value & 0x1f) * 255) / 31
  return [r, g, b]
}

function lerp(a, b, t) {
  return (a * (255 - t) + b * t) / 255
}

function decodeDxt1Block(block, alpha = false) {
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength)
  const c0 = view.getUint16(0, true)
  const c1 = view.getUint16(2, true)
  const bits = view.getUint32(4, true)
  const colors = [...unpackRgb565(c0), 255]
  const colors2 = [...unpackRgb565(c1), 255]
  let palette
  if (c0 > c1) {
    palette = [
      colors,
      colors2,
      [lerp(colors[0], colors2[0], 85), lerp(colors[1], colors2[1], 85), lerp(colors[2], colors2[2], 85), 255],
      [lerp(colors[0], colors2[0], 170), lerp(colors[1], colors2[1], 170), lerp(colors[2], colors2[2], 170), 255],
    ]
  } else {
    palette = [
      colors,
      colors2,
      [lerp(colors[0], colors2[0], 128), lerp(colors[1], colors2[1], 128), lerp(colors[2], colors2[2], 128), 255],
      [0, 0, 0, alpha ? 0 : 255],
    ]
  }
  const pixels = []
  for (let index = 0; index < 16; index++) {
    const code = (bits >> (2 * index)) & 0x3
    pixels.push(palette[code] ?? [255, 0, 255, 255])
  }
  return pixels
}

function decodeDxt5AlphaBlock(block) {
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
  const result = []
  for (let index = 0; index < 16; index++) {
    const code = Number((bits >> BigInt(3 * index)) & 0x7n)
    result.push(alphas[code] ?? 255)
  }
  return result
}

function decodeDxt5Block(block) {
  const alpha = decodeDxt5AlphaBlock(block.subarray(0, 8))
  const colorPixels = decodeDxt1Block(block.subarray(8, 16), true)
  return colorPixels.map((pixel, index) => [pixel[0], pixel[1], pixel[2], alpha[index] ?? 255])
}

function decodeDxtImage(data, width, height, dxt5) {
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

function decodeBgra8(data, width, height) {
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

function mipLevelCount(width, height) {
  const maxDim = Math.max(width, height, 1)
  const padded = maxDim.toString(2).padStart(32, '0')
  const firstOne = padded.indexOf('1')
  return firstOne === -1 ? 1 : 32 - firstOne
}

function readMip0Payload(bytes, width, height, format, mipmaps) {
  const headerSize = 12
  if (bytes.length <= headerSize) return new Uint8Array()
  if (!mipmaps || format === 1) {
    return bytes.subarray(headerSize)
  }
  if (format !== TEX_FORMAT_DXT1 && format !== TEX_FORMAT_DXT5 && format !== TEX_FORMAT_BGRA8) {
    return bytes.subarray(headerSize)
  }
  const blockSize = format === TEX_FORMAT_BGRA8 ? 1 : 4
  const bytesPerBlock = format === TEX_FORMAT_DXT1 ? 8 : format === TEX_FORMAT_DXT5 ? 16 : 4
  const mipmapCount = mipLevelCount(width, height)
  let offset = headerSize
  const chain = []
  for (let level = mipmapCount - 1; level >= 0; level--) {
    const currentWidth = Math.max(Math.floor(width / (1 << level)), 1)
    const currentHeight = Math.max(Math.floor(height / (1 << level)), 1)
    const blockWidth = Math.floor((currentWidth + blockSize - 1) / blockSize)
    const blockHeight = Math.floor((currentHeight + blockSize - 1) / blockSize)
    const currentSize = bytesPerBlock * blockWidth * blockHeight
    chain.push(bytes.subarray(offset, offset + currentSize))
    offset += currentSize
  }
  return chain.length ? chain[chain.length - 1] : bytes.subarray(headerSize)
}

export function decodeTexBytesToRgba(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 12) return null
  if (view.getUint32(0, true) !== TEX_SIGNATURE) return null
  const width = view.getUint16(4, true)
  const height = view.getUint16(6, true)
  const format = view.getUint8(9)
  const mipmaps = view.getUint8(11) !== 0
  if (width <= 0 || height <= 0) return null
  const mip0 = readMip0Payload(bytes, width, height, format, mipmaps)
  let rgba
  if (format === TEX_FORMAT_DXT1) {
    rgba = decodeDxtImage(mip0, width, height, false)
  } else if (format === TEX_FORMAT_DXT5) {
    rgba = decodeDxtImage(mip0, width, height, true)
  } else if (format === TEX_FORMAT_BGRA8) {
    rgba = decodeBgra8(mip0, width, height)
  } else {
    return null
  }
  return { width, height, rgba }
}

export function decodeDdsBytesToRgba(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 128) return null
  if (view.getUint32(0, true) !== DDS_MAGIC) return null
  const height = view.getUint32(12, true)
  const width = view.getUint32(16, true)
  if (width <= 0 || height <= 0) return null
  const fourCC = view.getUint32(84, true)
  const pfFlags = view.getUint32(80, true)
  let payloadOffset = 128
  let blockFormat = fourCC
  if (fourCC === FOURCC_DX10) {
    if (view.byteLength < 148) return null
    const dxgi = view.getUint32(128, true)
    if (dxgi === DXGI_BC1_UNORM) blockFormat = FOURCC_DXT1
    else if (dxgi === DXGI_BC3_UNORM) blockFormat = FOURCC_DXT5
    else return null
    payloadOffset = 148
  }
  const payload = bytes.subarray(payloadOffset)
  if (blockFormat === FOURCC_DXT1) {
    return { width, height, rgba: decodeDxtImage(payload, width, height, false) }
  }
  if (blockFormat === FOURCC_DXT5) {
    return { width, height, rgba: decodeDxtImage(payload, width, height, true) }
  }
  if (pfFlags & DDPF_RGB) {
    const bitCount = view.getUint32(88, true)
    if (bitCount === 32) {
      return { width, height, rgba: decodeBgra8(payload, width, height) }
    }
  }
  return null
}

export async function rgbaToPngObjectUrl(rgba, width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const clamped = new Uint8ClampedArray(rgba.length)
  clamped.set(rgba)
  ctx.putImageData(new ImageData(clamped, width, height), 0, 0)
  const blob = await new Promise((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/png')
  })
  if (!blob) return null
  return URL.createObjectURL(blob)
}

export async function decodeGalleryFileToObjectUrl(file) {
  const ext = fileExt(file.name)
  try {
    if (WEB_IMAGE_EXTENSIONS.has(ext) || file.type.startsWith('image/')) {
      return URL.createObjectURL(file)
    }
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let decoded = null
    if (ext === '.tex') {
      decoded = decodeTexBytesToRgba(bytes)
    } else if (ext === '.dds' || ext === '.dss') {
      decoded = decodeDdsBytesToRgba(bytes)
    }
    if (!decoded) return null
    return rgbaToPngObjectUrl(decoded.rgba, decoded.width, decoded.height)
  } catch {
    return null
  }
}

export function revokeObjectUrls(urls) {
  if (!Array.isArray(urls)) return
  for (const url of urls) {
    if (typeof url === 'string' && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
  }
}
