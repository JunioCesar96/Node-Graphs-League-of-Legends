import { championFilePrefix, inferSkinFolderFromRelativePath, SKIN_FOLDER_ORDER } from './vfxCharacterAssets'
import { championToGltfBaseName } from './characterGltfNaming'

const CONVERT_URL = '/api/character-gltf/convert'

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}

function filePathLower(file: File): string {
  const relative = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name
  return relative.replace(/\\/g, '/').toLowerCase()
}

function pickSknFile(files: File[], champion: string): File | null {
  const prefix = championFilePrefix(champion)
  const needle = `characters/${prefix}/`
  for (const skin of SKIN_FOLDER_ORDER) {
    const skinNeedle = `${needle}${skin.toLowerCase()}/`
    const hit = files.find(
      (file) => filePathLower(file).includes(skinNeedle) && file.name.toLowerCase().endsWith('.skn'),
    )
    if (hit) return hit
  }
  return (
    files.find(
      (file) => filePathLower(file).includes(needle) && file.name.toLowerCase().endsWith('.skn'),
    ) ?? null
  )
}

function pickSklFile(files: File[], champion: string, sknFile: File | null): File | null {
  if (sknFile) {
    const sknPath = filePathLower(sknFile)
    const sklPath = sknPath.replace(/\.skn$/i, '.skl')
    const sameDir = files.find((file) => filePathLower(file) === sklPath)
    if (sameDir) return sameDir
  }
  const prefix = championFilePrefix(champion)
  return (
    files.find(
      (file) =>
        filePathLower(file).includes(`characters/${prefix}/`) &&
        file.name.toLowerCase().endsWith('.skl'),
    ) ?? null
  )
}

/** Só .anm dentro de `characters/{campeao}/{skin}/animations/` (mesma skin do SKN). */
export function pickAnmFiles(files: File[], champion: string, sknFile: File | null): File[] {
  const skinFolder = sknFile ? inferSkinFolderFromRelativePath(filePathLower(sknFile)) : null
  if (!skinFolder) return []

  const prefix = championFilePrefix(champion)
  const animsNeedle = `characters/${prefix}/${skinFolder.toLowerCase()}/animations/`

  return files
    .filter((file) => {
      const path = filePathLower(file)
      return path.includes(animsNeedle) && file.name.toLowerCase().endsWith('.anm')
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }))
}

function pickTextureFile(files: File[], champion: string, sknFile: File | null): File | null {
  const prefix = championFilePrefix(champion)
  const skinFolder = sknFile ? inferSkinFolderFromRelativePath(filePathLower(sknFile)) : null
  const skinNeedle = skinFolder ? `${skinFolder.toLowerCase()}/` : ''
  const baseNeedle = `${prefix}_base_tx_cm`
  const hits = files.filter((file) => {
    const lower = file.name.toLowerCase()
    const path = filePathLower(file)
    if (!path.includes(`characters/${prefix}/`)) return false
    if (skinNeedle && !path.includes(skinNeedle)) return false
    return lower.endsWith('.tex') || lower.endsWith('.dds')
  })
  return (
    hits.find((file) => file.name.toLowerCase().includes(baseNeedle)) ??
    hits.find((file) => file.name.toLowerCase().includes(`${prefix}loadscreen`)) ??
    hits[0] ??
    null
  )
}

export type CharacterGltfConvertResult = {
  baseName: string
  animCount: number
  tool?: string
}

export async function convertCharacterToGltf(
  champion: string,
  files: File[],
): Promise<CharacterGltfConvertResult> {
  const sknFile = pickSknFile(files, champion)
  const sklFile = pickSklFile(files, champion, sknFile)
  const anmFiles = pickAnmFiles(files, champion, sknFile)
  const textureFile = pickTextureFile(files, champion, sknFile)

  if (!sknFile || !sklFile) {
    throw new Error(`SKN/SKL de «${champion}» não encontrados nos ficheiros indexados.`)
  }
  if (anmFiles.length === 0) {
    const skin = inferSkinFolderFromRelativePath(filePathLower(sknFile))
    const animFolder = skin
      ? `characters/${championFilePrefix(champion)}/${skin.toLowerCase()}/animations`
      : 'characters/{campeao}/skins/base/animations'
    throw new Error(`Nenhum .anm em «${animFolder}» — confirme a pasta de animações.`)
  }

  const sknBuffer = await sknFile.arrayBuffer()
  const sklBuffer = await sklFile.arrayBuffer()
  const anmEntries = await Promise.all(
    anmFiles.map(async (file) => ({
      name: file.name,
      data: bufferToBase64(await file.arrayBuffer()),
    })),
  )

  const payload: Record<string, unknown> = {
    champion,
    baseName: championToGltfBaseName(champion),
    skn: bufferToBase64(sknBuffer),
    skl: bufferToBase64(sklBuffer),
    sknName: sknFile.name,
    sklName: sklFile.name,
    anmFiles: anmEntries,
  }

  if (textureFile) {
    payload.texture = {
      name: textureFile.name,
      data: bufferToBase64(await textureFile.arrayBuffer()),
    }
  }

  const res = await fetch(CONVERT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = (await res.json()) as {
    error?: string
    code?: string
    baseName?: string
    animCount?: number
    tool?: string
  }

  if (!res.ok) {
    throw new Error(data.error || `Conversão falhou (${res.status}).`)
  }

  return {
    baseName: data.baseName ?? championToGltfBaseName(champion),
    animCount: data.animCount ?? anmEntries.length,
    tool: data.tool,
  }
}
