import type { CanvasNode } from '@/core/canvasScene'
import type { InternalStructureDefinition, NodeParameterDefinition, NodeStructureNomenclature } from '@/core/nodeSchema'

export type NodeInstanceJsonDocument = {
  id: string
  title: string
  parameters: NodeParameterDefinition[]
  internalStructures: InternalStructureDefinition[]
  nomenclature?: NodeStructureNomenclature
  required_parameter?: string[]
  linked_parameter_values?: Array<readonly [string, string]>
}

export function getNodeParameterRuntimeValue(
  canvasNode: CanvasNode,
  parameterId: string,
): string | undefined {
  const parameter = canvasNode.node.schema.parameters.find((entry) => entry.id === parameterId)

  if (!parameter) {
    return undefined
  }

  return canvasNode.node.values.find((entry) => entry.parameterId === parameterId)?.value ?? parameter.defaultValue
}

export function normalizeNodeInstanceStringName(value: string): string {
  const trimmed = value.trim()

  if (trimmed.length >= 2) {
    const first = trimmed.at(0)
    const last = trimmed.at(-1)

    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1).trim()
    }
  }

  return trimmed
}

export function sanitizeNodeInstanceJsonStem(value: string): string | null {
  const stem = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')

  return stem.length > 0 && stem.length <= 120 ? stem : null
}

export function sanitizeNodeInstanceNamePart(value: string): string | null {
  const stem = value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[\s/\\]+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')

  return stem.length > 0 && stem.length <= 120 ? stem : null
}

export function buildNodeInstanceId(sourceId: string, stringName: string): string | null {
  const sourceStem = sanitizeNodeInstanceJsonStem(sourceId)
  const nameStem = sanitizeNodeInstanceNamePart(stringName)

  return sourceStem && nameStem ? `${sourceStem}_${nameStem}` : null
}

export function buildNodeInstanceJsonDocument(
  canvasNode: CanvasNode,
  stringName: string,
  instanceId: string,
): NodeInstanceJsonDocument {
  const sourceId = canvasNode.node.schema.id
  const parameters = canvasNode.node.schema.parameters.map((parameter) => ({
    ...parameter,
    defaultValue: getNodeParameterRuntimeValue(canvasNode, parameter.id) ?? parameter.defaultValue,
  }))
  const document: NodeInstanceJsonDocument = {
    id: instanceId,
    title: `${sourceId} · ${stringName}`,
    parameters,
    internalStructures: structuredClone(canvasNode.node.schema.internalStructures),
  }

  if (canvasNode.node.schema.nomenclature) {
    document.nomenclature = structuredClone(canvasNode.node.schema.nomenclature)
  }

  const requiredParameter = canvasNode.node.required_parameter ?? canvasNode.node.schema.required_parameter
  if (requiredParameter) {
    document.required_parameter = [...requiredParameter]
  }

  const linkedParameterValues =
    canvasNode.node.parameter_value_links ?? canvasNode.node.schema.linked_parameter_values
  if (linkedParameterValues) {
    document.linked_parameter_values = linkedParameterValues.map(([a, b]) => [a, b] as const)
  }

  return document
}
