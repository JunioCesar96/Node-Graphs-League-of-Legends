import { getAddonManifest } from '@/blockStructures/addonRegistry'
import type { AddonSlotType } from '@/services/addonLoader.service'

import { findAddonSlotEndpoint, type AddonSlotEndpoint } from './addonSlotConnections'
import { findBlockSlotEndpoint, type BlockSlotEndpoint } from './blockSlotConnections'
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

export type CrossSlotConnectRequest =
  | AddonToAddonConnectRequest
  | BlockToAddonConnectRequest
  | AddonToBlockConnectRequest

function normalizeToAddonSlotType(raw: string): AddonSlotType | 'unknown' {
  const t = raw.trim().toLowerCase()
  if (t === 'string' || t.includes('string') || t === 'liststring') {
    return 'string'
  }
  if (
    t === 'number' ||
    t === 'f32' ||
    t === 'float' ||
    t === 'double' ||
    t === 'integer' ||
    t.includes('float') ||
    t === 'i32' ||
    t === 'u32'
  ) {
    return 'number'
  }
  if (t === 'boolean' || t === 'bool') {
    return 'boolean'
  }
  if (t === 'object') {
    return 'object'
  }
  return 'unknown'
}

function typesMatchForAddon(outputType: string, inputType: string): boolean {
  const out = normalizeToAddonSlotType(outputType)
  const input = normalizeToAddonSlotType(inputType)
  if (out === 'unknown' || input === 'unknown') {
    return false
  }
  return out === input
}

function formatTypeLabel(type: string): string {
  const normalized = normalizeToAddonSlotType(type)
  return normalized === 'unknown' ? type : normalized
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
