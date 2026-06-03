import { parseAddonSlotId } from '@/core/addonSlotConnections'

import type { BlockParameterDef, BlockStructurePayload } from '@/core/blockSchema'

import { blockParameterSlotId } from '@/core/blockSchema'

import {

  resolveBlockParameterValue,

  updateBlockParameterTokenValue,

  writeBlockParameterValue,

} from '@/core/blockTokenCodegen'

import { blockTokenFromParameterDef } from '@/core/blockTokenParser'

import type { CanvasNode, CanvasScene } from '@/core/canvasScene'



function resolveBlockParameterIdFromInputSlot(

  toBlockSlotId: string | undefined,

  toBlockParameterId: string | undefined,

): string | undefined {

  if (toBlockParameterId) {

    return toBlockParameterId

  }

  if (!toBlockSlotId) {

    return undefined

  }

  const match = /^block-param:([^:]+):input$/.exec(toBlockSlotId)

  return match?.[1]

}



function readAddonOutputValue(fromNode: CanvasNode, fromAddonSlotId: string | undefined): string | undefined {

  if (!fromNode.addonInstance || !fromAddonSlotId) {

    return undefined

  }

  const parsed = parseAddonSlotId(fromAddonSlotId)

  if (!parsed || parsed.direction !== 'output') {

    return undefined

  }

  const value = fromNode.addonInstance.outputValues[parsed.name]

  if (value === undefined) {

    return undefined

  }

  return String(value)

}



/** Valor actual da saída do add-on ligada ao input do parâmetro (se existir ligação). */

export function resolveIncomingAddonOutputForBlockParameter(

  scene: CanvasScene,

  canvasNode: CanvasNode,

  paramId: string,

): string | undefined {

  const inputSlotId = blockParameterSlotId(paramId, 'input')

  const connection = scene.connections.find(

    (entry) =>

      entry.toNodeId === canvasNode.id &&

      entry.fromAddonSlotId &&

      (entry.toBlockParameterId === paramId || entry.toBlockSlotId === inputSlotId),

  )

  if (!connection) {

    return undefined

  }

  const fromNode = scene.nodes.find((entry) => entry.id === connection.fromNodeId)

  if (!fromNode) {

    return undefined

  }

  return readAddonOutputValue(fromNode, connection.fromAddonSlotId)

}



function blockParameterAlreadyShowsValue(

  scene: CanvasScene,

  canvasNode: CanvasNode,

  param: BlockParameterDef,

  value: string,

): boolean {

  if (param.defaultValue !== value) {

    return false

  }

  const resolved = resolveBlockParameterValue(scene, canvasNode, param.sourcePath)

  return (resolved || param.defaultValue) === value

}



function applyAddonValueToBlockParameter(

  scene: CanvasScene,

  canvasNode: CanvasNode,

  paramId: string,

  value: string,

): CanvasNode {

  if (!canvasNode.blockStructure) {

    return canvasNode

  }

  const param = canvasNode.blockStructure.parameters.find((entry) => entry.idParameter === paramId)

  if (!param) {

    return canvasNode

  }

  if (blockParameterAlreadyShowsValue(scene, canvasNode, param, value)) {

    return canvasNode

  }



  const updatedStructure = updateBlockParameterTokenValue(canvasNode.blockStructure, paramId, value)

  const updatedParam = updatedStructure.parameters.find((entry) => entry.idParameter === paramId)

  let updatedNode = canvasNode.node

  if (updatedParam?.sourcePath.kind === 'parameter') {

    const token = blockTokenFromParameterDef(

      updatedStructure.blockType,

      updatedStructure.blockName,

      updatedParam,

    )

    updatedNode = writeBlockParameterValue(updatedNode, updatedParam.sourcePath, token)

  }



  return {

    ...canvasNode,

    blockStructure: updatedStructure,

    node: updatedNode,

  }

}



export function propagateAddonOutputsToDownstream(

  scene: CanvasScene,

  fromNodeId: string,

): CanvasScene {

  let next = scene

  const queue = [fromNodeId]

  const visited = new Set<string>()

  let changed = false



  while (queue.length > 0) {

    const nodeId = queue.shift()!

    if (visited.has(nodeId)) {

      continue

    }

    visited.add(nodeId)



    const outgoing = next.connections.filter((c) => c.fromNodeId === nodeId)

    for (const connection of outgoing) {

      const toNode = next.nodes.find((n) => n.id === connection.toNodeId)

      if (toNode?.addonViewActive && toNode.addonInstance) {

        queue.push(connection.toNodeId)

      }



      if (!connection.toBlockSlotId || !toNode?.blockStructure) {

        continue

      }



      const paramId = resolveBlockParameterIdFromInputSlot(

        connection.toBlockSlotId,

        connection.toBlockParameterId,

      )

      if (!paramId) {

        continue

      }



      const fromNode = next.nodes.find((n) => n.id === connection.fromNodeId)

      if (!fromNode?.addonInstance) {

        continue

      }



      const value = readAddonOutputValue(fromNode, connection.fromAddonSlotId)

      if (value === undefined) {

        continue

      }



      const patched = applyAddonValueToBlockParameter(next, toNode, paramId, value)

      if (patched === toNode) {

        continue

      }



      changed = true

      next = {

        ...next,

        nodes: next.nodes.map((n) => (n.id === toNode.id ? patched : n)),

      }

    }

  }



  return changed ? next : scene

}



/** Propaga valores actuais do add-on para blocos/add-ons ligados à saída. */

export function syncConnectedAddonOutputs(scene: CanvasScene, fromNodeId: string): CanvasScene {

  return propagateAddonOutputsToDownstream(scene, fromNodeId)

}


