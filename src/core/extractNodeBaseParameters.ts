import type { NodeDataType, NodeStructureNomenclature } from './nodeSchema'

import { fx_pathHierarchy } from './pathHierarchy'

const NODE_DATA_TYPES: ReadonlySet<string> = new Set<NodeDataType>([
  'keyword',
  'string',
  'comment',
  'property',
  'symbol',
  'integer',
  'i8',
  'u8',
  'i16',
  'u16',
  'i32',
  'u32',
  'i64',
  'u64',
  'f32',
  'float',
  'double',
  'vector2',
  'vector3',
  'vector4',
  'listF32',
  'listString',
  'listHash',
  'listVector2',
  'listVector3',
  'listVector4',
  'rgba',
  'bool',
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
    case 'listf32':
    case 'liststring':
    case 'listhash':
    case 'listvector2':
    case 'listvector3':
    case 'listvector4':
      return ''
    case 'rgba':
      return '1, 1, 1, 1'
    case 'float':
    case 'double':
      return '0'
    case 'integer':
    case 'i8':
    case 'u8':
    case 'i16':
    case 'u16':
    case 'i32':
    case 'u32':
    case 'i64':
    case 'u64':
    case 'f32':
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

/** Copia `nomenclature` para JSON de nó base, incluindo `pathHierarchy` / `pathHierarchySteps`. */
export function cloneNomenclatureForNodeBase(nomenclature: NodeStructureNomenclature): NodeStructureNomenclature {
  const out: NodeStructureNomenclature = {
    group: nomenclature.group,
    collection: nomenclature.collection,
    collectionType: nomenclature.collectionType,
  }
  const pathHierarchyRaw =
    typeof nomenclature.pathHierarchy === 'string' ? nomenclature.pathHierarchy.trim() : ''
  if (pathHierarchyRaw.length > 0) {
    out.pathHierarchy = pathHierarchyRaw
  }
  if (nomenclature.pathHierarchySteps && nomenclature.pathHierarchySteps.length > 0) {
    out.pathHierarchySteps = fx_pathHierarchy(nomenclature.pathHierarchySteps)
  }
  return out
}

export function buildNodeBaseSchemaBody(
  collectionType: string,
  nomenclature: NodeStructureNomenclature,
): NodeBaseSchemaBodyJson {
  return {
    internalStructures: [],
    id: collectionType,
    title: collectionType,
    nomenclature: cloneNomenclatureForNodeBase(nomenclature),
    parameters: [],
  }
}
