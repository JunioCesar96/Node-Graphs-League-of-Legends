import { useCallback, useEffect, useMemo, useState } from 'react'

import type { CanvasConnection, CanvasPosition, CanvasScene, ConnectionRouting } from '@/core/canvasScene'
import {
  createNodeInstance,
  hydrateScene,
  staticCanvasScene,
} from '@/core/canvasScene'
import type { NodeEntityDefinition, NodeParameterDefinition, NodeSchemaDefinition } from '@/core/nodeSchema'
import { STORAGE_LAST_STRUCTURE_META } from '@/core/workspaceStorage'

export const ROOT_NODE_ID = 'particle-root-01'

export const SCENE_STORAGE_KEY = 'node-graphs-lol:scene'

const DETACHED_NODE_COLUMNS = 3

const DETACHED_NODE_START: CanvasPosition = { x: 96, y: 96 }

const DETACHED_NODE_STEP: CanvasPosition = { x: 420, y: 220 }

const NODE_COLLISION_GAP: CanvasPosition = { x: 380, y: 180 }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isCanvasScene(value: unknown): value is CanvasScene {
  if (!isRecord(value)) {
    return false
  }

  return (
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.connections)
  )
}

export function loadStoredScene(): CanvasScene {
  try {
    const storedScene = window.localStorage.getItem(SCENE_STORAGE_KEY)

    if (!storedScene) {
      return staticCanvasScene
    }

    const parsedScene: unknown = JSON.parse(storedScene)

    return isCanvasScene(parsedScene) ? hydrateScene(parsedScene) : staticCanvasScene
  } catch {
    return staticCanvasScene
  }
}

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

/** Hook central do grafo local com histórico, persistência em localStorage e multi-seleção. */
export function useSceneHistory() {
  const [initialPresent] = useState<CanvasScene>(() => loadStoredScene())

  const [sceneHistory, setSceneHistory] = useState(() => ({
    future: [] as CanvasScene[],
    past: [] as CanvasScene[],
    present: initialPresent,
  }))

  const scene = sceneHistory.present

  const [selectionState, setSelectionState] = useState(() => {
    const fallback =
      initialPresent.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ??
      initialPresent.nodes[0]?.id ??
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

      if (nextIds.length === 0 && scene.nodes.length > 0) {
        nextIds = [scene.nodes[0].id]
      }

      let primaryCandidate =
        valid.has(previous.primaryId) && nextIds.includes(previous.primaryId)
          ? previous.primaryId
          : (nextIds[0] ?? '')

      if (!primaryCandidate && scene.nodes.length > 0) {
        primaryCandidate = scene.nodes[0].id
        nextIds = [primaryCandidate]
      }

      const samePrimary = previous.primaryId === primaryCandidate
      const sameIds =
        nextIds.length === previous.ids.length &&
        nextIds.every((id, idx) => previous.ids[idx] === id)

      if (samePrimary && sameIds) {
        return previous
      }

      return {
        ids: nextIds.length > 0 ? nextIds : primaryCandidate ? [primaryCandidate] : [],
        primaryId: primaryCandidate || ROOT_NODE_ID,
      }
    })
  }, [scene])

  useEffect(() => {
    window.localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(scene))
  }, [scene])

  const orderedSelectionUnique = useMemo(
    () => [...new Set(selectionState.ids)],
    [selectionState.ids],
  )

  const primarySelectedId = selectionState.primaryId || orderedSelectionUnique[0] || scene.nodes[0]?.id || ROOT_NODE_ID

  const selectedNode = scene.nodes.find((node) => node.id === primarySelectedId) ?? scene.nodes[0]

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

        if (nextArr.length === 0 && scene.nodes[0]) {
          nextArr = [scene.nodes[0].id]
          return {
            ids: nextArr,
            primaryId: nextArr[0],
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
          const fallback =
            scene.nodes.find((node) => node.id === ROOT_NODE_ID)?.id ?? scene.nodes[0]?.id ?? ROOT_NODE_ID

          setSelectionState({ ids: fallback ? [fallback] : [], primaryId: fallback || ROOT_NODE_ID })

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

        if (nextArr.length === 0 && scene.nodes[0]) {
          nextArr = [scene.nodes[0].id]
        }

        const primaryKeeps =
          prev.primaryId && bag.has(prev.primaryId) ? prev.primaryId : (nextArr[0] ?? ROOT_NODE_ID)

        return {
          ids: nextArr.length > 0 ? nextArr : [primaryKeeps],
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
      updateScene((currentScene) => ({
        ...currentScene,
        connections: [
          ...currentScene.connections.filter(
            (currentConnection) =>
              currentConnection.fromNodeId !== connection.fromNodeId ||
              currentConnection.fromEntityId !== connection.fromEntityId,
          ),
          connection,
        ],
      }))
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

          const nextRouting: ConnectionRouting =
            connection.routing === 'rigid' ? 'flex' : 'rigid'

          return { ...connection, routing: nextRouting }
        }),
      }))
    },
    [updateScene],
  )

  const createChildNode = useCallback((fromNodeId: string, entity: NodeEntityDefinition, placement?: CanvasPosition) => {
    updateScene((currentScene) => {
      const sourceNode = currentScene.nodes.find((node) => node.id === fromNodeId)

      if (!sourceNode) {
        return currentScene
      }

      const instanceId = createUniqueNodeId(entity.schemaId, currentScene.nodes)
      const node = createNodeInstance(entity.schemaId, instanceId)

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
        id: `${fromNodeId}:${entity.id}->${instanceId}`,
        fromEntityId: entity.id,
        fromNodeId,
        toNodeId: instanceId,
      }

      queueMicrotask(() =>
        setSelectionState({
          ids: [instanceId],
          primaryId: instanceId,
        }),
      )

      return {
        ...currentScene,
        connections: [
          ...currentScene.connections.filter(
            (currentConnection) =>
              currentConnection.fromNodeId !== fromNodeId ||
              currentConnection.fromEntityId !== entity.id,
          ),
          connection,
        ],
        nodes: [...currentScene.nodes, newCanvasNode],
      }
    })
  }, [])

  const createRootNode = useCallback((schema: NodeSchemaDefinition) => {
    updateScene((currentScene) => {
      const instanceId = createUniqueNodeId(schema.id, currentScene.nodes)
      const node = createNodeInstance(schema.id, instanceId)

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
  }, [])

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
        const currentValue = currentNode?.node.values.find(
          (parameterValue) => parameterValue.parameterId === parameterId,
        )

        if (!currentNode || currentValue?.value === value) {
          return currentScene
        }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((canvasNode) => {
            if (canvasNode.id !== primarySelectedId) {
              return canvasNode
            }

            const hasValue = canvasNode.node.values.some(
              (parameterValue) => parameterValue.parameterId === parameterId,
            )

            return {
              ...canvasNode,
              node: {
                ...canvasNode.node,
                values: hasValue
                  ? canvasNode.node.values.map((parameterValue) =>
                      parameterValue.parameterId === parameterId
                        ? { ...parameterValue, value }
                        : parameterValue,
                    )
                  : [...canvasNode.node.values, { parameterId, value }],
              },
            }
          }),
        }
      })
    },
    [primarySelectedId, updateScene],
  )

  const addDynamicParameter = useCallback(
    (nodeId: string, template: NodeParameterDefinition) => {
      const newParameterId = `dyn-param-${crypto.randomUUID().slice(0, 10)}`
      const newParameterDefinition: NodeParameterDefinition = {
        ...template,
        id: newParameterId,
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
                    parameters: [...canvasNode.node.schema.parameters, newParameterDefinition],
                  },
                  values: [
                    ...canvasNode.node.values,
                    { parameterId: newParameterId, value: template.defaultValue },
                  ],
                },
              },
        ),
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
                node: {
                  ...canvasNode.node,
                  schema: {
                    ...canvasNode.node.schema,
                    parameters: canvasNode.node.schema.parameters.filter((parameter) => parameter.id !== parameterId),
                  },
                  values: canvasNode.node.values.filter((value) => value.parameterId !== parameterId),
                },
              },
        ),
      }))
    },
    [updateScene],
  )

  const addDynamicEntitySlot = useCallback(
    (nodeId: string, template: NodeEntityDefinition) => {
      const newEntityId = `dyn-ent-${crypto.randomUUID().slice(0, 10)}`
      const newEntity: NodeEntityDefinition = {
        ...template,
        id: newEntityId,
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
                    entities: [...canvasNode.node.schema.entities, newEntity],
                  },
                },
              },
        ),
      }))
    },
    [updateScene],
  )

  const removeCanvasEntity = useCallback(
    (nodeId: string, entityId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.filter(
          (connection) =>
            !(connection.fromNodeId === nodeId && connection.fromEntityId === entityId),
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
                    entities: canvasNode.node.schema.entities.filter((entity) => entity.id !== entityId),
                  },
                },
              },
        ),
      }))
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
        setSelectionState((prev) => ({
          ids: [...prev.ids].filter((identifier) =>
            previousScene.nodes.some((node) => node.id === identifier),
          ).length > 0
            ? [...prev.ids].filter((identifier) =>
                previousScene.nodes.some((node) => node.id === identifier),
              )
            : [previousScene.nodes[0]?.id ?? ROOT_NODE_ID],
          primaryId:
            [...prev.ids].filter((identifier) =>
              previousScene.nodes.some((node) => node.id === identifier),
            )[0] ?? previousScene.nodes[0]?.id ?? ROOT_NODE_ID,
        })),
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
        setSelectionState((prev) => ({
          ids: [...prev.ids].filter((identifier) =>
            nextScene.nodes.some((node) => node.id === identifier),
          ).length > 0
            ? [...prev.ids].filter((identifier) => nextScene.nodes.some((node) => node.id === identifier))
            : [nextScene.nodes[0]?.id ?? ROOT_NODE_ID],
          primaryId:
            [...prev.ids].filter((identifier) => nextScene.nodes.some((node) => node.id === identifier))[0] ??
            nextScene.nodes[0]?.id ??
            ROOT_NODE_ID,
        })),
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
  }, [])

  return {
    cycleConnectionRouting,
    redoScene,
    resetScene,
    sceneHistory,
    moveNode,
    connectNodes,
    removeConnection,
    createChildNode,
    createRootNode,
    deleteNodeIds,
    deleteSelectedNodes,
    updateScene,
    updateSelectedParameter,
    addDynamicParameter,
    removeCanvasParameter,
    addDynamicEntitySlot,
    removeCanvasEntity,
    scene,
    selectedNodeIds: orderedSelectionUnique,
    primarySelectedId,
    commitMarqueeSelection,
    selectNode,
    selectAllNodes,
    undoScene,
    selectedNode,
    replaceScene,
  }
}
