const STORAGE_PREFIX = 'inputAddonPref:'

export function buildInputAddonPreferenceKey(
  block: string,
  parameter: string,
  paramType: string,
): string {
  return `${STORAGE_PREFIX}${block.trim()}:${parameter.trim()}:${paramType.trim()}`
}

export function readInputAddonPreference(key: string): string | undefined {
  if (typeof localStorage === 'undefined') {
    return undefined
  }
  try {
    const value = localStorage.getItem(key)
    return value?.trim() || undefined
  } catch {
    return undefined
  }
}

export function writeInputAddonPreference(key: string, inputAddonId: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(key, inputAddonId.trim())
  } catch {
    /* ignore quota errors */
  }
}

export function clearInputAddonPreference(key: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function resolveActiveInputAddonId(
  preferenceKey: string,
  matchIds: readonly string[],
): string | undefined {
  if (matchIds.length === 0) {
    return undefined
  }
  const preferred = readInputAddonPreference(preferenceKey)
  if (preferred && matchIds.includes(preferred)) {
    return preferred
  }
  return matchIds[0]
}
