import type { NodeDataType, NodeStructureNomenclature } from './nodeSchema'

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

/** Valor default para ficheiros «node base» (spec parametros_nodes.md), por `type` normalizado. */
export function defaultValueForNodeBaseType(typeLower: string): string {
  switch (typeLower) {
    case 'vector2':
      return '0,0'
    case 'vector3':
      return '0,0,0'
    case 'vector4':
      return '0,0,0,0'
    case 'float':
    case 'double':
      return '0'
    case 'integer':
      return '0'
    case 'bool':
    case 'boolean':
      return 'false'
    case 'string':
      return ''
    default:
      return ''
  }
}

export function normalizeParameterType(raw: string): string {
  return raw.trim().toLowerCase()
}

export function isKnownStructureParameterType(typeLower: string): boolean {
  return NODE_DATA_TYPES.has(typeLower)
}

/** Id composto: `collectionType_parameterName` (preserva capitalização de `collectionType` e `paramName`). */
export function nodeBaseParameterId(collectionType: string, paramName: string): string {
  return `${collectionType}_${paramName}`
}

export type NodeBaseParameterPayload = {
  id: string
  name: string
  type: string
  defaultValue: string
}

export function buildNodeBaseParameterPayload(
  collectionType: string,
  paramName: string,
  typeRaw: string,
): NodeBaseParameterPayload | null {
  const name = paramName.trim()
  if (!name) {
    return null
  }

  const typeLower = normalizeParameterType(typeRaw)
  if (!typeLower) {
    return null
  }

  return {
    id: nodeBaseParameterId(collectionType, name),
    name,
    type: typeLower,
    defaultValue: defaultValueForNodeBaseType(typeLower),
  }
}

/** Corpo JSON mínimo do nó base por `collectionType` (node_base.md). */
export type NodeBaseSchemaBodyJson = {
  internalStructures: []
  id: string
  title: string
  nomenclature: NodeStructureNomenclature
  parameters: []
}

export function buildNodeBaseSchemaBody(
  collectionType: string,
  nomenclature: NodeStructureNomenclature,
): NodeBaseSchemaBodyJson {
  return {
    internalStructures: [],
    id: collectionType,
    title: collectionType,
    nomenclature: { ...nomenclature },
    parameters: [],
  }
}
