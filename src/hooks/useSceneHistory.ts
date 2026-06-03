import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type {
  CanvasConnection,
  CanvasNode,
  CanvasPosition,
  CanvasScene,
  SceneCamera,
  SceneChromeState,
  SceneNodesChrome,
} from '@/core/canvasScene'
import { nextConnectionRouting } from '@/core/canvasScene'
import {
  applyCollapsedBodyWireless,
  applyCompactWireless,
  reapplyElementViewWireless,
  restoreCollapsedBodyWireless,
  restoreCompactWireless,
  syncSceneCollapsedBodyWireless,
} from '@/core/compactConnectionRouting'
import { collectBranchNodeIdsFromOutputSlots } from '@/core/compactElementBranchVisibility'
import {
  allSlotIdsForElement,
  collectCardElementViewKeys,
  isElementRetracted,
  isElementViewCompact,
  isSlotInWirelessElementView,
  patchAllCardElementsRetracted,
  patchElementRetracted,
  patchElementSelectedIndex,
  patchElementViewMode,
  resolveElementViewModeChange,
  slotIdsForElement,
} from '@/core/elementViewState'
import type { ElementViewKey, ElementViewMode } from '@/core/nodeSchema'
import {
  allVisibleSectionsExpandedMap,
  defaultNewCanvasNodeLayout,
  nextNodeCardSectionExpandedMap,
  resolveNodeCardSectionOrder,
  type NodeCardBodyLayout,
  type NodeCardSectionId,
} from '@/core/nodeCardSections'
import {
  isNodeSelectableOnCanvas,
  type NodeVisibilitySceneContext,
} from '@/core/canvasNodePresentation'
import { createCompactElementCanvasVisibility } from '@/core/compactElementBranchVisibility'
import type { BlockInspectorDraft } from '@/core/blockSchema'
import { mandatoryPointerSlotTags, slotRulesToTags } from '@/core/blockInspectorUi'
import { BLOCK_CARD_WIDTH, isBlockPointerSourcePath } from '@/core/blockSchema'
import {
  buildBlockInspectorDraftFromNode,
  generateBlockStructureFromDraft,
  revertBlockTokensFromNode,
} from '@/core/blockTokenCodegen'
import { syncBlockParameterEdit, applyBlockStructureToNodeValues } from '@/core/syncBlockToCode'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import {
  resolveSchemaIdForBlockDefinition,
} from '@/core/blockDefinitionJson'
import {
  mergeBlockHierarchyIntoScene,
  planBlockHierarchySpawn,
} from '@/core/blockHierarchySpawn'
import { persistMissingBlockParameterCatalog, persistMissingBlockParameterCatalogForDefinitions } from '@/core/blockParameterCatalogPersist'
import {
  addParameterToBlockStructure,
  applyBlockStructureWithTokens,
  removeParameterFromBlockStructure,
  updateParameterInBlockStructure,
} from '@/core/blockCatalogMutations'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import {
  applyBlockSlotConnectionToScene,
  type BlockDefinitionSpawnLinkContext,
  classifyBlockSlotConnection,
  findBlockSlotEndpoint,
} from '@/core/blockSlotConnections'
import { resolveBlockHeaderInputSlotIdForLink } from '@/core/blockCardHeaderSlots'
import { preloadAddonPackage } from '@/blockStructures/addonRegistry'
import { createAddonPlaceholderInstance } from '@/core/addonPlaceholderNode'
import { applyAddonSlotConnectionToScene, addonSlotId } from '@/core/addonSlotConnections'
import {
  applyBlockOutputToAddonInput,
  applyAddonOutputToBlockInput,
} from '@/core/addonBridgeConnections'
import { syncConnectedAddonOutputs } from '@/core/addonOutputPropagation'
import { applyAddonOutputs } from '@/nodeStructures/instanceEvaluator'
import type { GroupInspectorDraft } from '@/core/groupSchema'
import { GROUP_CARD_WIDTH, isGroupPointerSourcePath } from '@/core/groupSchema'
import { normalizeStructureCardWidth } from '@/core/structureCardLayout'
import {
  buildGroupInspectorDraftFromNode,
  generateGroupStructureFromDraft,
  revertGroupTokensFromNode,
} from '@/core/groupTokenCodegen'
import { syncGroupParameterEdit, applyGroupStructureToNodeValues } from '@/core/syncGroupToCode'
import {
  canConnectGroupSlots,
  findGroupSlotEndpoint,
  propagateGroupConnectionValue,
  withoutConnectionsToGroupInputSlot,
} from '@/core/groupSlotConnections'
import { groupInspectorTagsFromEntry } from '@/core/groupInspectorUi'
import {
  applySceneHiddenToNodeIds,
  applyShowOnlyNodeIds,
  clearLinkVisibilityFilter,
  collectIncomingSlotBranchNodeIds,
  collectLinkedChildNodeIds,
  collectNodeLinkBranchIds,
  collectSlotSubtreeNodeIds,
  reapplyLinkVisibilityFilter,
} from '@/core/sceneNodeLinkVisibility'
import {
  applySceneNodesStateSnapshot,
  captureSceneNodesStateSnapshot,
  createSceneNodesStatePreset,
  defaultSceneNodesStatePresetName,
  type SceneNodesStatePreset,
} from '@/core/sceneNodesStatePresets'
import { createUniqueNodeId } from '@/core/canvasNodeIds'
import {
  emptyCanvasScene,
  hydrateScene,
  schemaJsonRelativePathBySchemaId,
} from '@/core/canvasScene'
import { clearStoredScene, loadStoredScene, persistStoredScene, SCENE_STORAGE_KEY } from '@/core/sceneStorage'
import { applyLightModeToScene } from '@/core/sceneLightMode'
import type { SceneTabSnapshot } from '@/core/sceneTabsStorage'
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
import type { NewNodeMaterializePhase } from '@/core/codeToNewNodeGraph'
import type { MutableClassGroupSchema } from '@/core/classGroupRitualStackParser'
import {
  buildNeekoTransformScene,
  isNeekoSchemaId,
  materializeNeekoRootAtPhase,
  NEEKO_SCHEMA_ID,
} from '@/core/neekoNodeTransform'

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

export { createUniqueNodeId } from '@/core/canvasNodeIds'

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

/** Cena inicial legacy (`node-graphs-lol:scene`): storage válido ou grade vazia. */
function getInitialPresent(): CanvasScene {
  const loaded = loadStoredScene()
  return loaded.nodes.length === 0 ? emptyCanvasScene : loaded
}

function selectionFromSnapshot(snapshot: SceneTabSnapshot): { ids: string[]; primaryId: string } {
  const present = snapshot.present
  const validIds = new Set(present.nodes.map((node) => node.id))
  const ids = snapshot.selection.ids.filter((id) => validIds.has(id))
  let primaryId = snapshot.selection.primaryId

  if (present.nodes.length === 0) {
    return { ids: [], primaryId: '' }
  }

  if (!validIds.has(primaryId) || !ids.includes(primaryId)) {
    primaryId = ids[0] ?? present.nodes[0]?.id ?? ''

    return { ids: primaryId ? [primaryId] : [], primaryId }
  }

  return { ids, primaryId }
}

/** Hook central do grafo local com histórico, persistência em localStorage e multi-seleção. */
export function useSceneHistory(options?: {
  /** Registo efectivo `{ ...schemaRegistryEstático, ...convertidosLocal }`; omite só estático */
  extendSchemaLookup?: Record<string, NodeSchemaDefinition>
  /** Estado inicial da aba activa (multi-abas); omitir para legacy `getInitialPresent()`. */
  initialTabSnapshot?: SceneTabSnapshot
  /** Modo leve: mantém blocos estruturais em visualização compacta. */
  lightModeEnabled?: boolean
}) {
  const schemaLookup = options?.extendSchemaLookup ?? schemaRegistry
  const initialTabSnapshot = options?.initialTabSnapshot
  const lightModeEnabled = options?.lightModeEnabled !== false

  const applyLightModeIfEnabled = useCallback(
    (
      scene: CanvasScene,
      options?: { initMainEntriesVfxIndex?: boolean },
    ) => (lightModeEnabled ? applyLightModeToScene(scene, options) : scene),
    [lightModeEnabled],
  )

  const hydratePresentScene = useCallback(
    (raw: CanvasScene, options?: { initMainEntriesVfxIndex?: boolean }) =>
      applyLightModeIfEnabled(syncSceneCollapsedBodyWireless(hydrateScene(raw)), options),
    [applyLightModeIfEnabled],
  )

  const [sceneHistory, setSceneHistory] = useState(() => {
    if (initialTabSnapshot) {
      return {
        future: initialTabSnapshot.future.map((s) => structuredClone(s)),
        past: initialTabSnapshot.past.map((s) => structuredClone(s)),
        present: applyLightModeIfEnabled(
          syncSceneCollapsedBodyWireless(hydrateScene(initialTabSnapshot.present)),
          { initMainEntriesVfxIndex: true },
        ),
      }
    }

    return {
      future: [] as CanvasScene[],
      past: [] as CanvasScene[],
      present: applyLightModeIfEnabled(
        syncSceneCollapsedBodyWireless(hydrateScene(emptyCanvasScene)),
        { initMainEntriesVfxIndex: true },
      ),
    }
  })

  const scene = sceneHistory.present

  const compactVisibilityForSelection = useMemo(
    () => createCompactElementCanvasVisibility(scene),
    [scene],
  )

  const nodeVisibilityContext = useMemo(
    (): NodeVisibilitySceneContext => ({
      linkVisibilityFilter: scene.linkVisibilityFilter,
      connections: scene.connections,
      nodes: scene.nodes,
    }),
    [scene.linkVisibilityFilter, scene.connections, scene.nodes],
  )

  const isCanvasNodeSelectable = useCallback(
    (node: CanvasNode) =>
      isNodeSelectableOnCanvas(node, compactVisibilityForSelection, nodeVisibilityContext),
    [compactVisibilityForSelection, nodeVisibilityContext],
  )

  const [selectionState, setSelectionState] = useState(() => {
    if (initialTabSnapshot) {
      return selectionFromSnapshot(initialTabSnapshot)
    }

    return { ids: [] as string[], primaryId: '' }
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

  const mirrorLegacySceneStorage = initialTabSnapshot === undefined

  useEffect(() => {
    if (!mirrorLegacySceneStorage) {
      return
    }

    persistStoredScene(scene)
  }, [mirrorLegacySceneStorage, scene])

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    void workspaceService.migrateLocalStorageToDiskOnce()
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

  const updateScene = useCallback(
    (updater: (currentScene: CanvasScene) => CanvasScene) => {
      setSceneHistory((currentHistory) => {
        const nextScene = applyLightModeIfEnabled(updater(currentHistory.present))

        if (nextScene === currentHistory.present) {
          return currentHistory
        }

        return {
          future: [],
          past: [...currentHistory.past, currentHistory.present],
          present: nextScene,
        }
      })
    },
    [applyLightModeIfEnabled],
  )

  useEffect(() => {
    if (!lightModeEnabled) {
      return
    }

    setSceneHistory((currentHistory) => {
      const nextPresent = applyLightModeToScene(currentHistory.present, {
        initMainEntriesVfxIndex: true,
      })
      if (nextPresent === currentHistory.present) {
        return currentHistory
      }

      return { ...currentHistory, present: nextPresent }
    })
  }, [lightModeEnabled])

  const replaceScene = useCallback(
    (nextScene: CanvasScene, storageMeta?: Record<string, string>) => {
    const hydrated = hydratePresentScene(nextScene, { initMainEntriesVfxIndex: true })
    const fallbackId = hydrated.nodes[0]?.id ?? ''

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
  }, [hydratePresentScene])

  const getTabSnapshot = useCallback(
    (tabId: string, title: string): SceneTabSnapshot => ({
      id: tabId,
      title,
      past: sceneHistory.past.map((s) => structuredClone(s)),
      present: structuredClone(sceneHistory.present),
      future: sceneHistory.future.map((s) => structuredClone(s)),
      selection: {
        ids: [...selectionState.ids],
        primaryId: selectionState.primaryId,
      },
    }),
    [sceneHistory, selectionState],
  )

  const applyTabSnapshot = useCallback(
    (snapshot: SceneTabSnapshot, options?: { initMainEntriesVfxIndex?: boolean }) => {
    const hydrated = hydratePresentScene(snapshot.present, options)
    const validIds = new Set(hydrated.nodes.map((node) => node.id))
    let nextIds = snapshot.selection.ids.filter((id) => validIds.has(id))
    let primaryId = snapshot.selection.primaryId

    if (hydrated.nodes.length === 0) {
      nextIds = []
      primaryId = ''
    } else if (!validIds.has(primaryId) || !nextIds.includes(primaryId)) {
      primaryId = nextIds[0] ?? hydrated.nodes[0]?.id ?? ''
      if (primaryId && !nextIds.includes(primaryId)) {
        nextIds = [primaryId]
      }
    }

    setSceneHistory({
      past: snapshot.past.map((s) => hydratePresentScene(s)),
      present: hydrated,
      future: snapshot.future.map((s) => hydratePresentScene(s)),
    })
    setSelectionState({ ids: nextIds, primaryId })
  },
    [hydratePresentScene],
  )

  const selectNode = useCallback(
    (nodeId: string, options?: { additive?: boolean; includeHidden?: boolean }) => {
      const canvasNode = scene.nodes.find((node) => node.id === nodeId)

      if (!canvasNode) {
        return
      }

      if (!options?.includeHidden && canvasNode.sceneHidden === true) {
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
      const validIds = [...new Set(nodeIds)].filter((id) => {
        const node = scene.nodes.find((entry) => entry.id === id)

        return node !== undefined && isCanvasNodeSelectable(node)
      })

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
          prev.primaryId && bag.has(prev.primaryId) ? prev.primaryId : (nextArr[0] ?? '')

        return {
          ids: nextArr,
          primaryId: primaryKeeps,
        }
      })
    },
    [isCanvasNodeSelectable, scene.nodes],
  )

  const selectAllNodes = useCallback(() => {
    const ids = scene.nodes.filter(isCanvasNodeSelectable).map((node) => node.id)

    if (ids.length === 0) {
      return
    }

    const pivot = ids[0]!

    setSelectionState({ ids, primaryId: pivot })
  }, [isCanvasNodeSelectable, scene.nodes])

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

  type NodeSceneOverlayPatch = Partial<
    Pick<
      CanvasNode,
      'sceneHidden' | 'branchForceVisible' | 'displayLabel' | 'bodyColor' | 'bodyColorEnabled' | 'locked'
    >
  >

  const patchNodeSceneOverlay = useCallback(
    (nodeId: string, patch: NodeSceneOverlayPatch) => {
      updateScene((currentScene) => {
        const entry = currentScene.nodes.find((node) => node.id === nodeId)

        if (!entry) {
          return currentScene
        }

        const nextNode: CanvasNode = { ...entry, ...patch }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => (node.id === nodeId ? nextNode : node)),
        }
      })
    },
    [updateScene],
  )

  const setAllNodesSceneHidden = useCallback(
    (hidden: boolean) => {
      updateScene((currentScene) => {
        const base = hidden ? currentScene : clearLinkVisibilityFilter(currentScene)

        return {
          ...base,
          nodes: base.nodes.map((node) =>
            hidden
              ? { ...node, sceneHidden: true, branchForceVisible: undefined }
              : { ...node, sceneHidden: undefined, branchForceVisible: undefined },
          ),
        }
      })
    },
    [updateScene],
  )

  const showOnlyConnectedComponent = useCallback(
    (seedNodeId: string) => {
      updateScene((currentScene) => {
        const visibleIds = collectNodeLinkBranchIds(currentScene, seedNodeId)

        return applyShowOnlyNodeIds(currentScene, visibleIds, {
          mode: 'branch',
          seedNodeId,
        })
      })
    },
    [updateScene],
  )

  const showOnlySlotSubtree = useCallback(
    (fromNodeId: string, slotId: string) => {
      updateScene((currentScene) => {
        const visibleIds = collectSlotSubtreeNodeIds(currentScene, fromNodeId, slotId)

        return applyShowOnlyNodeIds(currentScene, visibleIds, {
          mode: 'slot',
          fromNodeId,
          slotId,
        })
      })
    },
    [updateScene],
  )

  const showOnlyIncomingSlotBranch = useCallback(
    (toNodeId: string) => {
      updateScene((currentScene) => {
        const visibleIds = collectIncomingSlotBranchNodeIds(currentScene, toNodeId)

        return applyShowOnlyNodeIds(currentScene, visibleIds, {
          mode: 'incoming',
          toNodeId,
        })
      })
    },
    [updateScene],
  )

  const hideLinkedChildNodes = useCallback(
    (parentNodeId: string) => {
      updateScene((currentScene) => {
        const childIds = collectLinkedChildNodeIds(currentScene, parentNodeId)

        return applySceneHiddenToNodeIds(currentScene, childIds, true)
      })
    },
    [updateScene],
  )

  const setAllNodesLocked = useCallback(
    (locked: boolean) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((node) =>
          locked ? { ...node, locked: true } : { ...node, locked: undefined },
        ),
      }))
    },
    [updateScene],
  )

  const resetNodePosition = useCallback(
    (nodeId: string, position: CanvasPosition = { x: 0, y: 0 }) => {
      moveNode(nodeId, position)
    },
    [moveNode],
  )

  const setSceneCamera = useCallback((camera: SceneCamera) => {
    setSceneHistory((currentHistory) => {
      const present = currentHistory.present
      const previous = present.camera

      if (
        previous?.pan.x === camera.pan.x &&
        previous?.pan.y === camera.pan.y &&
        previous?.scale === camera.scale
      ) {
        return currentHistory
      }

      return {
        ...currentHistory,
        present: { ...present, camera },
      }
    })
  }, [])

  const sceneNodesChromeEqual = useCallback((a?: SceneNodesChrome, b?: SceneNodesChrome): boolean => {
    if (a === b) {
      return true
    }
    if (!a || !b) {
      return !a && !b
    }
    return (
      a.minimized === b.minimized &&
      a.sortMode === b.sortMode &&
      JSON.stringify(a.presets ?? []) === JSON.stringify(b.presets ?? [])
    )
  }, [])

  const patchSceneChrome = useCallback(
    (patch: {
      sceneNodes?: Partial<SceneNodesChrome>
      toolbarCollapsed?: boolean
      toolbarVisibility?: SceneChromeState['toolbarVisibility']
      showCanvasGrid?: boolean
      canvasGridSize?: number
      canvasGridOpacity?: number
    }) => {
      setSceneHistory((currentHistory) => {
        const present = currentHistory.present
        const prev = present.sceneChrome ?? {}
        const nextSceneNodes =
          patch.sceneNodes !== undefined
            ? { ...prev.sceneNodes, ...patch.sceneNodes }
            : prev.sceneNodes
        const nextToolbarCollapsed =
          patch.toolbarCollapsed !== undefined ? patch.toolbarCollapsed : prev.toolbarCollapsed
        const nextToolbar =
          patch.toolbarVisibility !== undefined ? patch.toolbarVisibility : prev.toolbarVisibility
        const nextShowCanvasGrid =
          patch.showCanvasGrid !== undefined ? patch.showCanvasGrid : prev.showCanvasGrid
        const nextGridSize =
          patch.canvasGridSize !== undefined ? patch.canvasGridSize : prev.canvasGridSize
        const nextGridOpacity =
          patch.canvasGridOpacity !== undefined ? patch.canvasGridOpacity : prev.canvasGridOpacity

        if (
          sceneNodesChromeEqual(prev.sceneNodes, nextSceneNodes) &&
          prev.toolbarCollapsed === nextToolbarCollapsed &&
          prev.toolbarVisibility === nextToolbar &&
          prev.showCanvasGrid === nextShowCanvasGrid &&
          prev.canvasGridSize === nextGridSize &&
          prev.canvasGridOpacity === nextGridOpacity
        ) {
          return currentHistory
        }

        const nextChrome: SceneChromeState = {
          ...(nextSceneNodes !== undefined ? { sceneNodes: nextSceneNodes } : {}),
          ...(nextToolbarCollapsed !== undefined ? { toolbarCollapsed: nextToolbarCollapsed } : {}),
          ...(nextToolbar !== undefined ? { toolbarVisibility: nextToolbar } : {}),
          ...(nextShowCanvasGrid !== undefined ? { showCanvasGrid: nextShowCanvasGrid } : {}),
          ...(nextGridSize !== undefined ? { canvasGridSize: nextGridSize } : {}),
          ...(nextGridOpacity !== undefined ? { canvasGridOpacity: nextGridOpacity } : {}),
        }

        return {
          ...currentHistory,
          present: { ...present, sceneChrome: nextChrome },
        }
      })
    },
    [sceneNodesChromeEqual],
  )

  const readSceneNodesStatePresets = useCallback((): SceneNodesStatePreset[] => {
    return sceneHistory.present.sceneChrome?.sceneNodes?.presets ?? []
  }, [sceneHistory.present.sceneChrome?.sceneNodes?.presets])

  const writeSceneNodesStatePresets = useCallback(
    (presets: SceneNodesStatePreset[]) => {
      patchSceneChrome({ sceneNodes: { presets } })
    },
    [patchSceneChrome],
  )

  const saveSceneNodesStatePreset = useCallback(
    (name: string) => {
      const trimmed = name.trim()
      if (trimmed.length === 0) {
        return
      }
      const existing = readSceneNodesStatePresets()
      const preset = createSceneNodesStatePreset(trimmed, sceneHistory.present)
      writeSceneNodesStatePresets([...existing, preset])
    },
    [readSceneNodesStatePresets, sceneHistory.present, writeSceneNodesStatePresets],
  )

  const overwriteSceneNodesStatePreset = useCallback(
    (presetId: string) => {
      const now = new Date().toISOString()
      const snapshot = captureSceneNodesStateSnapshot(sceneHistory.present)
      writeSceneNodesStatePresets(
        readSceneNodesStatePresets().map((preset) =>
          preset.id === presetId ? { ...preset, snapshot, updatedAt: now } : preset,
        ),
      )
    },
    [readSceneNodesStatePresets, sceneHistory.present, writeSceneNodesStatePresets],
  )

  const renameSceneNodesStatePreset = useCallback(
    (presetId: string, name: string) => {
      const trimmed = name.trim()
      if (trimmed.length === 0) {
        return
      }
      const now = new Date().toISOString()
      writeSceneNodesStatePresets(
        readSceneNodesStatePresets().map((preset) =>
          preset.id === presetId ? { ...preset, name: trimmed, updatedAt: now } : preset,
        ),
      )
    },
    [readSceneNodesStatePresets, writeSceneNodesStatePresets],
  )

  const deleteSceneNodesStatePreset = useCallback(
    (presetId: string) => {
      writeSceneNodesStatePresets(readSceneNodesStatePresets().filter((preset) => preset.id !== presetId))
    },
    [readSceneNodesStatePresets, writeSceneNodesStatePresets],
  )

  const applySceneNodesStatePreset = useCallback(
    (presetId: string) => {
      const preset = readSceneNodesStatePresets().find((entry) => entry.id === presetId)
      if (preset === undefined) {
        return
      }
      updateScene((currentScene) => applySceneNodesStateSnapshot(currentScene, preset.snapshot))
    },
    [readSceneNodesStatePresets, updateScene],
  )

  const replaceSceneNodesStatePresets = useCallback(
    (presets: SceneNodesStatePreset[]) => {
      writeSceneNodesStatePresets(presets)
    },
    [writeSceneNodesStatePresets],
  )

  const suggestSceneNodesStatePresetName = useCallback((): string => {
    return defaultSceneNodesStatePresetName(readSceneNodesStatePresets())
  }, [readSceneNodesStatePresets])

  const connectNodes = useCallback(
    (connection: CanvasConnection) => {
      updateScene((currentScene) => {
        const sourceCanvasNode = currentScene.nodes.find((node) => node.id === connection.fromNodeId)
        const targetNode = currentScene.nodes.find((node) => node.id === connection.toNodeId)
        const useWireless =
          sourceCanvasNode &&
          isSlotInWirelessElementView(sourceCanvasNode.node, connection.fromInternalStructureId)
        const normalizedConnection: CanvasConnection = useWireless
          ? { ...connection, routing: 'wireless' }
          : connection
        const nextConnections = [
          ...currentScene.connections.filter(
            (currentConnection) =>
              currentConnection.fromNodeId !== connection.fromNodeId ||
              currentConnection.fromInternalStructureId !== connection.fromInternalStructureId,
          ),
          normalizedConnection,
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

  const setConnectionRouting = useCallback(
    (connectionId: string, routing: import('@/core/canvasScene').ConnectionRouting) => {
      updateScene((currentScene) => ({
        ...currentScene,
        connections: currentScene.connections.map((connection) =>
          connection.id === connectionId ? { ...connection, routing } : connection,
        ),
      }))
    },
    [updateScene],
  )

  const setElementViewMode = useCallback(
    (canvasNodeId: string, elementKey: ElementViewKey, mode: ElementViewMode) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((n) => n.id === canvasNodeId)
        if (!canvasNode) {
          return currentScene
        }

        if (lightModeEnabled && mode === 'list') {
          return currentScene
        }

        const resolvedMode = resolveElementViewModeChange(canvasNode.node, elementKey, mode)
        if (resolvedMode === null) {
          return currentScene
        }
        mode = resolvedMode

        const slotIds = slotIdsForElement(canvasNode.node, elementKey)
        const branchNodeIds = collectBranchNodeIdsFromOutputSlots(currentScene, canvasNodeId, slotIds)
        let nextScene = currentScene

        if (mode === 'compact') {
          nextScene = applyCompactWireless(nextScene, canvasNodeId, slotIds)
        } else {
          nextScene = restoreCompactWireless(nextScene, canvasNodeId, slotIds)
        }

        return {
          ...nextScene,
          nodes: nextScene.nodes.map((n) => {
            if (n.id === canvasNodeId) {
              return {
                ...n,
                node: patchElementRetracted(
                  patchElementViewMode(n.node, elementKey, mode),
                  elementKey,
                  true,
                ),
              }
            }

            if (!branchNodeIds.has(n.id)) {
              return n
            }

            const { branchForceVisible: _bfv, bodyCollapsed, ...rest } = n
            return bodyCollapsed === false ? rest : { ...rest, branchForceVisible: undefined }
          }),
        }
      })
    },
    [lightModeEnabled, updateScene],
  )

  const setElementRetracted = useCallback(
    (canvasNodeId: string, elementKey: ElementViewKey, retracted: boolean) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((n) => n.id === canvasNodeId)
        if (!canvasNode) {
          return currentScene
        }

        const slotIds = slotIdsForElement(canvasNode.node, elementKey)
        let nextScene = currentScene

        if (retracted) {
          nextScene = applyCompactWireless(nextScene, canvasNodeId, slotIds)
        } else if (!isElementViewCompact(canvasNode.node, elementKey)) {
          nextScene = restoreCompactWireless(nextScene, canvasNodeId, slotIds)
        }

        return {
          ...nextScene,
          nodes: nextScene.nodes.map((n) =>
            n.id === canvasNodeId
              ? {
                  ...n,
                  node: patchElementRetracted(n.node, elementKey, retracted),
                }
              : n,
          ),
        }
      })
    },
    [updateScene],
  )

  const setAllNodeElementsRetracted = useCallback(
    (canvasNodeId: string, retracted: boolean) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((n) => n.id === canvasNodeId)
        if (!canvasNode) {
          return currentScene
        }

        let nextScene = currentScene
        let node = patchAllCardElementsRetracted(canvasNode.node, retracted)

        for (const key of collectCardElementViewKeys(node)) {
          const slotIds = slotIdsForElement(node, key)
          if (retracted) {
            nextScene = applyCompactWireless(nextScene, canvasNodeId, slotIds)
          } else if (!isElementViewCompact(node, key)) {
            nextScene = restoreCompactWireless(nextScene, canvasNodeId, slotIds)
          }
        }

        return {
          ...nextScene,
          nodes: nextScene.nodes.map((n) =>
            n.id === canvasNodeId ? { ...n, node } : n,
          ),
        }
      })
    },
    [updateScene],
  )

  const setElementSelectedIndex = useCallback(
    (canvasNodeId: string, elementKey: ElementViewKey, selectedIndex: number) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((n) => n.id === canvasNodeId)
        if (!canvasNode) {
          return currentScene
        }

        let nextScene = currentScene
        const previousNode = canvasNode.node

        if (isElementViewCompact(previousNode, elementKey)) {
          nextScene = restoreCompactWireless(
            nextScene,
            canvasNodeId,
            allSlotIdsForElement(previousNode, elementKey),
          )
        }

        const nextNode = patchElementSelectedIndex(previousNode, elementKey, selectedIndex)
        const updatedCanvasNode = { ...canvasNode, node: nextNode }

        if (isElementViewCompact(nextNode, elementKey)) {
          nextScene = applyCompactWireless(
            nextScene,
            canvasNodeId,
            slotIdsForElement(nextNode, elementKey),
          )
        }

        let result: CanvasScene = {
          ...nextScene,
          nodes: nextScene.nodes.map((n) =>
            n.id === canvasNodeId ? updatedCanvasNode : n,
          ),
        }

        if (result.linkVisibilityFilter) {
          result = reapplyLinkVisibilityFilter(result)
        }

        return result
      })
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
          ...defaultNewCanvasNodeLayout(node),
        }

        const connection: CanvasConnection = {
          id: `${fromNodeId}:${slot.id}->${instanceId}`,
          fromInternalStructureId: slot.id,
          fromNodeId,
          toNodeId: instanceId,
          ...(isSlotInWirelessElementView(sourceNode.node, slot.id)
            ? { routing: 'wireless' as const }
            : {}),
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

  const createRootNode = useCallback(
    (schema: NodeSchemaDefinition, position?: CanvasPosition) => {
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
              position: position ?? getNextDetachedNodePosition(currentScene),
              ...defaultNewCanvasNodeLayout(node),
            },
          ],
        }
      })
    },
    [updateScene, schemaLookup],
  )

  const createBlockNodeFromDefinition = useCallback(
    (
      definition: BlockDefinitionJsonDocument,
      position?: CanvasPosition,
      spawnLink?: BlockDefinitionSpawnLinkContext,
    ): { ok: true; nodeId: string } | { ok: false; error: string } => {
      const blockName = definition.blockName?.trim() ?? ''
      if (!blockName) {
        return { ok: false, error: 'Definição de bloco sem blockName.' }
      }

      const schemaId = resolveSchemaIdForBlockDefinition(blockName, schemaLookup)
      if (!schemaId) {
        return {
          ok: false,
          error: `Schema não encontrado para o bloco "${blockName}".`,
        }
      }

      const schema = schemaLookup[schemaId]
      if (!schema) {
        return { ok: false, error: `Schema "${schemaId}" indisponível.` }
      }

      let createdId: string | null = null

      updateScene((currentScene) => {
        const spawnPosition = position ?? getNextDetachedNodePosition(currentScene)
        // Ao inserir bloco pelo catálogo, começa sempre vazio.
        const spawnDefinition: BlockDefinitionJsonDocument = {
          ...definition,
          parameters: [],
        }
        const plan = planBlockHierarchySpawn(
          spawnDefinition,
          schema,
          schemaLookup,
          currentScene,
          spawnPosition,
        )

        if (!plan) {
          return currentScene
        }

        createdId = plan.rootNodeId

        queueMicrotask(() =>
          setSelectionState({
            ids: [plan.rootNodeId],
            primaryId: plan.rootNodeId,
          }),
        )

        let nextScene = mergeBlockHierarchyIntoScene(currentScene, plan)

        if (spawnLink) {
          const inputSlotId = resolveBlockHeaderInputSlotIdForLink(
            definition.blockName,
            definition.headerSlots,
            {
              fromParameterName: spawnLink.fromParameterName,
              outTypes: spawnLink.outTypes,
              targetBlockName: definition.blockName,
              targetDisplayName: definition.name,
            },
          )
          if (inputSlotId) {
            const linked = applyBlockSlotConnectionToScene(nextScene, {
              fromNodeId: spawnLink.fromNodeId,
              fromBlockSlotId: spawnLink.fromBlockSlotId,
              fromBlockParameterId: spawnLink.fromBlockParameterId,
              toNodeId: plan.rootNodeId,
              toBlockSlotId: inputSlotId,
              allowForced: true,
            })
            if (linked) {
              nextScene = linked
            }
          }
        }

        return nextScene
      })

      if (!createdId) {
        return { ok: false, error: 'Não foi possível criar o nó do bloco.' }
      }

      void persistMissingBlockParameterCatalog(definition, schemaLookup).then((writeResult) => {
        if (!writeResult.ok) {
          console.warn(
            '[createBlockNodeFromDefinition] Falha ao gravar parâmetros no disco:',
            writeResult.error,
            writeResult.errors,
          )
          return
        }
        const count =
          (writeResult.written?.length ?? 0) + (writeResult.overwritten?.length ?? 0)
        if (count > 0) {
          console.info(
            `[createBlockNodeFromDefinition] Parâmetros gravados em blockStructures/parameters/ (${count} ficheiro(s)).`,
          )
        }
      })

      return { ok: true, nodeId: createdId }
    },
    [updateScene, schemaLookup],
  )

  const createAddonNode = useCallback(
    async (
      addonId: string,
      position?: CanvasPosition,
      spawnLink?: {
        fromNodeId: string
        fromAddonSlotId?: string
        fromBlockSlotId?: string
        fromBlockParameterId?: string
        toAddonSlotName?: string
      },
    ): Promise<{ ok: true; nodeId: string } | { ok: false; error: string }> => {
      try {
        await preloadAddonPackage(addonId)
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : `Falha ao carregar add-on "${addonId}".`,
        }
      }

      let createdId: string | null = null

      updateScene((currentScene) => {
        const instanceId = createUniqueNodeId(`addon-${addonId}`, currentScene.nodes)
        const node = createAddonPlaceholderInstance(instanceId)
        const spawnPosition = position ?? getNextDetachedNodePosition(currentScene)

        createdId = instanceId

        queueMicrotask(() =>
          setSelectionState({
            ids: [instanceId],
            primaryId: instanceId,
          }),
        )

        let nextScene: CanvasScene = {
          ...currentScene,
          nodes: [
            ...currentScene.nodes,
            {
              id: instanceId,
              node,
              position: spawnPosition,
              addonViewActive: true,
              addonInstance: {
                addonId,
                outputValues: {},
              },
            },
          ],
        }

        if (spawnLink) {
          const toSlotName = spawnLink.toAddonSlotName ?? 'text'
          const toAddonSlotId = addonSlotId(toSlotName, 'input')

          if (spawnLink.fromBlockSlotId) {
            const linked = applyBlockOutputToAddonInput(nextScene, {
              fromNodeId: spawnLink.fromNodeId,
              fromBlockSlotId: spawnLink.fromBlockSlotId,
              fromBlockParameterId: spawnLink.fromBlockParameterId,
              toNodeId: instanceId,
              toAddonSlotId,
            })
            if (linked) {
              nextScene = linked
            }
          } else if (spawnLink.fromAddonSlotId) {
            const linked = applyAddonSlotConnectionToScene(nextScene, {
              fromNodeId: spawnLink.fromNodeId,
              fromAddonSlotId: spawnLink.fromAddonSlotId,
              toNodeId: instanceId,
              toAddonSlotId,
            })
            if (linked) {
              nextScene = linked
            }
          }
        }

        return nextScene
      })

      if (!createdId) {
        return { ok: false, error: 'Não foi possível criar o nó add-on.' }
      }

      return { ok: true, nodeId: createdId }
    },
    [updateScene],
  )

  const applyAddonOutputsToScene = useCallback(
    (nodeId: string, outputs: Record<string, unknown>) => {
      updateScene((currentScene) => applyAddonOutputs(currentScene, nodeId, outputs))
    },
    [updateScene],
  )

  const connectAddonSlots = useCallback(
    (
      request:
        | {
            kind: 'addon'
            fromNodeId: string
            fromAddonSlotId: string
            toNodeId: string
            toAddonSlotId: string
            allowForced?: boolean
          }
        | {
            kind: 'blockToAddon'
            fromNodeId: string
            fromBlockSlotId: string
            fromBlockParameterId?: string
            toNodeId: string
            toAddonSlotId: string
            allowForced?: boolean
          }
        | {
            kind: 'addonToBlock'
            fromNodeId: string
            fromAddonSlotId: string
            toNodeId: string
            toBlockSlotId: string
            toBlockParameterId?: string
            allowForced?: boolean
          },
    ) => {
      updateScene((currentScene) => {
        let nextScene = currentScene

        if (request.kind === 'addon') {
          nextScene =
            applyAddonSlotConnectionToScene(currentScene, {
              fromNodeId: request.fromNodeId,
              fromAddonSlotId: request.fromAddonSlotId,
              toNodeId: request.toNodeId,
              toAddonSlotId: request.toAddonSlotId,
              allowForced: request.allowForced,
            }) ?? currentScene
        } else if (request.kind === 'blockToAddon') {
          nextScene =
            applyBlockOutputToAddonInput(currentScene, {
              fromNodeId: request.fromNodeId,
              fromBlockSlotId: request.fromBlockSlotId,
              fromBlockParameterId: request.fromBlockParameterId,
              toNodeId: request.toNodeId,
              toAddonSlotId: request.toAddonSlotId,
              allowForced: request.allowForced,
            }) ?? currentScene
        } else {
          nextScene =
            applyAddonOutputToBlockInput(currentScene, {
              fromNodeId: request.fromNodeId,
              fromAddonSlotId: request.fromAddonSlotId,
              toNodeId: request.toNodeId,
              toBlockSlotId: request.toBlockSlotId,
              toBlockParameterId: request.toBlockParameterId,
              allowForced: request.allowForced,
            }) ?? currentScene
        }

        if (nextScene === currentScene) {
          return currentScene
        }

        if (request.kind === 'addon' || request.kind === 'addonToBlock') {
          nextScene = syncConnectedAddonOutputs(nextScene, request.fromNodeId)
        }

        return nextScene
      })
    },
    [updateScene],
  )

  const syncBlockParameterCatalogFromDefinitions = useCallback(
    async (definitions: readonly BlockDefinitionJsonDocument[]) => {
      const writeResult = await persistMissingBlockParameterCatalogForDefinitions(
        definitions,
        schemaLookup,
      )
      if (!writeResult.ok) {
        console.warn(
          '[syncBlockParameterCatalogFromDefinitions] Falha ao gravar parâmetros:',
          writeResult.error,
          writeResult.errors,
        )
        return writeResult
      }

      const count = (writeResult.written?.length ?? 0) + (writeResult.overwritten?.length ?? 0)
      if (count > 0) {
        console.info(
          `[syncBlockParameterCatalogFromDefinitions] Parâmetros gravados (${count} ficheiro(s)).`,
        )
      }

      return writeResult
    },
    [schemaLookup],
  )

  const spawnNeekoNodeAtPosition = useCallback(
    (position: CanvasPosition): string | null => {
      const instanceId = createUniqueNodeId(NEEKO_SCHEMA_ID, sceneHistory.present.nodes)
      const node = createNodeInstanceFromRegistry(schemaLookup, NEEKO_SCHEMA_ID, instanceId)

      if (!node) {
        return null
      }

      updateScene((currentScene) => {
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
              position,
              ...defaultNewCanvasNodeLayout(node),
            },
          ],
        }
      })

      return instanceId
    },
    [schemaLookup, updateScene],
  )

  const deleteNodeIds = useCallback(
    (identifiers: string[]) => {
      const idSet = new Set(
        identifiers.filter((id) => {
          const entry = sceneHistory.present.nodes.find((node) => node.id === id)

          return entry !== undefined && entry.locked !== true
        }),
      )

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
    [sceneHistory.present.nodes, updateScene],
  )

  const deleteSelectedNodes = useCallback(() => {
    deleteNodeIds(orderedSelectionUnique)
  }, [deleteNodeIds, orderedSelectionUnique])

  const toggleNodeCardSection = useCallback(
    (nodeId: string, sectionId: NodeCardSectionId) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node
          }
          return {
            ...node,
            cardSectionExpanded: nextNodeCardSectionExpandedMap(node.cardSectionExpanded, sectionId),
          }
        }),
      }))
    },
    [updateScene],
  )

  const setNodeCardBodyLayout = useCallback(
    (nodeId: string, layout: NodeCardBodyLayout) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node
          }
          if (layout === 'freeform') {
            return {
              ...node,
              cardBodyLayout: 'freeform',
              cardSectionExpanded: allVisibleSectionsExpandedMap(node.node),
            }
          }
          if (node.cardBodyLayout === 'bySectionType') {
            return node
          }
          return {
            ...node,
            cardBodyLayout: 'bySectionType',
          }
        }),
      }))
    },
    [updateScene],
  )

  const setNodeCardSectionOrder = useCallback(
    (nodeId: string, sectionId: NodeCardSectionId, oneBasedIndex: number) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return currentScene
        }

        const order = resolveNodeCardSectionOrder(canvasNode.cardSectionOrder, canvasNode.node)
        const fromIndex = order.indexOf(sectionId)
        if (fromIndex < 0) {
          return currentScene
        }

        const count = order.length
        if (count < 2) {
          return currentScene
        }

        const targetOneBased = Math.max(1, Math.min(count, Math.trunc(oneBasedIndex)))
        const toIndex = targetOneBased - 1
        if (fromIndex === toIndex) {
          return currentScene
        }

        const nextOrder = [...order]
        const [moved] = nextOrder.splice(fromIndex, 1)
        nextOrder.splice(toIndex, 0, moved)

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) =>
            node.id !== nodeId ? node : { ...node, cardSectionOrder: nextOrder },
          ),
        }
      })
    },
    [updateScene],
  )

  const toggleStructureCardParamsExpanded = useCallback(
    (nodeId: string) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node
          }
          const nextExpanded = node.structureCardParamsExpanded !== true
          return {
            ...node,
            structureCardParamsExpanded: nextExpanded ? true : undefined,
          }
        }),
      }))
    },
    [updateScene],
  )

  const setStructureCardWidth = useCallback(
    (nodeId: string, width: number, positionX?: number) => {
      updateScene((currentScene) => ({
        ...currentScene,
        nodes: currentScene.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node
          }

          const minWidth =
            node.groupViewActive && node.groupStructure
              ? GROUP_CARD_WIDTH
              : node.blockViewActive && node.blockStructure
                ? BLOCK_CARD_WIDTH
                : GROUP_CARD_WIDTH
          const normalizedWidth = normalizeStructureCardWidth(width, minWidth)

          return {
            ...node,
            structureCardWidth: normalizedWidth,
            ...(positionX !== undefined
              ? {
                  position: {
                    x: Math.round(positionX),
                    y: node.position.y,
                  },
                }
              : {}),
          }
        }),
      }))
    },
    [updateScene],
  )

  const toggleNodeBodyCollapsed = useCallback(
    (nodeId: string) => {
      updateScene((currentScene) => {
        const entry = currentScene.nodes.find((node) => node.id === nodeId)
        if (!entry) {
          return currentScene
        }

        const nextCollapsed = !entry.bodyCollapsed
        const toggledNode: typeof entry = {
          ...entry,
          bodyCollapsed: nextCollapsed,
        }

        let nextScene: CanvasScene = {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => (node.id === nodeId ? toggledNode : node)),
        }

        if (nextCollapsed) {
          nextScene = applyCollapsedBodyWireless(nextScene, nodeId)
        } else {
          nextScene = restoreCollapsedBodyWireless(nextScene, nodeId)
          nextScene = reapplyElementViewWireless(nextScene, toggledNode)
        }

        return nextScene
      })
    },
    [updateScene],
  )

  const setAllNodesBodyCollapsed = useCallback(
    (collapsed: boolean) => {
      updateScene((currentScene) => {
        if (currentScene.nodes.length === 0) {
          return currentScene
        }

        if (collapsed) {
          let nextScene: CanvasScene = {
            ...currentScene,
            nodes: currentScene.nodes.map((node) => ({ ...node, bodyCollapsed: true })),
          }
          for (const node of nextScene.nodes) {
            nextScene = applyCollapsedBodyWireless(nextScene, node.id)
          }
          return nextScene
        }

        let nextScene: CanvasScene = {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => ({ ...node, bodyCollapsed: false })),
        }
        for (const node of currentScene.nodes) {
          if (node.bodyCollapsed === true) {
            nextScene = restoreCollapsedBodyWireless(nextScene, node.id)
            const expandedNode = nextScene.nodes.find((entry) => entry.id === node.id)
            if (expandedNode) {
              nextScene = reapplyElementViewWireless(nextScene, expandedNode)
            }
          }
        }
        return nextScene
      })
    },
    [updateScene],
  )

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

        const nextScene = {
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

        return applyValueVector3ConstantSyncOnParameterUpdate(
          nextScene,
          primarySelectedId,
          parameterId,
          value,
        )
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
            const fallback = previousScene.nodes[0]?.id ?? ''

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
            const fallback = nextScene.nodes[0]?.id ?? ''

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
    clearStoredScene()
    setSceneHistory({
      future: [],
      past: [],
      present: emptyCanvasScene,
    })
    setSelectionState({ ids: [], primaryId: '' })
  }, [])

  const updateCanvasNodeNeekoPhase = useCallback(
    (
      nodeId: string,
      phase: NewNodeMaterializePhase,
      parseRegistry: Map<string, MutableClassGroupSchema>,
      rootParsedId: string,
      options?: { error?: string; clearError?: boolean },
    ) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return currentScene
        }

        const stillNeeko = isNeekoSchemaId(canvasNode.node.schema.id)
        const transforming = canvasNode.neekoTransformPhase !== undefined

        if (!stillNeeko && !transforming) {
          return currentScene
        }

        if (options?.error) {
          return {
            ...currentScene,
            nodes: currentScene.nodes.map((node) =>
              node.id !== nodeId
                ? node
                : {
                    ...node,
                    neekoTransformPhase: phase,
                    neekoTransformError: options.error,
                  },
            ),
          }
        }

        const materialized = materializeNeekoRootAtPhase(
          parseRegistry,
          rootParsedId,
          nodeId,
          phase,
        )

        if (!materialized) {
          return currentScene
        }

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) =>
            node.id !== nodeId
              ? node
              : {
                  ...node,
                  node: materialized,
                  neekoTransformPhase: phase,
                  neekoTransformError: options?.clearError ? undefined : node.neekoTransformError,
                  ...defaultNewCanvasNodeLayout(materialized),
                },
          ),
        }
      })
    },
    [updateScene],
  )

  const blockInspectorDraftByNodeRef = useRef(new Map<string, BlockInspectorDraft>())
  const [blockInspectorDraftVersion, setBlockInspectorDraftVersion] = useState(0)

  const computeBlockInspectorDraft = useCallback(
    (nodeId: string): BlockInspectorDraft | null => {
      const canvasNode = scene.nodes.find((node) => node.id === nodeId)
      if (!canvasNode) {
        return null
      }
      if (canvasNode.blockStructure) {
        return {
          blockType: canvasNode.blockStructure.blockType,
          blockName: canvasNode.blockStructure.blockName,
          entries: canvasNode.blockStructure.parameters.map((param) => ({
            sourcePath: param.sourcePath,
            ritualName: param.nameParameter,
            typeParameter: param.typeParameter,
            defaultValue: param.defaultValue,
            exposed: true,
            nameParameter: param.nameParameter,
            iconHint: param.iconHint ?? null,
            iconId: param.iconId ?? param.iconHint ?? '',
            slotRules: param.slotRules,
            slotTags: isBlockPointerSourcePath(param.sourcePath)
              ? mandatoryPointerSlotTags(param.nameParameter)
              : slotRulesToTags(param.slotRules),
          })),
        }
      }
      return buildBlockInspectorDraftFromNode(scene, canvasNode)
    },
    [scene],
  )

  const updateBlockInspectorDraft = useCallback((nodeId: string, draft: BlockInspectorDraft) => {
    blockInspectorDraftByNodeRef.current.set(nodeId, draft)
    setBlockInspectorDraftVersion((value) => value + 1)
  }, [])

  const refreshBlockInspectorDraft = useCallback(
    (nodeId: string): BlockInspectorDraft | null => {
      blockInspectorDraftByNodeRef.current.delete(nodeId)
      const draft = computeBlockInspectorDraft(nodeId)
      if (draft) {
        blockInspectorDraftByNodeRef.current.set(nodeId, draft)
        setBlockInspectorDraftVersion((value) => value + 1)
      }
      return draft
    },
    [computeBlockInspectorDraft],
  )

  const getBlockInspectorDraft = useCallback(
    (nodeId: string): BlockInspectorDraft | null => {
      void blockInspectorDraftVersion
      const cached = blockInspectorDraftByNodeRef.current.get(nodeId)
      if (cached) {
        return cached
      }
      const draft = computeBlockInspectorDraft(nodeId)
      if (draft) {
        blockInspectorDraftByNodeRef.current.set(nodeId, draft)
      }
      return draft
    },
    [blockInspectorDraftVersion, computeBlockInspectorDraft],
  )

  const buildBlockInspectorDraft = useCallback(
    (nodeId: string): BlockInspectorDraft | null => getBlockInspectorDraft(nodeId),
    [getBlockInspectorDraft],
  )

  const applyNeekoTransform = useCallback(
    async (nodeId: string, source: string) => {
      const result = await buildNeekoTransformScene(scene, nodeId, source)
      if (!result.ok) {
        return { ok: false as const, error: result.error }
      }

      updateScene(() => result.scene)
      return { ok: true as const, warnings: result.warnings }
    },
    [scene, updateScene],
  )

  const generateBlockFromNode = useCallback(
    (nodeId: string, draft: BlockInspectorDraft) => {
      blockInspectorDraftByNodeRef.current.delete(nodeId)
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return currentScene
        }

        const generated = generateBlockStructureFromDraft(currentScene, canvasNode, draft)
        if (!generated) {
          return currentScene
        }

        const childPatchMap = new Map(generated.childNodePatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          connections: currentScene.connections.filter(
            (connection) =>
              !(
                (connection.fromGroupSlotId || connection.toGroupSlotId) &&
                (connection.fromNodeId === nodeId || connection.toNodeId === nodeId)
              ),
          ),
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: generated.node,
                blockStructure: generated.structure,
                blockViewActive: true,
                groupStructure: undefined,
                groupViewActive: false,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const revertBlockView = useCallback(
    (nodeId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.blockStructure) {
          return currentScene
        }

        const reverted = revertBlockTokensFromNode(currentScene, canvasNode, canvasNode.blockStructure)
        const childPatchMap = new Map(reverted.childNodePatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          connections: currentScene.connections.filter(
            (connection) =>
              !(
                (connection.fromBlockSlotId || connection.toBlockSlotId) &&
                (connection.fromNodeId === nodeId || connection.toNodeId === nodeId)
              ),
          ),
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: reverted.node,
                blockStructure: undefined,
                blockViewActive: false,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const updateBlockParameter = useCallback(
    (nodeId: string, paramId: string, value: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.blockStructure) {
          return currentScene
        }

        const synced = syncBlockParameterEdit(currentScene, canvasNode, canvasNode.blockStructure, paramId, value)
        const childPatchMap = new Map(synced.childPatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: synced.node,
                blockStructure: synced.structure,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const addBlockParameterFromCatalog = useCallback(
    (
      nodeId: string,
      doc: BlockParameterJsonDocument,
    ): { ok: true } | { ok: false; error: string } => {
      let error: string | undefined
      let didApply = false

      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.blockStructure) {
          error = 'Bloco não encontrado.'
          return currentScene
        }

        const added = addParameterToBlockStructure(canvasNode.blockStructure, doc)
        if (added.error) {
          error = added.error
          return currentScene
        }

        const applied = applyBlockStructureWithTokens(currentScene, canvasNode, added.structure)
        const childPatchMap = new Map(applied.childPatches.map((patch) => [patch.nodeId, patch.node]))
        didApply = true

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: applied.node,
                blockStructure: added.structure,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })

      if (error) {
        return { ok: false, error }
      }
      if (!didApply) {
        return { ok: false, error: 'Não foi possível adicionar o parâmetro.' }
      }
      return { ok: true }
    },
    [updateScene],
  )

  const removeBlockParameter = useCallback(
    (nodeId: string, paramId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.blockStructure) {
          return currentScene
        }

        const structure = removeParameterFromBlockStructure(canvasNode.blockStructure, paramId)
        const applied = applyBlockStructureWithTokens(currentScene, canvasNode, structure)
        const childPatchMap = new Map(applied.childPatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: applied.node,
                blockStructure: structure,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const updateBlockParameterFromInspector = useCallback(
    (nodeId: string, paramId: string, entry: BlockInspectorDraft['entries'][number]) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.blockStructure) {
          return currentScene
        }

        const structure = updateParameterInBlockStructure(canvasNode.blockStructure, paramId, entry)
        const applied = applyBlockStructureWithTokens(currentScene, canvasNode, structure)
        const childPatchMap = new Map(applied.childPatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: applied.node,
                blockStructure: structure,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const connectBlockSlots = useCallback(
    (
      fromNodeId: string,
      fromBlockSlotId: string,
      fromBlockParameterId: string | undefined,
      toNodeId: string,
      toBlockSlotId: string,
      toBlockParameterId: string | undefined,
      allowForced = false,
    ) => {
      updateScene((currentScene) => {
        const linked = applyBlockSlotConnectionToScene(currentScene, {
          fromNodeId,
          fromBlockSlotId,
          fromBlockParameterId,
          toNodeId,
          toBlockSlotId,
          toBlockParameterId,
          allowForced,
        })
        return linked ?? currentScene
      })
    },
    [updateScene],
  )

  const groupInspectorDraftByNodeRef = useRef(new Map<string, GroupInspectorDraft>())
  const [groupInspectorDraftVersion, setGroupInspectorDraftVersion] = useState(0)

  const computeGroupInspectorDraft = useCallback(
    (nodeId: string): GroupInspectorDraft | null => {
      const canvasNode = scene.nodes.find((node) => node.id === nodeId)
      if (!canvasNode) {
        return null
      }
      if (canvasNode.groupStructure) {
        return {
          groupType: canvasNode.groupStructure.groupType,
          groupName: canvasNode.groupStructure.groupName,
          entries: canvasNode.groupStructure.parameters.map((param) => ({
            sourcePath: param.sourcePath,
            ritualName: param.nameParameter,
            typeParameter: param.typeParameter,
            defaultValue: param.defaultValue,
            exposed: true,
            nameParameter: param.nameParameter,
            iconHint: param.iconHint ?? null,
            iconId: param.iconId ?? param.iconHint ?? '',
            slotRules: param.slotRules,
            slotTags: isGroupPointerSourcePath(param.sourcePath)
              ? mandatoryPointerSlotTags(param.nameParameter)
              : groupInspectorTagsFromEntry({
                  typeParameter: param.typeParameter,
                  slotRules: param.slotRules,
                }),
          })),
        }
      }
      return buildGroupInspectorDraftFromNode(scene, canvasNode)
    },
    [scene],
  )

  const updateGroupInspectorDraft = useCallback((nodeId: string, draft: GroupInspectorDraft) => {
    groupInspectorDraftByNodeRef.current.set(nodeId, draft)
    setGroupInspectorDraftVersion((value) => value + 1)
  }, [])

  const refreshGroupInspectorDraft = useCallback(
    (nodeId: string): GroupInspectorDraft | null => {
      groupInspectorDraftByNodeRef.current.delete(nodeId)
      const draft = computeGroupInspectorDraft(nodeId)
      if (draft) {
        groupInspectorDraftByNodeRef.current.set(nodeId, draft)
        setGroupInspectorDraftVersion((value) => value + 1)
      }
      return draft
    },
    [computeGroupInspectorDraft],
  )

  const getGroupInspectorDraft = useCallback(
    (nodeId: string): GroupInspectorDraft | null => {
      void groupInspectorDraftVersion
      const cached = groupInspectorDraftByNodeRef.current.get(nodeId)
      if (cached) {
        return cached
      }
      const draft = computeGroupInspectorDraft(nodeId)
      if (draft) {
        groupInspectorDraftByNodeRef.current.set(nodeId, draft)
      }
      return draft
    },
    [groupInspectorDraftVersion, computeGroupInspectorDraft],
  )

  const buildGroupInspectorDraft = useCallback(
    (nodeId: string): GroupInspectorDraft | null => getGroupInspectorDraft(nodeId),
    [getGroupInspectorDraft],
  )

  const generateGroupFromNode = useCallback(
    (nodeId: string, draft: GroupInspectorDraft) => {
      groupInspectorDraftByNodeRef.current.delete(nodeId)
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode) {
          return currentScene
        }

        const generated = generateGroupStructureFromDraft(currentScene, canvasNode, draft)
        if (!generated) {
          return currentScene
        }

        const childPatchMap = new Map(generated.childNodePatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          connections: currentScene.connections.filter(
            (connection) =>
              !(
                (connection.fromBlockSlotId || connection.toBlockSlotId) &&
                (connection.fromNodeId === nodeId || connection.toNodeId === nodeId)
              ),
          ),
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: generated.node,
                groupStructure: generated.structure,
                groupViewActive: true,
                blockStructure: undefined,
                blockViewActive: false,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const revertGroupView = useCallback(
    (nodeId: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.groupStructure) {
          return currentScene
        }

        const reverted = revertGroupTokensFromNode(currentScene, canvasNode, canvasNode.groupStructure)
        const childPatchMap = new Map(reverted.childNodePatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          connections: currentScene.connections.filter(
            (connection) =>
              !(
                (connection.fromGroupSlotId || connection.toGroupSlotId) &&
                (connection.fromNodeId === nodeId || connection.toNodeId === nodeId)
              ),
          ),
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: reverted.node,
                groupStructure: undefined,
                groupViewActive: false,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const updateGroupParameter = useCallback(
    (nodeId: string, paramId: string, value: string) => {
      updateScene((currentScene) => {
        const canvasNode = currentScene.nodes.find((node) => node.id === nodeId)
        if (!canvasNode?.groupStructure) {
          return currentScene
        }

        const synced = syncGroupParameterEdit(currentScene, canvasNode, canvasNode.groupStructure, paramId, value)
        const childPatchMap = new Map(synced.childPatches.map((patch) => [patch.nodeId, patch.node]))

        return {
          ...currentScene,
          nodes: currentScene.nodes.map((node) => {
            if (node.id === nodeId) {
              return {
                ...node,
                node: synced.node,
                groupStructure: synced.structure,
              }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  const connectGroupSlots = useCallback(
    (
      fromNodeId: string,
      fromGroupSlotId: string,
      fromGroupParameterId: string | undefined,
      toNodeId: string,
      toGroupSlotId: string,
      toGroupParameterId: string | undefined,
    ) => {
      updateScene((currentScene) => {
        const fromNode = currentScene.nodes.find((node) => node.id === fromNodeId)
        const toNode = currentScene.nodes.find((node) => node.id === toNodeId)
        if (!fromNode?.groupStructure || !toNode?.groupStructure) {
          return currentScene
        }

        const fromEndpoint = findGroupSlotEndpoint(fromNode, fromGroupSlotId)
        const toEndpoint = findGroupSlotEndpoint(toNode, toGroupSlotId)
        if (!fromEndpoint || !toEndpoint || !canConnectGroupSlots(fromEndpoint, toEndpoint)) {
          return currentScene
        }

        const connectionId = `group:${fromNodeId}:${fromGroupSlotId}->${toNodeId}:${toGroupSlotId}`
        if (currentScene.connections.some((connection) => connection.id === connectionId)) {
          return currentScene
        }

        let nextFromStructure = fromNode.groupStructure
        let nextToStructure = toNode.groupStructure

        if (fromGroupParameterId && toGroupParameterId) {
          const propagated = propagateGroupConnectionValue(
            fromNode.groupStructure,
            toNode.groupStructure,
            fromGroupParameterId,
            toGroupParameterId,
          )
          if (propagated) {
            nextFromStructure = propagated.source
            nextToStructure = propagated.target
          }
        }

        const connection: CanvasConnection = {
          id: connectionId,
          fromNodeId,
          fromInternalStructureId: `__group__:${fromGroupSlotId}`,
          toNodeId,
          routing: 'wireless',
          fromGroupSlotId,
          ...(fromGroupParameterId ? { fromGroupParameterId } : {}),
          toGroupSlotId,
          ...(toGroupParameterId ? { toGroupParameterId } : {}),
        }

        const fromApplied = applyGroupStructureToNodeValues(currentScene, {
          ...fromNode,
          groupStructure: nextFromStructure,
        }, nextFromStructure)
        const toApplied = applyGroupStructureToNodeValues(currentScene, {
          ...toNode,
          groupStructure: nextToStructure,
        }, nextToStructure)

        const childPatchMap = new Map([
          ...fromApplied.childPatches,
          ...toApplied.childPatches,
        ].map((patch) => [patch.nodeId, patch.node]))

        const connections = withoutConnectionsToGroupInputSlot(
          currentScene.connections,
          toNodeId,
          toGroupSlotId,
        )

        return {
          ...currentScene,
          connections: [...connections, connection],
          nodes: currentScene.nodes.map((node) => {
            if (node.id === fromNodeId) {
              return { ...node, groupStructure: nextFromStructure, node: fromApplied.node }
            }
            if (node.id === toNodeId) {
              return { ...node, groupStructure: nextToStructure, node: toApplied.node }
            }
            const childPatch = childPatchMap.get(node.id)
            if (childPatch) {
              return { ...node, node: childPatch }
            }
            return node
          }),
        }
      })
    },
    [updateScene],
  )

  return {
    cycleConnectionRouting,
    setConnectionRouting,
    setElementViewMode,
    setElementRetracted,
    setAllNodeElementsRetracted,
    setElementSelectedIndex,
    redoScene,
    resetScene,
    sceneHistory,
    moveNode,
    setSceneCamera,
    patchSceneChrome,
    saveSceneNodesStatePreset,
    overwriteSceneNodesStatePreset,
    renameSceneNodesStatePreset,
    deleteSceneNodesStatePreset,
    applySceneNodesStatePreset,
    replaceSceneNodesStatePresets,
    suggestSceneNodesStatePresetName,
    patchNodeSceneOverlay,
    setAllNodesSceneHidden,
    showOnlyConnectedComponent,
    showOnlySlotSubtree,
    showOnlyIncomingSlotBranch,
    hideLinkedChildNodes,
    setAllNodesLocked,
    resetNodePosition,
    connectNodes,
    removeConnection,
    removeConnectionsFromOutputSlot,
    relinkInternalStructureSlot,
    createChildNode,
    createRootNode,
    createBlockNodeFromDefinition,
    createAddonNode,
    applyAddonOutputsToScene,
    connectAddonSlots,
    syncBlockParameterCatalogFromDefinitions,
    spawnNeekoNodeAtPosition,
    deleteNodeIds,
    deleteSelectedNodes,
    toggleNodeBodyCollapsed,
    toggleStructureCardParamsExpanded,
    setStructureCardWidth,
    setAllNodesBodyCollapsed,
    toggleNodeCardSection,
    setNodeCardBodyLayout,
    setNodeCardSectionOrder,
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
    getTabSnapshot,
    applyTabSnapshot,
    clearSelection,
    updateCanvasNodeNeekoPhase,
    applyNeekoTransform,
    generateBlockFromNode,
    revertBlockView,
    updateBlockParameter,
    addBlockParameterFromCatalog,
    removeBlockParameter,
    updateBlockParameterFromInspector,
    connectBlockSlots,
    buildBlockInspectorDraft,
    getBlockInspectorDraft,
    updateBlockInspectorDraft,
    refreshBlockInspectorDraft,
    generateGroupFromNode,
    revertGroupView,
    updateGroupParameter,
    connectGroupSlots,
    buildGroupInspectorDraft,
    getGroupInspectorDraft,
    updateGroupInspectorDraft,
    refreshGroupInspectorDraft,
  }
}
