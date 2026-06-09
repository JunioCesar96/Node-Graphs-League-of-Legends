import { listInputAddonManifests } from '@/blockStructures/inputAddonRegistry'
import type { CanvasNode } from '@/core/canvasScene'
import type { NodeDataType } from '@/core/nodeSchema'
import {
  buildInputAddonPreferenceKey,
  resolveActiveInputAddonId,
} from '@/core/inputAddonPreferences'
import type { SceneNodesParameterRow } from '@/core/sceneNodesParametersView'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'

function normalizeBindingKey(value: string): string {
  return value.trim().toLowerCase()
}

export function nodeDataTypeToRitualAddonType(type: NodeDataType): string {
  switch (type) {
    case 'vector4':
      return 'vec4'
    case 'vector3':
      return 'vec3'
    case 'vector2':
      return 'vec2'
    case 'double':
      return 'double'
    case 'f32':
      return 'f32'
    case 'rgba':
      return 'rgba'
    case 'bool':
      return 'bool'
    case 'flag':
      return 'flag'
    case 'string':
      return 'string'
    case 'u8':
    case 'i8':
    case 'u16':
    case 'i16':
    case 'u32':
    case 'i32':
    case 'u64':
    case 'i64':
      return type
    default:
      return type
  }
}

export function resolveParameterBlockName(canvasNode: CanvasNode, kind: SceneNodesParameterRow['kind']): string | undefined {
  if (kind === 'block' && canvasNode.blockStructure) {
    return canvasNode.blockStructure.blockType
  }
  if (kind === 'schema') {
    return canvasNode.node.schema.title
  }
  return undefined
}

export function inputAddonMatchesParameter(
  manifest: InputAddonManifest,
  blockName: string,
  parameterName: string,
  ritualType: string,
): boolean {
  const binding = manifest.input
  return (
    normalizeBindingKey(binding.block) === normalizeBindingKey(blockName) &&
    normalizeBindingKey(binding.parameter) === normalizeBindingKey(parameterName) &&
    normalizeBindingKey(binding.type) === normalizeBindingKey(ritualType)
  )
}

export function findMatchingInputAddons(
  blockName: string,
  parameterName: string,
  ritualType: string,
): InputAddonManifest[] {
  return listInputAddonManifests().filter((manifest) =>
    inputAddonMatchesParameter(manifest, blockName, parameterName, ritualType),
  )
}

export function enrichSceneNodesParameterRowWithInputAddons(
  canvasNode: CanvasNode,
  row: SceneNodesParameterRow,
): SceneNodesParameterRow {
  if (!row.editable || row.kind === 'addon') {
    return row
  }

  const blockName = resolveParameterBlockName(canvasNode, row.kind)
  if (!blockName) {
    return row
  }

  const ritualType = nodeDataTypeToRitualAddonType(row.valueType)
  const matches = findMatchingInputAddons(blockName, row.name, ritualType)
  if (matches.length === 0) {
    return row
  }

  const preferenceKey = buildInputAddonPreferenceKey(blockName, row.name, ritualType)
  const activeInputAddonId = resolveActiveInputAddonId(
    preferenceKey,
    matches.map((manifest) => manifest.id),
  )

  return {
    ...row,
    inputAddonMatches: matches,
    activeInputAddonId,
    inputAddonPreferenceKey: preferenceKey,
  }
}

export function enrichSceneNodesParameterRowsWithInputAddons(
  canvasNode: CanvasNode,
  rows: SceneNodesParameterRow[],
): SceneNodesParameterRow[] {
  return rows.map((row) => enrichSceneNodesParameterRowWithInputAddons(canvasNode, row))
}

export type BlockParameterInputAddonBinding = {
  matches: InputAddonManifest[]
  activeInputAddonId: string
  activeManifest: InputAddonManifest
  preferenceKey: string
}

export function resolveBlockParameterInputAddonBinding(
  blockType: string,
  parameterName: string,
  typeParameter: string,
): BlockParameterInputAddonBinding | null {
  const ritualType = typeParameter.trim()
  if (!ritualType || ritualType.endsWith('{}')) {
    return null
  }

  const matches = findMatchingInputAddons(blockType, parameterName, ritualType)
  if (matches.length === 0) {
    return null
  }

  const preferenceKey = buildInputAddonPreferenceKey(blockType, parameterName, ritualType)
  const activeInputAddonId = resolveActiveInputAddonId(
    preferenceKey,
    matches.map((manifest) => manifest.id),
  )
  if (!activeInputAddonId) {
    return null
  }

  const activeManifest = matches.find((manifest) => manifest.id === activeInputAddonId)
  if (!activeManifest) {
    return null
  }

  return {
    matches,
    activeInputAddonId,
    activeManifest,
    preferenceKey,
  }
}
