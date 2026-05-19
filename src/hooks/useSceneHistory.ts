import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CanvasConnection, CanvasPosition, CanvasScene } from '@/core/canvasScene'
import { nextConnectionRouting } from '@/core/canvasScene'
import { hydrateScene, schemaJsonRelativePathBySchemaId, staticCanvasScene } from '@/core/canvasScene'
import { loadStoredScene, SCENE_STORAGE_KEY } from '@/core/sceneStorage'
import { workspaceService } from '@/services/workspaceService'
import { fx_required_parameter, resolveRequiredParameterListId } from '@/core/fx_required_parameter'
import {
  link_parameter_value_add_pair,
  link_parameter_value_partner,
  link_parameter_value_patch_values,
  link_parameter_value_remove_involving,
} from '@/core/link_parameter_value'
import {
  createNodeInstanceFromRegistry,
  schemaBaseParameterCatalogBySchemaId,
  schemaRegistry,
} from '@/core/nodeStructureRegistry'
import {
  diskLinkedPairsFromCanvas,
  instanceLinkedPairsEqual,
  linkedParameterDiskKey,
  linked_parameter_values_apply_to_instance,
  translateDiskLinkedPairsToCanvas,
} from '@/core/linked_parameter_values'
import { patchInternalStructureSlotForLink } from '@/core/collectionTypeLinking'
import {
  appendEmbedCatalogItemToSchema,
  removeEmbedBlockFromSchema,
  removeEmbedSlotFromSchema,
  slotIdsForEmbedBlock,
  structureForEmbedAdd,
} from '@/core/embedElementMenu'
import {
  appendListEmbedCatalogItemToSchema,
  removeListEmbedBlockFromSchema,
  removeListEmbedSlotFromSchema,
  slotIdsForListEmbedBlock,
  structureForListEmbedAdd,
} from '@/core/listEmbedElementMenu'
import {
  appendPointerCatalogItemToSchema,
  removePointerBlockFromSchema,
  removePointerSlotFromSchema,
  slotIdsForPointerBlock,
  structureForPointerAdd,
} from '@/core/pointerElementMenu'
import {
  appendListPointerCatalogItemToSchema,
  removeListPointerBlockFromSchema,
  removeListPointerSlotFromSchema,
  slotIdsForListPointerBlock,
  structureForListPointerAdd,
} from '@/core/listPointerElementMenu'
import {
  appendList2EmbedCatalogItemToSchema,
  removeList2EmbedInstanceFromSchema,
} from '@/core/list2EmbedElementMenu'
import { populatedSlotsForList2EmbedInstance } from '@/core/list2EmbedSlots'
import {
  appendList2PointerCatalogItemToSchema,
  removeList2PointerInstanceFromSchema,
} from '@/core/list2PointerElementMenu'
import { populatedSlotsForList2PointerInstance } from '@/core/list2PointerSlots'
import { findOutputSlotInNode, patchOutputSlotInNodeSchema } from '@/core/listEmbedSlots'
import type {
  InternalStructureDefinition,
  NodeInstance,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import { addHashStringInNode, syncHashStringMirrorFromValues } from '@/core/hashString'
import { STORAGE_LAST_STRUCTURE_META } from '@/core/workspaceStorage'

export const ROOT_NODE_ID = 'particle-root-01'

export { isCanvasScene, loadStoredScene, SCENE_STORAGE_KEY } from '@/core/sceneStorage'

const hashStringPersistTimers = new Map<string, ReturnType<typeof setTimeout>>()

function scheduleHashStringSchemaDiskPersist(
  sceneNodeId: string,
  schemaId: string,
  hashStringParameterId: string,
  hashString: string,
) {
  if (!import.meta.env.DEV) {
    return
  }

  const relativePath = schemaJsonRelativePathBySchemaId[schemaId]
  if (!relativePath) {
    return
  }

  const key = `${sceneNodeId}:${schemaId}`
  const prev = hashStringPersistTimers.get(key)
  if (prev !== undefined) {
    window.clearTimeout(prev)
  }

  const token = window.setTimeout(() => {
    hashStringPersistTimers.delete(key)
    void fetch('/api/node-structures-patch-hash-string', {
      body: JSON.stringify({ hashString, hashStringParameterId, relativePath }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    }).catch(() => {})
  }, 480)

  hashStringPersistTimers.set(key, token)
}

const DETACHED_NODE_COLUMNS = 3

const DETACHED_NODE_START: CanvasPosition = { x: 96, y: 96 }

const DETACHED_NODE_STEP: CanvasPosition = { x: 420, y: 220 }

const NODE_COLLISION_GAP: CanvasPosition = { x: 380, y: 180 }

export function createUniqueNodeId(schemaId: string, nodes: CanvasScene['nodes']) {
  let nextIndex = nodes.filter((node) => node.node.schema.id === schemaId).length + 1
  let instanceId = `${schemaId}-${String(nextIndex).padStart(2, '0')}`

  while (nodes.some((node) => node.id === instanceId)) {
    nextIndex += 1
    instanceId = `${schemaId}-${String(nextIndex).padStart(2, '0')}`
  }

  return instanceId
}

export function getNextDetachedNodePosition(scene: CanvasScene) {
  let attempt = scene.nodes.length

  while (attempt < scene.nodes.length + 200) {
    const candidate = {
      x: DETACHED_NODE_START.x + (attempt % DETACHED_NODE_COLUMNS) * DETACHED_NODE_STEP.x,
      y: DETACHED_NODE_START.y + Math.floor(attempt / DETACHED_NODE_COLUMNS) * DETACHED_NODE_STEP.y,
    }
    const overlapsNode = scene.nodes.some(
      (node) =>
        Math.abs(node.position.x - candidate.x) < NODE_COLLISION_GAP.x &&
        Math.abs(node.position.y - candidate.y) < NODE_COLLISION_GAP.y,
    )

    if (!overlapsNode) {
      return candidate
    }

    attempt += 1
  }

  return {
    x: DETACHED_NODE_START.x,
    y: DETACHED_NODE_START.y + scene.nodes.length * 80,
  }
}

/** Cena inicial: storage válido ou demo estática; grafo persistido sem nós volta à demo para não bloquear a UI. */
function getInitialPresent(): CanvasScene {
  const loaded = loadStoredScene()
  return loaded.nodes.length === 0 ? staticCanvasScene : loaded
}

/** Hook central do grafo local com histórico, persistência em localStorage e multi-seleção. */
export function useSceneHistory(options?: {
  /** Registo efectivo `{ ...schemaRegistryEstático, ...convertidosLocal }`; omite só estático */
  extendSchemaLookup?: Record<string, NodeSchemaDefinition>
}) {
  const schemaLookup = options?.extendSchemaLookup ?? schemaRegistry
  const [sceneHistory, setSceneHistory] = useState(() => ({
    future: [] as CanvasScene[],
    past: [] as CanvasScene[],
    present: getInitialPresent(),
  }))

  const scene = sceneHistory.present

  const [selectionState, setSelectionState] = useState(() => {
    const present = getInitialPresent()
    const fallback =
      present.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ??
      present.nodes[0]?.id ??
      ROOT_NODE_ID

    return {
      ids: fallback ? [fallback] : ([] as string[]),
      primaryId: fallback || ROOT_NODE_ID,
    }
  })

  useEffect(() => {
    const validIds = scene.nodes.map((node) => node.id)
    const valid = new Set(validIds)

    setSelectionState((previous) => {
      let nextIds = previous.ids.filter((id) => valid.has(id))

      if (scene.nodes.length === 0) {
        return nextIds.length === 0 && previous.primaryId === '' ? previous : { ids: [], primaryId: '' }
      }

      const primaryCandidate =
        nextIds.length === 0
          ? ''
          : valid.has(previous.primaryId) && nextIds.includes(previous.primaryId)
            ? previous.primaryId
            : (nextIds[0] ?? '')

      const samePrimary = previous.primaryId === primaryCandidate
      const sameIds =
        nextIds.length === previous.ids.length &&
        nextIds.every((id, idx) => previous.ids[idx] === id)

      if (samePrimary && sameIds) {
        return previous
      }

      return {
        ids: nextIds,
        primaryId: primaryCandidate,
      }
    })
  }, [scene])

  useEffect(() => {
    window.localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(scene))
  }, [scene])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }
    workspaceService.syncSceneToDisk(scene)
  }, [scene])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    let cancelled = false

    void (async () => {
      await workspaceService.migrateLocalStorageToDiskOnce()
      const diskScene = await workspaceService.loadSceneFromDisk()
      if (cancelled || diskScene === null || diskScene.nodes.length === 0) {
        return
      }

      setSceneHistory({
        future: [],
        past: [],
        present: diskScene,
      })

      const fallbackId =
        diskScene.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ??
        diskScene.nodes[0]?.id ??
        ROOT_NODE_ID

      setSelectionState({
        ids: fallbackId ? [fallbackId] : [],
        primaryId: fallbackId,
      })
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const orderedSelectionUnique = useMemo(
    () => [...new Set(selectionState.ids)],
    [selectionState.ids],
  )

  const primarySelectedId =
    orderedSelectionUnique.length === 0
      ? ''
      : selectionState.primaryId && orderedSelectionUnique.includes(selectionState.primaryId)
        ? selectionState.primaryId
        : (orderedSelectionUnique[0] ?? '')

  useEffect(() => {
    if (primarySelectedId === '') {
      return
    }

    setSceneHistory((history) => {
      const present = history.present
      const nodeIndex = present.nodes.findIndex((node) => node.id === primarySelectedId)

      if (nodeIndex < 0) {
        return history
      }

      const canvasNode = present.nodes[nodeIndex]!
      const schemaId = canvasNode.node.schema.id
      const canonical = schemaLookup[schemaId]

      if (!canonical || canonical.linked_parameter_values === undefined) {
        return history
      }

      const catalog = schemaBaseParameterCatalogBySchemaId[schemaId] ?? []
      const translated = translateDiskLinkedPairsToCanvas(
        canonical.linked_parameter_values,
        canvasNode.node,
        catalog,
      )

      if (canonical.linked_parameter_values.length > 0 && translated.length === 0) {
        return history
      }

      const canvasAligned = instanceLinkedPairsEqual(
        canvasNode.node.parameter_value_links,
        translated,
      )
      const diskAligned =
        linkedParameterDiskKey(canvasNode.node.schema.linked_parameter_values) ===
        linkedParameterDiskKey(canonical.linked_parameter_values)

      if (canvasAligned && diskAligned) {
        return history
      }

      const nextNode = linked_parameter_values_apply_to_instance(
        canvasNode.node,
        translated,
        canonical.linked_parameter_values,
        catalog,
      )

      const nextNodes = [...present.nodes]
      nextNodes[nodeIndex] = { ...canvasNode, node: nextNode }

      return {
        past: [...history.past, history.present],
        present: { ...present, nodes: nextNodes },
        future: [],
      }
    })
  }, [primarySelectedId, schemaLookup])

  const selectedNode =
    primarySelectedId === ''
      ? undefined
      : (scene.nodes.find((node) => node.id === primarySelectedId) ?? undefined)

  const clearSelection = useCallback(() => {
    setSelectionState({ ids: [], primaryId: '' })
  }, [])

  const updateScene = useCallback((updater: (currentScene: CanvasScene) => CanvasScene) => {
    setSceneHistory((currentHistory) => {
      const nextScene = updater(currentHistory.present)

      if (nextScene === currentHistory.present) {
        return currentHistory
      }

      return {
        future: [],
        past: [...currentHistory.past, currentHistory.present],
        present: nextScene,
      }
    })
  }, [])

  const replaceScene = useCallback((nextScene: CanvasScene, storageMeta?: Record<string, string>) => {
    const hydrated = hydrateScene(nextScene)
    const fallbackId =
      hydrated.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ?? hydrated.nodes[0]?.id ?? ROOT_NODE_ID

    setSceneHistory({
      future: [],
      past: [],
      present: hydrated,
    })

    setSelectionState({ ids: fallbackId ? [fallbackId] : [], primaryId: fallbackId })

    try {
      if (storageMeta) {
        window.sessionStorage.setItem(STORAGE_LAST_STRUCTURE_META, JSON.stringify(storageMeta))
      }
    } catch {
      /** ignore */
    }
  }, [])

  const selectNode = useCallback(
    (nodeId: string, options?: { additive?: boolean }) => {
      const exists = scene.nodes.some((node) => node.id === nodeId)

      if (!exists) {
        return
      }

      if (!options?.additive) {
        setSelectionState({ ids: [nodeId], primaryId: nodeId })
        return
      }

      setSelectionState((previousState) => {
        const bag = new Set(previousState.ids)

        if (bag.has(nodeId)) {
          bag.delete(nodeId)
        } else {
          bag.add(nodeId)
        }

        let nextArr = [...bag]

        if (nextArr.length === 0) {
          return {
            ids: [],
            primaryId: '',
          }
        }

        const primaryNext = bag.has(previousState.primaryId) ? previousState.primaryId : nodeId

        return {
          ids: nextArr,
          primaryId: primaryNext,
        }
      })
    },
    [scene.nodes],
  )

  const commitMarqueeSelection = useCallback(
    ({ additive, nodeIds }: { additive: boolean; nodeIds: string[] }) => {
      const validIds = [...new Set(nodeIds)].filter((id) =>
        scene.nodes.some((node) => node.id === id),
      )

      if (!additive) {
        if (validIds.length === 0) {
          setSelectionState({ ids: [], primaryId: '' })

          return
        }

        setSelectionState({
          ids: validIds,
          primaryId: validIds[0],
        })

        return
      }

      setSelectionState((prev) => {
        const bag = new Set(prev.ids)

        for (const id of validIds) {
          bag.add(id)
        }

        let nextArr = [...bag]

        if (nextArr.length === 0) {
          return {
            ids: [],
            primaryId: '',
          }
        }

        const primaryKeeps =
          prev.primaryId && bag.has(prev.primaryId) ? prev.primaryId : (nextArr[0] ?? ROOT_NODE_ID)

        return {
          ids: nextArr,
          primaryId: primaryKeeps,
        }
      })
    },
    [scene.nodes],
  )

  const selectAllNodes = useCallback(() => {
    const ids = scene.nodes.map((node) => node.id)

    if (ids.length === 0) {
      return
    }

    const pivot = ids.includes(ROOT_NODE_ID) ? ROOT_NODE_ID : ids[0]

    setSelectionState({ ids, primaryId: pivot })
  }, [scene.nodes])

  const moveNode = useCallback(
    (nodeId: string, position: CanvasPosition, _modifiers?: { axisLock: string; snapGrid: boolean }) => {
      updateScene((currentScene) => {
        const currentNode = currentScene.nodes.find((node) => node.id === nodeId)

        if (
          !currentNode ||
          (currentNode.position.x === position.x && currentNode.position.y === position.y)
        ) {
          return currentScene
        }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) =>
            node.id === nodeId ? { ...node, position } : node,
          ),
        }
      })
    },
    [updateScene],
  )

  const connectNodes = useCallback(
    (connection: CanvasConnection) => {
      updateScene((currentScene) => {
        const targetNode = currentScene.nodes.find((node) => node.id === connection.toNodeId)
        const nextConnections = [
          ...currentScene.connections.filter(
            (currentConnection) =>
              currentConnection.fromNodeId !== connection.fromNodeId ||
              currentConnection.fromInternalStructureId !== connection.fromInternalStructureId,
          ),
          connection,
        ]

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: targetNode
            ? currentScene.nodes.map((canvasNode) => {
                if (canvasNode.id !== connection.fromNodeId) {
                  return canvasNode
                }

                const slot = findOutputSlotInNode(
                  canvasNode,
                  connection.fromInternalStructureId,
                  nextConnections,
                )

                if (!slot) {
                  return canvasNode
                }

                return {
                  ...canvasNode,
                  node: {
                    ...canvasNode.node,
                    schema: patchOutputSlotInNodeSchema(
                      canvasNode.node.schema,
                      connection.fromInternalStructureId,
                      patchInternalStructureSlotForLink(slot, targetNode),
                      nextConnections,
                      connection.fromNodeId,
                    ),
                  },
                }
              })
            : currentScene.nodes,
        }
      })
    },
    [updateScene],
  )

  const removeConnection = useCallback(
    (connectionId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.filter((connection) => connection.id !== connectionId),
      }))
    },
    [updateScene],
  )

  const cycleConnectionRouting = useCallback(
    (connectionId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.map((connection) => {
          if (connection.id !== connectionId) {
            return connection
          }

          return { ...connection, routing: nextConnectionRouting(connection.routing) }
        }),
      }))
    },
    [updateScene],
  )

  const createChildNode = useCallback(
    (fromNodeId: string, slot: InternalStructureDefinition, placement?: CanvasPosition) => {
      updateScene((currentScene) => {
        const sourceNode = currentScene.nodes.find((node) => node.id === fromNodeId)

        if (!sourceNode) {
          return currentScene
        }

        const instanceId = createUniqueNodeId(slot.schemaId, currentScene.nodes)
        const node = createNodeInstanceFromRegistry(schemaLookup, slot.schemaId, instanceId)

        if (!node) {
          return currentScene
        }

        const defaultPosition: CanvasPosition = {
          x: sourceNode.position.x + 520,
          y: sourceNode.position.y + 90,
        }

        const newCanvasNode = {
          id: instanceId,
          node,
          position: placement ?? defaultPosition,
        }

        const connection: CanvasConnection = {
          id: `${fromNodeId}:${slot.id}->${instanceId}`,
          fromInternalStructureId: slot.id,
          fromNodeId,
          toNodeId: instanceId,
        }

        queueMicrotask(() =>
          setSelectionState({
            ids: [instanceId],
            primaryId: instanceId,
          }),
        )

        const nextConnections = [
          ...currentScene.connections.filter(
            (currentConnection) =>
              currentConnection.fromNodeId !== fromNodeId ||
              currentConnection.fromInternalStructureId !== slot.id,
          ),
          connection,
        ]

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: [
            ...currentScene.nodes.map((canvasNode) => {
              if (canvasNode.id !== fromNodeId) {
                return canvasNode
              }

              return {
                ...canvasNode,
                node: {
                  ...canvasNode.node,
                  schema: patchOutputSlotInNodeSchema(
                    canvasNode.node.schema,
                    slot.id,
                    patchInternalStructureSlotForLink(slot, newCanvasNode),
                    nextConnections,
                    fromNodeId,
                  ),
                },
              }
            }),
            newCanvasNode,
          ],
        }
      })
    },
    [updateScene, schemaLookup],
  )

  const relinkInternalStructureSlot = useCallback(
    (fromNodeId: string, structureId: string, targetNodeId: string) => {
      updateScene((currentScene) => {
        const sourceNode = currentScene.nodes.find((node) => node.id === fromNodeId)
        const targetNode = currentScene.nodes.find((node) => node.id === targetNodeId)

        if (!sourceNode || !targetNode) {
          return currentScene
        }

        const structure = findOutputSlotInNode(sourceNode, structureId, currentScene.connections)

        if (!structure) {
          return currentScene
        }

        const connection: CanvasConnection = {
          id: `${fromNodeId}:${structureId}->${targetNodeId}`,
          fromInternalStructureId: structureId,
          fromNodeId,
          toNodeId: targetNodeId,
        }

        const nextConnections = [
          ...currentScene.connections.filter(
            (currentConnection) =>
              currentConnection.fromNodeId !== fromNodeId ||
              currentConnection.fromInternalStructureId !== structureId,
          ),
          connection,
        ]

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((canvasNode) => {
            if (canvasNode.id !== fromNodeId) {
              return canvasNode
            }

            return {
              ...canvasNode,
              node: {
                ...canvasNode.node,
                schema: patchOutputSlotInNodeSchema(
                  canvasNode.node.schema,
                  structureId,
                  patchInternalStructureSlotForLink(structure, targetNode),
                  nextConnections,
                  fromNodeId,
                ),
              },
            }
          }),
        }
      })
    },
    [updateScene],
  )

  const createRootNode = useCallback((schema: NodeSchemaDefinition) => {
    updateScene((currentScene) => {
      const instanceId = createUniqueNodeId(schema.id, currentScene.nodes)
      const node = createNodeInstanceFromRegistry(schemaLookup, schema.id, instanceId)

      if (!node) {
        return currentScene
      }

      queueMicrotask(() =>
        setSelectionState({
          ids: [instanceId],
          primaryId: instanceId,
        }),
      )

      return {
        ...currentScene,
        nodes: [
          ...currentScene.nodes,
          {
            id: instanceId,
            node,
            position: getNextDetachedNodePosition(currentScene),
          },
        ],
      }
    })
  }, [updateScene, schemaLookup])

  const deleteNodeIds = useCallback(
    (identifiers: string[]) => {
      const idSet = new Set(identifiers.filter((id) => id !== ROOT_NODE_ID))

      if (idSet.size === 0) {
        return
      }

      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.filter(
          (connection) => !idSet.has(connection.fromNodeId) && !idSet.has(connection.toNodeId),
        ),
        nodes: currentScene.nodes.filter((node) => !idSet.has(node.id)),
      }))
    },
    [updateScene],
  )

  const deleteSelectedNodes = useCallback(() => {
    deleteNodeIds(orderedSelectionUnique)
  }, [deleteNodeIds, orderedSelectionUnique])

  const updateSelectedParameter = useCallback(
    (parameterId: string, value: string) => {
      updateScene((currentScene) => {
        const currentNode = currentScene.nodes.find((node) => node.id === primarySelectedId)

        if (!currentNode) {
          return currentScene
        }

        const currentValue = currentNode.node.values.find(
          (parameterValue) => parameterValue.parameterId === parameterId,
        )
        const partner = link_parameter_value_partner(currentNode.node, parameterId)
        const partnerVal = partner
          ? currentNode.node.values.find((v) => v.parameterId === partner)?.value
          : undefined

        if (currentValue?.value === value && (!partner || partnerVal === value)) {
          return currentScene
        }

        const nextValues = link_parameter_value_patch_values(
          currentNode.node.values,
          parameterId,
          value,
          currentNode.node.parameter_value_links,
        )

        const catalog = schemaBaseParameterCatalogBySchemaId[currentNode.node.schema.id] ?? []
        const patched: NodeInstance = {
          ...currentNode.node,
          values: nextValues,
        }
        const synced = syncHashStringMirrorFromValues(patched, catalog)
        const listId = synced.hashStringParameterId ?? synced.schema.hashStringParameterId
        const mirror = synced.hashString ?? synced.schema.hashString
        if (listId !== undefined && typeof mirror === 'string') {
          scheduleHashStringSchemaDiskPersist(currentNode.id, currentNode.node.schema.id, listId, mirror)
        }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== primarySelectedId
              ? canvasNode
              : {
                  ...canvasNode,
                  node: synced,
                },
          ),
        }
      })
    },
    [primarySelectedId, updateScene],
  )

  const applyHashStringSourceToSelectedNode = useCallback(
    (canvasParameterId: string) => {
      updateScene((currentScene) => {
        const currentNode = currentScene.nodes.find((node) => node.id === primarySelectedId)

        if (!currentNode) {
          return currentScene
        }

        const catalog = schemaBaseParameterCatalogBySchemaId[currentNode.node.schema.id] ?? []
        const nextNode = addHashStringInNode(currentNode.node, canvasParameterId, catalog)

        if (!nextNode) {
          return currentScene
        }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== primarySelectedId ? canvasNode : { ...canvasNode, node: nextNode },
          ),
        }
      })
    },
    [primarySelectedId, updateScene],
  )

  const toggleSelectedParameterRequired = useCallback(
    (parameterId: string) => {
      updateScene((currentScene) => {
        const currentNode = currentScene.nodes.find((node) => node.id === primarySelectedId)

        if (!currentNode) {
          return currentScene
        }

        const row = currentNode.node.schema.parameters.find((parameter) => parameter.id === parameterId)

        if (!row) {
          return currentScene
        }

        const listId = resolveRequiredParameterListId(
          row,
          schemaBaseParameterCatalogBySchemaId[currentNode.node.schema.id],
        )

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== primarySelectedId
              ? canvasNode
              : { ...canvasNode, node: fx_required_parameter(canvasNode.node, listId) },
          ),
        }
      })
    },
    [primarySelectedId, updateScene],
  )

  const updateNodeParameter = useCallback(
    (nodeId: string, parameterId: string, value: string) => {
      updateScene((currentScene) => {
        const currentNode = currentScene.nodes.find((node) => node.id === nodeId)

        if (!currentNode) {
          return currentScene
        }

        const currentValue = currentNode.node.values.find(
          (parameterValue) => parameterValue.parameterId === parameterId,
        )
        const partner = link_parameter_value_partner(currentNode.node, parameterId)
        const partnerVal = partner
          ? currentNode.node.values.find((v) => v.parameterId === partner)?.value
          : undefined

        if (currentValue?.value === value && (!partner || partnerVal === value)) {
          return currentScene
        }

        const nextValues = link_parameter_value_patch_values(
          currentNode.node.values,
          parameterId,
          value,
          currentNode.node.parameter_value_links,
        )

        const catalog = schemaBaseParameterCatalogBySchemaId[currentNode.node.schema.id] ?? []
        const patched: NodeInstance = {
          ...currentNode.node,
          values: nextValues,
        }
        const synced = syncHashStringMirrorFromValues(patched, catalog)
        const listId = synced.hashStringParameterId ?? synced.schema.hashStringParameterId
        const mirror = synced.hashString ?? synced.schema.hashString
        if (listId !== undefined && typeof mirror === 'string') {
          scheduleHashStringSchemaDiskPersist(currentNode.id, currentNode.node.schema.id, listId, mirror)
        }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== nodeId
              ? canvasNode
              : {
                  ...canvasNode,
                  node: synced,
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const setNodeParameterOrder = useCallback(
    (nodeId: string, parameterId: string, oneBasedIndex: number) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return currentScene
        }

        const parameters = canvasNode.node.schema.parameters
        const count = parameters.length
        if (count === 0) {
          return currentScene
        }

        const fromIndex = parameters.findIndex((parameter) => parameter.id === parameterId)
        if (fromIndex < 0) {
          return currentScene
        }

        const targetOneBased = Math.max(1, Math.min(count, Math.trunc(oneBasedIndex)))
        const toIndex = targetOneBased - 1
        if (fromIndex === toIndex) {
          return currentScene
        }

        const nextParameters = [...parameters]
        const [moved] = nextParameters.splice(fromIndex, 1)
        nextParameters.splice(toIndex, 0, moved)

        const valueById = new Map(
          canvasNode.node.values.map((entry) => [entry.parameterId, entry] as const),
        )
        const nextValues = nextParameters.map((parameter) => {
          const existing = valueById.get(parameter.id)
          return existing ?? { parameterId: parameter.id, value: parameter.defaultValue }
        })

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) =>
            node.id !== nodeId
              ? node
              : {
                  ...node,
                  node: {
                    ...node.node,
                    schema: { ...node.node.schema, parameters: nextParameters },
                    values: nextValues,
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const setSelectedNodeParameterOrder = useCallback(
    (parameterId: string, oneBasedIndex: number) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === primarySelectedId)
        if (!canvasNode) {
          return currentScene
        }

        const parameters = canvasNode.node.schema.parameters
        const count = parameters.length
        if (count === 0) {
          return currentScene
        }

        const fromIndex = parameters.findIndex((parameter) => parameter.id === parameterId)
        if (fromIndex < 0) {
          return currentScene
        }

        const targetOneBased = Math.max(1, Math.min(count, Math.trunc(oneBasedIndex)))
        const toIndex = targetOneBased - 1
        if (fromIndex === toIndex) {
          return currentScene
        }

        const nextParameters = [...parameters]
        const [moved] = nextParameters.splice(fromIndex, 1)
        nextParameters.splice(toIndex, 0, moved)

        const valueById = new Map(
          canvasNode.node.values.map((entry) => [entry.parameterId, entry] as const),
        )
        const nextValues = nextParameters.map((parameter) => {
          const existing = valueById.get(parameter.id)
          return existing ?? { parameterId: parameter.id, value: parameter.defaultValue }
        })

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) =>
            node.id !== primarySelectedId
              ? node
              : {
                  ...node,
                  node: {
                    ...node.node,
                    schema: { ...node.node.schema, parameters: nextParameters },
                    values: nextValues,
                  },
                },
          ),
        }
      })
    },
    [primarySelectedId, updateScene],
  )

  const swapSelectedNodeParameters = useCallback(
    (parameterIdA: string, parameterIdB: string) => {
      if (parameterIdA === parameterIdB) {
        return
      }

      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === primarySelectedId)
        if (!canvasNode) {
          return currentScene
        }

        const parameters = [...canvasNode.node.schema.parameters]
        const indexA = parameters.findIndex((parameter) => parameter.id === parameterIdA)
        const indexB = parameters.findIndex((parameter) => parameter.id === parameterIdB)

        if (indexA < 0 || indexB < 0) {
          return currentScene
        }

        ;[parameters[indexA], parameters[indexB]] = [parameters[indexB], parameters[indexA]]

        const valueById = new Map(
          canvasNode.node.values.map((entry) => [entry.parameterId, entry] as const),
        )
        const nextValues = parameters.map((parameter) => {
          const existing = valueById.get(parameter.id)
          return existing ?? { parameterId: parameter.id, value: parameter.defaultValue }
        })

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) =>
            node.id !== primarySelectedId
              ? node
              : {
                  ...node,
                  node: {
                    ...node.node,
                    schema: { ...node.node.schema, parameters },
                    values: nextValues,
                  },
                },
          ),
        }
      })
    },
    [primarySelectedId, updateScene],
  )

  const addDynamicParameter = useCallback(
    (nodeId: string, template: NodeParameterDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const existingIds = new Set(canvasNode.node.schema.parameters.map((parameter) => parameter.id))
          const newParameterId = existingIds.has(template.id)
            ? `dyn-param-${crypto.randomUUID().slice(0, 10)}`
            : template.id
          const newParameterDefinition: NodeParameterDefinition = {
            ...template,
            id: newParameterId,
          }

          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: {
                ...canvasNode.node.schema,
                parameters: [...canvasNode.node.schema.parameters, newParameterDefinition],
              },
              values: [
                ...canvasNode.node.values,
                { parameterId: newParameterId, value: template.defaultValue },
              ],
            },
          }
        }),
      }))
    },
    [updateScene],
  )

  const linkParameterValuePairForNode = useCallback(
    (nodeId: string, parameterIdA: string, parameterIdB: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          let nextNode = link_parameter_value_add_pair(canvasNode.node, parameterIdA, parameterIdB)
          const sourceValue =
            nextNode.values.find((v) => v.parameterId === parameterIdA)?.value ??
            nextNode.schema.parameters.find((p) => p.id === parameterIdA)?.defaultValue ??
            ''

          nextNode = {
            ...nextNode,
            values: link_parameter_value_patch_values(
              nextNode.values,
              parameterIdA,
              sourceValue,
              nextNode.parameter_value_links,
            ),
          }

          const catalog = schemaBaseParameterCatalogBySchemaId[nextNode.schema.id] ?? []
          const diskList = diskLinkedPairsFromCanvas(
            nextNode,
            nextNode.parameter_value_links,
            catalog,
          )

          nextNode = {
            ...nextNode,
            schema: {
              ...nextNode.schema,
              linked_parameter_values: diskList,
            },
          }

          return { ...canvasNode, node: nextNode }
        }),
      }))
    },
    [updateScene],
  )

  const unlinkParameterValueForNode = useCallback(
    (nodeId: string, parameterId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          let nextNode = link_parameter_value_remove_involving(canvasNode.node, parameterId)
          const catalog = schemaBaseParameterCatalogBySchemaId[nextNode.schema.id] ?? []
          const diskList = diskLinkedPairsFromCanvas(
            nextNode,
            nextNode.parameter_value_links,
            catalog,
          )

          nextNode = {
            ...nextNode,
            schema: {
              ...nextNode.schema,
              linked_parameter_values: diskList,
            },
          }

          return {
            ...canvasNode,
            node: nextNode,
          }
        }),
      }))
    },
    [updateScene],
  )

  const removeCanvasParameter = useCallback(
    (nodeId: string, parameterId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) =>
          canvasNode.id !== nodeId
            ? canvasNode
            : {
                ...canvasNode,
                node: (() => {
                  let cleaned = link_parameter_value_remove_involving(
                    {
                      ...canvasNode.node,
                      schema: {
                        ...canvasNode.node.schema,
                        parameters: canvasNode.node.schema.parameters.filter(
                          (parameter) => parameter.id !== parameterId,
                        ),
                      },
                      values: canvasNode.node.values.filter(
                        (value) => value.parameterId !== parameterId,
                      ),
                    },
                    parameterId,
                  )
                  cleaned = linked_parameter_values_apply_to_instance(
                    cleaned,
                    cleaned.parameter_value_links ?? [],
                    undefined,
                    schemaBaseParameterCatalogBySchemaId[cleaned.schema.id] ?? [],
                  )
                  return cleaned
                })(),
              },
        ),
      }))
    },
    [updateScene],
  )

  const addDynamicInternalStructureSlot = useCallback(
    (nodeId: string, template: InternalStructureDefinition) => {
      const newStructureId = `dyn-is-${crypto.randomUUID().slice(0, 10)}`
      const newStructure: InternalStructureDefinition = {
        ...template,
        id: newStructureId,
      }

      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) =>
          canvasNode.id !== nodeId
            ? canvasNode
            : {
                ...canvasNode,
                node: {
                  ...canvasNode.node,
                  schema: {
                    ...canvasNode.node.schema,
                    internalStructures: [
                      ...canvasNode.node.schema.internalStructures,
                      newStructure,
                    ],
                  },
                },
              },
        ),
      }))
    },
    [updateScene],
  )

  const removeCanvasInternalStructure = useCallback(
    (nodeId: string, structureId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && connection.fromInternalStructureId === structureId),
        ),
        nodes: currentScene.nodes.map((canvasNode) =>
          canvasNode.id !== nodeId
            ? canvasNode
            : {
                ...canvasNode,
                node: {
                  ...canvasNode.node,
                  schema: {
                    ...canvasNode.node.schema,
                    internalStructures: canvasNode.node.schema.internalStructures.filter(
                      (structure) => structure.id !== structureId,
                    ),
                  },
                },
              },
        ),
      }))
    },
    [updateScene],
  )

  const appendListEmbedCatalogItem = useCallback(
    (nodeId: string, templateListEmbedId: string, structure: InternalStructureDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const templateSchema = schemaLookup[canvasNode.node.schema.id] ?? null
          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: appendListEmbedCatalogItemToSchema(
                canvasNode.node.schema,
                templateListEmbedId,
                structureForListEmbedAdd(structure),
                templateSchema,
              ),
            },
          }
        }),
      }))
    },
    [schemaLookup, updateScene],
  )

  const removeListEmbedSlot = useCallback(
    (nodeId: string, slotId: string) => {
      updateScene((currentScene) => {
        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && connection.fromInternalStructureId === slotId),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== nodeId
              ? canvasNode
              : {
                  ...canvasNode,
                  node: {
                    ...canvasNode.node,
                    schema: removeListEmbedSlotFromSchema(
                      canvasNode.node.schema,
                      slotId,
                      nextConnections,
                      nodeId,
                    ),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const appendEmbedCatalogItem = useCallback(
    (nodeId: string, targetEmbedId: string, structure: InternalStructureDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const templateSchema = schemaLookup[canvasNode.node.schema.id] ?? null
          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: appendEmbedCatalogItemToSchema(
                canvasNode.node.schema,
                targetEmbedId,
                structureForEmbedAdd(structure),
                templateSchema,
              ),
            },
          }
        }),
      }))
    },
    [schemaLookup, updateScene],
  )

  const appendPointerCatalogItem = useCallback(
    (nodeId: string, targetPointerId: string, structure: InternalStructureDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const templateSchema = schemaLookup[canvasNode.node.schema.id] ?? null
          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: appendPointerCatalogItemToSchema(
                canvasNode.node.schema,
                targetPointerId,
                structureForPointerAdd(structure),
                templateSchema,
              ),
            },
          }
        }),
      }))
    },
    [schemaLookup, updateScene],
  )

  const appendListPointerCatalogItem = useCallback(
    (nodeId: string, targetListPointerId: string, structure: InternalStructureDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const templateSchema = schemaLookup[canvasNode.node.schema.id] ?? null
          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: appendListPointerCatalogItemToSchema(
                canvasNode.node.schema,
                targetListPointerId,
                structureForListPointerAdd(structure),
                templateSchema,
              ),
            },
          }
        }),
      }))
    },
    [schemaLookup, updateScene],
  )

  const removeEmbedSlot = useCallback(
    (nodeId: string, slotId: string) => {
      updateScene((currentScene) => {
        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && connection.fromInternalStructureId === slotId),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== nodeId
              ? canvasNode
              : {
                  ...canvasNode,
                  node: {
                    ...canvasNode.node,
                    schema: removeEmbedSlotFromSchema(canvasNode.node.schema, slotId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removeEmbedBlock = useCallback(
    (nodeId: string, blockInstanceId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((entry) => entry.id === nodeId)
        const block = canvasNode?.node.schema.embed?.find((entry) => entry.id === blockInstanceId)
        const slotIds = block ? new Set(slotIdsForEmbedBlock(block)) : new Set<string>()

        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(
              connection.fromNodeId === nodeId &&
              slotIds.has(connection.fromInternalStructureId)
            ),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((entry) =>
            entry.id !== nodeId
              ? entry
              : {
                  ...entry,
                  node: {
                    ...entry.node,
                    schema: removeEmbedBlockFromSchema(entry.node.schema, blockInstanceId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removeConnectionsFromOutputSlot = useCallback(
    (nodeId: string, structureId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.filter(
          (connection) =>
            !(
              connection.fromNodeId === nodeId &&
              connection.fromInternalStructureId === structureId
            ),
        ),
      }))
    },
    [updateScene],
  )

  const removePointerSlot = useCallback(
    (nodeId: string, slotId: string) => {
      updateScene((currentScene) => {
        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && connection.fromInternalStructureId === slotId),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== nodeId
              ? canvasNode
              : {
                  ...canvasNode,
                  node: {
                    ...canvasNode.node,
                    schema: removePointerSlotFromSchema(canvasNode.node.schema, slotId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removePointerBlock = useCallback(
    (nodeId: string, blockInstanceId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((entry) => entry.id === nodeId)
        const block = canvasNode?.node.schema.pointer?.find((entry) => entry.id === blockInstanceId)
        const slotIds = block ? new Set(slotIdsForPointerBlock(block)) : new Set<string>()

        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(
              connection.fromNodeId === nodeId &&
              slotIds.has(connection.fromInternalStructureId)
            ),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((entry) =>
            entry.id !== nodeId
              ? entry
              : {
                  ...entry,
                  node: {
                    ...entry.node,
                    schema: removePointerBlockFromSchema(entry.node.schema, blockInstanceId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removeListEmbedBlock = useCallback(
    (nodeId: string, blockInstanceId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((entry) => entry.id === nodeId)
        const block = canvasNode?.node.schema.listEmbed?.find((entry) => entry.id === blockInstanceId)
        const slotIds = block ? new Set(slotIdsForListEmbedBlock(block)) : new Set<string>()

        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(
              connection.fromNodeId === nodeId &&
              slotIds.has(connection.fromInternalStructureId)
            ),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((entry) =>
            entry.id !== nodeId
              ? entry
              : {
                  ...entry,
                  node: {
                    ...entry.node,
                    schema: removeListEmbedBlockFromSchema(entry.node.schema, blockInstanceId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removeListPointerSlot = useCallback(
    (nodeId: string, slotId: string) => {
      updateScene((currentScene) => {
        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && connection.fromInternalStructureId === slotId),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((canvasNode) =>
            canvasNode.id !== nodeId
              ? canvasNode
              : {
                  ...canvasNode,
                  node: {
                    ...canvasNode.node,
                    schema: removeListPointerSlotFromSchema(canvasNode.node.schema, slotId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removeListPointerBlock = useCallback(
    (nodeId: string, blockInstanceId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((entry) => entry.id === nodeId)
        const block = canvasNode?.node.schema.listPointer?.find((entry) => entry.id === blockInstanceId)
        const slotIds = block ? new Set(slotIdsForListPointerBlock(block)) : new Set<string>()

        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(
              connection.fromNodeId === nodeId &&
              slotIds.has(connection.fromInternalStructureId)
            ),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((entry) =>
            entry.id !== nodeId
              ? entry
              : {
                  ...entry,
                  node: {
                    ...entry.node,
                    schema: removeListPointerBlockFromSchema(entry.node.schema, blockInstanceId),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const appendList2EmbedCatalogItem = useCallback(
    (nodeId: string, targetList2EmbedId: string, structure: InternalStructureDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const templateSchema = schemaLookup[canvasNode.node.schema.id] ?? null
          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: appendList2EmbedCatalogItemToSchema(
                canvasNode.node.schema,
                targetList2EmbedId,
                structure,
                templateSchema,
              ),
            },
          }
        }),
      }))
    },
    [schemaLookup, updateScene],
  )

  const appendList2PointerCatalogItem = useCallback(
    (nodeId: string, targetList2PointerId: string, structure: InternalStructureDefinition) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((canvasNode) => {
          if (canvasNode.id !== nodeId) {
            return canvasNode
          }

          const templateSchema = schemaLookup[canvasNode.node.schema.id] ?? null
          return {
            ...canvasNode,
            node: {
              ...canvasNode.node,
              schema: appendList2PointerCatalogItemToSchema(
                canvasNode.node.schema,
                targetList2PointerId,
                structure,
                templateSchema,
              ),
            },
          }
        }),
      }))
    },
    [schemaLookup, updateScene],
  )

  const removeList2EmbedInstance = useCallback(
    (nodeId: string, blockId: string, instanceId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((entry) => entry.id === nodeId)
        const block = canvasNode?.node.schema.list2Embed?.find((entry) => entry.id === blockId)
        const instance = block?.instances.find((entry) => entry.id === instanceId)
        const slotIds = instance
          ? new Set(populatedSlotsForList2EmbedInstance(instance).map((slot) => slot.id))
          : new Set<string>()

        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && slotIds.has(connection.fromInternalStructureId)),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((entry) =>
            entry.id !== nodeId
              ? entry
              : {
                  ...entry,
                  node: {
                    ...entry.node,
                    schema: removeList2EmbedInstanceFromSchema(
                      entry.node.schema,
                      blockId,
                      instanceId,
                    ),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const removeList2PointerInstance = useCallback(
    (nodeId: string, blockId: string, instanceId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((entry) => entry.id === nodeId)
        const block = canvasNode?.node.schema.list2Pointer?.find((entry) => entry.id === blockId)
        const instance = block?.instances.find((entry) => entry.id === instanceId)
        const slotIds = instance
          ? new Set(populatedSlotsForList2PointerInstance(instance).map((slot) => slot.id))
          : new Set<string>()

        const nextConnections = currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && slotIds.has(connection.fromInternalStructureId)),
        )

        return {
          ...currentScene,
          connections: nextConnections,
          nodes: currentScene.nodes.map((entry) =>
            entry.id !== nodeId
              ? entry
              : {
                  ...entry,
                  node: {
                    ...entry.node,
                    schema: removeList2PointerInstanceFromSchema(
                      entry.node.schema,
                      blockId,
                      instanceId,
                    ),
                  },
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const undoScene = useCallback(() => {
    setSceneHistory((currentHistory) => {
      const previousScene = currentHistory.past.at(-1)

      if (!previousScene) {
        return currentHistory
      }

      queueMicrotask(() =>
        setSelectionState((prev) => {
          const restored = [...prev.ids].filter((identifier) =>
            previousScene.nodes.some((node) => node.id === identifier),
          )

          if (restored.length === 0) {
            const fallback =
              previousScene.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ??
              previousScene.nodes[0]?.id ??
              ''

            return fallback
              ? { ids: [fallback], primaryId: fallback }
              : { ids: [], primaryId: '' }
          }

          const primary =
            restored.includes(prev.primaryId) ? prev.primaryId : restored[0]

          return {
            ids: restored,
            primaryId: primary,
          }
        }),
      )

      return {
        future: [currentHistory.present, ...currentHistory.future],
        past: currentHistory.past.slice(0, -1),
        present: previousScene,
      }
    })
  }, [])

  const redoScene = useCallback(() => {
    setSceneHistory((currentHistory) => {
      const nextScene = currentHistory.future[0]

      if (!nextScene) {
        return currentHistory
      }

      queueMicrotask(() =>
        setSelectionState((prev) => {
          const restored = [...prev.ids].filter((identifier) =>
            nextScene.nodes.some((node) => node.id === identifier),
          )

          if (restored.length === 0) {
            const fallback =
              nextScene.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ??
              nextScene.nodes[0]?.id ??
              ''

            return fallback
              ? { ids: [fallback], primaryId: fallback }
              : { ids: [], primaryId: '' }
          }

          const primary =
            restored.includes(prev.primaryId) ? prev.primaryId : restored[0]

          return {
            ids: restored,
            primaryId: primary,
          }
        }),
      )

      return {
        future: currentHistory.future.slice(1),
        past: [...currentHistory.past, currentHistory.present],
        present: nextScene,
      }
    })
  }, [])

  const resetScene = useCallback(() => {
    window.localStorage.removeItem(SCENE_STORAGE_KEY)
    const emptySelection = [ROOT_NODE_ID]

    setSceneHistory({
      future: [],
      past: [],
      present: staticCanvasScene,
    })
    setSelectionState({ ids: emptySelection, primaryId: ROOT_NODE_ID })
    workspaceService.syncSceneToDisk(staticCanvasScene)
  }, [])

  return {
    cycleConnectionRouting,
    redoScene,
    resetScene,
    sceneHistory,
    moveNode,
    connectNodes,
    removeConnection,
    removeConnectionsFromOutputSlot,
    relinkInternalStructureSlot,
    createChildNode,
    createRootNode,
    deleteNodeIds,
    deleteSelectedNodes,
    updateScene,
    updateSelectedParameter,
    updateNodeParameter,
    setNodeParameterOrder,
    setSelectedNodeParameterOrder,
    swapSelectedNodeParameters,
    toggleSelectedParameterRequired,
    applyHashStringSourceToSelectedNode,
    linkParameterValuePairForNode,
    unlinkParameterValueForNode,
    addDynamicParameter,
    removeCanvasParameter,
    addDynamicInternalStructureSlot,
    appendEmbedCatalogItem,
    appendPointerCatalogItem,
    appendListEmbedCatalogItem,
    appendListPointerCatalogItem,
    appendList2EmbedCatalogItem,
    appendList2PointerCatalogItem,
    removeList2EmbedInstance,
    removeList2PointerInstance,
    removeCanvasInternalStructure,
    removeEmbedSlot,
    removeEmbedBlock,
    removePointerSlot,
    removePointerBlock,
    removeListEmbedSlot,
    removeListEmbedBlock,
    removeListPointerSlot,
    removeListPointerBlock,
    scene,
    selectedNodeIds: orderedSelectionUnique,
    primarySelectedId,
    commitMarqueeSelection,
    selectNode,
    selectAllNodes,
    undoScene,
    selectedNode,
    replaceScene,
    clearSelection,
  }
}
