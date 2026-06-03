import { getAddonManifest } from '@/blockStructures/addonRegistry'
import { parseAddonSlotId,
  slotByName,
  addonSlotId,
} from '@/core/addonSlotConnections'
import { propagateAddonOutputsToDownstream } from '@/core/addonOutputPropagation'
import type { BlockParameterDef, BlockStructurePayload } from '@/core/blockSchema'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import type { AddonManifest } from '@/services/addonLoader.service'

function coerceUnknown(value: unknown): unknown {
  if (value === null || value === undefined) {
    return ''
  }
  return value
}

function readBlockSlotValue(structure: BlockStructurePayload, slotId: string): string {
  const paramMatch = /^block-param:(.+):(input|output)$/.exec(slotId)
  if (paramMatch) {
    const param = structure.parameters.find((p) => p.idParameter === paramMatch[1])
    return param?.defaultValue ?? ''
  }
  return ''
}

function resolveBlockOutputForAddon(
  scene: CanvasScene,
  fromNode: CanvasNode,
  fromAddonSlotId: string | undefined,
  fromBlockSlotId: string | undefined,
  fromBlockParameterId: string | undefined,
): unknown {
  if (!fromNode.blockStructure || !fromNode.blockViewActive) {
    return ''
  }

  if (fromBlockParameterId) {
    const param = fromNode.blockStructure.parameters.find(
      (p) => p.idParameter === fromBlockParameterId,
    )
    if (param) {
      return param.defaultValue ?? ''
    }
  }

  if (fromBlockSlotId) {
    return readBlockSlotValue(fromNode.blockStructure, fromBlockSlotId)
  }

  if (fromAddonSlotId) {
    return ''
  }

  return ''
}

function resolveUpstreamValue(
  scene: CanvasScene,
  connection: CanvasScene['connections'][number],
  slotName: string,
): unknown {
  const fromNode = scene.nodes.find((n) => n.id === connection.fromNodeId)
  if (!fromNode) {
    return ''
  }

  if (fromNode.addonViewActive && fromNode.addonInstance) {
    const outputs = fromNode.addonInstance.outputValues
    const fromParsed = connection.fromAddonSlotId
      ? parseAddonSlotId(connection.fromAddonSlotId)
      : null
    if (fromParsed?.direction === 'output') {
      if (Object.prototype.hasOwnProperty.call(outputs, fromParsed.name)) {
        return coerceUnknown(outputs[fromParsed.name])
      }
      return ''
    }
    if (Object.prototype.hasOwnProperty.call(outputs, slotName)) {
      return coerceUnknown(outputs[slotName])
    }
    return ''
  }

  if (fromNode.blockViewActive && fromNode.blockStructure) {
    return resolveBlockOutputForAddon(
      scene,
      fromNode,
      connection.fromAddonSlotId,
      connection.fromBlockSlotId,
      connection.fromBlockParameterId,
    )
  }

  if (connection.fromInternalStructureId && !connection.fromInternalStructureId.startsWith('__')) {
    const paramId = connection.fromInternalStructureId
    const raw = fromNode.node.values.find((v) => v.parameterId === paramId)?.value ?? ''
    return raw
  }

  return ''
}

export function resolveAddonInputs(
  scene: CanvasScene,
  canvasNode: CanvasNode,
  manifest: AddonManifest,
): Record<string, unknown> {
  const inputs: Record<string, unknown> = {}

  const incoming = scene.connections.filter(
    (c) => c.toNodeId === canvasNode.id && c.toAddonSlotId,
  )

  for (const connection of incoming) {
    const parsed = connection.toAddonSlotId ? parseAddonSlotId(connection.toAddonSlotId) : null
    if (!parsed || parsed.direction !== 'input') {
      continue
    }
    if (!slotByName(manifest, parsed.name, 'input')) {
      continue
    }
    inputs[parsed.name] = resolveUpstreamValue(scene, connection, parsed.name)
  }

  return inputs
}

export function applyAddonOutputs(
  scene: CanvasScene,
  nodeId: string,
  outputs: Record<string, unknown>,
): CanvasScene {
  const node = scene.nodes.find((n) => n.id === nodeId)
  if (!node?.addonInstance) {
    return scene
  }

  const manifest = getAddonManifest(node.addonInstance.addonId)
  const mergedOutputs = { ...node.addonInstance.outputValues }
  if (manifest) {
    for (const slot of manifest.data) {
      if (slot.direction === 'output' && Object.prototype.hasOwnProperty.call(outputs, slot.name)) {
        mergedOutputs[slot.name] = outputs[slot.name]
      }
    }
  } else {
    Object.assign(mergedOutputs, outputs)
  }

  if (JSON.stringify(mergedOutputs) === JSON.stringify(node.addonInstance.outputValues)) {
    return scene
  }

  let nextScene: CanvasScene = {
    ...scene,
    nodes: scene.nodes.map((n) =>
      n.id === nodeId
        ? {
            ...n,
            addonInstance: {
              ...n.addonInstance!,
              outputValues: mergedOutputs,
            },
          }
        : n,
    ),
  }

  return propagateAddonOutputsToDownstream(nextScene, nodeId)
}

export function listAddonOutputSlotIds(manifest: AddonManifest): string[] {
  return manifest.data
    .filter((s) => s.direction === 'output')
    .map((s) => addonSlotId(s.name, 'output'))
}

export function listAddonInputSlotIds(manifest: AddonManifest): string[] {
  return manifest.data
    .filter((s) => s.direction === 'input')
    .map((s) => addonSlotId(s.name, 'input'))
}
