import {
  baseNameMatchesChampion,
  championToGltfBaseName,
  gltfFileName,
} from './characterGltfNaming'

export type CharacterGltfModelEntry = {
  baseName: string
  format: string
}

export type CharacterGltfListResponse = {
  models: CharacterGltfModelEntry[]
  count: number
}

const LIST_URL = '/api/character-gltf/list'
const HEALTH_URL = '/api/character-gltf/health'

export function getGltfUrl(champion: string): string {
  return `/api/character-gltf/${encodeURIComponent(gltfFileName(champion))}`
}

export async function fetchCharacterGltfHealth(): Promise<{
  ok: boolean
  lol2gltf?: { available: boolean; installHint?: string }
}> {
  try {
    const res = await fetch(HEALTH_URL)
    if (!res.ok) return { ok: false }
    return (await res.json()) as { ok: boolean; lol2gltf?: { available: boolean; installHint?: string } }
  } catch {
    return { ok: false }
  }
}

export async function fetchConvertedModels(): Promise<CharacterGltfModelEntry[]> {
  try {
    const res = await fetch(LIST_URL)
    if (!res.ok) throw new Error('Não foi possível listar character-gltf (use pnpm dev).')
    const data = (await res.json()) as CharacterGltfListResponse
    return (data.models ?? []).slice().sort((a, b) =>
      a.baseName.localeCompare(b.baseName, undefined, { numeric: true, sensitivity: 'base' }),
    )
  } catch {
    return []
  }
}

export function isChampionConverted(
  champion: string,
  models: readonly CharacterGltfModelEntry[],
): boolean {
  return models.some((entry) => baseNameMatchesChampion(entry.baseName, champion))
}

export function buildConvertedBaseNameSet(models: readonly CharacterGltfModelEntry[]): Set<string> {
  const set = new Set<string>()
  for (const entry of models) {
    set.add(entry.baseName.toLowerCase())
    set.add(championToGltfBaseName(entry.baseName.replace(/^gltf_/i, '')))
  }
  return set
}

export function isChampionInConvertedSet(champion: string, convertedSet: Set<string>): boolean {
  const base = championToGltfBaseName(champion)
  if (convertedSet.has(base)) return true
  if (convertedSet.has(`gltf_${base}`)) return true
  return [...convertedSet].some((name) => baseNameMatchesChampion(name, champion))
}

export function findModelForChampion(
  champion: string,
  models: readonly CharacterGltfModelEntry[],
): CharacterGltfModelEntry | null {
  return models.find((entry) => baseNameMatchesChampion(entry.baseName, champion)) ?? null
}
