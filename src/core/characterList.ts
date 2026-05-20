const CHARACTER_LIST_URL = '/list_characters.json'

let cachedCharacterNames: readonly string[] | null = null
let loadPromise: Promise<readonly string[]> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseCharacterListPayload(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload.filter((entry): entry is string => typeof entry === 'string')
  }

  if (isRecord(payload) && Array.isArray(payload.characters)) {
    return payload.characters.filter((entry): entry is string => typeof entry === 'string')
  }

  return []
}

export async function getCharacterNames(): Promise<readonly string[]> {
  if (cachedCharacterNames) {
    return cachedCharacterNames
  }

  if (!loadPromise) {
    loadPromise = fetch(CHARACTER_LIST_URL)
      .then(async (response) => {
        if (!response.ok) {
          return []
        }
        const payload: unknown = await response.json()
        return parseCharacterListPayload(payload)
      })
      .catch(() => [] as string[])
      .then((names) => {
        cachedCharacterNames = names
        return names
      })
  }

  return loadPromise
}

export function filterCharacterNames(query: string, names: readonly string[]): string[] {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) {
    return [...names]
  }
  return names.filter((name) => name.toLowerCase().includes(trimmed))
}

/** Limpa cache (útil em testes). */
export function resetCharacterNamesCache(): void {
  cachedCharacterNames = null
  loadPromise = null
}
