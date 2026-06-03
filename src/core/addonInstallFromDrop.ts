import type { AddonManifest } from '@/services/addonLoader.service'
import { normalizeAddonManifest, validateAddonManifest } from '@/services/addonLoader.service'

const ADDON_INSTALL_ENDPOINT = '/api/addons-install'
const ADDON_INSTALL_AVAILABLE_ENDPOINT = '/api/addons-install-available'

const TEXT_FILE_PATTERN = /\.(json|html|js|css|md|txt|svg)$/i

export type DroppedAddonFile = {
  relativePath: string
  file: File
}

export type AddonInstallProgress = {
  phase: 'reading' | 'validating' | 'uploading' | 'finalizing'
  progress: number
  addonName?: string
  message?: string
}

export type AddonInstallResult =
  | { ok: true; manifest: AddonManifest }
  | { ok: false; error: string }

function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = []

    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries)
            return
          }
          entries.push(...batch)
          readBatch()
        },
        (error) => reject(error),
      )
    }

    readBatch()
  })
}

function entryToFile(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject)
  })
}

async function readDirectoryEntry(
  dirEntry: FileSystemDirectoryEntry,
  prefix = '',
): Promise<DroppedAddonFile[]> {
  const entries = await readAllDirectoryEntries(dirEntry.createReader())
  const files: DroppedAddonFile[] = []

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await entryToFile(entry as FileSystemFileEntry)
      files.push({ relativePath: `${prefix}${entry.name}`, file })
      continue
    }

    if (entry.isDirectory) {
      const nested = await readDirectoryEntry(entry as FileSystemDirectoryEntry, `${prefix}${entry.name}/`)
      files.push(...nested)
    }
  }

  return files
}

export async function readDroppedAddonFolder(dataTransfer: DataTransfer): Promise<DroppedAddonFile[]> {
  const items = [...dataTransfer.items]
  const directoryEntries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemDirectoryEntry => Boolean(entry?.isDirectory))

  if (directoryEntries.length !== 1) {
    throw new Error('Arraste apenas uma pasta de add-on.')
  }

  return readDirectoryEntry(directoryEntries[0]!)
}

async function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text()
  }
  const buffer = await file.arrayBuffer()
  return new TextDecoder().decode(buffer)
}

async function readLanguagePackFromFile(file: File): Promise<Record<string, string>> {
  try {
    const raw = JSON.parse(await readFileAsText(file)) as unknown
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      return {}
    }

    const pack: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') {
        pack[key] = value
      }
    }
    return pack
  } catch {
    return {}
  }
}

export async function resolveDroppedAddonDisplayName(
  manifest: AddonManifest,
  files: DroppedAddonFile[],
  locale = 'pt',
): Promise<string> {
  const rawName = manifest.name.trim()
  const match = rawName.match(/^\[\{(\d+)\}\]$/) ?? rawName.match(/^\{(\d+)\}$/)
  if (!match?.[1]) {
    return rawName
  }

  const localeCandidates = [locale, locale.slice(0, 2), 'pt', 'en']
  for (const candidate of localeCandidates) {
    const langFile = files.find(
      (file) => file.relativePath.replace(/\\/g, '/') === `language/${candidate}.json`,
    )
    if (!langFile) {
      continue
    }
    const pack = await readLanguagePackFromFile(langFile.file)
    const resolved = pack[match[1]]
    if (resolved) {
      return resolved
    }
  }

  return manifest.id
}

async function fileToInstallPayloadEntry(
  file: DroppedAddonFile,
): Promise<{ path: string; content: string; binary?: boolean }> {
  const relativePath = file.relativePath.replace(/\\/g, '/')
  if (TEXT_FILE_PATTERN.test(relativePath)) {
    return {
      path: relativePath,
      content: await file.file.text(),
      binary: false,
    }
  }

  const buffer = await file.file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]!)
  }

  return {
    path: relativePath,
    content: btoa(binary),
    binary: true,
  }
}

export async function isAddonInstallAvailable(): Promise<boolean> {
  try {
    const response = await fetch(ADDON_INSTALL_AVAILABLE_ENDPOINT, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      return false
    }
    const payload: unknown = await response.json().catch(() => null)
    return typeof payload === 'object' && payload !== null && Reflect.get(payload, 'ok') === true
  } catch {
    return false
  }
}

export async function installDroppedAddonFiles(
  files: DroppedAddonFile[],
  onProgress?: (progress: AddonInstallProgress) => void,
): Promise<AddonInstallResult> {
  onProgress?.({ phase: 'validating', progress: 28, message: 'A procurar manifest.json…' })

  const manifestEntry = files.find((file) => file.relativePath.replace(/\\/g, '/') === 'manifest.json')
  if (!manifestEntry) {
    return { ok: false, error: 'manifest.json não encontrado na raiz do add-on.' }
  }

  let manifestRaw: unknown
  try {
    manifestRaw = JSON.parse(await manifestEntry.file.text()) as unknown
  } catch {
    return { ok: false, error: 'manifest.json inválido.' }
  }

  if (!validateAddonManifest(manifestRaw)) {
    return { ok: false, error: 'manifest.json não cumpre o schema de add-on.' }
  }

  const manifest = normalizeAddonManifest(manifestRaw)
  const addonName = await resolveDroppedAddonDisplayName(manifest, files)

  onProgress?.({
    phase: 'uploading',
    progress: 40,
    addonName,
    message: 'A instalar…',
  })

  const payloadFiles = []
  for (let index = 0; index < files.length; index += 1) {
    payloadFiles.push(await fileToInstallPayloadEntry(files[index]!))
    const uploadProgress = 40 + Math.round(((index + 1) / files.length) * 45)
    onProgress?.({
      phase: 'uploading',
      progress: uploadProgress,
      addonName,
      message: 'A instalar…',
    })
  }

  onProgress?.({ phase: 'finalizing', progress: 92, addonName, message: 'A finalizar…' })

  const response = await fetch(ADDON_INSTALL_ENDPOINT, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files: payloadFiles }),
  })

  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error =
      typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
        ? String(Reflect.get(payload, 'error'))
        : 'Falha ao instalar add-on.'
    return { ok: false, error }
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    Reflect.get(payload, 'ok') !== true ||
    !validateAddonManifest(Reflect.get(payload, 'manifest'))
  ) {
    return { ok: false, error: 'Resposta inválida do servidor.' }
  }

  onProgress?.({ phase: 'finalizing', progress: 100, addonName, message: 'Instalado com sucesso.' })

  return {
    ok: true,
    manifest: normalizeAddonManifest(Reflect.get(payload, 'manifest')),
  }
}

export async function installAddonFromDataTransfer(
  dataTransfer: DataTransfer,
  onProgress?: (progress: AddonInstallProgress) => void,
): Promise<AddonInstallResult> {
  onProgress?.({ phase: 'reading', progress: 8, message: 'A ler pasta…' })
  const files = await readDroppedAddonFolder(dataTransfer)
  onProgress?.({ phase: 'reading', progress: 22, message: 'A ler pasta…' })
  return installDroppedAddonFiles(files, onProgress)
}
