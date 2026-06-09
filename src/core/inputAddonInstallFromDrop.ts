import {
  readDroppedAddonFolder,
  type AddonInstallProgress,
  type DroppedAddonFile,
} from '@/core/addonInstallFromDrop'
import { resolveAddonI18nText } from '@/core/addonLanguage'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'
import {
  normalizeInputAddonManifest,
  validateInputAddonManifest,
} from '@/services/inputAddonLoader.service'

const INPUT_ADDON_INSTALL_ENDPOINT = '/api/input-addons-install'
const INPUT_ADDON_INSTALL_AVAILABLE_ENDPOINT = '/api/input-addons-install-available'

const TEXT_FILE_PATTERN = /\.(json|html|js|css|md|txt|svg)$/i

export type InputAddonInstallResult =
  | { ok: true; manifest: InputAddonManifest }
  | { ok: false; error: string }

async function readLanguagePackFromFile(file: File): Promise<Record<string, string>> {
  try {
    const raw = JSON.parse(await file.text()) as unknown
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

async function resolveDroppedInputAddonDisplayName(
  manifest: InputAddonManifest,
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

export async function isInputAddonInstallAvailable(): Promise<boolean> {
  try {
    const response = await fetch(INPUT_ADDON_INSTALL_AVAILABLE_ENDPOINT, {
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

export async function installDroppedInputAddonFiles(
  files: DroppedAddonFile[],
  onProgress?: (progress: AddonInstallProgress) => void,
): Promise<InputAddonInstallResult> {
  onProgress?.({ phase: 'validating', progress: 28, message: 'A procurar manifest.json…' })

  const manifestEntry = files.find((file) => file.relativePath.replace(/\\/g, '/') === 'manifest.json')
  if (!manifestEntry) {
    return { ok: false, error: 'manifest.json não encontrado na raiz do input add-on.' }
  }

  let manifestRaw: unknown
  try {
    manifestRaw = JSON.parse(await manifestEntry.file.text()) as unknown
  } catch {
    return { ok: false, error: 'manifest.json inválido.' }
  }

  if (!validateInputAddonManifest(manifestRaw)) {
    return { ok: false, error: 'manifest.json não cumpre o schema de input add-on.' }
  }

  const manifest = normalizeInputAddonManifest(manifestRaw)
  const addonName = await resolveDroppedInputAddonDisplayName(manifest, files)

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

  const response = await fetch(INPUT_ADDON_INSTALL_ENDPOINT, {
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
        : 'Falha ao instalar input add-on.'
    return { ok: false, error }
  }

  if (
    typeof payload !== 'object' ||
    payload === null ||
    Reflect.get(payload, 'ok') !== true ||
    !validateInputAddonManifest(Reflect.get(payload, 'manifest'))
  ) {
    return { ok: false, error: 'Resposta inválida do servidor.' }
  }

  onProgress?.({ phase: 'finalizing', progress: 100, addonName, message: 'Instalado com sucesso.' })

  return {
    ok: true,
    manifest: normalizeInputAddonManifest(Reflect.get(payload, 'manifest')),
  }
}

export async function installInputAddonFromDataTransfer(
  dataTransfer: DataTransfer,
  onProgress?: (progress: AddonInstallProgress) => void,
): Promise<InputAddonInstallResult> {
  onProgress?.({ phase: 'reading', progress: 8, message: 'A ler pasta…' })
  const files = await readDroppedAddonFolder(dataTransfer)
  onProgress?.({ phase: 'reading', progress: 22, message: 'A ler pasta…' })
  return installDroppedInputAddonFiles(files, onProgress)
}

export function resolveInputAddonDisplayName(
  manifest: InputAddonManifest,
  languagePack: Record<string, string>,
): string {
  return resolveAddonI18nText(manifest.name, languagePack) || manifest.id
}
