import type {
  NodeDataType,
  NodeEntityDefinition,
  NodeParameterDefinition,
  NodeSchemaDefinition,
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

function parseEntity(raw: unknown): NodeEntityDefinition | null {
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

/** Interpreta um ficheiro JSON de estruturas (ex.: `src/nodeStructures/default/`) como `NodeSchemaDefinition`. */
export function nodeSchemaFromStructureJson(raw: unknown): NodeSchemaDefinition | null {
  if (!isRecord(raw)) {
    return null
  }

  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') {
    return null
  }

  if (!Array.isArray(raw.parameters) || !Array.isArray(raw.entities)) {
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

  const entities: NodeEntityDefinition[] = []
  for (const entry of raw.entities) {
    const e = parseEntity(entry)
    if (!e) {
      return null
    }
    entities.push(e)
  }

  return {
    id: raw.id,
    title: raw.title,
    parameters,
    entities,
  }
}
