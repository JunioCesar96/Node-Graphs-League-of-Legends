/** Índice de ficheiros locais (pasta Game Root) para URLs de preview no browser. */

import {
  assetIndexSize,
  createEmptyAssetIndex,
  ensureAssetsRitualPath,
  registerAssetInIndex,
  registerBasenameInIndex,
  ritualKeyFromRelativePath,
  type VfxAssetFileIndex,
} from './vfxAssetLookup'

export type { VfxAssetFileIndex } from './vfxAssetLookup'
export {
  assetIndexSize,
  createEmptyAssetIndex,
  lookupTextureForRitual,
  lookupTextureUrlForRitual,
  revokeAssetIndex,
} from './vfxAssetLookup'

import {
  decodeTexBytesToRgba,
  decodeTexFileToBlobUrl,
  isTexFileName,
  isWebImageFileName,
  rgbaToPngBlobUrl,
  TEX_FORMAT_NAMES,
} from './lolTexDecode'

type FileEntry = {
  file: File
  relative: string
  ritualKey: string | null
}

function fileExt(path: string): string {
  const dot = path.lastIndexOf('.')
  return dot >= 0 ? path.slice(dot).toLowerCase() : ''
}

function decodeTexHeaderFormat(buffer: ArrayBuffer): number {
  if (buffer.byteLength < 10) return -1
  const view = new DataView(buffer)
  if (view.getUint32(0, true) !== 0x00584554) return -1
  return view.getUint8(9)
}

async function indexTexFile(
  index: VfxAssetFileIndex,
  file: File,
  ritualKey: string | null,
): Promise<'decoded' | 'failed'> {
  const buffer = await file.arrayBuffer()
  const decoded = decodeTexBytesToRgba(new Uint8Array(buffer))
  if (decoded) {
    const url = await rgbaToPngBlobUrl(decoded.rgba, decoded.width, decoded.height)
    if (url) {
      if (ritualKey) registerAssetInIndex(index, ritualKey, url)
      else registerBasenameInIndex(index, file.name, url)
      return 'decoded'
    }
  }
  return 'failed'
}

export async function buildAssetIndexFromFileList(files: FileList | File[]): Promise<{
  index: VfxAssetFileIndex
  rootLabel: string
  warnings: string[]
  texDecoded: number
  imagesLoaded: number
  ddsLoaded: number
  basenameOnly: number
}> {
  const index = createEmptyAssetIndex()
  const warnings: string[] = []
  let rootLabel = 'selected-folder'
  let texDecoded = 0
  let imagesLoaded = 0
  let ddsLoaded = 0
  let basenameOnly = 0

  const entries: FileEntry[] = []
  let orphanCount = 0

  for (const file of files) {
    const relative =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath?.replace(/\\/g, '/') ||
      file.name
    const ritualKey = ritualKeyFromRelativePath(relative)

    if (!ritualKey) orphanCount += 1
    else if (rootLabel === 'selected-folder') {
      rootLabel = relative.split('/')[0] ?? rootLabel
    }

    entries.push({ file, relative, ritualKey })
  }

  const withKey = entries.filter((entry) => entry.ritualKey)
  const orphans = entries.filter((entry) => !entry.ritualKey)

  const texWithKey = withKey.filter((entry) => isTexFileName(entry.file.name))
  const imageWithKey = withKey.filter((entry) => isWebImageFileName(entry.file.name))
  const ddsWithKey = withKey.filter((entry) => fileExt(entry.ritualKey!) === '.dds')

  for (const { ritualKey, file } of imageWithKey) {
    registerAssetInIndex(index, ritualKey!, URL.createObjectURL(file))
    imagesLoaded += 1
  }

  for (const { ritualKey, file } of ddsWithKey) {
    registerAssetInIndex(index, ritualKey!, URL.createObjectURL(file), { isDds: true })
    ddsLoaded += 1
  }

  for (const { ritualKey, file } of texWithKey) {
    if ((await indexTexFile(index, file, ritualKey)) === 'decoded') {
      texDecoded += 1
      continue
    }

    const buffer = await file.arrayBuffer()
    const formatLabel = TEX_FORMAT_NAMES[decodeTexHeaderFormat(buffer)] ?? 'desconhecido'
    warnings.push(`Falha .tex: ${ritualKey} (${formatLabel})`)
  }

  for (const { file } of orphans) {
    const ext = fileExt(file.name)
    if (ext === '.dds') {
      const url = URL.createObjectURL(file)
      registerBasenameInIndex(index, file.name, url, { isDds: true })
      ddsLoaded += 1
      basenameOnly += 1
      continue
    }
    if (isWebImageFileName(file.name)) {
      const url = URL.createObjectURL(file)
      registerBasenameInIndex(index, file.name, url)
      imagesLoaded += 1
      basenameOnly += 1
      continue
    }
    if (isTexFileName(file.name)) {
      if ((await indexTexFile(index, file, null)) === 'decoded') {
        texDecoded += 1
        basenameOnly += 1
      }
    }
  }

  const indexed = assetIndexSize(index)
  const totalFiles = entries.length

  if (!indexed) {
    warnings.unshift(
      `0 texturas indexadas (${totalFiles} ficheiro(s) na pasta). Seleccione a pasta .wad.client, a pasta ASSETS, ou use «Abrir .tex…».`,
    )
  } else {
    const parts: string[] = []
    if (imagesLoaded > 0) parts.push(`${imagesLoaded} img`)
    if (ddsLoaded > 0) parts.push(`${ddsLoaded} dds`)
    if (texDecoded > 0) parts.push(`${texDecoded} tex`)
    if (basenameOnly > 0) parts.push(`${basenameOnly} por nome`)
    let summary = `Índice: ${parts.join(', ')} · ${indexed} URL(s)`
    if (orphanCount > 0 && withKey.length === 0) {
      summary += ' — caminho sem ASSETS/; match pelo nome do ficheiro.'
    }
    warnings.push(summary)
  }

  return { index, rootLabel, warnings, texDecoded, imagesLoaded, ddsLoaded, basenameOnly }
}

export async function indexSingleTextureFile(
  index: VfxAssetFileIndex,
  file: File,
  ritualPathHint: string,
): Promise<{ ok: boolean; warning?: string }> {
  const ritualKey = ritualKeyFromRelativePath(file.name) ?? ensureAssetsRitualPath(ritualPathHint)

  if (isWebImageFileName(file.name)) {
    const url = URL.createObjectURL(file)
    registerAssetInIndex(index, ritualKey, url)
    registerBasenameInIndex(index, file.name, url)
    return { ok: true }
  }

  if (fileExt(file.name) === '.dds') {
    const url = URL.createObjectURL(file)
    registerAssetInIndex(index, ritualKey, url, { isDds: true })
    registerBasenameInIndex(index, file.name, url, { isDds: true })
    return { ok: true }
  }

  if (isTexFileName(file.name)) {
    const url = await decodeTexFileToBlobUrl(file)
    if (url) {
      registerAssetInIndex(index, ritualKey, url)
      registerBasenameInIndex(index, file.name, url)
      return { ok: true }
    }
    return { ok: false, warning: `Não foi possível decodificar ${file.name}` }
  }

  return { ok: false, warning: 'Formato não suportado' }
}
