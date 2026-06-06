import {
  parseSlashCommandDocument,
  type SlashCommandDocument,
  type SlashCommandFeature,
} from '@/core/slashCommandTypes'

const registry = new Map<string, SlashCommandDocument>()

function registryKey(feature: SlashCommandFeature, command: string): string {
  return `${feature}::${command.trim().toLowerCase()}`
}

export function registerSlashCommand(document: SlashCommandDocument): void {
  registry.set(registryKey(document.feature, document.command), document)
}

export function unregisterSlashCommand(feature: SlashCommandFeature, command: string): void {
  registry.delete(registryKey(feature, command))
}

export function replaceSlashCommandRegistry(documents: readonly SlashCommandDocument[]): void {
  registry.clear()
  for (const document of documents) {
    registerSlashCommand(document)
  }
}

export function slashCommandByKey(feature: SlashCommandFeature, command: string): SlashCommandDocument | undefined {
  return registry.get(registryKey(feature, command))
}

export function slashCommandsList(feature?: SlashCommandFeature): SlashCommandDocument[] {
  const all = [...registry.values()]
  const filtered = feature ? all.filter((entry) => entry.feature === feature) : all
  return filtered.sort((a, b) => {
    const featureCompare = a.feature.localeCompare(b.feature)
    if (featureCompare !== 0) {
      return featureCompare
    }
    return a.command.localeCompare(b.command)
  })
}

export function matchesSlashCommandQuery(document: SlashCommandDocument, query: string): boolean {
  const trimmed = query.trim()
  const needle = (trimmed.startsWith('/') ? trimmed.slice(1) : trimmed).toLowerCase()
  if (!needle) {
    return true
  }

  const haystack = [
    document.command,
    document.name,
    document.feature,
    document.source.rootBlockName,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle)
}

export function parseSlashCommandsFromRawList(
  rawList: readonly unknown[],
  sourceLabel = 'slash-commands-list',
): SlashCommandDocument[] {
  const documents: SlashCommandDocument[] = []

  for (const raw of rawList) {
    const parsed = parseSlashCommandDocument(raw)
    if (parsed) {
      documents.push(parsed)
      continue
    }
    console.warn(`[slashCommandRegistry] Documento inválido em ${sourceLabel}`)
  }

  return documents
}
