import { resolveBlockHeaderInputSlotIdForLink } from './blockCardHeaderSlots'
import { deriveChildBlockNodeId } from './blockParameterSynthesis'
import {
  blockParameterSlotId,
  type BlockParameterDef,
  type BlockStructurePayload,
  isBlockListCollectionParameter,
  isBlockListEmbedParameter,
  isBlockListPointerParameter,
} from './blockSchema'
import {
  canConnectBlockSlots,
  findBlockSlotEndpoint,
  isBlockSlotConnection,
} from './blockSlotConnections'
import type { CanvasConnection, CanvasNode } from './canvasScene'
import { listEmbedSlotId } from './listEmbedSlots'
import { listPointerSlotId } from './listPointerSlots'
import {
  mapHashEmbedSlotId,
  parseMapHashEmbedSlotId,
} from './mapHashEmbedSlots'
import {
  mapHashPointerSlotId,
  parseMapHashPointerSlotId,
} from './mapHashPointerSlots'
import {
  mapU64PointerSlotId,
  parseMapU64PointerSlotId,
} from './mapU64PointerSlots'
import { parseListEmbedSlotIndex } from './listEmbedSlots'
import { parseListPointerSlotIndex } from './listPointerSlots'

function normalizeParameterName(value: string): string {
  return value.trim().toLowerCase()
}

function resolveParentOutputSlotIdFromDef(
  parentParam: BlockParameterDef,
  linkFieldName: string | null,
): string {
  if (linkFieldName) {
    if (parentParam.typeParameter === 'mapHashEmbed') {
      return mapHashEmbedSlotId(parentParam.idParameter, linkFieldName)
    }
    if (parentParam.typeParameter === 'mapHashPointer') {
      return mapHashPointerSlotId(parentParam.idParameter, linkFieldName)
    }
    if (parentParam.typeParameter === 'mapU64Pointer') {
      return mapU64PointerSlotId(parentParam.idParameter, linkFieldName)
    }

    const listSlotMatch = /^(.+)__slot__(\d+)$/.exec(linkFieldName)
    if (listSlotMatch) {
      const index = Number(listSlotMatch[2])
      if (Number.isFinite(index)) {
        if (isBlockListPointerParameter(parentParam)) {
          return listPointerSlotId(parentParam.idParameter, index)
        }
        if (isBlockListEmbedParameter(parentParam)) {
          return listEmbedSlotId(parentParam.idParameter, index)
        }
      }
    }
  }

  return blockParameterSlotId(parentParam.idParameter, 'output')
}

function headerInputSlotIdForChildLink(
  structure: BlockStructurePayload,
  parentParam: BlockParameterDef,
): string | null {
  const outTypes =
    parentParam.slotRules?.outputs?.map((entry) => entry.trim()).filter(Boolean) ??
    (structure.blockType.trim() ? [structure.blockType.trim()] : [])

  return resolveBlockHeaderInputSlotIdForLink(
    structure.blockType,
    structure.appearance?.headerSlots ?? [],
    {
      fromParameterName: parentParam.nameParameter,
      outTypes,
      targetBlockName: structure.blockType,
      targetDisplayName: structure.blockName,
    },
  )
}

function inferParameterIdFromOutputSlot(
  structure: BlockStructurePayload,
  slotId: string,
): string | undefined {
  for (const param of structure.parameters) {
    if (slotId === blockParameterSlotId(param.idParameter, 'output')) {
      return param.idParameter
    }
    if (parseListPointerSlotIndex(slotId, param.idParameter) !== null) {
      return param.idParameter
    }
    if (parseListEmbedSlotIndex(slotId, param.idParameter) !== null) {
      return param.idParameter
    }
    if (parseMapHashEmbedSlotId(slotId)?.parameterId === param.idParameter) {
      return param.idParameter
    }
    if (parseMapHashPointerSlotId(slotId)?.parameterId === param.idParameter) {
      return param.idParameter
    }
    if (parseMapU64PointerSlotId(slotId)?.parameterId === param.idParameter) {
      return param.idParameter
    }
  }
  return undefined
}

function normalizeBlockSpawnConnection(
  connection: CanvasConnection,
  nodeById: ReadonlyMap<string, CanvasNode>,
): CanvasConnection {
  if (!isBlockSlotConnection(connection)) {
    return connection
  }

  let next: CanvasConnection = { ...connection }

  if (next.fromBlockSlotId) {
    const expectedInternal = `__block__:${next.fromBlockSlotId}`
    if (next.fromInternalStructureId !== expectedInternal) {
      next = { ...next, fromInternalStructureId: expectedInternal }
    }
  }

  if (next.fromBlockSlotId && !next.fromBlockParameterId && next.fromNodeId) {
    const fromNode = nodeById.get(next.fromNodeId)
    if (fromNode?.blockStructure) {
      const parameterId = inferParameterIdFromOutputSlot(fromNode.blockStructure, next.fromBlockSlotId)
      if (parameterId) {
        next = { ...next, fromBlockParameterId: parameterId }
      }
    }
  }

  return next
}

function childHasIncomingBlockConnection(
  connections: readonly CanvasConnection[],
  childNodeId: string,
): boolean {
  return connections.some(
    (connection) =>
      isBlockSlotConnection(connection) &&
      connection.toNodeId === childNodeId &&
      Boolean(connection.toBlockSlotId),
  )
}

function linkFieldNameCandidates(param: BlockParameterDef): Array<string | null> {
  const paramName = param.nameParameter.trim()
  const candidates: Array<string | null> = [null, paramName]

  if (isBlockListCollectionParameter(param)) {
    for (let index = 0; index < 8; index += 1) {
      candidates.push(`${paramName}__slot__${String(index)}`)
    }
  }

  return candidates
}

function findParentLinkForChild(
  child: CanvasNode,
  nodes: readonly CanvasNode[],
): { parent: CanvasNode; param: BlockParameterDef; linkFieldName: string | null } | null {
  const childStructure = child.blockStructure
  const childType = childStructure?.blockType.trim()
  const parentField = childStructure?.appearance?.parentBlockField?.trim()
  if (!childStructure || !childType || !parentField) {
    return null
  }

  for (const parent of nodes) {
    if (parent.id === child.id || !parent.blockStructure) {
      continue
    }

    for (const param of parent.blockStructure.parameters) {
      const paramName = param.nameParameter.trim()
      if (
        paramName !== parentField &&
        normalizeParameterName(paramName) !== normalizeParameterName(parentField)
      ) {
        continue
      }

      for (const linkFieldName of linkFieldNameCandidates(param)) {
        const fieldForId = linkFieldName ?? paramName
        const expectedChildId = deriveChildBlockNodeId(parent.id, childType, fieldForId)
        if (expectedChildId === child.id) {
          return { parent, param, linkFieldName }
        }
      }
    }
  }

  return null
}

function createMissingBlockHierarchyConnection(
  parent: CanvasNode,
  child: CanvasNode,
  param: BlockParameterDef,
  linkFieldName: string | null,
): CanvasConnection | null {
  const parentStructure = parent.blockStructure
  const childStructure = child.blockStructure
  if (!parentStructure || !childStructure) {
    return null
  }

  const fromSlotId = resolveParentOutputSlotIdFromDef(param, linkFieldName)
  const toSlotId = headerInputSlotIdForChildLink(childStructure, param)
  if (!toSlotId) {
    return null
  }

  const fromEndpoint = findBlockSlotEndpoint(parent, fromSlotId)
  const toEndpoint = findBlockSlotEndpoint(child, toSlotId)
  if (
    !fromEndpoint ||
    !toEndpoint ||
    !canConnectBlockSlots(fromEndpoint, toEndpoint, parentStructure, childStructure)
  ) {
    return null
  }

  return {
    id: `block:${parent.id}:${fromSlotId}->${child.id}:${toSlotId}`,
    fromNodeId: parent.id,
    fromInternalStructureId: `__block__:${fromSlotId}`,
    toNodeId: child.id,
    routing: 'wireless',
    fromBlockSlotId: fromSlotId,
    fromBlockParameterId: param.idParameter,
    toBlockSlotId: toSlotId,
  }
}

/** Normaliza metadados de ligações e repara filhos órfãos após spawn de blocos. */
export function reconcileBlockSpawnConnections(
  nodes: readonly CanvasNode[],
  connections: readonly CanvasConnection[],
): CanvasConnection[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  let next = connections.map((connection) => normalizeBlockSpawnConnection(connection, nodeById))

  for (const child of nodes) {
    if (!child.blockViewActive || !child.blockStructure) {
      continue
    }
    if (childHasIncomingBlockConnection(next, child.id)) {
      continue
    }

    const parentLink = findParentLinkForChild(child, nodes)
    if (!parentLink) {
      continue
    }

    const created = createMissingBlockHierarchyConnection(
      parentLink.parent,
      child,
      parentLink.param,
      parentLink.linkFieldName,
    )
    if (!created) {
      continue
    }

    next = next.filter(
      (connection) =>
        !(
          isBlockSlotConnection(connection) &&
          connection.toNodeId === child.id &&
          connection.toBlockSlotId === created.toBlockSlotId
        ),
    )
    next.push(created)
  }

  return next.map((connection) => normalizeBlockSpawnConnection(connection, nodeById))
}
