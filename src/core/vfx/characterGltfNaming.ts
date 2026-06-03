/** Nomenclatura de ficheiros GLB de personagem — sem prefixo gltf_. */

export function safeGltfBaseName(name: string): string {
  const cleaned = String(name || 'model')
    .toLowerCase()
    .replace(/[^\w\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return cleaned.slice(0, 64) || 'model'
}

/** Campeão "Aatrox" → "aatrox" */
export function championToGltfBaseName(champion: string): string {
  return safeGltfBaseName(champion.trim())
}

export function gltfFileName(champion: string): string {
  return `${championToGltfBaseName(champion)}.glb`
}

/** Reconhece GLB legado com prefixo gltf_ (ex.: gltf_aatrox.glb → aatrox). */
export function normalizeConvertedBaseName(baseName: string): string {
  return String(baseName).replace(/^gltf_/i, '')
}

/** Verifica se o baseName corresponde ao campeão (com ou sem prefixo legado). */
export function baseNameMatchesChampion(baseName: string, champion: string): boolean {
  const championBase = championToGltfBaseName(champion)
  const normalized = normalizeConvertedBaseName(baseName)
  return normalized === championBase || baseName === championBase
}
