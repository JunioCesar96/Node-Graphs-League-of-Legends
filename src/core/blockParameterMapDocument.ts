import type { BlockParameterJsonDocumentMap } from './blockParameterJson'
import { buildBlockParameterDocumentId } from './blockParameterJson'
import { parseMapHashEmbedString } from './mapHashEmbedValue'
import { parseMapHashPointerString } from './mapHashPointerValue'
import { parseMapU64PointerString } from './mapU64PointerValue'
import type { MapHashStructureEntry } from './mapHashStructureValue'

export type MapParameterJsonEntry = { key: string; target: string }

export type BuildMapParameterJsonDocumentInput = {
  blockName: string
  parameterName: string
  /** Nome de exibição; por omissão usa `parameterName`. */
  name?: string
  parameterId: string
  mapKind: 'mapHashPointer' | 'mapHashEmbed' | 'mapU64Pointer'
  rawValue: string
}

function mapHashStructureEntryTarget(entry: MapHashStructureEntry): string {
  return (entry.typeName || entry.schemaId || '').trim()
}

export function buildMapParameterEntriesFromRaw(
  mapKind: BuildMapParameterJsonDocumentInput['mapKind'],
  rawValue: string,
): MapParameterJsonEntry[] {
  const parse =
    mapKind === 'mapHashEmbed'
      ? parseMapHashEmbedString
      : mapKind === 'mapU64Pointer'
        ? parseMapU64PointerString
        : parseMapHashPointerString

  return parse(rawValue)
    .map((entry) => ({
      key: entry.key.trim(),
      target: mapHashStructureEntryTarget(entry),
    }))
    .filter((entry) => entry.key.length > 0 && entry.target.length > 0)
}

/** Gera documento JSON de parâmetro map[hash,*] com `entries: [{ key, target }]`. */
export function buildMapParameterJsonDocument(
  input: BuildMapParameterJsonDocumentInput,
): BlockParameterJsonDocumentMap {
  const parameterName = input.parameterName.trim()
  const name = (input.name ?? parameterName).trim()
  const entries = buildMapParameterEntriesFromRaw(input.mapKind, input.rawValue)
  const classTargets = [...new Set(entries.map((entry) => entry.target))]

  return {
    id: buildBlockParameterDocumentId(parameterName, `${parameterName}_${input.mapKind}`),
    block: input.blockName.trim(),
    parameterName,
    name,
    source: {
      kind: 'parameter',
      parameterId: input.parameterId.trim(),
    },
    type: input.mapKind,
    mapKind: input.mapKind,
    entries,
    slots: {
      out: classTargets.length > 0 ? classTargets : [input.mapKind],
    },
  }
}

export function mapParameterEntryTargets(
  doc: Pick<BlockParameterJsonDocumentMap, 'entries'>,
): string[] {
  return [...new Set(doc.entries.map((entry) => entry.target.trim()).filter(Boolean))]
}
