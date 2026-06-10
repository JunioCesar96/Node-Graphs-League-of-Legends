import { getAddonManifest } from '@/blockStructures/addonRegistry'
import {
  addonSlotTypesAreCompatible,
  formatAddonSlotTypeLabel,
} from '@/core/addonRitualSlotTypes'

import { findAddonSlotEndpoint, type AddonSlotEndpoint } from './addonSlotConnections'
import { findBlockSlotEndpoint, type BlockSlotEndpoint } from './blockSlotConnections'
import { findLabelSlotEndpoint, type LabelSlotEndpoint } from './labelSlotConnections'
import type { CanvasNode } from './canvasScene'

export type CrossSlotConnectionClass =
  | { kind: 'compatible' }
  | { kind: 'forced'; outputType: string; inputType: string; outputLabel: string; inputLabel: string }
  | { kind: 'incompatible'; reason?: string }

export type AddonToAddonConnectRequest = {
  kind: 'addon'
  fromNodeId: string
  fromAddonSlotId: string
  toNodeId: string
  toAddonSlotId: string
}

export type BlockToAddonConnectRequest = {
  kind: 'blockToAddon'
  fromNodeId: string
  fromBlockSlotId: string
  fromBlockParameterId?: string
  toNodeId: string
  toAddonSlotId: string
}

export type AddonToBlockConnectRequest = {
  kind: 'addonToBlock'
  fromNodeId: string
  fromAddonSlotId: string
  toNodeId: string
  toBlockSlotId: string
  toBlockParameterId?: string
}

export type LabelToAddonConnectRequest = {
  kind: 'labelToAddon'
  fromNodeId: string
  fromLabelSlotId: string
  toNodeId: string
  toAddonSlotId: string
}

export type CrossSlotConnectRequest =
  | AddonToAddonConnectRequest
  | BlockToAddonConnectRequest
  | AddonToBlockConnectRequest
  | LabelToAddonConnectRequest

function isBlockHeaderCodeOutputType(type: string): boolean {
  const trimmed = type.trim()
  if (!trimmed) {
    return false
  }
  if (trimmed.toLowerCase() === 'code') {
    return true
  }
  return trimmed.toLowerCase().endsWith('preview')
}

function typesMatchForAddon(outputType: string, inputType: string): boolean {
  const out = outputType.trim().toLowerCase()
  const input = inputType.trim().toLowerCase()
  if (!out || !input) {
    return false
  }
  if (out.includes('string') || input.includes('string')) {
    if (out === 'string' || out === 'liststring' || input === 'string' || input === 'liststring') {
      return addonSlotTypesAreCompatible(outputType, inputType)
    }
  }
  return addonSlotTypesAreCompatible(outputType, inputType)
}

function formatTypeLabel(type: string): string {
  return formatAddonSlotTypeLabel(type)
}

function forcedClass(
  outputType: string,
  inputType: string,
  outputLabel: string,
  inputLabel: string,
): CrossSlotConnectionClass {
  return {
    kind: 'forced',
    outputType: formatTypeLabel(outputType),
    inputType: formatTypeLabel(inputType),
    outputLabel,
    inputLabel,
  }
}

export function classifyAddonSlotConnectionExtended(
  from: AddonSlotEndpoint,
  to: AddonSlotEndpoint,
): CrossSlotConnectionClass {
  if (from.direction !== 'output' || to.direction !== 'input') {
    return { kind: 'incompatible', reason: 'direction' }
  }
  if (from.nodeId === to.nodeId) {
    return { kind: 'incompatible', reason: 'same-node' }
  }
  if (typesMatchForAddon(from.type, to.type)) {
    return { kind: 'compatible' }
  }
  return forcedClass(from.type, to.type, `${from.slotName} (saída)`, `${to.slotName} (entrada)`)
}

export function classifyBlockOutputToAddonInput(
  from: BlockSlotEndpoint,
  to: AddonSlotEndpoint,
): CrossSlotConnectionClass {
  if (from.direction !== 'output' || to.direction !== 'input') {
    return { kind: 'incompatible', reason: 'direction' }
  }
  if (from.nodeId === to.nodeId) {
    return { kind: 'incompatible', reason: 'same-node' }
  }

  const outputTypes = from.types.length > 0 ? from.types : ['']
  if (
    to.type === 'code' &&
    from.kind === 'header' &&
    outputTypes.some(isBlockHeaderCodeOutputType)
  ) {
    return { kind: 'compatible' }
  }
  const matches = outputTypes.some((type) => typesMatchForAddon(type, to.type))
  if (matches) {
    return { kind: 'compatible' }
  }

  const primaryOut = outputTypes[0] ?? ''
  return forcedClass(
    primaryOut,
    to.type,
    from.parameterId ? `${from.parameterId} (saída bloco)` : 'saída bloco',
    `${to.slotName} (entrada add-on)`,
  )
}

export function classifyLabelOutputToAddonInput(
  from: LabelSlotEndpoint,
  to: AddonSlotEndpoint,
): CrossSlotConnectionClass {
  if (from.direction !== 'output' || to.direction !== 'input') {
    return { kind: 'incompatible', reason: 'direction' }
  }
  if (from.nodeId === to.nodeId) {
    return { kind: 'incompatible', reason: 'same-node' }
  }

  const outputTypes = from.types.length > 0 ? from.types : ['json']
  if (to.type === 'json' && outputTypes.some((type) => type.trim().toLowerCase() === 'json')) {
    return { kind: 'compatible' }
  }

  const matches = outputTypes.some((type) => typesMatchForAddon(type, to.type))
  if (matches) {
    return { kind: 'compatible' }
  }

  const primaryOut = outputTypes[0] ?? 'json'
  return forcedClass(
    primaryOut,
    to.type,
    'saída label (json)',
    `${to.slotName} (entrada add-on)`,
  )
}

export function classifyAddonOutputToBlockInput(
  from: AddonSlotEndpoint,
  to: BlockSlotEndpoint,
): CrossSlotConnectionClass {
  if (from.direction !== 'output' || to.direction !== 'input') {
    return { kind: 'incompatible', reason: 'direction' }
  }
  if (from.nodeId === to.nodeId) {
    return { kind: 'incompatible', reason: 'same-node' }
  }

  const inputTypes = to.types.length > 0 ? to.types : ['']
  const matches = inputTypes.some((type) => typesMatchForAddon(from.type, type))
  if (matches) {
    return { kind: 'compatible' }
  }

  const primaryIn = inputTypes[0] ?? ''
  return forcedClass(
    from.type,
    primaryIn,
    `${from.slotName} (saída add-on)`,
    to.parameterId ? `${to.parameterId} (entrada bloco)` : 'entrada bloco',
  )
}

export function classifyCrossSlotRequest(
  nodes: readonly CanvasNode[],
  request: CrossSlotConnectRequest,
): CrossSlotConnectionClass {
  if (request.kind === 'addon') {
    const fromNode = nodes.find((n) => n.id === request.fromNodeId)
    const toNode = nodes.find((n) => n.id === request.toNodeId)
    if (!fromNode?.addonInstance || !toNode?.addonInstance) {
      return { kind: 'incompatible' }
    }
    const fromManifest = getAddonManifest(fromNode.addonInstance.addonId)
    const toManifest = getAddonManifest(toNode.addonInstance.addonId)
    if (!fromManifest || !toManifest) {
      return { kind: 'incompatible' }
    }
    const from = findAddonSlotEndpoint(fromNode, fromManifest, request.fromAddonSlotId)
    const to = findAddonSlotEndpoint(toNode, toManifest, request.toAddonSlotId)
    if (!from || !to) {
      return { kind: 'incompatible' }
    }
    return classifyAddonSlotConnectionExtended(from, to)
  }

  if (request.kind === 'labelToAddon') {
    const fromNode = nodes.find((n) => n.id === request.fromNodeId)
    const toNode = nodes.find((n) => n.id === request.toNodeId)
    if (!fromNode?.labelStructure || !toNode?.addonInstance) {
      return { kind: 'incompatible' }
    }
    const from = findLabelSlotEndpoint(fromNode, request.fromLabelSlotId)
    const toManifest = getAddonManifest(toNode.addonInstance.addonId)
    if (!from || !toManifest) {
      return { kind: 'incompatible' }
    }
    const to = findAddonSlotEndpoint(toNode, toManifest, request.toAddonSlotId)
    if (!to) {
      return { kind: 'incompatible' }
    }
    return classifyLabelOutputToAddonInput(from, to)
  }

  if (request.kind === 'blockToAddon') {
    const fromNode = nodes.find((n) => n.id === request.fromNodeId)
    const toNode = nodes.find((n) => n.id === request.toNodeId)
    if (!fromNode?.blockStructure || !toNode?.addonInstance) {
      return { kind: 'incompatible' }
    }
    let from = findBlockSlotEndpoint(fromNode, request.fromBlockSlotId)
    const toManifest = getAddonManifest(toNode.addonInstance.addonId)
    if (!from || !toManifest) {
      return { kind: 'incompatible' }
    }
    if (from.kind === 'parameter' && from.types.length === 0) {
      const paramId = request.fromBlockParameterId ?? from.parameterId
      const param = fromNode.blockStructure.parameters.find((entry) => entry.idParameter === paramId)
      if (param?.typeParameter) {
        from = { ...from, types: [param.typeParameter] }
      }
    }
    const to = findAddonSlotEndpoint(toNode, toManifest, request.toAddonSlotId)
    if (!to) {
      return { kind: 'incompatible' }
    }
    return classifyBlockOutputToAddonInput(from, to)
  }

  const fromNode = nodes.find((n) => n.id === request.fromNodeId)
  const toNode = nodes.find((n) => n.id === request.toNodeId)
  if (!fromNode?.addonInstance || !toNode?.blockStructure) {
    return { kind: 'incompatible' }
  }
  const fromManifest = getAddonManifest(fromNode.addonInstance.addonId)
  if (!fromManifest) {
    return { kind: 'incompatible' }
  }
  const from = findAddonSlotEndpoint(fromNode, fromManifest, request.fromAddonSlotId)
  const to = findBlockSlotEndpoint(toNode, request.toBlockSlotId)
  if (!from || !to) {
    return { kind: 'incompatible' }
  }
  return classifyAddonOutputToBlockInput(from, to)
}

export function isCrossSlotConnectionForced(
  nodes: readonly CanvasNode[],
  request: CrossSlotConnectRequest,
): boolean {
  return classifyCrossSlotRequest(nodes, request).kind === 'forced'
}
