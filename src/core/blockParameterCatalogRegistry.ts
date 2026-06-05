import type { BlockParameterJsonDocument } from './blockParameterJson'
import { isSimpleBlockParameterDocument } from './blockParameterJson'
import { validateBlockParameterDocument } from './blockParameterRegistry'

function isMapDocumentWithEntries(doc: BlockParameterJsonDocument): boolean {
  return (
    !isSimpleBlockParameterDocument(doc) &&
    (doc.type === 'mapHashEmbed' || doc.type === 'mapHashPointer' || doc.type === 'mapU64Pointer') &&
    doc.entries.length > 0
  )
}

function pickPreferredParameterDocument(
  docs: readonly BlockParameterJsonDocument[],
): BlockParameterJsonDocument {
  const mapWithEntries = docs.filter(isMapDocumentWithEntries)
  if (mapWithEntries.length > 0) {
    return [...mapWithEntries].sort((a, b) => b.entries.length - a.entries.length || a.id.localeCompare(b.id))[0]!
  }
  return [...docs].sort((a, b) => a.id.localeCompare(b.id))[0]!
}

const modules = import.meta.glob<{ default: unknown }>('../blockStructures/parameters/**/*.json', {
  eager: true,
})

const byBlockAndName = new Map<string, Map<string, BlockParameterJsonDocument[]>>()

for (const [path, mod] of Object.entries(modules)) {
  const normalizedPath = path.replace(/\\/g, '/')
  if (!normalizedPath.includes('/parameters/')) {
    continue
  }
  const validated = validateBlockParameterDocument(mod.default, path)
  if (!validated.ok) {
    console.warn('[blockParameterCatalogRegistry]', validated.errors.join('; '))
    continue
  }
  const doc = validated.value
  const blockKey = doc.block.trim()
  if (!blockKey) {
    continue
  }
  let byName = byBlockAndName.get(blockKey)
  if (!byName) {
    byName = new Map()
    byBlockAndName.set(blockKey, byName)
  }
  const paramKey = doc.parameterName.trim()
  const bucket = byName.get(paramKey) ?? []
  bucket.push(doc)
  byName.set(paramKey, bucket)
}

/** Parâmetros JSON em disco para um tipo de bloco (`parameters/{blockName}/`). */
export function blockParameterCatalogForBlock(blockType: string): readonly BlockParameterJsonDocument[] {
  const byName = byBlockAndName.get(blockType.trim())
  if (!byName) {
    return []
  }
  const all: BlockParameterJsonDocument[] = []
  for (const docs of byName.values()) {
    all.push(...docs)
  }
  all.sort((a, b) => a.id.localeCompare(b.id))
  return all
}

export function blockParameterCatalogByName(
  blockType: string,
  parameterName: string,
): BlockParameterJsonDocument | undefined {
  const docs = byBlockAndName.get(blockType.trim())?.get(parameterName.trim())
  if (!docs || docs.length === 0) {
    return undefined
  }
  return pickPreferredParameterDocument(docs)
}

/** Regista parâmetro após gravação em disco (o glob eager não recarrega sozinho). */
export function registerBlockParameterInCatalog(doc: BlockParameterJsonDocument): void {
  const blockKey = doc.block.trim()
  const paramKey = doc.parameterName.trim()
  if (!blockKey || !paramKey) {
    return
  }
  let byName = byBlockAndName.get(blockKey)
  if (!byName) {
    byName = new Map()
    byBlockAndName.set(blockKey, byName)
  }
  const bucket = byName.get(paramKey) ?? []
  if (!bucket.some((entry) => entry.id === doc.id)) {
    bucket.push(doc)
    byName.set(paramKey, bucket)
  }
}
