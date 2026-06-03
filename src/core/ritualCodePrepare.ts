import { MAP_ENTRY_HEAD_REGEX, STRUCT_ONLY_LINE } from '@/core/classGroupFieldClassifier'
import { collectChildLinks } from '@/core/codeToCanvasScene'
import {
  findParsedSchemaInRegistry,
  MAIN_SCHEMA_ID,
  normalizeStandaloneClassGroupRitual,
  parseClassGroupRitualWithStack,
  type ClassGroupStackParseResult,
  type MutableClassGroupSchema,
} from '@/core/classGroupRitualStackParser'

export type PrepareClassGroupRitualParseResult =
  | { ok: true; parse: ClassGroupStackParseResult }
  | { ok: false; error: string }

/** Parse Class Group normalizado — pipeline partilhado por Neeko e block build. */
export function prepareClassGroupRitualParse(source: string): PrepareClassGroupRitualParseResult {
  const text = source.replace(/\r\n/g, '\n').trim()

  if (text.length === 0) {
    return { ok: false, error: 'Texto ritual vazio.' }
  }

  const parse = parseClassGroupRitualWithStack(normalizeStandaloneClassGroupRitual(text))
  if (parse.registry.size === 0) {
    return { ok: false, error: 'Nenhum schema gerado a partir do ritual.' }
  }

  return { ok: true, parse }
}

function inferStandaloneRootTypeTitle(source: string): string | null {
  for (const line of source.replace(/\r\n/g, '\n').split('\n')) {
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue
    }

    const mapEntry = MAP_ENTRY_HEAD_REGEX.exec(trimmed)
    if (mapEntry?.[3]) {
      return mapEntry[3]!
    }

    const structOnly = STRUCT_ONLY_LINE.exec(trimmed)
    if (structOnly?.[1]) {
      return structOnly[1]!
    }

    break
  }

  return null
}

function findRootParsedIdByTypeTitle(
  registry: Map<string, MutableClassGroupSchema>,
  candidateIds: readonly string[],
  typeTitle: string,
): string | null {
  for (const id of candidateIds) {
    const schema = registry.get(id)
    if (schema?.title === typeTitle) {
      return id
    }
  }

  for (const id of candidateIds) {
    if (id === typeTitle || id.startsWith(`${typeTitle}__`)) {
      return id
    }
  }

  const titleLower = typeTitle.toLowerCase()
  for (const id of candidateIds) {
    const schema = registry.get(id)
    if (schema?.title.toLowerCase() === titleLower) {
      return id
    }
  }

  return null
}

/** Raiz para Neeko: em Main usa a 1.ª entrada do mapa, não o nó Main. */
export function resolveNeekoRootParsedId(
  registry: Map<string, MutableClassGroupSchema>,
  rootSchemaIds: ReadonlySet<string>,
  options?: { sourceText?: string },
): { rootParsedId: string; warnings: string[] } | { error: string } {
  const roots = [...rootSchemaIds]
  const warnings: string[] = []

  if (roots.length === 0) {
    return { error: 'Nenhum tipo raiz encontrado no ritual.' }
  }

  const nonMain = roots.filter((id) => id !== MAIN_SCHEMA_ID)

  if (roots.length === 1 && roots[0] !== MAIN_SCHEMA_ID) {
    return { rootParsedId: roots[0]!, warnings }
  }

  if (roots.includes(MAIN_SCHEMA_ID)) {
    const main = registry.get(MAIN_SCHEMA_ID)
    if (!main) {
      return { error: 'Schema main ausente no parse.' }
    }
    const links = collectChildLinks(main)
    if (links.length === 0) {
      return { error: 'Ritual com entries: map sem entradas para transformar.' }
    }
    if (links.length > 1) {
      warnings.push(
        `Várias entradas em main; a usar a primeira («${links[0]!.childParsedId}»).`,
      )
    }
    return { rootParsedId: links[0]!.childParsedId, warnings }
  }

  if (nonMain.length > 0) {
    const inferredTitle = options?.sourceText
      ? inferStandaloneRootTypeTitle(options.sourceText)
      : null

    if (inferredTitle && nonMain.length > 1) {
      const matched = findRootParsedIdByTypeTitle(registry, nonMain, inferredTitle)
      if (matched) {
        warnings.push(`Vários tipos raiz; a usar «${matched}» (tipo inferido do ritual).`)
        return { rootParsedId: matched, warnings }
      }
    }

    if (nonMain.length > 1) {
      warnings.push(`Vários tipos raiz; a usar «${nonMain[0]!}».`)
    }
    return { rootParsedId: nonMain[0]!, warnings }
  }

  return { rootParsedId: roots[0]!, warnings }
}

/** Raiz para block build: mantém Main quando existe (subárvore completa de entries). */
export function resolveBlockBuildRootSchema(
  parse: ClassGroupStackParseResult,
  preferredBlockName?: string,
): MutableClassGroupSchema | null {
  const preferred = preferredBlockName?.trim()
  if (preferred) {
    return findParsedSchemaInRegistry(parse.registry, preferred) ?? null
  }

  const main = parse.registry.get(MAIN_SCHEMA_ID)
  if (main && parse.rootSchemaIds.has(MAIN_SCHEMA_ID)) {
    return main
  }

  const resolved = resolveNeekoRootParsedId(parse.registry, parse.rootSchemaIds)
  if ('error' in resolved) {
    for (const rootId of parse.rootSchemaIds) {
      const schema = parse.registry.get(rootId)
      if (schema) {
        return schema
      }
    }
    return parse.registry.values().next().value ?? null
  }

  return parse.registry.get(resolved.rootParsedId) ?? null
}
