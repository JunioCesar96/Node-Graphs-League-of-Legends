import type {
  InternalStructureDefinition,
  NodeDataType,
  NodeParameterDefinition,
  NodeSchemaDefinition,
  NodeStructureNomenclature,
} from './nodeSchema'

const NODE_DATA_TYPES: ReadonlySet<string> = new Set<NodeDataType>([
  'keyword',
  'string',
  'comment',
  'property',
  'symbol',
  'integer',
  'float',
  'double',
  'vector2',
  'vector3',
  'vector4',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseParameter(raw: unknown): NodeParameterDefinition | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : null
  const name = typeof raw.name === 'string' ? raw.name : null
  const defaultValue =
    typeof raw.defaultValue === 'string' ? raw.defaultValue : null
  const typ = typeof raw.type === 'string' ? raw.type : null

  if (!id || !name || defaultValue === null || !typ || !NODE_DATA_TYPES.has(typ)) {
    return null
  }

  return {
    id,
    name,
    type: typ as NodeDataType,
    defaultValue,
  }
}

function parseNomenclature(raw: unknown): NodeStructureNomenclature | undefined {
  if (!isRecord(raw)) {
    return undefined
  }
  const group = typeof raw.group === 'string' ? raw.group : null
  const collection = typeof raw.collection === 'string' ? raw.collection : null
  const collectionType = typeof raw.collectionType === 'string' ? raw.collectionType : null

  if (!group || !collection || !collectionType) {
    return undefined
  }

  return { group, collection, collectionType }
}

function parseInternalStructure(raw: unknown): InternalStructureDefinition | null {
  if (!isRecord(raw)) {
    return null
  }
  const id = typeof raw.id === 'string' ? raw.id : null
  const name = typeof raw.name === 'string' ? raw.name : null
  const schemaId = typeof raw.schemaId === 'string' ? raw.schemaId : null

  if (!id || !name || !schemaId) {
    return null
  }

  return { id, name, schemaId }
}

function readInternalStructuresArray(raw: Record<string, unknown>): unknown[] | null {
  if (Array.isArray(raw.internalStructures)) {
    return raw.internalStructures
  }
  if (Array.isArray(raw.entities)) {
    return raw.entities
  }
  return null
}

/** Interpreta um ficheiro JSON de estruturas (ex.: `src/nodeStructures/default/`) como `NodeSchemaDefinition`. */
export function nodeSchemaFromStructureJson(raw: unknown): NodeSchemaDefinition | null {
  if (!isRecord(raw)) {
    return null
  }

  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null
  }

  const structuresRaw = readInternalStructuresArray(raw)
  if (!Array.isArray(raw.parameters) || !structuresRaw) {
    return null
  }

  const parameters: NodeParameterDefinition[] = []
  for (const entry of raw.parameters) {
    const p = parseParameter(entry)
    if (!p) {
      return null
    }
    parameters.push(p)
  }

  const internalStructures: InternalStructureDefinition[] = []
  for (const entry of structuresRaw) {
    const s = parseInternalStructure(entry)
    if (!s) {
      return null
    }
    internalStructures.push(s)
  }

  const nomenclature = parseNomenclature(raw.nomenclature)

  const result: NodeSchemaDefinition = {
    id: raw.id,
    title: raw.title,
    parameters,
    internalStructures,
  }

  if (nomenclature) {
    result.nomenclature = nomenclature
  }

  return result
}
