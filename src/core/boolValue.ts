/** Valor bool persistido como `true` ou `false` (minúsculas). */
export function parseBoolString(raw: string): boolean {
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'true' || normalized === '1') {
    return true
  }
  return false
}

export function formatBoolString(value: boolean): string {
  return value ? 'true' : 'false'
}

export function normalizeBoolString(raw: string): string {
  return formatBoolString(parseBoolString(raw))
}

export function isValidPartialBoolValue(value: string): boolean {
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return true
  }
  if (normalized === 'true' || normalized === 'false') {
    return true
  }
  return 'true'.startsWith(normalized) || 'false'.startsWith(normalized)
}
