import type { SlashCommandDocument } from '@/core/slashCommandTypes'

/** Normaliza códigos de locale (ex.: `pt-BR` → `pt-br`). */
export function normalizeSlashCommandLocale(locale: string): string {
  return locale.trim().toLowerCase()
}

/**
 * Comandos sem `locale` são universais (ex.: nomes de blocos técnicos).
 * Com `locale` definido, só aparecem quando o idioma activo coincide.
 */
export function matchesSlashCommandLocale(
  document: SlashCommandDocument,
  activeLocale: string,
): boolean {
  const documentLocale = document.locale?.trim()
  if (!documentLocale) {
    return true
  }

  return normalizeSlashCommandLocale(documentLocale) === normalizeSlashCommandLocale(activeLocale)
}

export function filterSlashCommandsByLocale(
  commands: readonly SlashCommandDocument[],
  activeLocale: string,
): SlashCommandDocument[] {
  return commands.filter((entry) => matchesSlashCommandLocale(entry, activeLocale))
}
