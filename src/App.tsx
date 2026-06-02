import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphCanvasHandle } from '@/components/organisms/GraphCanvas'
import type { CSSProperties, PointerEvent } from 'react'

import { ConsoleNotificationCapsule } from '@/components/molecules/ConsoleNotificationCapsule'
import { CanvasViewportStatusBar } from '@/components/molecules/CanvasViewportStatusBar'
import { SceneTabBar } from '@/components/molecules/SceneTabBar'
import type { TabContextMenuAction } from '@/components/molecules/TabContextMenu'
import { NewCodeFileDialog } from '@/components/molecules/NewCodeFileDialog'
import { TextInputDialog } from '@/components/molecules/TextInputDialog'
import { AppMenuBar } from '@/components/organisms/AppMenuBar'
import {
  CodeDock,
  CODE_DOCK_DEFAULT_WIDTH,
  CODE_DOCK_MIN_WIDTH,
  type CodeDockFileBridge,
} from '@/components/organisms/CodeDock'
import {
  VfxDock,
  VFX_DOCK_DEFAULT_WIDTH,
  VFX_DOCK_MIN_WIDTH,
} from '@/components/organisms/VfxDock'
import { getPreference } from '@jade/lib/preferenceStore'
import { initAppTheme } from '@/core/appTheme'
import { refreshJadeSurfaceTheme } from '@/core/jadeSurfaceTheme'
import { pushCodeRecentFile, readCodeRecentFiles } from '@/jade/codeRecentFiles'
import {
  NodeInstanceStringPicker,
  type NodeInstanceStringCandidate,
} from '@/components/molecules/NodeInstanceStringPicker'
import {
  clampFloatingDockRect,
  createDefaultFloatingCodeDockRect,
} from '@/components/organisms/codeDockFloatingRect'
import { GraphCanvas } from '@/components/organisms/GraphCanvas'
import { DEFAULT_CANVAS_TOOLBAR_VISIBILITY } from '@/core/canvasToolbarVisibility'
import {
  toggleViewportToolbarDock,
  type ViewportToolbarDockId,
} from '@/core/viewportToolbarDock'
import { ParameterValueLinkPicker } from '@/components/molecules/ParameterValueLinkPicker'
import { NodeInspector } from '@/components/organisms/NodeInspector'
import { BlockInspector } from '@/components/organisms/BlockInspector'
import {
  BlockParameterInspector,
  type BlockParameterInspectorTarget,
} from '@/components/organisms/BlockParameterInspector'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import { GroupInspector } from '@/components/organisms/GroupInspector'
import { BlockingProgressDialog } from '@/components/molecules/BlockingProgressDialog'
import {
  buildBlockAutoBuildPlan,
  buildBlockAutoBuildPlanFromViewCode,
} from '@/core/blockAutoBuild'
import { codeToBlockScene } from '@/core/codeToBlockScene'
import {
  executeAutoBuildWorkItems,
  flattenAutoBuildWorkItems,
  type AutoBuildProgress,
  type AutoBuildRunResult,
} from '@/core/blockAutoBuildExecutor'
import { buildBlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import { writeBlockDefinitionDocument } from '@/core/blockDefinitionStorage'
import { buildBlockParameterJsonDocuments } from '@/core/blockParameterJson'
import { writeBlockParameterDocuments } from '@/core/blockParameterStorage'
import { blockTypeDefinitionsList } from '@/core/blockStructureRegistry'
import { SceneNodesPanel, type SceneNodesPanelTab } from '@/components/organisms/SceneNodesPanel'
import {
  filterRemovableNodeIds,
  getNodeDisplayTitle,
  isNodeLocked,
} from '@/core/canvasNodePresentation'
import { stubBinStructureDocument } from '@/core/binImportStub'
import { binTreeJsonToCanvasScene } from '@/core/ltkBinTreeScene'
import { getStoredRitobinExePath } from '@/core/ritobinExePreference'
import { convertBinViaRitobinExeBridge } from '@/core/ritobinInvokeBridge'
import type { ConvertRitobinToStructuresResult } from '@/core/convertRitobinTextToNodeStructures'
import {
  buildNodeInstanceId,
  buildNodeInstanceJsonDocument,
  getNodeParameterRuntimeValue,
  normalizeNodeInstanceStringName,
  sanitizeNodeInstanceJsonStem,
} from '@/core/convertToNodeInstance'
import { applyNomenclatureFromBinRitualText } from '@/core/binNomenclatureAnalyzer'
import {
  convertRitualTextClassGroup,
  convertRitualTextJadeFxEditor,
} from '@/core/convertRitualTextToNodeStructures'
import type {
  InternalStructureDefinition,
  NodeParameterDefinition,
  NodeSchemaDefinition,
} from '@/core/nodeSchema'
import type { CanvasPosition } from '@/core/canvasScene'
import {
  hydrateScene,
  schemaPackFolderBySchemaId,
  schemaJsonRelativePathBySchemaId,
  schemaRegistry,
  schemaStructureSubfolderBySchemaId,
  schemaNodeKindBySchemaId,
  schemaBaseParameterCatalogBySchemaId,
  schemaBaseInternalStructureCatalogBySchemaId,
} from '@/core/canvasScene'
import {
  dynamicPackFolderMap,
  dynamicPackStructureSubfolderMap,
  dynamicPacksSchemaRecord,
  loadDynamicStructurePacksFromStorage,
  sanitizeStructurePackFolderName,
  saveDynamicStructurePacksToStorage,
} from '@/core/nodeStructurePackStorage'
import { fx_required_parameter_isMarked, resolveRequiredParameterListId } from '@/core/fx_required_parameter'
import { resolveLinkedPairForDisk } from '@/core/linked_parameter_values'
import { link_parameter_value_partner } from '@/core/link_parameter_value'
import { parseSceneDocument } from '@/core/leagueBinScene'
import {
  countElementDependencies,
  formatElementDependencyWarning,
  type NodeElementListItem,
} from '@/core/listNodeElements'
import {
  MESSENGER_CONFIRM_DELETE_NODE,
  MESSENGER_TOAST_NODE_LOCKED,
  MESSENGER_CONFIRM_NODE_CONFIGURATION_MODE,
  MESSENGER_CONFIRM_REMOVE_NODE_ELEMENT,
  MESSENGER_CONFIRM_TOGGLE_REQUIRED_PARAMETER,
} from '@/messenger_popup/messengerCatalog'
import { useMessengerPopup } from '@/messenger_popup/MessengerPopupProvider'
import {
  getNodeLightModeEnabled,
  setNodeLightModeEnabled,
} from '@/core/nodeLightModePreference'
import { canvasToClassGroupRitualWithProgress } from '@/core/canvasToClassGroupRitual'
import { codeToCanvasScene } from '@/core/codeToCanvasScene'
import { codeToNewNodeGraph, prepareCodeToNewNodeGraph } from '@/core/codeToNewNodeGraph'
import { CodeToCanvasWizardPanel } from '@/components/molecules/CodeToCanvasWizardPanel'
import { GraphsToCodeProgressDialog } from '@/components/molecules/GraphsToCodeProgressDialog'
import { useCodeToCanvasWizard } from '@/hooks/useCodeToCanvasWizard'
import { useCodeToNewNodeGraphWizard } from '@/hooks/useCodeToNewNodeGraphWizard'
import {
  getClassGroupConverterPackFolder,
  getCodeToNewNodeGraphPackFolder,
  getCodeToNodeGraphPackFolder,
  parseClassGroupPackFolderName,
  setClassGroupConverterPackFolder,
  setCodeToNewNodeGraphPackFolder,
  setCodeToNodeGraphPackFolder,
} from '@/core/nodeConfigurationPreference'
import { STORAGE_LAST_STRUCTURE_META, triggerJsonDownload } from '@/core/workspaceStorage'
import { workspaceService } from '@/services/workspaceService'
import {
  CODE_DOCK_FILE_INPUT_ACCEPT,
  defaultContentForNewFile,
  getFileExtension,
  isRitobinEditorPath,
  needsBinConversionOnOpen,
  needsBinConversionOnSave,
  normalizeCodeDockFileName,
  sanitizeCodeDockBaseName,
} from '@/core/codeDockFileTypes'
import { applyRitualSnippetScalarsToNode } from '@/core/applyRitualSnippetScalarsToNode'
import {
  emitNodeRitualViewCodeText,
  emitNodeBlockViewCodeText,
  emitNodeBlockCardPreviewCodeText,
  emitNodeGroupViewCodeText,
  syncNodeToBoundCodeRange,
  type NodeCodeEditorBinding,
} from '@/core/nodeCodeEditorBinding'
import { stripExtension } from '@/core/sceneTabsStorage'
import { saveCodeDockTextManual } from '@/core/codeDockFileSave'
import {
  parseSceneNodesStatePresetsFile,
  serializeSceneNodesStatePresetsFile,
} from '@/core/sceneNodesStatePresets'
import { isCanvasScene } from '@/hooks/useSceneHistory'
import { useAppShortcutHandlers } from '@/shortcuts/useAppShortcutHandlers'
import {
  ensureJadeHashesLoaded,
  getJadeEditorResolveStatus,
  resolveBinFileForEditor,
  resolveRitualTextForEditor,
  type JadeEditorResolveStatus,
} from '@/core/jadeEditorTextResolve'
import { ritualContainsVfxSystem } from '@/core/vfx/ritualParseVfx'
import { resolveVfxRitualText } from '@/core/vfx/resolveVfxRitualText'
import { useCodeDockTabs } from '@/hooks/useCodeDockTabs'
import { useNeekoTransform } from '@/hooks/useNeekoTransform'
import { RitualDragOverlay } from '@/components/molecules/RitualDragOverlay'
import { LangId } from '@/core/language/languageIds'
import { useSceneTabs } from '@/hooks/useSceneTabs'
import { useLanguage } from '@/language/LanguageProvider'
import {
  MESSENGER_TOAST_NEEKO_BUILD_FAILED,
  MESSENGER_TOAST_NEEKO_TRANSFORM_ERROR,
  MESSENGER_TOAST_NEEKO_TRANSFORM_WARNINGS,
} from '@/messenger_popup/messengerCatalog'

import styles from './App.module.css'

/** Notificação de teste ao carregar a app (cápsula consola / 3s). */
const BOOT_CONSOLE_TEST_MESSAGE = 'Teste, console de notificação funcionado.'
const BOOT_CONSOLE_TEST_SECONDS = 3

const SAVE_STATUS_NOTICE_SECONDS = 10

type TabRenameTarget =
  | { kind: 'scene'; tabId: string; initial: string }
  | { kind: 'code'; tabId: string; initial: string }

const HASH_STRING_EMPTY_NOTICE =
  'Você precisa adicionar um parâmetro do tipo string name em seu node, adicione para definir a hashString'

type TooltipDictionary = Record<string, string>

type InspectorOffset = {
  x: number
  y: number
}

type InspectorDragGesture = {
  element: HTMLElement
  moved: boolean
  offset: InspectorOffset
  origin: InspectorOffset
  pointerId: number
  viewportDockedAtStart: boolean
  undockFromToolbarStarted: boolean
}

const INSPECTOR_TOOLBAR_UNDOCK_DRAG_PX = 12

const INSPECTOR_CHROME_STRIP_PX = 42

function readRootSpacePx(variable: string): number {
  if (typeof document === 'undefined') {
    return 0
  }

  const raw = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()

  if (raw.endsWith('px')) {
    const value = Number.parseFloat(raw)

    return Number.isFinite(value) ? value : 0
  }

  return 0
}

type InspectorDockAnchor = {
  clientX: number
  clientY: number
}

function computeInspectorDockDefaultAnchor(
  column: HTMLElement,
  minimized: boolean,
): { defaultRight: number; defaultTop: number } {
  const col = column.getBoundingClientRect()
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  const marginEdge = readRootSpacePx(narrow ? '--space-3' : '--space-5')

  return {
    defaultRight: col.right - marginEdge,
    defaultTop: minimized
      ? col.bottom - marginEdge - INSPECTOR_CHROME_STRIP_PX
      : col.top + col.height - marginEdge - INSPECTOR_CHROME_STRIP_PX,
  }
}

function computeInspectorDockOffsetFromPointer(
  column: HTMLElement,
  anchor: InspectorDockAnchor,
  minimized: boolean,
): InspectorOffset {
  const { defaultRight, defaultTop } = computeInspectorDockDefaultAnchor(column, minimized)

  return {
    x: anchor.clientX - defaultRight,
    y: anchor.clientY - defaultTop,
  }
}

function computeInspectorDockOffsetFromStrip(
  column: HTMLElement,
  strip: HTMLElement,
  minimized: boolean,
): InspectorOffset {
  const { defaultRight, defaultTop } = computeInspectorDockDefaultAnchor(column, minimized)
  const sr = strip.getBoundingClientRect()
  const marginBelowStrip = readRootSpacePx('--space-3')

  return {
    x: sr.right - defaultRight,
    y: sr.bottom + marginBelowStrip - defaultTop,
  }
}

function App() {
  const { t } = useLanguage()
  const inspectorMovedDuringPointer = useRef(false)
  const inspectorDragGesture = useRef<InspectorDragGesture | null>(null)
  const sceneNodesMovedDuringPointer = useRef(false)
  const sceneNodesDragGesture = useRef<InspectorDragGesture | null>(null)
  const graphColumnRef = useRef<HTMLDivElement | null>(null)
  const graphCanvasRef = useRef<GraphCanvasHandle | null>(null)

  const [dynamicStructurePacks, setDynamicStructurePacks] = useState(loadDynamicStructurePacksFromStorage)

  const extendSchemaLookup = useMemo(
    () => ({ ...schemaRegistry, ...dynamicPacksSchemaRecord(dynamicStructurePacks) }),
    [dynamicStructurePacks],
  )

  const [paletteSignal, setPaletteSignal] = useState(0)
  const requestPalette = useCallback(() => {
    setPaletteSignal((ticket) => ticket + 1)
  }, [])

  const mergedPackFolderBySchemaId = useMemo(
    () => ({
      ...schemaPackFolderBySchemaId,
      ...dynamicPackFolderMap(dynamicStructurePacks),
    }),
    [dynamicStructurePacks],
  )

  const mergedStructureSubfolderBySchemaId = useMemo(
    () => ({
      ...schemaStructureSubfolderBySchemaId,
      ...dynamicPackStructureSubfolderMap(dynamicStructurePacks),
    }),
    [dynamicStructurePacks],
  )

  const memoryPackFolders = useMemo(
    () =>
      [...new Set(dynamicStructurePacks.map((pack) => pack.folder.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [dynamicStructurePacks],
  )

  const [nodeLightModeEnabled, setNodeLightModeEnabled] = useState(() => getNodeLightModeEnabled())

  const {
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
    deleteSceneNodesStatePreset,
    applySceneNodesStatePreset,
    replaceSceneNodesStatePresets,
    suggestSceneNodesStatePresetName,
    connectNodes,
    relinkInternalStructureSlot,
    removeConnection,
    removeConnectionsFromOutputSlot,
    createChildNode,
    createRootNode,
    spawnNeekoNodeAtPosition,
    deleteSelectedNodes,
    deleteNodeIds,
    patchNodeSceneOverlay,
    setAllNodesSceneHidden,
    showOnlyConnectedComponent,
    showOnlySlotSubtree,
    showOnlyIncomingSlotBranch,
    hideLinkedChildNodes,
    setAllNodesLocked,
    resetNodePosition,
    toggleNodeBodyCollapsed,
    toggleStructureCardParamsExpanded,
    setStructureCardWidth,
    setAllNodesBodyCollapsed,
    toggleNodeCardSection,
    setNodeCardSectionOrder,
    setNodeCardBodyLayout,
    updateSelectedParameter,
    updateNodeParameter,
    setNodeParameterOrder,
    swapSelectedNodeParameters,
    toggleSelectedParameterRequired,
    applyHashStringSourceToSelectedNode,
    linkParameterValuePairForNode,
    unlinkParameterValueForNode,
    commitMarqueeSelection,
    undoScene,
    scene,
    selectedNodeIds,
    primarySelectedId,
    selectNode,
    selectAllNodes,
    clearSelection,
    tabBarItems,
    recentScenes,
    activateTab,
    closeTab,
    createWorkScene,
    hasOpenSceneTabs,
    renameTab: renameSceneTab,
    saveSceneTab,
    openSceneInNewTab,
    openOrReplaceSceneByTitle,
    openRecentScene,
    promptNewWorkScene,
    activeTabId,
    activeTabTitle,
    activeTabJsonFileName,
    setTabJsonFileContext,
    addDynamicParameter,
    removeCanvasParameter,
    appendEmbedCatalogItem,
    appendPointerCatalogItem,
    appendListEmbedCatalogItem,
    appendListPointerCatalogItem,
    appendList2EmbedCatalogItem,
    appendList2PointerCatalogItem,
    removeList2EmbedInstance,
    removeList2PointerInstance,
    removeEmbedSlot,
    removeEmbedBlock,
    removePointerSlot,
    removePointerBlock,
    removeListEmbedSlot,
    removeListEmbedBlock,
    removeListPointerSlot,
    removeListPointerBlock,
    updateCanvasNodeNeekoPhase,
    applyNeekoTransform,
    generateBlockFromNode,
    revertBlockView,
    updateBlockParameter,
    createBlockNodeFromDefinition,
    syncBlockParameterCatalogFromDefinitions,
    addBlockParameterFromCatalog,
    removeBlockParameter,
    updateBlockParameterFromInspector,
    connectBlockSlots,
    getBlockInspectorDraft,
    updateBlockInspectorDraft,
    refreshBlockInspectorDraft,
    generateGroupFromNode,
    revertGroupView,
    updateGroupParameter,
    connectGroupSlots,
    getGroupInspectorDraft,
    updateGroupInspectorDraft,
    refreshGroupInspectorDraft,
  } = useSceneTabs({ extendSchemaLookup, lightModeEnabled: nodeLightModeEnabled })

  const { showConfirmByCatalogId, showToastByCatalogId } = useMessengerPopup()

  const neekoTransformCallbacks = useMemo(
    () => ({
      updateCanvasNodeNeekoPhase,
      applyNeekoTransform,
    }),
    [applyNeekoTransform, updateCanvasNodeNeekoPhase],
  )

  const {
    transformingNodeId: neekoTransformingNodeId,
    runTransform: runNeekoTransform,
    canTransformNode: canNeekoTransformNode,
  } = useNeekoTransform(neekoTransformCallbacks)

  const neekoSendTarget = useMemo(() => {
    if (!primarySelectedId || neekoTransformingNodeId === primarySelectedId) {
      return null
    }

    const node = scene.nodes.find((canvasNode) => canvasNode.id === primarySelectedId)
    if (!node || !canNeekoTransformNode(node.node.schema.id, node.locked)) {
      return null
    }

    return { canvasNodeId: primarySelectedId }
  }, [canNeekoTransformNode, neekoTransformingNodeId, primarySelectedId, scene.nodes])

  const handleNeekoBuildFailed = useCallback(() => {
    showToastByCatalogId(MESSENGER_TOAST_NEEKO_BUILD_FAILED)
  }, [showToastByCatalogId])

  const handleBuildNeekoAtPosition = useCallback(
    (position: CanvasPosition) => spawnNeekoNodeAtPosition(position),
    [spawnNeekoNodeAtPosition],
  )

  const handleNeekoDropCode = useCallback(
    (canvasNodeId: string, text: string) => {
      void runNeekoTransform(canvasNodeId, text).then((result) => {
        if (!result?.ok) {
          if (result?.error) {
            showToastByCatalogId(MESSENGER_TOAST_NEEKO_TRANSFORM_ERROR, { error: result.error })
          }
          return
        }
        requestPalette()
        if (result.warnings.length > 0) {
          const preview = result.warnings.slice(0, 30).join('\n')
          const suffix =
            result.warnings.length > 30
              ? `\n… e mais ${String(result.warnings.length - 30)} aviso(s).`
              : ''
          showToastByCatalogId(MESSENGER_TOAST_NEEKO_TRANSFORM_WARNINGS, {
            summary: `${preview}${suffix}`,
          })
        }
      })
    },
    [requestPalette, runNeekoTransform, showToastByCatalogId],
  )

  const availableSchemas = useMemo(() => Object.values(extendSchemaLookup), [extendSchemaLookup])

  const mergedSchemaNodeKindBySchemaId = useMemo(() => {
    const next: Record<string, 'module' | 'base'> = { ...schemaNodeKindBySchemaId }
    for (const s of availableSchemas) {
      if (next[s.id] === undefined) {
        next[s.id] = 'module'
      }
    }
    return next
  }, [availableSchemas])

  const mergedBaseParameterCatalogBySchemaId = useMemo(() => {
    const next: Record<string, NodeParameterDefinition[]> = {
      ...schemaBaseParameterCatalogBySchemaId,
    }
    for (const s of availableSchemas) {
      if (next[s.id] === undefined) {
        next[s.id] = []
      }
    }
    return next
  }, [availableSchemas])

  const mergedBaseInternalStructureCatalogBySchemaId = useMemo(() => {
    const next: Record<string, InternalStructureDefinition[]> = {
      ...schemaBaseInternalStructureCatalogBySchemaId,
    }
    for (const s of availableSchemas) {
      if (next[s.id] === undefined) {
        next[s.id] = []
      }
    }
    return next
  }, [availableSchemas])

  const [inspectorMinimized, setInspectorMinimized] = useState(false)
  const [inspectorOffset, setInspectorOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const [inspectorViewportDocked, setInspectorViewportDocked] = useState(true)
  const [blockParameterInspectorTarget, setBlockParameterInspectorTarget] =
    useState<BlockParameterInspectorTarget | null>(null)

  const [blockInspectorMinimized, setBlockInspectorMinimized] = useState(false)
  const [blockInspectorViewportDocked, setBlockInspectorViewportDocked] = useState(true)
  const [blockInspectorOffset, setBlockInspectorOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const [autoBuildUi, setAutoBuildUi] = useState<{
    phase: 'running' | 'confirmCancel' | 'summary' | 'error'
    progress: AutoBuildProgress
    result?: AutoBuildRunResult
    errorMessage?: string
  } | null>(null)
  const autoBuildCancelRef = useRef(false)
  const blockAutoBuildBusy = autoBuildUi !== null
  const [blockCardPreviewUi, setBlockCardPreviewUi] = useState<{
    phase: 'running' | 'confirmCancel' | 'summary' | 'error'
    completed: number
    total: number
    currentLabel: string
    summaryBody?: string
    summaryTitle?: string
  } | null>(null)
  const blockCardPreviewCancelRef = useRef(false)
  const blockCardPreviewBusy = blockCardPreviewUi !== null
  const blockInspectorMovedDuringPointer = useRef(false)
  const blockInspectorDragGesture = useRef<InspectorDragGesture | null>(null)
  const [groupInspectorMinimized, setGroupInspectorMinimized] = useState(false)
  const [groupInspectorViewportDocked, setGroupInspectorViewportDocked] = useState(true)
  const [groupInspectorOffset, setGroupInspectorOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const groupInspectorMovedDuringPointer = useRef(false)
  const groupInspectorDragGesture = useRef<InspectorDragGesture | null>(null)
  const [inspectorGrabFollowActive, setInspectorGrabFollowActive] = useState(false)
  const [inspectorGrabFollowCoords, setInspectorGrabFollowCoords] = useState({ x: 0, y: 0 })
  const sceneNodesMinimized = scene.sceneChrome?.sceneNodes?.minimized ?? true
  const sceneNodesSortMode = scene.sceneChrome?.sceneNodes?.sortMode ?? 'name'
  const [sceneNodesPanelTab, setSceneNodesPanelTab] = useState<SceneNodesPanelTab>('nodes')
  const [sceneNodesOffset, setSceneNodesOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const [sceneNodesViewportDocked, setSceneNodesViewportDocked] = useState(true)
  const [activeViewportToolbarDock, setActiveViewportToolbarDock] =
    useState<ViewportToolbarDockId | null>(null)
  const [canvasToolbarChromeHost, setCanvasToolbarChromeHost] = useState<HTMLDivElement | null>(null)
  const [codeDockOpen, setCodeDockOpen] = useState(false)
  const [codeDockWidth, setCodeDockWidth] = useState(CODE_DOCK_DEFAULT_WIDTH)
  const [codeDockFloating, setCodeDockFloating] = useState(false)
  const [codeDockFloatingRect, setCodeDockFloatingRect] = useState(() =>
    clampFloatingDockRect(createDefaultFloatingCodeDockRect()),
  )
  const [codeDockJadeBanner, setCodeDockJadeBanner] = useState<{
    message: string
    tone: 'fnv' | 'jade' | 'mock'
  } | null>(null)
  const [vfxDockOpen, setVfxDockOpen] = useState(false)
  const [vfxRitualOverride, setVfxRitualOverride] = useState<string | null>(null)
  const [vfxDockWidth, setVfxDockWidth] = useState(VFX_DOCK_DEFAULT_WIDTH)
  const [vfxDockFloating, setVfxDockFloating] = useState(false)
  const [vfxDockFloatingRect, setVfxDockFloatingRect] = useState(() =>
    clampFloatingDockRect(createDefaultFloatingCodeDockRect()),
  )
  const {
    activateTab: activateCodeDockTab,
    activeTabId: activeCodeDockTabId,
    closeTab: closeCodeDockTab,
    codeDockFileName,
    codeText,
    markActiveTabSaved,
    openInTab: openCodeDockTab,
    openNewTab: openNewCodeDockTab,
    renameTab: renameCodeDockTab,
    saveTab: saveCodeDockTab,
    setCodeDockFileName,
    setCodeText,
    tabBarItems: codeDockTabBarItems,
    tabs: codeDockTabs,
  } = useCodeDockTabs()

  const [tabRenameTarget, setTabRenameTarget] = useState<TabRenameTarget | null>(null)
  const [newCodeFileDialogOpen, setNewCodeFileDialogOpen] = useState(false)
  const [codeRecentFiles, setCodeRecentFiles] = useState<string[]>(() => readCodeRecentFiles())
  const codeDockFileInputRef = useRef<HTMLInputElement>(null)
  const [nodeConfigurationMode, setNodeConfigurationMode] = useState(false)
  const [classGroupPackFolderDialogOpen, setClassGroupPackFolderDialogOpen] = useState(false)
  const [classGroupPackFolderDialogMode, setClassGroupPackFolderDialogMode] = useState<
    'settings' | 'convert'
  >('settings')
  const [parameterValueLinkSourceId, setParameterValueLinkSourceId] = useState<null | string>(null)
  const [nodeInstanceStringPickerNodeId, setNodeInstanceStringPickerNodeId] = useState<null | string>(null)
  const [hashStringPickerNodeId, setHashStringPickerNodeId] = useState<null | string>(null)
  const [hashStringNoticeStamp, setHashStringNoticeStamp] = useState<number | null>(null)
  const [codeToNewNodeGraphProgress, setCodeToNewNodeGraphProgress] = useState<{
    label: string
    ratio: number
  } | null>(null)
  const [graphsToCodeProgress, setGraphsToCodeProgress] = useState<{
    label: string
    ratio: number
  } | null>(null)
  const [tooltipHints, setTooltipHints] = useState<TooltipDictionary>({})
  const [bootConsoleTestStamp, setBootConsoleTestStamp] = useState<number | null>(() => Date.now())
  const [saveStatusNotice, setSaveStatusNotice] = useState<{
    lifetimeSeconds: number
    message: string
    stamp: number
  } | null>(null)
  const [nodeCodeBindings, setNodeCodeBindings] = useState<
    Record<string, NodeCodeEditorBinding>
  >({})

  const dismissBootConsoleTest = useCallback(() => {
    setBootConsoleTestStamp(null)
  }, [])

  const dismissHashStringNotice = useCallback(() => {
    setHashStringNoticeStamp(null)
  }, [])

  const dismissSaveStatusNotice = useCallback(() => {
    setSaveStatusNotice(null)
  }, [])

  const showSaveStatusNotice = useCallback(
    (message: string, lifetimeSeconds = SAVE_STATUS_NOTICE_SECONDS) => {
      setSaveStatusNotice({ message, stamp: Date.now(), lifetimeSeconds })
    },
    [],
  )

  const applySnippetScalarsToCanvasNode = useCallback(
    (canvasNodeId: string, snippet: string) => {
      const canvasNode = scene.nodes.find((entry) => entry.id === canvasNodeId)
      if (!canvasNode) {
        return
      }

      const result = applyRitualSnippetScalarsToNode(canvasNode.node, snippet)
      if (!result.ok) {
        window.alert(result.error)
        return
      }

      for (const update of result.updates) {
        updateNodeParameter(canvasNodeId, update.parameterId, update.value)
      }

      showSaveStatusNotice(
        `${String(result.updates.length)} valor(es) do código aplicado(s) ao nó «${canvasNode.node.schema.title}».`,
      )

      if (result.warnings.length > 0) {
        const preview = result.warnings.slice(0, 20).join('\n')
        const suffix =
          result.warnings.length > 20
            ? `\n… e mais ${String(result.warnings.length - 20)} aviso(s).`
            : ''
        window.alert(`[Replace Value to Graph]\n\n${preview}${suffix}`)
      }
    },
    [scene.nodes, showSaveStatusNotice, updateNodeParameter],
  )

  const handleReplaceValueToGraph = useCallback(
    (snippet: string) => {
      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de aplicar valores ao grafo.')
        return
      }

      if (!primarySelectedId) {
        window.alert('Seleccione um nó no canvas antes de aplicar valores do código.')
        return
      }

      if (selectedNodeIds.length > 1) {
        window.alert('Em selecção múltipla, use apenas o nó primário seleccionado.')
        return
      }

      applySnippetScalarsToCanvasNode(primarySelectedId, snippet)
    },
    [
      applySnippetScalarsToCanvasNode,
      hasOpenSceneTabs,
      primarySelectedId,
      selectedNodeIds.length,
    ],
  )

  const handleBindCodeRangeToNode = useCallback(
    (
      canvasNodeId: string,
      payload: {
        text: string
        textRange: NodeCodeEditorBinding['range']
      },
    ) => {
      if (!activeCodeDockTabId) {
        window.alert('Abra uma aba no editor de código antes de vincular a área.')
        return
      }

      const canvasNode = scene.nodes.find((entry) => entry.id === canvasNodeId)
      if (!canvasNode) {
        return
      }

      setNodeCodeBindings((previous) => ({
        ...previous,
        [canvasNodeId]: {
          canvasNodeId,
          codeDockTabId: activeCodeDockTabId,
          range: payload.textRange,
        },
      }))

      showSaveStatusNotice(
        `Área do código vinculada ao nó «${canvasNode.node.schema.title}». Use «Sincronizar valores para o código» para actualizar o trecho.`,
      )
    },
    [activeCodeDockTabId, scene.nodes, showSaveStatusNotice],
  )

  const openClassGroupPackFolderDialog = useCallback(() => {
    setClassGroupPackFolderDialogMode('settings')
    setClassGroupPackFolderDialogOpen(true)
  }, [])

  const toggleNodeLightMode = useCallback(() => {
    setNodeLightModeEnabled((previous) => {
      const next = !previous
      setNodeLightModeEnabled(next)
      return next
    })
  }, [])

  const toggleNodeConfigurationMode = useCallback(() => {
    if (nodeConfigurationMode) {
      setNodeConfigurationMode(false)
      setClassGroupPackFolderDialogOpen(false)
      setParameterValueLinkSourceId(null)
      setHashStringPickerNodeId(null)
      return
    }

    showConfirmByCatalogId(MESSENGER_CONFIRM_NODE_CONFIGURATION_MODE, {
      onConfirm: () => {
        setNodeConfigurationMode(true)
      },
      onCancel: () => {
        setNodeConfigurationMode(false)
        setParameterValueLinkSourceId(null)
      },
    })
  }, [nodeConfigurationMode, showConfirmByCatalogId])

  /** Ao desacoplar pelo pin: alinha o inspector lateral ao chip da barra (X) e coloca o topo a stripBottom + `--space-3`. */
  const applyInspectorOffsetFromViewportStrip = useCallback(
    (options?: { minimized?: boolean }) => {
      const column = graphColumnRef.current

      if (!column) {
        setInspectorOffset({ x: 0, y: 0 })
        return
      }

      const strip = column.querySelector('[data-inspector-viewport-strip]')

      if (!(strip instanceof HTMLElement)) {
        setInspectorOffset({ x: 0, y: 0 })
        return
      }

      const useMinimized = options?.minimized ?? inspectorMinimized

      setInspectorOffset(
        computeInspectorDockOffsetFromStrip(column, strip, useMinimized),
      )
    },
    [inspectorMinimized],
  )

  const toggleViewportToolbarDockById = useCallback((dockId: ViewportToolbarDockId) => {
    setActiveViewportToolbarDock((current) => toggleViewportToolbarDock(current, dockId))
  }, [])

  const handleUndockFromViewportToolbar = useCallback(() => {
    setInspectorMinimized(true)
    applyInspectorOffsetFromViewportStrip({ minimized: true })
    setInspectorViewportDocked(false)
    setActiveViewportToolbarDock((current) => (current === 'node' ? null : current))
  }, [applyInspectorOffsetFromViewportStrip])

  const applyBlockInspectorOffsetFromViewportStrip = useCallback(
    (anchor?: InspectorDockAnchor) => {
      const column = graphColumnRef.current

      if (!column) {
        setBlockInspectorOffset({ x: 0, y: 0 })
        return
      }

      if (anchor) {
        setBlockInspectorOffset(
          computeInspectorDockOffsetFromPointer(column, anchor, blockInspectorMinimized),
        )
        return
      }

      const strip = column.querySelector('[data-block-inspector-strip]')

      if (!(strip instanceof HTMLElement)) {
        setBlockInspectorOffset({ x: 0, y: 0 })
        return
      }

      setBlockInspectorOffset(
        computeInspectorDockOffsetFromStrip(column, strip, blockInspectorMinimized),
      )
    },
    [blockInspectorMinimized],
  )

  const handleUndockBlockInspectorFromViewportToolbar = useCallback(
    (anchor?: InspectorDockAnchor) => {
      applyBlockInspectorOffsetFromViewportStrip(anchor)
      setBlockInspectorViewportDocked(false)
      setActiveViewportToolbarDock((current) => (current === 'block' ? null : current))
    },
    [applyBlockInspectorOffsetFromViewportStrip],
  )

  const applyGroupInspectorOffsetFromViewportStrip = useCallback(
    (anchor?: InspectorDockAnchor, options?: { minimized?: boolean }) => {
      const column = graphColumnRef.current
      const useMinimized = options?.minimized ?? groupInspectorMinimized

      if (!column) {
        setGroupInspectorOffset({ x: 0, y: 0 })
        return
      }

      if (anchor) {
        setGroupInspectorOffset(
          computeInspectorDockOffsetFromPointer(column, anchor, useMinimized),
        )
        return
      }

      const strip = column.querySelector('[data-group-inspector-strip]')

      if (!(strip instanceof HTMLElement)) {
        setGroupInspectorOffset({ x: 0, y: 0 })
        return
      }

      setGroupInspectorOffset(
        computeInspectorDockOffsetFromStrip(column, strip, useMinimized),
      )
    },
    [groupInspectorMinimized],
  )

  const handleUndockGroupInspectorFromViewportToolbar = useCallback(
    (anchor?: InspectorDockAnchor) => {
      setGroupInspectorMinimized(true)
      applyGroupInspectorOffsetFromViewportStrip(anchor, { minimized: true })
      setGroupInspectorViewportDocked(false)
      setActiveViewportToolbarDock((current) => (current === 'group' ? null : current))
    },
    [applyGroupInspectorOffsetFromViewportStrip],
  )

  const applySceneNodesOffsetFromViewportStrip = useCallback(
    (options?: { minimized?: boolean }) => {
      const column = graphColumnRef.current

      if (!column) {
        setSceneNodesOffset({ x: 0, y: 0 })
        return
      }

      const strip = column.querySelector('[data-scene-nodes-viewport-strip]')

      if (!(strip instanceof HTMLElement)) {
        setSceneNodesOffset({ x: 0, y: 0 })
        return
      }

      const useMinimized = options?.minimized ?? sceneNodesMinimized
      const sr = strip.getBoundingClientRect()
      const col = column.getBoundingClientRect()
      const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
      const marginEdge = readRootSpacePx(narrow ? '--space-3' : '--space-5')
      const marginBelowStrip = readRootSpacePx('--space-3')
      const defaultLeft = col.left + marginEdge
      const defaultTop = useMinimized
        ? col.bottom - marginEdge - INSPECTOR_CHROME_STRIP_PX
        : col.top + col.height - marginEdge - INSPECTOR_CHROME_STRIP_PX

      setSceneNodesOffset({
        x: sr.left - defaultLeft,
        y: sr.bottom + marginBelowStrip - defaultTop,
      })
    },
    [sceneNodesMinimized],
  )

  const handleUndockSceneNodesFromViewportToolbar = useCallback(() => {
    patchSceneChrome({ sceneNodes: { minimized: true } })
    applySceneNodesOffsetFromViewportStrip({ minimized: true })
    setSceneNodesViewportDocked(false)
    setActiveViewportToolbarDock((current) => (current === 'scene' ? null : current))
  }, [applySceneNodesOffsetFromViewportStrip, patchSceneChrome])

  useEffect(() => {
    const loadTooltips = async () => {
      try {
        const response = await fetch('/tooltips.json')

        if (!response.ok) {
          return
        }

        const payload: unknown = await response.json()

        if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
          setTooltipHints(payload as TooltipDictionary)
        }
      } catch {
        /** ignore */
      }
    }

    void loadTooltips()
    void initAppTheme()
    void refreshJadeSurfaceTheme()
  }, [])

  const persistConvertedStructurePack = useCallback(
    async (
      folder: string,
      schemas: NodeSchemaDefinition[],
      warnings: string[],
      modeBanner: string,
      rootSchemaIds?: string[],
      options?: { silent?: boolean },
    ) => {
      setDynamicStructurePacks((previous) => {
        const next = previous.filter((pack) => pack.folder !== folder)
        next.push({ folder, schemas })
        saveDynamicStructurePacksToStorage(next)
        return next
      })

      let diskLine = ''

      if (import.meta.env.DEV) {
        try {
          const res = await fetch('/api/node-structures-write', {
            body: JSON.stringify({
              folder,
              schemas,
              rootSchemaIds,
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })

          const payload: unknown = await res.json().catch(() => null)
          const ok =
            res.ok &&
            typeof payload === 'object' &&
            payload !== null &&
            'ok' in payload &&
            Reflect.get(payload, 'ok') === true

          if (ok && typeof payload === 'object' && payload !== null) {
            const paths = Reflect.get(payload, 'paths')
            const skipped = Reflect.get(payload, 'skippedIds')
            const list = Array.isArray(paths) ? paths.map(String).join(', ') : ''

            diskLine =
              `\n\nDisco (dev): src/nodeStructures/${folder}/ (${list}).` +
              (options?.silent
                ? ''
                : '\nRecarrega (F5) se a paleta não actualizar logo.')

            if (Array.isArray(skipped) && skipped.length > 0) {
              diskLine += `\nIgnorados: ${skipped.slice(0, 8).join(', ')}${skipped.length > 8 ? '…' : ''}`
            }
          } else {
            const errMsg =
              typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
                ? String(Reflect.get(payload, 'error'))
                : `HTTP ${String(res.status)}`
            diskLine = `\n\nNão gravou no disco (${errMsg}). O pack ficou registado só na sessão/localStorage até corrigires.`
          }
        } catch {
          diskLine =
            '\n\nServidor dev indisponível — corre `npm run dev` para gravar na pasta `src/nodeStructures`. O pack ficou registado para a paleta via localStorage.'
        }
      } else {
        diskLine =
          '\n\nBuild estático: os tipos ficam só no armazenamento local da paleta. Para persistir copia-os para src/nodeStructures após usar `npm run dev`.'
      }

      const warnPreview =
        warnings.length > 0
          ? `\n\nNotas:\n${warnings.slice(0, 15).join('\n')}${warnings.length > 15 ? '\n…' : ''}`
          : ''

      if (!options?.silent) {
        window.alert(
          `${modeBanner}Pack «${folder}» · ${String(schemas.length)} tipo(s) na paleta (📂 [${folder}]).${diskLine}${warnPreview}`,
        )
      }
    },
    [],
  )

  const resolveStructurePackFolder = useCallback((): string | null => {
      const rawName = window.prompt(
        'Nome da pasta (cria `src/nodeStructures/<nome>/` em dev; aparece na paleta como 📂 [nome]):',
        'importado',
      )

      if (rawName === null) {
        return null
      }

      const folder = sanitizeStructurePackFolderName(rawName)

      if (!folder) {
        window.alert(
          'Nome de pasta inválido. Usa letras minúsculas, números, hífen (-) e sublinhado (_), até 48 caracteres.',
        )
        return null
      }

      if (folder === 'default') {
        window.alert('«default» é reservada aos tipos estáticos da app; escolhe outro nome de pasta.')
        return null
      }

      return folder
  }, [])

  const handleConvertRitualToStructurePack = useCallback(
    async (
      convertFn: (text: string) => ConvertRitobinToStructuresResult,
      modeBanner: string,
    ) => {
      const folder = resolveStructurePackFolder()

      if (!folder) {
        return
      }

      const converted = convertFn(codeText)

      if (converted.ok === false) {
        window.alert(converted.error)
        return
      }

      await persistConvertedStructurePack(
        folder,
        converted.schemas,
        converted.warnings,
        modeBanner,
        converted.rootSchemaIds,
      )
    },
    [codeText, persistConvertedStructurePack, resolveStructurePackFolder],
  )

  const handleConvertJadeFxEditorPack = useCallback(() => {
    void handleConvertRitualToStructurePack(
      convertRitualTextJadeFxEditor,
      '[Converter · Jade fx_editor]\n\n',
    )
  }, [handleConvertRitualToStructurePack])

  const runClassGroupPackConvert = useCallback(
    async (folder: string) => {
      const converted = convertRitualTextClassGroup(codeText)

      if (converted.ok === false) {
        window.alert(converted.error)
        return
      }

      await persistConvertedStructurePack(
        folder,
        converted.schemas,
        converted.warnings,
        '[Converter · Class Group]\n\n',
        converted.rootSchemaIds,
      )
    },
    [codeText, persistConvertedStructurePack],
  )

  const handleClassGroupPackFolderConfirm = useCallback(
    async (raw: string) => {
      const folder = parseClassGroupPackFolderName(raw, { allowDefault: true })

      if (!folder) {
        window.alert(
          'Nome de pasta inválido. Usa letras minúsculas, números, hífen (-) e sublinhado (_), até 48 caracteres.',
        )
        return
      }

      if (classGroupPackFolderDialogMode === 'settings') {
        setClassGroupConverterPackFolder(folder)
        setClassGroupPackFolderDialogOpen(false)
        return
      }

      setClassGroupPackFolderDialogOpen(false)
      setClassGroupConverterPackFolder(folder)
      await runClassGroupPackConvert(folder)
    },
    [classGroupPackFolderDialogMode, runClassGroupPackConvert],
  )

  const handleConvertClassGroupPack = useCallback(() => {
    if (nodeConfigurationMode) {
      setClassGroupPackFolderDialogMode('convert')
      setClassGroupPackFolderDialogOpen(true)
      return
    }

    void handleConvertRitualToStructurePack(
      convertRitualTextClassGroup,
      '[Converter · Class Group]\n\n',
    )
  }, [handleConvertRitualToStructurePack, nodeConfigurationMode])

  const listPackFolders = useCallback(
    async (includeDefault: boolean) => {
      const unique = new Set<string>()

      if (import.meta.env.DEV) {
        try {
          const query = includeDefault ? '?includeDefault=1' : ''
          const res = await fetch(`/api/node-structures-folders${query}`)
          const payload: unknown = await res.json().catch(() => null)

          const apiOk =
            res.ok &&
            typeof payload === 'object' &&
            payload !== null &&
            Reflect.get(payload, 'ok') === true

          if (apiOk && typeof payload === 'object' && payload !== null) {
            const folders = Reflect.get(payload, 'folders')

            if (Array.isArray(folders)) {
              for (const entry of folders) {
                const name = String(entry).trim()
                if (name.length > 0) {
                  unique.add(name)
                }
              }
            }
          }
        } catch {
          /** API indisponível — cai no fallback */
        }
      }

      for (const pack of dynamicStructurePacks) {
        if (includeDefault || pack.folder !== 'default') {
          unique.add(pack.folder)
        }
      }

      if (includeDefault) {
        unique.add('default')
      }

      return Array.from(unique).sort((a, b) => a.localeCompare(b))
    },
    [dynamicStructurePacks],
  )

  const listStructurePackFolders = useCallback(
    () => listPackFolders(nodeConfigurationMode),
    [listPackFolders, nodeConfigurationMode],
  )

  const listDeletablePackFolders = useCallback(() => listPackFolders(false), [listPackFolders])

  const handleCodeToNodeGraphPack = useCallback(
    async (folder: string) => {
      const converted = codeToCanvasScene(
        codeText,
        folder,
        extendSchemaLookup,
        mergedPackFolderBySchemaId,
      )

      if (converted.ok === false) {
        window.alert(converted.error)
        return false
      }

      const sceneTitle = stripExtension(codeDockFileName).trim() || 'Cena'
      openOrReplaceSceneByTitle(sceneTitle, converted.scene)

      if (converted.warnings.length > 0) {
        const preview = converted.warnings.slice(0, 30).join('\n')
        const suffix =
          converted.warnings.length > 30
            ? `\n… e mais ${String(converted.warnings.length - 30)} aviso(s).`
            : ''
        window.alert(`[Code To Node Graph]\n\n${preview}${suffix}`)
      }

      setCodeToNodeGraphPackFolder(folder)
      return true
    },
    [codeDockFileName, codeText, extendSchemaLookup, mergedPackFolderBySchemaId, openOrReplaceSceneByTitle],
  )

  const focusCodeToCanvasNodes = useCallback(
    (nodeIds: string[]) => {
      if (nodeIds.length === 0) {
        return
      }
      selectNode(nodeIds[0]!)
      graphCanvasRef.current?.focusSelectionIntoView(nodeIds)
    },
    [selectNode],
  )

  const { startWizard: startCodeToCanvasWizard, controller: codeToCanvasWizardController } =
    useCodeToCanvasWizard({
      codeText,
      codeDockFileName,
      registry: extendSchemaLookup,
      packFolderBySchemaId: mergedPackFolderBySchemaId,
      openOrReplaceSceneByTitle,
      selectNode,
      focusNodes: focusCodeToCanvasNodes,
    })

  const handleCodeToNodeGraphStepByStep = useCallback(
    async (folder: string) => startCodeToCanvasWizard(folder),
    [startCodeToCanvasWizard],
  )

  const handleCodeToNodeBlock = useCallback(async () => {
    const converted = codeToBlockScene(codeText, extendSchemaLookup)

    if (!converted.ok) {
      window.alert(converted.error)
      return false
    }

    const sceneTitle = stripExtension(codeDockFileName).trim() || 'Cena'
    openOrReplaceSceneByTitle(sceneTitle, converted.scene)
    selectNode(converted.rootNodeId)
    graphCanvasRef.current?.focusSelectionIntoView([converted.rootNodeId])

    if (converted.warnings.length > 0) {
      const preview = converted.warnings.slice(0, 30).join('\n')
      const suffix =
        converted.warnings.length > 30
          ? `\n… e mais ${String(converted.warnings.length - 30)} aviso(s).`
          : ''
      window.alert(`[Code To Node Block]\n\n${preview}${suffix}`)
    }

    return true
  }, [
    codeDockFileName,
    codeText,
    extendSchemaLookup,
    openOrReplaceSceneByTitle,
    selectNode,
  ])

  const handleDismissCodeToCanvasWizard = useCallback(() => {
    const summary = codeToCanvasWizardController.summary
    if (!summary || summary.buildWarnings.length === 0) {
      return
    }

    const preview = summary.buildWarnings.slice(0, 30).join('\n')
    const suffix =
      summary.buildWarnings.length > 30
        ? `\n… e mais ${String(summary.buildWarnings.length - 30)} aviso(s).`
        : ''
    window.alert(`[Code To Node Graph · passo a passo]\n\n${preview}${suffix}`)
  }, [codeToCanvasWizardController.summary])

  const persistPackForNewNodeGraph = useCallback(
    async (
      folder: string,
      schemas: NodeSchemaDefinition[],
      warnings: string[],
      rootSchemaIds: string[],
      options?: { silent?: boolean },
    ) => {
      await persistConvertedStructurePack(
        folder,
        schemas,
        warnings,
        '[Code to new node graph]\n\n',
        rootSchemaIds,
        options,
      )
    },
    [persistConvertedStructurePack],
  )

  const persistSceneAfterCodeToNewNodeGraph = useCallback((nextScene: CanvasScene) => {
    workspaceService.saveSceneNow(nextScene)
  }, [])

  const handleCodeToNewNodeGraph = useCallback(
    async (folder: string) => {
      setCodeToNewNodeGraphProgress({ label: 'A analisar ritual…', ratio: 0.08 })

      try {
        const prepared = prepareCodeToNewNodeGraph(codeText)
        if (!prepared.ok) {
          window.alert(prepared.error)
          return false
        }

        setCodeToNewNodeGraphProgress({ label: 'A gravar pack de tipos…', ratio: 0.28 })
        await persistPackForNewNodeGraph(
          folder,
          prepared.schemas,
          prepared.warnings,
          prepared.rootSchemaIds,
          { silent: true },
        )

        setCodeToNewNodeGraphProgress({ label: 'A gerar nós e ligações…', ratio: 0.55 })
        await new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve())
        })

        const built = codeToNewNodeGraph(codeText)
        if (!built.ok) {
          window.alert(built.error)
          return false
        }

        setCodeToNewNodeGraphProgress({ label: 'A abrir cena…', ratio: 0.82 })
        const sceneTitle = stripExtension(codeDockFileName).trim() || 'Cena'
        openOrReplaceSceneByTitle(sceneTitle, built.scene)

        setCodeToNewNodeGraphProgress({ label: 'A guardar cena no disco…', ratio: 0.95 })
        persistSceneAfterCodeToNewNodeGraph(built.scene)

        if (built.warnings.length > 0) {
          const preview = built.warnings.slice(0, 30).join('\n')
          const suffix =
            built.warnings.length > 30
              ? `\n… e mais ${String(built.warnings.length - 30)} aviso(s).`
              : ''
          window.alert(`[Code to new node graph]\n\n${preview}${suffix}`)
        }

        setCodeToNewNodeGraphPackFolder(folder)
        setCodeToNewNodeGraphProgress({ label: 'Concluído', ratio: 1 })
        return true
      } finally {
        setCodeToNewNodeGraphProgress(null)
      }
    },
    [
      codeDockFileName,
      codeText,
      openOrReplaceSceneByTitle,
      persistPackForNewNodeGraph,
      persistSceneAfterCodeToNewNodeGraph,
    ],
  )

  const { startWizard: startCodeToNewNodeGraphWizard, controller: codeToNewNodeGraphWizardController } =
    useCodeToNewNodeGraphWizard({
      codeText,
      codeDockFileName,
      persistPack: persistPackForNewNodeGraph,
      openOrReplaceSceneByTitle,
      selectNode,
      focusNodes: focusCodeToCanvasNodes,
      onSceneBuilt: persistSceneAfterCodeToNewNodeGraph,
    })

  const handleCodeToNewNodeGraphStepByStep = useCallback(
    async (folder: string) => startCodeToNewNodeGraphWizard(folder),
    [startCodeToNewNodeGraphWizard],
  )

  const handleDismissCodeToNewNodeGraphWizard = useCallback(() => {
    const summary = codeToNewNodeGraphWizardController.summary
    if (!summary || summary.buildWarnings.length === 0) {
      return
    }

    const preview = summary.buildWarnings.slice(0, 30).join('\n')
    const suffix =
      summary.buildWarnings.length > 30
        ? `\n… e mais ${String(summary.buildWarnings.length - 30)} aviso(s).`
        : ''
    window.alert(`[Code to new node graph · passo a passo]\n\n${preview}${suffix}`)
  }, [codeToNewNodeGraphWizardController.summary])

  const deleteNodeStructurePackFolder = useCallback(async (folder: string) => {
    const safe = sanitizeStructurePackFolderName(folder)

    if (!safe || safe === 'default') {
      return { ok: false as const, error: 'Pasta inválida ou reservada (default).' }
    }

    let notice: string | undefined

    if (import.meta.env.DEV) {
      try {
        const res = await fetch('/api/node-structures-delete', {
          body: JSON.stringify({ folder: safe }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })

        const payload: unknown = await res.json().catch(() => null)

        const apiOk =
          res.ok &&
          typeof payload === 'object' &&
          payload !== null &&
          Reflect.get(payload, 'ok') === true

        if (!apiOk) {
          const errMsg =
            typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
              ? String(Reflect.get(payload, 'error'))
              : `HTTP ${String(res.status)}`

          notice = `Pack removido da paleta (localStorage). Disco: ${errMsg}`
        }
      } catch {
        notice =
          'Pack removido da paleta (localStorage). Servidor dev indisponível — não apagou pasta em disco.'
      }
    }

    setDynamicStructurePacks((previous) => {
      const next = previous.filter((pack) => pack.folder !== safe)
      saveDynamicStructurePacksToStorage(next)
      return next
    })

    return { ok: true as const, ...(notice ? { notice } : {}) }
  }, [])

  const handleExtractNodeBasePack = useCallback(
    async (folder: string): Promise<boolean> => {
    const safe = parseClassGroupPackFolderName(folder, { allowDefault: nodeConfigurationMode })

    if (!safe) {
      window.alert(
        nodeConfigurationMode
          ? 'Pasta inválida. Usa letras minúsculas, números, hífen (-) e sublinhado (_), até 48 caracteres.'
          : 'Pasta inválida ou reservada (default).',
      )
      return false
    }

    if (!import.meta.env.DEV) {
      window.alert(
        'Extração só grava em `src/nodeStructures` com o servidor de desenvolvimento (`npm run dev`).',
      )
      return false
    }

    try {
      const res = await fetch('/api/node-structures-extract-base', {
        body: JSON.stringify({ folder: safe }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })

      const payload: unknown = await res.json().catch(() => null)

      const apiOk =
        res.ok &&
        typeof payload === 'object' &&
        payload !== null &&
        Reflect.get(payload, 'ok') === true

      if (!apiOk) {
        const errMsg =
          typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
            ? String(Reflect.get(payload, 'error'))
            : `HTTP ${String(res.status)}`
        window.alert(`Extração falhou: ${errMsg}`)
        return false
      }

      const created = typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'created') : null
      const skipped = typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'skipped') : null
      const errors = typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'errors') : null
      const baseCreated =
        typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'baseCreated') : null
      const baseSkipped =
        typeof payload === 'object' && payload !== null ? Reflect.get(payload, 'baseSkipped') : null

      const lines = [
        '[Extrair Node Base]',
        '',
        `Pack «${safe}»`,
        '',
        `Novos ficheiros (parâmetros): ${Array.isArray(created) ? String(created.length) : '0'}`,
        `Ignorados (duplicados): ${Array.isArray(skipped) ? String(skipped.length) : '0'}`,
        `Corpos base novos: ${Array.isArray(baseCreated) ? String(baseCreated.length) : '0'}`,
        `Corpos base já existentes (não alterados): ${Array.isArray(baseSkipped) ? String(baseSkipped.length) : '0'}`,
      ]

      if (Array.isArray(baseCreated) && baseCreated.length > 0) {
        lines.push('', 'Base criada(s):', ...baseCreated.slice(0, 8).map((p) => String(p)))
        if (baseCreated.length > 8) {
          lines.push('…')
        }
      }

      if (Array.isArray(baseSkipped) && baseSkipped.length > 0) {
        lines.push('', 'Base ignorada(s):', ...baseSkipped.slice(0, 6).map((p) => String(p)))
        if (baseSkipped.length > 6) {
          lines.push('…')
        }
      }

      if (Array.isArray(errors) && errors.length > 0) {
        lines.push('', 'Ficheiros com avisos:', ...errors.slice(0, 15).map((e) => String(e)))
        if (errors.length > 15) {
          lines.push('…')
        }
      }

      lines.push('', 'Recarrega (F5) se não vires as pastas de imediato.')

      window.alert(lines.join('\n'))
      return true
    } catch {
      window.alert('Servidor dev indisponível ou pedido falhou.')
      return false
    }
  },
    [nodeConfigurationMode],
  )

  const handleApplyBinNomenclaturaPack = useCallback(
    async (folder: string): Promise<boolean> => {
      const safe = sanitizeStructurePackFolderName(folder)

      if (!safe || safe === 'default') {
        window.alert('Pasta inválida ou reservada (default).')
        return false
      }

      const pack = dynamicStructurePacks.find((p) => p.folder === safe)

      if (!pack) {
        window.alert(
          'Pack não encontrado na sessão. Converte o ritual outra vez ou recarrega a app (packs vêm do armazenamento local).',
        )
        return false
      }

      const { schemas: nextSchemas, appliedCount, warnings } = applyNomenclatureFromBinRitualText(
        codeText,
        pack.schemas,
      )

      setDynamicStructurePacks((previous) => {
        const merged = [...previous.filter((p) => p.folder !== safe), { folder: safe, schemas: nextSchemas }]
        saveDynamicStructurePacksToStorage(merged)
        return merged
      })

      requestPalette()

      let diskLine = ''

      if (import.meta.env.DEV) {
        try {
          const res = await fetch('/api/node-structures-write', {
            body: JSON.stringify({ folder: safe, schemas: nextSchemas }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })

          const payload: unknown = await res.json().catch(() => null)
          const ok =
            res.ok &&
            typeof payload === 'object' &&
            payload !== null &&
            'ok' in payload &&
            Reflect.get(payload, 'ok') === true

          if (ok && typeof payload === 'object' && payload !== null) {
            const paths = Reflect.get(payload, 'paths')
            const list = Array.isArray(paths) ? paths.map(String).join(', ') : ''
            diskLine = `\n\nDisco (dev): actualizado em src/nodeStructures/${safe}/ (${list}).`
          } else {
            const errMsg =
              typeof payload === 'object' && payload !== null && typeof Reflect.get(payload, 'error') === 'string'
                ? String(Reflect.get(payload, 'error'))
                : `HTTP ${String(res.status)}`
            diskLine = `\n\nNão gravou no disco (${errMsg}).`
          }
        } catch {
          diskLine = '\n\nServidor dev indisponível — não gravou ficheiros.'
        }
      } else {
        diskLine = '\n\nBuild estático: alteração só na paleta (localStorage).'
      }

      const warnPreview =
        warnings.length > 0
          ? `\n\n${warnings.slice(0, 18).join('\n')}${warnings.length > 18 ? '\n…' : ''}`
          : ''

      window.alert(
        `[Aplicar nomeclatura · texto Código]\n\nPack «${safe}» · ${String(appliedCount)} schema(s).${diskLine}${warnPreview}`,
      )

      return true
    },
    [codeText, dynamicStructurePacks],
  )

  const refreshJadeResolveStatus = useCallback(() => getJadeEditorResolveStatus(), [])

  const applyCodeDockJadeBanner = useCallback(
    (via: 'unchanged' | 'jade-bridge' | 'fnv-fallback' | 'convert-only', status: JadeEditorResolveStatus | null) => {
      if (via === 'fnv-fallback') {
        setCodeDockJadeBanner({
          tone: 'fnv',
          message:
            'Hashes parciais (fallback FNV). Use `npm run jade:http-bridge:build` e preload de hashes no Jade (Settings → Hashes).',
        })
        return
      }
      if (status?.isMockBridge) {
        setCodeDockJadeBanner({
          tone: 'mock',
          message:
            'Mock bridge activo — conversão/unhash incompletos. `npm run jade:http-bridge:build` e reinicia `npm run dev`.',
        })
        return
      }
      if (status?.provider === 'jade-http-bridge' && status.unhashText) {
        const count =
          status.fnvCount !== null && status.fnvCount !== undefined
            ? String(status.fnvCount)
            : '?'
        setCodeDockJadeBanner({
          tone: 'jade',
          message: `Motor Jade (${count} hashes em cache).`,
        })
        return
      }
      setCodeDockJadeBanner(null)
    },
    [],
  )

  const loadTextIntoCodeDock = useCallback(
    async (
      text: string,
      fileName: string,
      via: string,
      options?: { fullText?: boolean; suppressConvertedOpenAlert?: boolean },
    ) => {
      const maxPreview = 500_000
      const raw =
        options?.fullText || text.length <= maxPreview
          ? text
          : `${text.slice(0, maxPreview)}\n…`
      const status = await refreshJadeResolveStatus()
      const unhashed = await resolveRitualTextForEditor(raw)
      const content = unhashed.text
      const normalized = normalizeCodeDockFileName(fileName)
      openCodeDockTab(content, normalized)
      pushCodeRecentFile(normalized)
      setCodeRecentFiles(readCodeRecentFiles())
      setCodeDockOpen(true)
      applyCodeDockJadeBanner(unhashed.via, status)

      if (needsBinConversionOnOpen(normalized) && !options?.suppressConvertedOpenAlert) {
        window.alert(`«${normalized}» convertido e aberto no painel Código (${via}).`)
      } else if (unhashed.changed && unhashed.via === 'fnv-fallback' && unhashed.warning) {
        console.warn('[jadeEditorTextResolve] fallback FNV:', unhashed.warning)
      }
    },
    [applyCodeDockJadeBanner, openCodeDockTab, refreshJadeResolveStatus],
  )

  const handleGraphsToCode = useCallback(async () => {
    if (!hasOpenSceneTabs) {
      window.alert('Abra uma cena de trabalho antes de exportar.')
      return
    }

    const defaultName = `${stripExtension(activeTabTitle).trim() || 'export'}.bin`
    const raw = window.prompt('Nome da aba no editor de código:', defaultName)

    if (raw === null || !raw.trim()) {
      return
    }

    setGraphsToCodeProgress({ label: 'A preparar…', ratio: 0 })

    try {
      const result = await canvasToClassGroupRitualWithProgress(
        hydrateScene(scene),
        extendSchemaLookup,
        setGraphsToCodeProgress,
      )

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      loadTextIntoCodeDock(result.text, raw.trim(), 'Node Graphs to Code', { fullText: true })

      if (result.warnings.length > 0) {
        const preview = result.warnings.slice(0, 30).join('\n')
        const suffix =
          result.warnings.length > 30
            ? `\n… e mais ${String(result.warnings.length - 30)} aviso(s).`
            : ''
        window.alert(`[Node Graphs to Code]\n\n${preview}${suffix}`)
      }
    } finally {
      setGraphsToCodeProgress(null)
    }
  }, [activeTabTitle, extendSchemaLookup, hasOpenSceneTabs, loadTextIntoCodeDock, scene])

  const handleViewNodeCode = useCallback(
    (nodeId: string) => {
      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de pré-visualizar código.')
        return
      }

      const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)

      if (!canvasNode) {
        return
      }

      const title = canvasNode.node.schema.title
      const fileName = `preview_${sanitizeCodeDockBaseName(title)}.bin`

      const result = emitNodeRitualViewCodeText(
        hydrateScene(scene),
        extendSchemaLookup,
        nodeId,
      )

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      loadTextIntoCodeDock(result.text, fileName, 'Ver código League bin', { fullText: true })

      if (result.warnings.length > 0) {
        const preview = result.warnings.slice(0, 30).join('\n')
        const suffix =
          result.warnings.length > 30
            ? `\n… e mais ${String(result.warnings.length - 30)} aviso(s).`
            : ''
        window.alert(`[Ver código League bin]\n\n${preview}${suffix}`)
      }
    },
    [extendSchemaLookup, hasOpenSceneTabs, loadTextIntoCodeDock, scene],
  )

  const handleViewNodeBlockCode = useCallback(
    (nodeId: string) => {
      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de pré-visualizar código de bloco.')
        return
      }

      const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)

      if (!canvasNode) {
        return
      }

      const title = canvasNode.node.schema.title
      const fileName = `preview_block_${sanitizeCodeDockBaseName(title)}.bin`

      const result = emitNodeBlockViewCodeText(
        hydrateScene(scene),
        extendSchemaLookup,
        nodeId,
      )

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      loadTextIntoCodeDock(result.text, fileName, 'Ver código de bloco', { fullText: true })

      if (result.warnings.length > 0) {
        const preview = result.warnings.slice(0, 30).join('\n')
        const suffix =
          result.warnings.length > 30
            ? `\n… e mais ${String(result.warnings.length - 30)} aviso(s).`
            : ''
        window.alert(`[Ver código de bloco]\n\n${preview}${suffix}`)
      }
    },
    [extendSchemaLookup, hasOpenSceneTabs, loadTextIntoCodeDock, scene],
  )

  const handlePreviewBlockCardCode = useCallback(
    async (nodeId: string) => {
      if (blockCardPreviewBusy) {
        return
      }

      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de pré-visualizar código de bloco.')
        return
      }

      const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)
      if (!canvasNode) {
        return
      }

      const title = canvasNode.node.schema.title
      const fileName = `preview_block_${sanitizeCodeDockBaseName(title)}.bin`

      const nextFrame = () =>
        new Promise<void>((resolve) => {
          window.requestAnimationFrame(() => resolve())
        })

      const totalSteps = 4
      const setRunningProgress = (completed: number, currentLabel: string) => {
        setBlockCardPreviewUi((current) => {
          if (!current || current.phase === 'confirmCancel') {
            return current
          }
          return {
            phase: 'running',
            completed,
            total: totalSteps,
            currentLabel,
          }
        })
      }

      const isCancelled = () => blockCardPreviewCancelRef.current

      blockCardPreviewCancelRef.current = false
      setBlockCardPreviewUi({
        phase: 'running',
        completed: 0,
        total: totalSteps,
        currentLabel: 'A preparar conversão…',
      })

      try {
        await nextFrame()
        if (isCancelled()) {
          setBlockCardPreviewUi({
            phase: 'summary',
            completed: 0,
            total: totalSteps,
            currentLabel: '',
            summaryTitle: 'Conversão cancelada',
            summaryBody: 'A conversão do Código Preview Block foi cancelada antes de iniciar.',
          })
          return
        }

        setRunningProgress(1, 'A sincronizar valores do card…')
        await nextFrame()
        if (isCancelled()) {
          setBlockCardPreviewUi({
            phase: 'summary',
            completed: 1,
            total: totalSteps,
            currentLabel: '',
            summaryTitle: 'Conversão cancelada',
            summaryBody: 'A conversão do Código Preview Block foi cancelada pelo utilizador.',
          })
          return
        }

        const result = emitNodeBlockCardPreviewCodeText(
          hydrateScene(scene),
          extendSchemaLookup,
          nodeId,
        )

        if (!result.ok) {
          setBlockCardPreviewUi({
            phase: 'error',
            completed: 1,
            total: totalSteps,
            currentLabel: '',
            summaryTitle: 'Falha na conversão',
            summaryBody: result.error,
          })
          return
        }

        if (isCancelled()) {
          setBlockCardPreviewUi({
            phase: 'summary',
            completed: 2,
            total: totalSteps,
            currentLabel: '',
            summaryTitle: 'Conversão cancelada',
            summaryBody: 'A conversão do Código Preview Block foi cancelada antes de abrir o resultado.',
          })
          return
        }

        setRunningProgress(3, 'A abrir no dock de código…')
        await nextFrame()

        loadTextIntoCodeDock(result.text, fileName, 'Código Preview Block', {
          fullText: true,
          suppressConvertedOpenAlert: true,
        })

        const warningLines =
          result.warnings.length > 0
            ? `\n\nAvisos (${String(result.warnings.length)}):\n${result.warnings.slice(0, 10).join('\n')}`
            : ''

        setBlockCardPreviewUi({
          phase: 'summary',
          completed: totalSteps,
          total: totalSteps,
          currentLabel: '',
          summaryTitle: 'Conversão concluída',
          summaryBody: `Código Preview Block gerado com sucesso para «${title}».${warningLines}`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        setBlockCardPreviewUi({
          phase: 'error',
          completed: 0,
          total: totalSteps,
          currentLabel: '',
          summaryTitle: 'Falha na conversão',
          summaryBody: message,
        })
      }
    },
    [blockCardPreviewBusy, extendSchemaLookup, hasOpenSceneTabs, loadTextIntoCodeDock, scene],
  )

  const handleViewNodeGroupCode = useCallback(
    (nodeId: string) => {
      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de pré-visualizar código de grupo.')
        return
      }

      const canvasNode = scene.nodes.find((entry) => entry.id === nodeId)

      if (!canvasNode) {
        return
      }

      const title = canvasNode.node.schema.title
      const fileName = `preview_group_${sanitizeCodeDockBaseName(title)}.bin`

      const result = emitNodeGroupViewCodeText(
        hydrateScene(scene),
        extendSchemaLookup,
        nodeId,
      )

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      loadTextIntoCodeDock(result.text, fileName, 'Ver código de grupo', { fullText: true })

      if (result.warnings.length > 0) {
        const preview = result.warnings.slice(0, 30).join('\n')
        const suffix =
          result.warnings.length > 30
            ? `\n… e mais ${String(result.warnings.length - 30)} aviso(s).`
            : ''
        window.alert(`[Ver código de grupo]\n\n${preview}${suffix}`)
      }
    },
    [extendSchemaLookup, hasOpenSceneTabs, loadTextIntoCodeDock, scene],
  )

  const primaryNodeCodeBinding = primarySelectedId
    ? nodeCodeBindings[primarySelectedId]
    : undefined

  const canSyncNodeToCode = Boolean(
    codeDockOpen &&
      isRitobinEditorPath(codeDockFileName) &&
      codeText.trim().length > 0 &&
      primaryNodeCodeBinding &&
      primaryNodeCodeBinding.codeDockTabId === activeCodeDockTabId,
  )

  const handleSyncNodeValueToCode = useCallback(
    (nodeId: string) => {
      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de sincronizar valores.')
        return
      }

      if (!selectedNodeIds.includes(nodeId)) {
        window.alert('Seleccione o nó antes de sincronizar valores para o código.')
        return
      }

      if (selectedNodeIds.length > 1 && primarySelectedId !== nodeId) {
        window.alert('Em selecção múltipla, sincronize apenas o nó primário seleccionado.')
        return
      }

      if (!codeDockOpen) {
        window.alert('Abra o painel Código com o ficheiro ritual antes de sincronizar.')
        return
      }

      if (!isRitobinEditorPath(codeDockFileName)) {
        window.alert('A aba activa do CodeDock deve ser um ficheiro ritual (.bin ou .py).')
        return
      }

      if (!codeText.trim()) {
        window.alert('O editor de código está vazio.')
        return
      }

      const binding = nodeCodeBindings[nodeId]
      if (!binding) {
        window.alert(
          'Nenhuma área vinculada a este nó. Seleccione o trecho no editor e use Shift+arrasto até ao nó para vincular.',
        )
        return
      }

      if (binding.codeDockTabId !== activeCodeDockTabId) {
        window.alert(
          'A vinculação pertence a outra aba do editor. Active a aba correcta ou vincule de novo.',
        )
        return
      }

      const result = syncNodeToBoundCodeRange(
        hydrateScene(scene),
        extendSchemaLookup,
        nodeId,
        codeText,
        binding,
      )

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      setCodeText(result.newText)
      showSaveStatusNotice('Valores sincronizados na área vinculada do código.')

      if (result.warnings.length > 0) {
        const preview = result.warnings.slice(0, 30).join('\n')
        const suffix =
          result.warnings.length > 30
            ? `\n… e mais ${String(result.warnings.length - 30)} aviso(s).`
            : ''
        window.alert(`[Sync value to code]\n\n${preview}${suffix}`)
      }
    },
    [
      activeCodeDockTabId,
      codeDockFileName,
      codeDockOpen,
      codeText,
      extendSchemaLookup,
      hasOpenSceneTabs,
      nodeCodeBindings,
      primarySelectedId,
      scene,
      selectedNodeIds,
      setCodeText,
      showSaveStatusNotice,
    ],
  )

  const saveCodeDockTabById = useCallback(
    async (tabId: string) => {
      const tab = codeDockTabs.find((entry) => entry.id === tabId)

      if (!tab) {
        return
      }

      const content = tabId === activeCodeDockTabId ? codeText : tab.content
      const suggested = tab.fileName

      if (needsBinConversionOnSave(suggested)) {
        const { base64ToUint8Array, convertTextToBinViaBridge, downloadBytesAsFile } =
          await import('@/core/jadeBridgeApi')
        const result = await convertTextToBinViaBridge(content)

        if (result.branch !== 'success') {
          const hint =
            result.branch === 'not_configured'
              ? 'Gravar .bin requer jade-http-bridge (reinicia npm run dev com Rust compilado).'
              : result.branch === 'network_error'
                ? result.message
                : result.message
          window.alert(`Não foi possível converter para .bin: ${hint}`)
          return
        }

        const normalized = normalizeCodeDockFileName(suggested)
        const fileName = normalized.toLowerCase().endsWith('.bin') ? normalized : `${normalized.replace(/\.py$/i, '')}.bin`

        if (typeof window.showSaveFilePicker === 'function') {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: fileName,
              types: [{ description: 'Binário ritual', accept: { 'application/octet-stream': ['.bin'] } }],
            })
            const writable = await handle.createWritable()
            await writable.write(base64ToUint8Array(result.bytesBase64))
            await writable.close()
            const savedName = handle.name || fileName
            renameCodeDockTab(tabId, savedName)
            if (tabId === activeCodeDockTabId) {
              markActiveTabSaved(savedName)
            }
            pushCodeRecentFile(savedName)
            setCodeRecentFiles(readCodeRecentFiles())
            return
          } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') {
              return
            }
          }
        }

        downloadBytesAsFile(base64ToUint8Array(result.bytesBase64), fileName)
        renameCodeDockTab(tabId, fileName)
        if (tabId === activeCodeDockTabId) {
          markActiveTabSaved(fileName)
        }
        pushCodeRecentFile(fileName)
        setCodeRecentFiles(readCodeRecentFiles())
        return
      }

      const saveResult = await saveCodeDockTab(
        tabId,
        tabId === activeCodeDockTabId ? codeText : undefined,
      )

      if (!saveResult.cancelled) {
        pushCodeRecentFile(saveResult.fileName)
        setCodeRecentFiles(readCodeRecentFiles())
      }
    },
    [
      activeCodeDockTabId,
      codeDockTabs,
      codeText,
      markActiveTabSaved,
      renameCodeDockTab,
      saveCodeDockTab,
    ],
  )

  const saveCodeDockFile = useCallback(
    async () => {
      if (!activeCodeDockTabId) {
        return
      }

      await saveCodeDockTabById(activeCodeDockTabId)
    },
    [activeCodeDockTabId, saveCodeDockTabById],
  )

  const convertBinForCodeDock = useCallback(async (file: File): Promise<boolean> => {
    const engine = (await getPreference('ConverterEngine', 'jade')).toLowerCase()
    const jadeFirst = engine !== 'ltk'
    const exeConfigured = getStoredRitobinExePath()

    const tryRitobin = async () => {
      if (!exeConfigured) return false
      const rit = await convertBinViaRitobinExeBridge(file, exeConfigured)
      if (rit.branch === 'success') {
        loadTextIntoCodeDock(rit.text, file.name, 'ponte ritobin + executável local')
        return true
      }
      return false
    }

    const tryJadeBridge = async () => {
      const bridge = await resolveBinFileForEditor(file)
      if (bridge.ok) {
        loadTextIntoCodeDock(bridge.text, file.name, 'Jade bridge /convert')
        return true
      }
      if (bridge.branch === 'not_configured') {
        window.alert(
          'Jade bridge não configurado.\n\n' +
            'Em dev: reinicia `npm run dev` (arranca a ponte em 127.0.0.1:8788 automaticamente).\n' +
            'Ou define `VITE_JADE_BIN_BRIDGE=http://127.0.0.1:8788` / `VITE_JADE_USE_PROXY=true` no `.env`.',
        )
      } else if (bridge.branch === 'network_error') {
        window.alert(
          `Não foi possível contactar o Jade bridge (${bridge.message}).\n\n` +
            'Em dev: confirma que `npm run dev` está a correr (inicia a ponte automaticamente).\n' +
            'Manual: `npm run jade:http-bridge` ou `npm run jade:http-bridge:build` + `npm run dev`.\n' +
            'Conversão real .bin exige `jade-http-bridge` Rust (não o mock Node).',
        )
      } else if (bridge.branch === 'bridge_error') {
        window.alert(
          `Jade bridge respondeu com erro.\n${bridge.status !== undefined ? String(bridge.status) : ''} — ${bridge.message}`,
        )
      }
      return false
    }

    if (jadeFirst) {
      if (await tryJadeBridge()) return true
      return tryRitobin()
    }
    if (await tryRitobin()) return true
    return tryJadeBridge()
  }, [loadTextIntoCodeDock])

  const handleCodeDockImportFile = useCallback(
    async (file: File) => {
      if (needsBinConversionOnOpen(file.name)) {
        await convertBinForCodeDock(file)
        return
      }

      const text = await file.text()
      const ext = getFileExtension(file.name)
      const via =
        ext === 'py'
          ? 'ritobin (.py)'
          : ext === 'json'
            ? 'JSON'
            : ext === 'md' || ext === 'markdown'
              ? 'Markdown'
              : 'texto'

      loadTextIntoCodeDock(text, file.name, via)
    },
    [convertBinForCodeDock, loadTextIntoCodeDock],
  )

  const handleCreateCodeDockFile = useCallback(
    (fileName: string) => {
      const normalized = normalizeCodeDockFileName(fileName)
      openNewCodeDockTab(normalized, defaultContentForNewFile(normalized))
      setCodeDockOpen(true)
      setNewCodeFileDialogOpen(false)
    },
    [openNewCodeDockTab],
  )

  const codeDockFileBridge = useMemo<CodeDockFileBridge>(
    () => ({
      onOpenFile: () => codeDockFileInputRef.current?.click(),
      onNewFile: () => {
        setNewCodeFileDialogOpen(true)
        setCodeDockOpen(true)
      },
      onSaveFile: () => void saveCodeDockFile(),
      onSaveFileAs: () => void saveCodeDockFile(),
      onOpenLog: () => {
        window.alert('Open Log File: disponível no Jade desktop ou ponte Tauri (Fase 2).')
      },
      recentFiles: codeRecentFiles,
      onOpenRecentFile: (path) => {
        window.alert(`Recente «${path}»: reabre com File → Open… (caminho completo não guardado no browser).`)
      },
    }),
    [codeRecentFiles, saveCodeDockFile],
  )

  const handleSceneTabAction = useCallback(
    (tabId: string, action: TabContextMenuAction) => {
      if (action === 'rename') {
        const tab = tabBarItems.find((entry) => entry.id === tabId)
        setTabRenameTarget({ kind: 'scene', tabId, initial: tab?.title ?? '' })
        return
      }

      if (action === 'save') {
        void saveSceneTab(tabId).then((result) => {
          if (result.cancelled) {
            return
          }

          const message = result.usedDownload
            ? `Cena de trabalho descarregada como «${result.fileName}».`
            : `Cena de trabalho guardada em «${result.fileName}».`

          showSaveStatusNotice(message)
        })
      }
    },
    [saveSceneTab, showSaveStatusNotice, tabBarItems],
  )

  const handleCodeDockTabAction = useCallback(
    (tabId: string, action: TabContextMenuAction) => {
      if (action === 'rename') {
        const tab = codeDockTabs.find((entry) => entry.id === tabId)
        setTabRenameTarget({
          kind: 'code',
          tabId,
          initial: tab ? stripExtension(tab.fileName) : '',
        })
        return
      }

      if (action === 'save') {
        void saveCodeDockTabById(tabId)
      }
    },
    [codeDockTabs, saveCodeDockTabById],
  )

  const handleSaveWorkScene = useCallback(async () => {
    if (!hasOpenSceneTabs || !activeTabId) {
      return
    }

    const result = await saveSceneTab(activeTabId)

    if (result.cancelled) {
      return
    }

    const message = result.usedDownload
      ? `Cena de trabalho descarregada como «${result.fileName}».`
      : `Cena de trabalho guardada em «${result.fileName}».`

    showSaveStatusNotice(message)
  }, [activeTabId, hasOpenSceneTabs, saveSceneTab, showSaveStatusNotice])

  const handleTabRenameConfirm = useCallback(
    (value: string) => {
      if (!tabRenameTarget) {
        return
      }

      if (tabRenameTarget.kind === 'scene') {
        renameSceneTab(tabRenameTarget.tabId, value)
      } else {
        renameCodeDockTab(tabRenameTarget.tabId, value)
      }

      setTabRenameTarget(null)
    },
    [renameCodeDockTab, renameSceneTab, tabRenameTarget],
  )

  const handleImportWorkspaceFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.bin')) {
      await convertBinForCodeDock(file)
      return
    }

    try {
      const textContent = await file.text()
      const parsedUnknown: unknown = JSON.parse(textContent)

      const graphCandidate =
        parseSceneDocument(parsedUnknown) ??
        (isCanvasScene(parsedUnknown) ? hydrateScene(parsedUnknown) : binTreeJsonToCanvasScene(parsedUnknown))

      if (!graphCandidate) {
        window.alert('Ficheiro JSON inválido (grafo node-graphs-lol, CanvasScene ou BinTree Jade).')
        return
      }

      openSceneInNewTab(stripExtension(file.name), graphCandidate, { sourceFileName: file.name })
    } catch {
      window.alert('Não foi possível ler o JSON.')
    }
  }

  const handleStubPipeline = () => {
    const structure = stubBinStructureDocument()

    triggerJsonDownload(structure, `json_structure_${Date.now()}.json`)

    try {
      window.sessionStorage.setItem(
        STORAGE_LAST_STRUCTURE_META,
        JSON.stringify({ generatedAt: new Date().toISOString(), kind: 'stub-bin' }),
      )
    } catch {
      /** ignore */
    }
  }

  const startInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) {
      return
    }

    if (inspectorViewportDocked) {
      return
    }

    inspectorMovedDuringPointer.current = false
    inspectorDragGesture.current = {
      element: event.currentTarget,
      moved: false,
      offset: inspectorOffset,
      origin: {
        x: event.clientX,
        y: event.clientY,
      },
      pointerId: event.pointerId,
      viewportDockedAtStart: inspectorViewportDocked,
      undockFromToolbarStarted: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = inspectorDragGesture.current

    if (!gesture) {
      return
    }

    if (gesture.viewportDockedAtStart && !gesture.undockFromToolbarStarted) {
      const deltaX = event.clientX - gesture.origin.x
      const deltaY = event.clientY - gesture.origin.y

      if (Math.hypot(deltaX, deltaY) < INSPECTOR_TOOLBAR_UNDOCK_DRAG_PX) {
        return
      }

      gesture.undockFromToolbarStarted = true
      inspectorMovedDuringPointer.current = true
      inspectorDragGesture.current = null

      if (gesture.element.hasPointerCapture(gesture.pointerId)) {
        gesture.element.releasePointerCapture(gesture.pointerId)
      }

      setInspectorViewportDocked(false)
      setInspectorMinimized(true)
      setActiveViewportToolbarDock((current) => (current === 'node' ? null : current))
      setInspectorGrabFollowActive(true)
      setInspectorGrabFollowCoords({ x: event.clientX, y: event.clientY })
      return
    }

    const nextOffset = {
      x: gesture.offset.x + event.clientX - gesture.origin.x,
      y: gesture.offset.y + event.clientY - gesture.origin.y,
    }
    const moved = Math.abs(nextOffset.x - gesture.offset.x) > 3 || Math.abs(nextOffset.y - gesture.offset.y) > 3

    gesture.moved = gesture.moved || moved
    setInspectorOffset(nextOffset)
  }

  const stopInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = inspectorDragGesture.current

    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    inspectorMovedDuringPointer.current = gesture.moved
    inspectorDragGesture.current = null

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }

  const startBlockInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || blockInspectorViewportDocked) {
      return
    }

    blockInspectorMovedDuringPointer.current = false
    blockInspectorDragGesture.current = {
      element: event.currentTarget,
      moved: false,
      offset: blockInspectorOffset,
      origin: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
      viewportDockedAtStart: blockInspectorViewportDocked,
      undockFromToolbarStarted: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveBlockInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = blockInspectorDragGesture.current
    if (!gesture) {
      return
    }

    const nextOffset = {
      x: gesture.offset.x + event.clientX - gesture.origin.x,
      y: gesture.offset.y + event.clientY - gesture.origin.y,
    }
    const moved = Math.abs(nextOffset.x - gesture.offset.x) > 3 || Math.abs(nextOffset.y - gesture.offset.y) > 3
    gesture.moved = gesture.moved || moved
    setBlockInspectorOffset(nextOffset)
  }

  const stopBlockInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = blockInspectorDragGesture.current
    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    blockInspectorMovedDuringPointer.current = gesture.moved
    blockInspectorDragGesture.current = null

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }

  const startGroupInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || groupInspectorViewportDocked) {
      return
    }

    groupInspectorMovedDuringPointer.current = false
    groupInspectorDragGesture.current = {
      element: event.currentTarget,
      moved: false,
      offset: groupInspectorOffset,
      origin: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
      viewportDockedAtStart: groupInspectorViewportDocked,
      undockFromToolbarStarted: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveGroupInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = groupInspectorDragGesture.current
    if (!gesture) {
      return
    }

    const nextOffset = {
      x: gesture.offset.x + event.clientX - gesture.origin.x,
      y: gesture.offset.y + event.clientY - gesture.origin.y,
    }
    const moved = Math.abs(nextOffset.x - gesture.offset.x) > 3 || Math.abs(nextOffset.y - gesture.offset.y) > 3
    gesture.moved = gesture.moved || moved
    setGroupInspectorOffset(nextOffset)
  }

  const stopGroupInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = groupInspectorDragGesture.current
    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    groupInspectorMovedDuringPointer.current = gesture.moved
    groupInspectorDragGesture.current = null

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }

  const toggleBlockInspectorMinimized = () => {
    if (blockInspectorMovedDuringPointer.current) {
      blockInspectorMovedDuringPointer.current = false
      return
    }

    if (blockInspectorViewportDocked) {
      toggleViewportToolbarDockById('block')
      return
    }

    setBlockInspectorMinimized((value) => !value)
  }

  const toggleGroupInspectorMinimized = () => {
    if (groupInspectorMovedDuringPointer.current) {
      groupInspectorMovedDuringPointer.current = false
      return
    }

    if (groupInspectorViewportDocked) {
      toggleViewportToolbarDockById('group')
      return
    }

    setGroupInspectorMinimized((value) => !value)
  }

  const toggleInspectorMinimized = () => {
    if (inspectorMovedDuringPointer.current) {
      inspectorMovedDuringPointer.current = false
      return
    }

    if (inspectorViewportDocked) {
      toggleViewportToolbarDockById('node')
      return
    }

    setInspectorMinimized((isMinimized) => !isMinimized)
  }

  const startSceneNodesDrag = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0 || sceneNodesViewportDocked) {
      return
    }

    sceneNodesMovedDuringPointer.current = false
    sceneNodesDragGesture.current = {
      element: event.currentTarget,
      moved: false,
      offset: sceneNodesOffset,
      origin: { x: event.clientX, y: event.clientY },
      pointerId: event.pointerId,
      viewportDockedAtStart: sceneNodesViewportDocked,
      undockFromToolbarStarted: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveSceneNodesDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = sceneNodesDragGesture.current

    if (!gesture) {
      return
    }

    const nextOffset = {
      x: gesture.offset.x + event.clientX - gesture.origin.x,
      y: gesture.offset.y + event.clientY - gesture.origin.y,
    }
    const moved = Math.abs(nextOffset.x - gesture.offset.x) > 3 || Math.abs(nextOffset.y - gesture.offset.y) > 3

    gesture.moved = gesture.moved || moved
    setSceneNodesOffset(nextOffset)
  }

  const stopSceneNodesDrag = (event: PointerEvent<HTMLElement>) => {
    const gesture = sceneNodesDragGesture.current

    if (gesture?.pointerId !== event.pointerId) {
      return
    }

    sceneNodesMovedDuringPointer.current = gesture.moved
    sceneNodesDragGesture.current = null

    if (gesture.element.hasPointerCapture(event.pointerId)) {
      gesture.element.releasePointerCapture(event.pointerId)
    }
  }

  const toggleSceneNodesMinimized = () => {
    if (sceneNodesMovedDuringPointer.current) {
      sceneNodesMovedDuringPointer.current = false
      return
    }

    if (sceneNodesViewportDocked) {
      toggleViewportToolbarDockById('scene')
      return
    }

    patchSceneChrome({ sceneNodes: { minimized: !sceneNodesMinimized } })
  }

  const blockInspectorMinimizedEffective =
    blockInspectorViewportDocked
      ? activeViewportToolbarDock !== 'block'
      : blockInspectorMinimized

  const groupInspectorMinimizedEffective =
    groupInspectorViewportDocked
      ? activeViewportToolbarDock !== 'group'
      : groupInspectorMinimized

  const inspectorMinimizedEffective =
    inspectorViewportDocked && !inspectorGrabFollowActive
      ? activeViewportToolbarDock !== 'node'
      : inspectorMinimized

  const sceneNodesMinimizedEffective = sceneNodesViewportDocked
    ? activeViewportToolbarDock !== 'scene'
    : sceneNodesMinimized

  const inspectorDockClassName = [
    styles.inspectorDock,
    inspectorMinimized ? styles.inspectorDockMinimized : styles.inspectorDockExpanded,
  ]
    .filter(Boolean)
    .join(' ')

  const inspectorDockStyle = {
    transform: `translate(${inspectorOffset.x}px, ${inspectorOffset.y}px)`,
  } satisfies CSSProperties

  const sceneNodesDockClassName = [
    styles.sceneNodesDock,
    sceneNodesMinimized ? styles.sceneNodesDockMinimized : styles.sceneNodesDockExpanded,
  ]
    .filter(Boolean)
    .join(' ')

  const sceneNodesDockStyle = {
    transform: `translate(${sceneNodesOffset.x}px, ${sceneNodesOffset.y}px)`,
  } satisfies CSSProperties

  const handleCloseCodeDock = useCallback(() => {
    setCodeDockOpen(false)
  }, [])

  const handleCloseVfxDock = useCallback(() => {
    setVfxDockOpen(false)
  }, [])

  const handleClosePanelShortcut = useCallback(() => {
    if (vfxDockOpen) {
      setVfxDockOpen(false)
      return
    }
    handleCloseCodeDock()
  }, [handleCloseCodeDock, vfxDockOpen])

  const skipPropHumanizeOnceRef = useRef(false)

  const handleHumanizePropRitualInEditor = useCallback(async () => {
    if (!codeText.trim()) {
      window.alert('O editor de código está vazio.')
      return
    }
    const status = await refreshJadeResolveStatus()
    const result = await resolveRitualTextForEditor(codeText)
    if (!result.changed) {
      window.alert(
        result.warning
          ? `Nenhuma hash foi convertida.\n\n${result.warning}`
          : 'Nenhuma hash foi convertida (nomes já legíveis ou hashes desconhecidas).',
      )
      return
    }
    skipPropHumanizeOnceRef.current = true
    setCodeText(result.text)
    applyCodeDockJadeBanner(result.via, status)
    const viaLabel =
      result.via === 'jade-bridge'
        ? 'parser Jade + tabelas de hash'
        : 'fallback FNV (bridge Jade indisponível)'
    showSaveStatusNotice(`Hashes convertidas (${viaLabel}).`)
    if (result.warning) {
      console.warn('[jadeEditorTextResolve]', result.warning)
    }
  }, [applyCodeDockJadeBanner, codeText, refreshJadeResolveStatus, setCodeText, showSaveStatusNotice])

  const prevCodeTextForVfxRef = useRef(codeText)
  useEffect(() => {
    if (prevCodeTextForVfxRef.current === codeText) return
    prevCodeTextForVfxRef.current = codeText
    if (vfxRitualOverride && ritualContainsVfxSystem(codeText)) {
      setVfxRitualOverride(null)
    }
  }, [codeText, vfxRitualOverride])

  useEffect(() => {
    if (!codeDockOpen) {
      return
    }
    void ensureJadeHashesLoaded()
    void refreshJadeResolveStatus()
  }, [codeDockOpen, refreshJadeResolveStatus])

  useEffect(() => {
    if (!codeDockOpen || !codeText.trim()) {
      return
    }
    if (skipPropHumanizeOnceRef.current) {
      skipPropHumanizeOnceRef.current = false
      return
    }

    let cancelled = false

    void (async () => {
      const status = await refreshJadeResolveStatus()
      const result = await resolveRitualTextForEditor(codeText)
      if (cancelled || !result.changed || result.text === codeText) {
        return
      }
      skipPropHumanizeOnceRef.current = true
      setCodeText(result.text)
      applyCodeDockJadeBanner(result.via, status)
    })()

    return () => {
      cancelled = true
    }
  }, [applyCodeDockJadeBanner, codeDockOpen, codeText, refreshJadeResolveStatus, setCodeText])

  const vfxPreviewRitualText = useMemo(
    () =>
      resolveVfxRitualText({
        codeText,
        vfxRitualOverride,
        scene,
        registry: extendSchemaLookup,
        primarySelectedId,
        nodeCodeBindings,
        activeCodeDockTabId,
      }),
    [
      activeCodeDockTabId,
      codeText,
      extendSchemaLookup,
      nodeCodeBindings,
      primarySelectedId,
      scene,
      vfxRitualOverride,
    ],
  )

  const handlePreviewNodeVfx = useCallback(
    (nodeId: string) => {
      if (!hasOpenSceneTabs) {
        window.alert('Abra uma cena de trabalho antes de pré-visualizar VFX.')
        return
      }

      const result = emitNodeRitualViewCodeText(
        hydrateScene(scene),
        extendSchemaLookup,
        nodeId,
      )

      if (!result.ok) {
        window.alert(result.error)
        return
      }

      if (!ritualContainsVfxSystem(result.text)) {
        window.alert('O nó seleccionado não contém VfxSystemDefinitionData.')
        return
      }

      setVfxRitualOverride(result.text)
      setVfxDockOpen(true)
    },
    [extendSchemaLookup, hasOpenSceneTabs, scene],
  )

  const prevDockFloatingRef = useRef(codeDockFloating)
  const prevVfxDockFloatingRef = useRef(vfxDockFloating)

  useEffect(() => {
    const was = prevDockFloatingRef.current

    if (was === codeDockFloating) {
      return
    }

    if (was && !codeDockFloating) {
      setCodeDockWidth(Math.round(codeDockFloatingRect.width))
    }

    if (!was && codeDockFloating) {
      setCodeDockFloatingRect(
        clampFloatingDockRect({
          ...createDefaultFloatingCodeDockRect(),
          width: Math.max(codeDockWidth, 260),
        }),
      )
    }

    prevDockFloatingRef.current = codeDockFloating
  }, [codeDockFloating, codeDockFloatingRect.width, codeDockWidth])

  useEffect(() => {
    const was = prevVfxDockFloatingRef.current

    if (was === vfxDockFloating) {
      return
    }

    if (was && !vfxDockFloating) {
      setVfxDockWidth(Math.round(vfxDockFloatingRect.width))
    }

    if (!was && vfxDockFloating) {
      const defaultRect = createDefaultFloatingCodeDockRect()
      setVfxDockFloatingRect(
        clampFloatingDockRect({
          ...defaultRect,
          width: Math.max(vfxDockWidth, VFX_DOCK_MIN_WIDTH),
          height: Math.max(defaultRect.height, 520),
        }),
      )
    }

    prevVfxDockFloatingRef.current = vfxDockFloating
  }, [vfxDockFloating, vfxDockFloatingRect.width, vfxDockWidth])

  const resetFloatingDockDimensions = useCallback(() => {
    setCodeDockFloatingRect(clampFloatingDockRect(createDefaultFloatingCodeDockRect()))
  }, [])

  useAppShortcutHandlers({
    scene,
    selectedNodeIds,
    undoScene,
    redoScene,
    deleteNodeIds,
    showToastByCatalogId,
    codeDockOpen,
    vfxDockOpen,
  })

  const inspectorTarget =
    selectedNodeIds.length > 0 && primarySelectedId
      ? scene.nodes.find((node) => node.id === primarySelectedId)
      : undefined

  const blockInspectorTarget =
    selectedNodeIds.length === 1 && primarySelectedId && inspectorTarget && !isNodeLocked(inspectorTarget)
      ? inspectorTarget
      : undefined

  useEffect(() => {
    if (!blockInspectorTarget) {
      return
    }
    refreshBlockInspectorDraft(blockInspectorTarget.id)
  }, [
    blockInspectorTarget?.id,
    blockInspectorTarget?.blockViewActive,
    blockInspectorTarget?.blockStructure?.identification_codes?.join('|'),
    refreshBlockInspectorDraft,
  ])

  const blockInspectorDraft = blockInspectorTarget
    ? getBlockInspectorDraft(blockInspectorTarget.id)
    : null

  const handleGenerateBlock = useCallback(() => {
    if (!blockInspectorTarget || !blockInspectorDraft) {
      return
    }
    generateBlockFromNode(blockInspectorTarget.id, blockInspectorDraft)
    refreshBlockInspectorDraft(blockInspectorTarget.id)
  }, [
    blockInspectorDraft,
    blockInspectorTarget,
    generateBlockFromNode,
    refreshBlockInspectorDraft,
  ])

  const handleBuildBlockDefinition = useCallback(async () => {
    if (!blockInspectorTarget || !blockInspectorDraft) {
      return
    }

    const result = buildBlockDefinitionJsonDocument(
      blockInspectorDraft,
      scene,
      blockInspectorTarget,
    )

    if (!result.ok) {
      window.alert(
        t(LangId.BlockInspectorBuildBlockFailed, undefined, {
          error: result.error,
        }),
      )
      return
    }

    const writeResult = await writeBlockDefinitionDocument(result.document)

    if (!writeResult.ok) {
      window.alert(
        t(LangId.BlockInspectorBuildBlockFailed, undefined, {
          error: writeResult.error ?? 'Erro desconhecido',
        }),
      )
      return
    }

    const written = writeResult.written ?? result.document.id
    const overwrittenNote = writeResult.overwritten ? ' (substituído)' : ''

    window.alert(
      t(LangId.BlockInspectorBuildBlockDone, undefined, {
        written,
        overwritten: overwrittenNote,
      }),
    )
  }, [blockInspectorDraft, blockInspectorTarget, scene, t])

  const handleBuildBlockParameters = useCallback(async () => {
    if (!blockInspectorTarget || !blockInspectorDraft) {
      return
    }

    const marked = blockInspectorDraft.entries.filter((entry) => entry.exposed)
    if (marked.length === 0) {
      return
    }

    const { documents, errors: buildErrors } = buildBlockParameterJsonDocuments(
      marked,
      blockInspectorDraft,
      scene,
      blockInspectorTarget,
      extendSchemaLookup,
    )

    if (documents.length === 0) {
      window.alert(
        buildErrors.length > 0
          ? t(LangId.BlockInspectorBuildParameterFailed, undefined, {
              error: buildErrors.join('\n'),
            })
          : t(LangId.BlockInspectorBuildParameterFailed, undefined, { error: 'Nenhum documento válido' }),
      )
      return
    }

    const writeResult = await writeBlockParameterDocuments(documents)

    if (!writeResult.ok) {
      window.alert(
        t(LangId.BlockInspectorBuildParameterFailed, undefined, {
          error: writeResult.error ?? 'Erro desconhecido',
        }),
      )
      return
    }

    const written = writeResult.written ?? []
    const overwritten = writeResult.overwritten ?? []
    const serverErrors = [...buildErrors, ...(writeResult.errors ?? []), ...(writeResult.skipped ?? [])]

    const overwrittenNote =
      overwritten.length > 0 ? ` (${overwritten.length} substituídos)` : ''

    window.alert(
      t(LangId.BlockInspectorBuildParameterDone, undefined, {
        written: String(written.length),
        overwritten: overwrittenNote,
      }) + (serverErrors.length > 0 ? `\n\n${serverErrors.join('\n')}` : ''),
    )
  }, [blockInspectorDraft, blockInspectorTarget, extendSchemaLookup, scene, t])

  const closeAutoBuildUi = useCallback(() => {
    autoBuildCancelRef.current = false
    setAutoBuildUi(null)
  }, [])

  const formatAutoBuildSummaryBody = useCallback(
    (result: AutoBuildRunResult) => {
      const lines = [
        t(LangId.BlockInspectorAutoBuildSummaryBody, undefined, {
          nodes: String(result.nodesProcessed),
          written: String(result.written.length),
          overwritten: String(result.overwritten.length),
          errors: String(result.errors.length),
        }),
      ]

      if (result.errors.length > 0) {
        lines.push('', result.errors.join('\n'))
      }

      return lines.join('\n')
    },
    [t],
  )

  const runBlockAutoBuildPlan = useCallback(
    async (plan: ReturnType<typeof buildBlockAutoBuildPlan>) => {
      if (blockAutoBuildBusy) {
        return
      }

      if (plan.errors.includes('NO_NODES')) {
        setAutoBuildUi({
          phase: 'error',
          progress: { completed: 0, total: 0, currentLabel: '', currentKind: 'parameter' },
          errorMessage: t(LangId.BlockInspectorAutoBuildNoMain),
        })
        return
      }

      if (plan.errors.includes('EMPTY_CODE')) {
        setAutoBuildUi({
          phase: 'error',
          progress: { completed: 0, total: 0, currentLabel: '', currentKind: 'parameter' },
          errorMessage: t(LangId.CodeBuildBlockEmptyEditor),
        })
        return
      }

      const items = flattenAutoBuildWorkItems(plan)

      if (items.length === 0) {
        setAutoBuildUi({
          phase: 'error',
          progress: { completed: 0, total: 0, currentLabel: '', currentKind: 'parameter' },
          errorMessage: t(LangId.BlockInspectorAutoBuildFailed, undefined, {
            error:
              plan.errors.filter((entry) => entry !== 'NO_NODES' && entry !== 'EMPTY_CODE').join('\n') ||
              'Nenhum documento válido gerado',
          }),
        })
        return
      }

      autoBuildCancelRef.current = false
      setAutoBuildUi({
        phase: 'running',
        progress: {
          completed: 0,
          total: items.length,
          currentLabel: items[0]?.label ?? '',
          currentKind: items[0]?.kind ?? 'parameter',
        },
      })

      const result = await executeAutoBuildWorkItems({
        items,
        nodesProcessed: plan.nodeResults.length,
        planErrors: plan.errors,
        shouldCancel: () => autoBuildCancelRef.current,
        onProgress: (progress) => {
          setAutoBuildUi((current) => {
            if (!current || current.phase === 'confirmCancel') {
              return current
            }
            return {
              ...current,
              phase: 'running',
              progress,
            }
          })
        },
      })

      setAutoBuildUi({
        phase: 'summary',
        progress: {
          completed: result.cancelled
            ? result.written.length + result.overwritten.length
            : items.length,
          total: items.length,
          currentLabel: '',
          currentKind: 'parameter',
        },
        result,
      })
    },
    [blockAutoBuildBusy, t],
  )

  const handleAutoBuildBlockHierarchy = useCallback(async () => {
    await runBlockAutoBuildPlan(buildBlockAutoBuildPlan(scene, extendSchemaLookup))
  }, [extendSchemaLookup, runBlockAutoBuildPlan, scene])

  const handleCodeBuildBlock = useCallback(async () => {
    if (!hasOpenSceneTabs) {
      window.alert('Abra uma cena de trabalho antes de gerar blocos a partir do código.')
      return false
    }

    const viewCodeResult = buildBlockAutoBuildPlanFromViewCode(scene, extendSchemaLookup, {
      rootNodeId: primarySelectedId ?? undefined,
    })

    if (viewCodeResult.exportedText.trim()) {
      const canvasNode = scene.nodes.find((entry) => entry.id === viewCodeResult.exportNodeId)
      const title = canvasNode?.node.schema.title ?? 'ritual'
      const fileName = `build_${sanitizeCodeDockBaseName(title)}.bin`
      loadTextIntoCodeDock(viewCodeResult.exportedText, fileName, 'Code Build Block', {
        fullText: true,
      })
    }

    await runBlockAutoBuildPlan(viewCodeResult.plan)
    return true
  }, [
    extendSchemaLookup,
    hasOpenSceneTabs,
    loadTextIntoCodeDock,
    primarySelectedId,
    runBlockAutoBuildPlan,
    scene,
  ])

  const handleRevertBlock = useCallback(() => {
    if (!blockInspectorTarget) {
      return
    }
    revertBlockView(blockInspectorTarget.id)
  }, [blockInspectorTarget, revertBlockView])

  const showBlockInspectorPinnedToToolbar =
    blockInspectorViewportDocked && Boolean(blockInspectorTarget)

  const blockInspectorDockShowsSidebar = Boolean(blockInspectorTarget) && !showBlockInspectorPinnedToToolbar

  const blockInspectorDockClassName = [
    styles.inspectorDock,
    blockInspectorMinimized ? styles.inspectorDockMinimized : styles.inspectorDockExpanded,
  ]
    .filter(Boolean)
    .join(' ')

  const blockInspectorDockStyle = {
    transform: `translate(${blockInspectorOffset.x}px, ${blockInspectorOffset.y}px)`,
  } satisfies CSSProperties

  const blockInspectorDragHandleProps = blockInspectorViewportDocked
    ? {}
    : {
        onPointerCancel: stopBlockInspectorDrag,
        onPointerDown: startBlockInspectorDrag,
        onPointerMove: moveBlockInspectorDrag,
        onPointerUp: stopBlockInspectorDrag,
      }

  const blockInspectorPickHandlers = useMemo(
    () => ({
      onDockToViewport: () => {
        setBlockInspectorViewportDocked(true)
        setActiveViewportToolbarDock('block')
      },
      onUndockFromViewportToolbar: handleUndockBlockInspectorFromViewportToolbar,
    }),
    [handleUndockBlockInspectorFromViewportToolbar],
  )

  const knownBlockTypeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const def of blockTypeDefinitionsList()) {
      ids.add(def.id)
    }
    for (const canvasNode of scene.nodes) {
      const blockType = canvasNode.blockStructure?.blockType
      if (blockType?.trim()) {
        ids.add(blockType.trim())
      }
    }
    return [...ids].sort((a, b) => a.localeCompare(b))
  }, [scene.nodes])

  const blockInspectorControlsSlot = blockInspectorTarget ? (
    <BlockInspector
      autoBuildBusy={blockAutoBuildBusy}
      draft={blockInspectorDraft}
      knownBlockTypeIds={knownBlockTypeIds}
      minimized={blockInspectorMinimizedEffective}
      node={blockInspectorTarget}
      onAutoBuild={handleAutoBuildBlockHierarchy}
      onDraftChange={(draft) => updateBlockInspectorDraft(blockInspectorTarget.id, draft)}
      onGenerateBlock={handleGenerateBlock}
      onBuildParameters={handleBuildBlockParameters}
      onBuildBlock={handleBuildBlockDefinition}
      onRevertBlock={handleRevertBlock}
      onToggleMinimized={toggleBlockInspectorMinimized}
      {...blockInspectorPickHandlers}
      viewportDocked={blockInspectorViewportDocked}
    />
  ) : null

  const blockInspectorSidebar = blockInspectorTarget ? (
    <BlockInspector
      autoBuildBusy={blockAutoBuildBusy}
      draft={blockInspectorDraft}
      dragHandleProps={blockInspectorDragHandleProps}
      knownBlockTypeIds={knownBlockTypeIds}
      minimized={blockInspectorMinimized}
      node={blockInspectorTarget}
      onAutoBuild={handleAutoBuildBlockHierarchy}
      onDraftChange={(draft) => updateBlockInspectorDraft(blockInspectorTarget.id, draft)}
      onGenerateBlock={handleGenerateBlock}
      onBuildParameters={handleBuildBlockParameters}
      onBuildBlock={handleBuildBlockDefinition}
      onRevertBlock={handleRevertBlock}
      onToggleMinimized={toggleBlockInspectorMinimized}
      {...blockInspectorPickHandlers}
    />
  ) : null

  const groupInspectorTarget =
    selectedNodeIds.length === 1 && primarySelectedId && inspectorTarget && !isNodeLocked(inspectorTarget)
      ? inspectorTarget
      : undefined

  useEffect(() => {
    if (!groupInspectorTarget) {
      return
    }
    refreshGroupInspectorDraft(groupInspectorTarget.id)
  }, [
    groupInspectorTarget?.id,
    groupInspectorTarget?.groupViewActive,
    groupInspectorTarget?.groupStructure?.identification_codes?.join('|'),
    refreshGroupInspectorDraft,
  ])

  const groupInspectorDraft = groupInspectorTarget
    ? getGroupInspectorDraft(groupInspectorTarget.id)
    : null

  const handleGenerateGroup = useCallback(() => {
    if (!groupInspectorTarget || !groupInspectorDraft) {
      return
    }
    generateGroupFromNode(groupInspectorTarget.id, groupInspectorDraft)
    refreshGroupInspectorDraft(groupInspectorTarget.id)
  }, [
    groupInspectorDraft,
    groupInspectorTarget,
    generateGroupFromNode,
    refreshGroupInspectorDraft,
  ])

  const handleRevertGroup = useCallback(() => {
    if (!groupInspectorTarget) {
      return
    }
    revertGroupView(groupInspectorTarget.id)
  }, [groupInspectorTarget, revertGroupView])

  const showGroupInspectorPinnedToToolbar =
    groupInspectorViewportDocked && Boolean(groupInspectorTarget)

  const groupInspectorDockShowsSidebar = Boolean(groupInspectorTarget) && !showGroupInspectorPinnedToToolbar

  const groupInspectorDockClassName = [
    styles.inspectorDock,
    groupInspectorMinimized ? styles.inspectorDockMinimized : styles.inspectorDockExpanded,
  ]
    .filter(Boolean)
    .join(' ')

  const groupInspectorDockStyle = {
    transform: `translate(${groupInspectorOffset.x}px, ${groupInspectorOffset.y}px)`,
  } satisfies CSSProperties

  const groupInspectorDragHandleProps = groupInspectorViewportDocked
    ? {}
    : {
        onPointerCancel: stopGroupInspectorDrag,
        onPointerDown: startGroupInspectorDrag,
        onPointerMove: moveGroupInspectorDrag,
        onPointerUp: stopGroupInspectorDrag,
      }

  const groupInspectorPickHandlers = useMemo(
    () => ({
      onDockToViewport: () => {
        setGroupInspectorViewportDocked(true)
        setActiveViewportToolbarDock('group')
      },
      onUndockFromViewportToolbar: handleUndockGroupInspectorFromViewportToolbar,
    }),
    [handleUndockGroupInspectorFromViewportToolbar],
  )

  const groupInspectorControlsSlot = groupInspectorTarget ? (
    <GroupInspector
      draft={groupInspectorDraft}
      minimized={groupInspectorMinimizedEffective}
      node={groupInspectorTarget}
      onDraftChange={(draft) => updateGroupInspectorDraft(groupInspectorTarget.id, draft)}
      onGenerateGroup={handleGenerateGroup}
      onRevertGroup={handleRevertGroup}
      onToggleMinimized={toggleGroupInspectorMinimized}
      {...groupInspectorPickHandlers}
      viewportDocked={groupInspectorViewportDocked}
    />
  ) : null

  const groupInspectorSidebar = groupInspectorTarget ? (
    <GroupInspector
      draft={groupInspectorDraft}
      dragHandleProps={groupInspectorDragHandleProps}
      minimized={groupInspectorMinimized}
      node={groupInspectorTarget}
      onDraftChange={(draft) => updateGroupInspectorDraft(groupInspectorTarget.id, draft)}
      onGenerateGroup={handleGenerateGroup}
      onRevertGroup={handleRevertGroup}
      onToggleMinimized={toggleGroupInspectorMinimized}
      {...groupInspectorPickHandlers}
    />
  ) : null

  const inspectorStubCatalog =
    inspectorTarget !== undefined
      ? mergedBaseParameterCatalogBySchemaId[inspectorTarget.node.schema.id]
      : undefined

  const handleInspectorUpdatePosition = useCallback(
    (position: CanvasPosition) => {
      if (!inspectorTarget) {
        return
      }

      moveNode(inspectorTarget.id, position, { axisLock: '', snapGrid: false })
    },
    [inspectorTarget, moveNode],
  )

  const resolveNodeStructureJsonRelativePath = useCallback(
    (schemaId: string): string | undefined => {
      const staticRelativePath = schemaJsonRelativePathBySchemaId[schemaId]

      if (staticRelativePath) {
        return staticRelativePath
      }

      const packFolder = mergedPackFolderBySchemaId[schemaId]
      const stem = sanitizeNodeInstanceJsonStem(schemaId)

      if (!packFolder || !stem) {
        return undefined
      }

      const structureSubfolder = mergedStructureSubfolderBySchemaId[schemaId] ?? ''

      return structureSubfolder
        ? `${packFolder}/${structureSubfolder}/${stem}.json`
        : `${packFolder}/${stem}.json`
    },
    [mergedPackFolderBySchemaId, mergedStructureSubfolderBySchemaId],
  )

  useEffect(() => {
    setParameterValueLinkSourceId(null)
  }, [primarySelectedId])

  const nodeInstanceStringCandidates = useMemo<NodeInstanceStringCandidate[]>(() => {
    if (!inspectorTarget) {
      return []
    }

    return inspectorTarget.node.schema.parameters
      .filter((parameter) => parameter.type === 'string')
      .map((parameter) => {
        const value =
          getNodeParameterRuntimeValue(inspectorTarget, parameter.id) ?? parameter.defaultValue
        const stringName = normalizeNodeInstanceStringName(value)

        return { parameter, stringName, value }
      })
  }, [inspectorTarget])

  const promptConvertToNodeInstance = useCallback(() => {
    if (!inspectorTarget) {
      return
    }

    if (nodeInstanceStringCandidates.length === 0) {
      window.alert(
        'Você precisa adicionar um parâmetro do tipo string em seu node para que defina o nome do node.',
      )
      return
    }

    setNodeInstanceStringPickerNodeId(inspectorTarget.id)
    setHashStringPickerNodeId(null)
  }, [inspectorTarget, nodeInstanceStringCandidates.length])

  const closeNodeInstanceStringPicker = useCallback(() => {
    setNodeInstanceStringPickerNodeId(null)
  }, [])

  const addHashStringInNode = useCallback(() => {
    if (!inspectorTarget) {
      return
    }

    const stringParams = inspectorTarget.node.schema.parameters.filter((parameter) => parameter.type === 'string')
    if (stringParams.length === 0) {
      setHashStringNoticeStamp(Date.now())
      return
    }

    setNodeInstanceStringPickerNodeId(null)
    setHashStringPickerNodeId(inspectorTarget.id)
  }, [inspectorTarget])

  const closeHashStringPicker = useCallback(() => {
    setHashStringPickerNodeId(null)
  }, [])

  const saveHashStringFromPicker = useCallback(
    (parameterId: string) => {
      if (!inspectorTarget) {
        return
      }

      const catalog = mergedBaseParameterCatalogBySchemaId[inspectorTarget.node.schema.id] ?? []
      const row = inspectorTarget.node.schema.parameters.find((parameter) => parameter.id === parameterId)
      if (!row || row.type !== 'string') {
        return
      }

      const listId = resolveRequiredParameterListId(row, catalog)
      const hashString = getNodeParameterRuntimeValue(inspectorTarget, parameterId) ?? row.defaultValue
      const jsonRel = resolveNodeStructureJsonRelativePath(inspectorTarget.node.schema.id)

      applyHashStringSourceToSelectedNode(parameterId)
      setHashStringPickerNodeId(null)

      if (import.meta.env.DEV && jsonRel) {
        void (async () => {
          try {
            const res = await fetch('/api/node-structures-patch-hash-string', {
              body: JSON.stringify({
                hashString,
                hashStringParameterId: listId,
                relativePath: jsonRel,
              }),
              headers: { 'Content-Type': 'application/json' },
              method: 'POST',
            })
            const payload: unknown = await res.json().catch(() => null)
            const ok =
              res.ok &&
              typeof payload === 'object' &&
              payload !== null &&
              'ok' in payload &&
              Reflect.get(payload, 'ok') === true

            if (!ok) {
              console.warn('[hashString] Gravação no disco falhou', payload)
            }
          } catch (cause) {
            console.warn('[hashString] Gravação no disco falhou', cause)
          }
        })()
      }
    },
    [
      applyHashStringSourceToSelectedNode,
      inspectorTarget,
      mergedBaseParameterCatalogBySchemaId,
      resolveNodeStructureJsonRelativePath,
    ],
  )

  const saveNodeInstanceFromStringParameter = useCallback(
    (parameterId: string) => {
      if (!inspectorTarget) {
        return
      }

      const candidate = nodeInstanceStringCandidates.find((entry) => entry.parameter.id === parameterId)

      if (!candidate) {
        return
      }

      if (candidate.stringName.length === 0) {
        window.alert('O valor do parâmetro string escolhido está vazio.')
        return
      }

      const schemaId = inspectorTarget.node.schema.id
      const jsonRel = resolveNodeStructureJsonRelativePath(schemaId)

      if (!jsonRel) {
        window.alert('Não foi possível localizar o JSON de origem deste node em nodeStructures.')
        return
      }

      if (!import.meta.env.DEV) {
        window.alert(
          'Node Instance só grava em src/nodeStructures com o servidor de desenvolvimento (npm run dev).',
        )
        return
      }

      const instanceId = buildNodeInstanceId(schemaId, candidate.stringName)

      if (!instanceId) {
        window.alert('O valor do parâmetro string escolhido não gera um nome de arquivo válido.')
        return
      }

      const instance = buildNodeInstanceJsonDocument(inspectorTarget, candidate.stringName, instanceId)

      void (async () => {
        try {
          const res = await fetch('/api/node-structures-write-instance', {
            body: JSON.stringify({ instance, relativePath: jsonRel }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
          })
          const payload: unknown = await res.json().catch(() => null)
          const ok =
            res.ok &&
            typeof payload === 'object' &&
            payload !== null &&
            'ok' in payload &&
            Reflect.get(payload, 'ok') === true

          if (!ok) {
            const error =
              typeof payload === 'object' && payload !== null && 'error' in payload
                ? String(Reflect.get(payload, 'error'))
                : `HTTP ${String(res.status)}`
            window.alert(`Node Instance falhou: ${error}`)
            return
          }

          const savedRelativePath =
            typeof payload === 'object' && payload !== null && 'relativePath' in payload
              ? String(Reflect.get(payload, 'relativePath'))
              : instance.id
          setNodeInstanceStringPickerNodeId(null)
          window.alert(`Node Instance salva em ${savedRelativePath}.`)
        } catch {
          window.alert('Servidor dev indisponível ou pedido de Node Instance falhou.')
        }
      })()
    },
    [inspectorTarget, nodeInstanceStringCandidates, resolveNodeStructureJsonRelativePath],
  )

  const parameterValueLinkPickerModel = useMemo(() => {
    if (!inspectorTarget || !parameterValueLinkSourceId) {
      return null
    }

    const sourceParameter = inspectorTarget.node.schema.parameters.find(
      (p) => p.id === parameterValueLinkSourceId,
    )

    if (!sourceParameter) {
      return null
    }

    const candidates = inspectorTarget.node.schema.parameters.filter(
      (p) => p.id !== parameterValueLinkSourceId && p.type === sourceParameter.type,
    )
    const partnerId = link_parameter_value_partner(inspectorTarget.node, parameterValueLinkSourceId)
    const linkedPartner = partnerId
      ? inspectorTarget.node.schema.parameters.find((p) => p.id === partnerId)
      : undefined

    return { candidates, linkedPartner, sourceParameter }
  }, [inspectorTarget, parameterValueLinkSourceId])

  const closeParameterValueLinkPicker = useCallback(() => {
    setParameterValueLinkSourceId(null)
  }, [])

  const promptToggleRequiredParameter = useCallback(
    (parameterId: string) => {
      const canvasNode = scene.nodes.find((node) => node.id === primarySelectedId)

      if (!canvasNode) {
        return
      }

      const definition = canvasNode.node.schema.parameters.find((parameter) => parameter.id === parameterId)

      if (!definition) {
        return
      }

      const schemaId = canvasNode.node.schema.id
      const stubCatalog = mergedBaseParameterCatalogBySchemaId[schemaId] ?? []
      const nextIsRequired = !fx_required_parameter_isMarked(canvasNode.node, parameterId, stubCatalog)
      const jsonRel = schemaJsonRelativePathBySchemaId[schemaId]

      const listId = resolveRequiredParameterListId(definition, stubCatalog)

      showConfirmByCatalogId(MESSENGER_CONFIRM_TOGGLE_REQUIRED_PARAMETER, {
        replacements: {
          verb: nextIsRequired ? 'Marcar' : 'Desmarcar',
          parameterName: definition.name,
        },
        onConfirm: () => {
          void (async () => {
            if (import.meta.env.DEV && jsonRel) {
              try {
                const res = await fetch('/api/node-structures-patch-required-parameter', {
                  body: JSON.stringify({
                    add: nextIsRequired,
                    parameterId: listId,
                    relativePath: jsonRel,
                  }),
                  headers: { 'Content-Type': 'application/json' },
                  method: 'POST',
                })
                const payload: unknown = await res.json().catch(() => null)
                const ok =
                  res.ok &&
                  typeof payload === 'object' &&
                  payload !== null &&
                  'ok' in payload &&
                  Reflect.get(payload, 'ok') === true
                if (!ok) {
                  console.warn('[required_parameter] Gravação no disco falhou', payload)
                  return
                }
              } catch (cause) {
                console.warn('[required_parameter] Gravação no disco falhou', cause)
                return
              }
            }

            toggleSelectedParameterRequired(parameterId)
          })()
        },
      })
    },
    [mergedBaseParameterCatalogBySchemaId, primarySelectedId, scene.nodes, showConfirmByCatalogId, toggleSelectedParameterRequired],
  )

  const handleRequestRemoveNodeElement = useCallback(
    (canvasNodeId: string, item: NodeElementListItem) => {
      const canvasNode = scene.nodes.find((entry) => entry.id === canvasNodeId)
      if (!canvasNode) {
        return
      }

      if (item.kind === 'parameter') {
        const schemaId = canvasNode.node.schema.id
        const stubCatalog = mergedBaseParameterCatalogBySchemaId[schemaId] ?? []
        if (fx_required_parameter_isMarked(canvasNode.node, item.id, stubCatalog)) {
          return
        }
      }

      const dependencyCount = countElementDependencies(scene, canvasNodeId, item.id, item.kind)
      const connectionWarning = formatElementDependencyWarning(dependencyCount)

      showConfirmByCatalogId(MESSENGER_CONFIRM_REMOVE_NODE_ELEMENT, {
        replacements: {
          connectionWarning,
          elementName: item.name,
        },
        onConfirm: () => {
          if (item.kind === 'parameter') {
            removeCanvasParameter(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'embedBlock') {
            removeEmbedBlock(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'embedSlot') {
            removeEmbedSlot(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'listEmbedBlock') {
            removeListEmbedBlock(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'listEmbedSlot') {
            removeListEmbedSlot(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'pointerBlock') {
            removePointerBlock(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'pointerSlot') {
            removePointerSlot(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'listPointerBlock') {
            removeListPointerBlock(canvasNodeId, item.id)
            return
          }
          if (item.kind === 'listPointerSlot') {
            removeListPointerSlot(canvasNodeId, item.id)
          }
        },
      })
    },
    [
      mergedBaseParameterCatalogBySchemaId,
      removeEmbedSlot,
      removeEmbedBlock,
      removeListEmbedSlot,
      removeListEmbedBlock,
      removePointerSlot,
      removePointerBlock,
      removeListPointerSlot,
      removeListPointerBlock,
      removeCanvasParameter,
      scene,
      showConfirmByCatalogId,
    ],
  )

  const persistLinkedParameterValuesToSchemaJson = useCallback(
    async (options: {
      parameterIdA: string
      parameterIdB?: string
      relativePath: string
      unlink: boolean
    }) => {
      if (!import.meta.env.DEV) {
        return
      }

      try {
        const res = await fetch('/api/node-structures-patch-linked-parameter-values', {
          body: JSON.stringify(options),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        const payload: unknown = await res.json().catch(() => null)
        const ok =
          res.ok &&
          typeof payload === 'object' &&
          payload !== null &&
          'ok' in payload &&
          Reflect.get(payload, 'ok') === true

        if (!ok) {
          console.warn('[linked_parameter_values] Gravação no disco falhou', payload)
        }
      } catch (cause) {
        console.warn('[linked_parameter_values] Gravação no disco falhou', cause)
      }
    },
    [],
  )

  useEffect(() => {
    if (!inspectorGrabFollowActive) {
      return
    }

    const onMove = (event: globalThis.PointerEvent) => {
      setInspectorGrabFollowCoords({ x: event.clientX, y: event.clientY })
    }

    const finish = (event: globalThis.PointerEvent) => {
      setInspectorGrabFollowActive(false)
      setInspectorMinimized(false)

      const col = graphColumnRef.current?.getBoundingClientRect()

      if (col) {
        const panelHalf = Math.min(170, window.innerWidth * 0.2)
        setInspectorOffset({
          x: event.clientX - col.right + panelHalf,
          y: col.bottom - event.clientY - 96,
        })
      }

      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [inspectorGrabFollowActive])

  const showInspectorPinnedToToolbar = inspectorViewportDocked && !inspectorGrabFollowActive
  const inspectorDockShowsSidebar = !inspectorGrabFollowActive && !showInspectorPinnedToToolbar
  const showSceneNodesPinnedToToolbar = sceneNodesViewportDocked
  const sceneNodesDockShowsSidebar = !showSceneNodesPinnedToToolbar
  const selectionCanDeleteNode = (() => {
    if (selectedNodeIds.length === 0) {
      return false
    }

    const primary = primarySelectedId
      ? scene.nodes.find((node) => node.id === primarySelectedId)
      : undefined

    if (primary && isNodeLocked(primary)) {
      return false
    }

    return filterRemovableNodeIds(scene, selectedNodeIds).length > 0
  })()

  const sceneNodesCanDelete = selectionCanDeleteNode
  const inspectorCanDelete = selectionCanDeleteNode
  const inspectorDragHandleProps = inspectorViewportDocked
    ? {}
    : {
        onPointerCancel: stopInspectorDrag,
        onPointerDown: startInspectorDrag,
        onPointerMove: moveInspectorDrag,
        onPointerUp: stopInspectorDrag,
      }
  const inspectorPickHandlers = useMemo(
    () => ({
      onDockToViewport: () => {
        setInspectorViewportDocked(true)
        setActiveViewportToolbarDock('node')
      },
      onUndockFromViewportToolbar: handleUndockFromViewportToolbar,
    }),
    [handleUndockFromViewportToolbar],
  )

  const sceneNodesPickHandlers = useMemo(
    () => ({
      onDockToViewport: () => {
        setSceneNodesViewportDocked(true)
        setActiveViewportToolbarDock('scene')
      },
      onUndockFromViewportToolbar: handleUndockSceneNodesFromViewportToolbar,
    }),
    [handleUndockSceneNodesFromViewportToolbar],
  )

  const sceneNodesDragHandleProps = sceneNodesViewportDocked
    ? {}
    : {
        onPointerCancel: stopSceneNodesDrag,
        onPointerDown: startSceneNodesDrag,
        onPointerMove: moveSceneNodesDrag,
        onPointerUp: stopSceneNodesDrag,
      }

  const handleSceneNodesDelete = useCallback(() => {
    if (!primarySelectedId || !sceneNodesCanDelete) {
      return
    }

    const target = scene.nodes.find((node) => node.id === primarySelectedId)

    if (!target || isNodeLocked(target)) {
      if (target && isNodeLocked(target)) {
        showToastByCatalogId(MESSENGER_TOAST_NODE_LOCKED)
      }

      return
    }

    showConfirmByCatalogId(MESSENGER_CONFIRM_DELETE_NODE, {
      replacements: { nodeTitle: getNodeDisplayTitle(target) },
      onConfirm: () => deleteNodeIds([primarySelectedId]),
    })
  }, [
    deleteNodeIds,
    primarySelectedId,
    scene.nodes,
    sceneNodesCanDelete,
    showConfirmByCatalogId,
  ])

  const handleResetSceneNodesSelectedPosition = useCallback(() => {
    if (!primarySelectedId) {
      return
    }

    resetNodePosition(primarySelectedId)
  }, [primarySelectedId, resetNodePosition])

  const handleFocusSceneNode = useCallback(
    (nodeId: string) => {
      selectNode(nodeId)
      graphCanvasRef.current?.focusSelectionIntoView([nodeId])
    },
    [selectNode],
  )

  const sceneNodesStatePresets = scene.sceneChrome?.sceneNodes?.presets ?? []

  const suggestSceneNodesStateNameFromNode = useCallback(
    (nodeId: string) => {
      const canvasNode = scene.nodes.find((node) => node.id === nodeId)
      const title = canvasNode ? getNodeDisplayTitle(canvasNode) : 'Nó'
      const used = new Set(
        sceneNodesStatePresets.map((preset) => preset.name.trim().toLowerCase()),
      )

      for (let index = 1; index < 10_000; index += 1) {
        const candidate = index === 1 ? `${title} — Estado` : `${title} — Estado ${index}`
        if (!used.has(candidate.toLowerCase())) {
          return candidate
        }
      }

      return suggestSceneNodesStatePresetName()
    },
    [scene.nodes, sceneNodesStatePresets, suggestSceneNodesStatePresetName],
  )

  const expandSceneNodesPanel = useCallback(() => {
    if (sceneNodesViewportDocked) {
      setActiveViewportToolbarDock('scene')
      return
    }

    patchSceneChrome({ sceneNodes: { minimized: false } })
  }, [patchSceneChrome, sceneNodesViewportDocked])

  const openSceneNodesStatesTab = useCallback(() => {
    expandSceneNodesPanel()
    setSceneNodesPanelTab('states')
  }, [expandSceneNodesPanel])

  const handleSaveNewSceneNodesState = useCallback(() => {
    const suggested = suggestSceneNodesStatePresetName()
    const name = window.prompt('Nome do novo estado de nodes em cena:', suggested)
    if (name === null) {
      return
    }
    saveSceneNodesStatePreset(name)
    openSceneNodesStatesTab()
  }, [openSceneNodesStatesTab, saveSceneNodesStatePreset, suggestSceneNodesStatePresetName])

  const handleExtractSceneNodesStateFromNode = useCallback(
    (nodeId: string) => {
      const suggested = suggestSceneNodesStateNameFromNode(nodeId)
      const name = window.prompt('Nome do estado de nodes em cena:', suggested)
      if (name === null) {
        return
      }
      saveSceneNodesStatePreset(name)
      openSceneNodesStatesTab()
    },
    [
      openSceneNodesStatesTab,
      saveSceneNodesStatePreset,
      suggestSceneNodesStateNameFromNode,
    ],
  )

  const handleExportSceneNodesStatesJson = useCallback(async () => {
    await saveCodeDockTextManual(
      serializeSceneNodesStatePresetsFile(sceneNodesStatePresets),
      'scene-nodes-states.json',
    )
  }, [sceneNodesStatePresets])

  const handleImportSceneNodesStatesJson = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const raw = JSON.parse(String(reader.result ?? ''))
          const parsed = parseSceneNodesStatePresetsFile(raw)
          if (parsed === undefined) {
            window.alert('Ficheiro JSON inválido para estados de nodes em cena.')
            return
          }
          if (sceneNodesStatePresets.length > 0) {
            const ok = window.confirm(
              'Substituir a lista de estados guardada na cena pela do ficheiro?',
            )
            if (!ok) {
              return
            }
          }
          replaceSceneNodesStatePresets(parsed.presets)
        } catch {
          window.alert('Não foi possível ler o ficheiro JSON.')
        }
      }
      reader.readAsText(file)
    },
    [replaceSceneNodesStatePresets, sceneNodesStatePresets.length],
  )

  const sceneNodesPanelProps = {
    ...sceneNodesPickHandlers,
    canDeleteSelected: sceneNodesCanDelete,
    dragHandleProps: sceneNodesDragHandleProps,
    minimized: sceneNodesMinimizedEffective,
    sceneNodesStatePresets,
    onSaveNewSceneNodesState: handleSaveNewSceneNodesState,
    onLoadSceneNodesState: applySceneNodesStatePreset,
    onDeleteSceneNodesState: deleteSceneNodesStatePreset,
    onOverwriteSceneNodesState: overwriteSceneNodesStatePreset,
    onExportSceneNodesStatesJson: handleExportSceneNodesStatesJson,
    onImportSceneNodesStatesJson: handleImportSceneNodesStatesJson,
    onSortModeChange: (sortMode) => patchSceneChrome({ sceneNodes: { sortMode } }),
    onDeleteSelected: handleSceneNodesDelete,
    onFocusNode: handleFocusSceneNode,
    onHideAll: () => setAllNodesSceneHidden(true),
    onLockAll: () => setAllNodesLocked(true),
    onPatchNodeOverlay: patchNodeSceneOverlay,
    onRequestAddNode: requestPalette,
    onResetSelectedPosition: handleResetSceneNodesSelectedPosition,
    onSelectNode: (nodeId: string) => selectNode(nodeId, { includeHidden: true }),
    onShowAll: () => setAllNodesSceneHidden(false),
    onToggleMinimized: toggleSceneNodesMinimized,
    onUnlockAll: () => setAllNodesLocked(false),
    primarySelectedId,
    scene,
    selectedNodeIds,
    sortMode: sceneNodesSortMode,
    activeTab: sceneNodesPanelTab,
    onActiveTabChange: setSceneNodesPanelTab,
  }

  return (
    <main className={styles.shell}>
      {bootConsoleTestStamp !== null ? (
        <ConsoleNotificationCapsule
          key={bootConsoleTestStamp}
          lifetimeSeconds={BOOT_CONSOLE_TEST_SECONDS}
          message={BOOT_CONSOLE_TEST_MESSAGE}
          onDismiss={dismissBootConsoleTest}
        />
      ) : null}
      {hashStringNoticeStamp !== null ? (
        <ConsoleNotificationCapsule
          key={`hash-${String(hashStringNoticeStamp)}`}
          lifetimeSeconds={10}
          message={HASH_STRING_EMPTY_NOTICE}
          onDismiss={dismissHashStringNotice}
        />
      ) : null}
      {saveStatusNotice !== null ? (
        <ConsoleNotificationCapsule
          key={`save-${String(saveStatusNotice.stamp)}`}
          lifetimeSeconds={saveStatusNotice.lifetimeSeconds}
          message={saveStatusNotice.message}
          onDismiss={dismissSaveStatusNotice}
        />
      ) : null}
      <RitualDragOverlay />
      <AppMenuBar
        nodeLightModeEnabled={nodeLightModeEnabled}
        nodeConfigurationMode={nodeConfigurationMode}
        onDeleteSelection={() => deleteSelectedNodes()}
        onImportGraph={handleImportWorkspaceFile}
        onNewWorkScene={promptNewWorkScene}
        onOpenRecentScene={openRecentScene}
        onOpenStubBin={handleStubPipeline}
        onRequestAddNode={requestPalette}
        onSaveWorkScene={handleSaveWorkScene}
        onToggleNodeLightMode={toggleNodeLightMode}
        onToggleNodeConfigurationMode={toggleNodeConfigurationMode}
        onEditClassGroupPackFolder={
          nodeConfigurationMode ? openClassGroupPackFolderDialog : undefined
        }
        onGraphsToCode={() => void handleGraphsToCode()}
        onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
        onToggleVfxDock={() => setVfxDockOpen((isOpen) => !isOpen)}
        recentScenes={recentScenes}
      />

      <div className={styles.workspace} data-workspace>
        <div className={styles.graphColumn} ref={graphColumnRef}>
          <div className={styles.graphSurface}>
            <div className={styles.sceneTabRow}>
              {hasOpenSceneTabs ? (
                <div
                  className={styles.sceneToolbarChrome}
                  data-canvas-toolbar-chrome=""
                  ref={setCanvasToolbarChromeHost}
                />
              ) : null}
              <div className={styles.sceneTabBarSlot}>
                <SceneTabBar
                  attached
                  onActivate={activateTab}
                  onClose={closeTab}
                  onNewTab={() => createWorkScene(t(LangId.SceneTabNew))}
                  onTabAction={handleSceneTabAction}
                  tabs={tabBarItems}
                />
              </div>
              {hasOpenSceneTabs ? (
                <CanvasViewportStatusBar
                  nodeCount={scene.nodes.length}
                  pan={scene.camera?.pan ?? { x: 0, y: 0 }}
                  scale={scene.camera?.scale ?? 1}
                />
              ) : null}
            </div>
            <div className={styles.graphColumnMain}>
          {hasOpenSceneTabs ? (
          <GraphCanvas
            activeViewportToolbarDock={activeViewportToolbarDock}
            attachedViewport
            toolbarChromeHost={canvasToolbarChromeHost}
            onViewportToolbarDockToggle={toggleViewportToolbarDockById}
            ref={graphCanvasRef}
            availableSchemas={availableSchemas}
            canRedo={sceneHistory.future.length > 0}
            canUndo={sceneHistory.past.length > 0}
            hints={tooltipHints}
            onAppendEmbedCatalogItem={(canvasNodeId, embedId, structure) =>
              appendEmbedCatalogItem(canvasNodeId, embedId, structure)
            }
            onAppendPointerCatalogItem={(canvasNodeId, pointerId, structure) =>
              appendPointerCatalogItem(canvasNodeId, pointerId, structure)
            }
            onAppendListEmbedCatalogItem={(canvasNodeId, listEmbedId, structure) =>
              appendListEmbedCatalogItem(canvasNodeId, listEmbedId, structure)
            }
            onAppendListPointerCatalogItem={(canvasNodeId, listPointerId, structure) =>
              appendListPointerCatalogItem(canvasNodeId, listPointerId, structure)
            }
            onAppendList2EmbedCatalogItem={(canvasNodeId, list2EmbedId, structure) =>
              appendList2EmbedCatalogItem(canvasNodeId, list2EmbedId, structure)
            }
            onAppendList2PointerCatalogItem={(canvasNodeId, list2PointerId, structure) =>
              appendList2PointerCatalogItem(canvasNodeId, list2PointerId, structure)
            }
            onRemoveList2EmbedInstance={(canvasNodeId, list2EmbedId, instanceId) =>
              removeList2EmbedInstance(canvasNodeId, list2EmbedId, instanceId)
            }
            onRemoveList2PointerInstance={(canvasNodeId, list2PointerId, instanceId) =>
              removeList2PointerInstance(canvasNodeId, list2PointerId, instanceId)
            }
            onCatalogParameterAppend={(canvasNodeId, definition) =>
              addDynamicParameter(canvasNodeId, definition)
            }
            onRequestRemoveElement={handleRequestRemoveNodeElement}
            onCloseCodePanelShortcut={handleClosePanelShortcut}
            onConnectNodes={connectNodes}
            onRelinkInternalStructure={relinkInternalStructureSlot}
            onCreateChildNode={createChildNode}
            onCreateRootNode={createRootNode}
            onCreateBlockFromDefinition={(definition, position, spawnLink) =>
              createBlockNodeFromDefinition(definition, position, spawnLink)
            }
            onSyncBlockParameterCatalog={syncBlockParameterCatalogFromDefinitions}
            onAddBlockParameterFromCatalog={addBlockParameterFromCatalog}
            onRemoveBlockParameter={removeBlockParameter}
            onEditBlockParameter={(nodeId, param) => {
              setBlockParameterInspectorTarget({ nodeId, paramId: param.idParameter, parameter: param })
            }}
            onDeleteNodeIds={deleteNodeIds}
            onToggleNodeBodyCollapsed={toggleNodeBodyCollapsed}
            onToggleStructureCardParamsExpanded={toggleStructureCardParamsExpanded}
            onSetStructureCardWidth={setStructureCardWidth}
            onSetAllNodesBodyCollapsed={setAllNodesBodyCollapsed}
            onToggleNodeCardSection={toggleNodeCardSection}
            onSetNodeCardSectionOrder={setNodeCardSectionOrder}
            onSetNodeCardBodyLayout={setNodeCardBodyLayout}
            onCycleConnectionRouting={cycleConnectionRouting}
            onSetConnectionRouting={setConnectionRouting}
            onMarqueeCommit={commitMarqueeSelection}
            onMoveNode={moveNode}
            onSceneCameraChange={setSceneCamera}
            onToolbarVisibilityChange={(toolbarVisibility) =>
              patchSceneChrome({ toolbarVisibility })
            }
            onToolbarCollapsedChange={(toolbarCollapsed) => patchSceneChrome({ toolbarCollapsed })}
            toolbarCollapsed={scene.sceneChrome?.toolbarCollapsed !== false}
            toolbarVisibility={
              scene.sceneChrome?.toolbarVisibility ?? DEFAULT_CANVAS_TOOLBAR_VISIBILITY
            }
            showCanvasGrid={scene.sceneChrome?.showCanvasGrid !== false}
            canvasGridSize={scene.sceneChrome?.canvasGridSize}
            canvasGridOpacity={scene.sceneChrome?.canvasGridOpacity}
            onCanvasGridChange={(patch) => patchSceneChrome(patch)}
            onNodeLockedInteraction={() => showToastByCatalogId(MESSENGER_TOAST_NODE_LOCKED)}
            onPatchNodeSceneOverlay={patchNodeSceneOverlay}
            onSceneNodesPanelRequest={expandSceneNodesPanel}
            onExtractSceneNodesStatePreset={handleExtractSceneNodesStateFromNode}
            onGraphsToCode={() => void handleGraphsToCode()}
            onViewNodeCode={handleViewNodeCode}
            onViewNodeBlockCode={handleViewNodeBlockCode}
            onPreviewBlockCardCode={handlePreviewBlockCardCode}
            onViewNodeGroupCode={handleViewNodeGroupCode}
            onPreviewNodeVfx={handlePreviewNodeVfx}
            onSyncNodeValueToCode={handleSyncNodeValueToCode}
            canSyncNodeToCode={canSyncNodeToCode}
            onNeekoDropCode={handleNeekoDropCode}
            onBindCodeRangeToNode={handleBindCodeRangeToNode}
            onBuildNeekoAtPosition={handleBuildNeekoAtPosition}
            onNeekoBuildFailed={handleNeekoBuildFailed}
            neekoTransformingNodeId={neekoTransformingNodeId}
            memoryPackFolders={memoryPackFolders}
            onRedo={redoScene}
            onRemoveConnection={removeConnection}
            onResetScene={resetScene}
            onClearSelection={clearSelection}
            onSelectAllNodesShortcut={selectAllNodes}
            onSelectNode={(nodeId, options) => selectNode(nodeId, options)}
            onUndo={undoScene}
            onUpdateNodeParameter={updateNodeParameter}
            onSetElementViewMode={setElementViewMode}
            onSetElementRetracted={setElementRetracted}
            onSetAllNodeElementsRetracted={setAllNodeElementsRetracted}
            onSetElementSelectedIndex={setElementSelectedIndex}
            onRemoveConnectionsFromOutputSlot={removeConnectionsFromOutputSlot}
            onShowOnlyConnectedComponent={showOnlyConnectedComponent}
            onShowOnlySlotSubtree={showOnlySlotSubtree}
            onShowOnlyIncomingSlotBranch={showOnlyIncomingSlotBranch}
            onHideLinkedChildNodes={hideLinkedChildNodes}
            onSetNodeParameterOrder={setNodeParameterOrder}
            paletteRequestSignal={paletteSignal}
            scene={scene}
            schemaBaseInternalStructureCatalogBySchemaId={mergedBaseInternalStructureCatalogBySchemaId}
            schemaBaseParameterCatalogBySchemaId={mergedBaseParameterCatalogBySchemaId}
            schemaNodeKindBySchemaId={mergedSchemaNodeKindBySchemaId}
            schemaPackFolderBySchemaId={mergedPackFolderBySchemaId}
            schemaJsonRelativePathBySchemaId={schemaJsonRelativePathBySchemaId}
            schemaStructureSubfolderBySchemaId={mergedStructureSubfolderBySchemaId}
            selectedNodeId={primarySelectedId}
            selectedNodeIds={selectedNodeIds}
            blockInspectorControlsSlot={
              showBlockInspectorPinnedToToolbar ? blockInspectorControlsSlot : null
            }
            groupInspectorControlsSlot={
              showGroupInspectorPinnedToToolbar ? groupInspectorControlsSlot : null
            }
            onUpdateBlockParameter={updateBlockParameter}
            onConnectBlockSlots={connectBlockSlots}
            onUpdateGroupParameter={updateGroupParameter}
            onConnectGroupSlots={connectGroupSlots}
            sceneNodesControlsSlot={
              showSceneNodesPinnedToToolbar ? (
                <SceneNodesPanel {...sceneNodesPanelProps} viewportDocked />
              ) : null
            }
            viewportControlsSlot={
              showInspectorPinnedToToolbar ? (
                <NodeInspector
                  {...inspectorPickHandlers}
                  canDelete={inspectorCanDelete}
                  dragHandleProps={inspectorDragHandleProps}
                  minimized={inspectorMinimizedEffective}
                  nodeConfigurationMode={nodeConfigurationMode}
                  node={inspectorTarget}
                  onAddHashStringInNode={nodeConfigurationMode ? addHashStringInNode : undefined}
                  onCreateInstance={promptConvertToNodeInstance}
                  onDelete={() => deleteSelectedNodes()}
                  onOpenParameterValueLinkPicker={setParameterValueLinkSourceId}
                  onPromptToggleRequiredParameter={promptToggleRequiredParameter}
                  parameterStubCatalog={inspectorStubCatalog}
                  onSwapParameterPositions={swapSelectedNodeParameters}
                  onToggleMinimized={toggleInspectorMinimized}
                  onUpdateParameter={updateSelectedParameter}
                  onUpdatePosition={handleInspectorUpdatePosition}
                  viewportDocked
                />
              ) : null
            }
          />
          ) : (
            <p className={styles.empty}>{t(LangId.AppSceneEmptyHint)}</p>
          )}
          {sceneNodesDockShowsSidebar ? (
            <div className={sceneNodesDockClassName} style={sceneNodesDockStyle}>
              <SceneNodesPanel {...sceneNodesPanelProps} />
            </div>
          ) : null}
          {inspectorDockShowsSidebar ? (
            <div className={inspectorDockClassName} style={inspectorDockStyle}>
              <NodeInspector
                {...inspectorPickHandlers}
                canDelete={inspectorCanDelete}
                dragHandleProps={inspectorDragHandleProps}
                minimized={inspectorMinimized}
                nodeConfigurationMode={nodeConfigurationMode}
                node={inspectorTarget}
                onAddHashStringInNode={nodeConfigurationMode ? addHashStringInNode : undefined}
                onCreateInstance={promptConvertToNodeInstance}
                onDelete={() => deleteSelectedNodes()}
                onOpenParameterValueLinkPicker={setParameterValueLinkSourceId}
                onPromptToggleRequiredParameter={promptToggleRequiredParameter}
                parameterStubCatalog={inspectorStubCatalog}
                onSwapParameterPositions={swapSelectedNodeParameters}
                onToggleMinimized={toggleInspectorMinimized}
                onUpdateParameter={updateSelectedParameter}
                onUpdatePosition={handleInspectorUpdatePosition}
              />
            </div>
          ) : null}
          {blockInspectorDockShowsSidebar ? (
            <div className={blockInspectorDockClassName} style={blockInspectorDockStyle}>
              {blockInspectorSidebar}
            </div>
          ) : null}
          {groupInspectorDockShowsSidebar ? (
            <div className={groupInspectorDockClassName} style={groupInspectorDockStyle}>
              {groupInspectorSidebar}
            </div>
          ) : null}
          {inspectorGrabFollowActive ? (
            <div
              aria-hidden
              className={styles.inspectorGrabFollow}
              style={{
                left: inspectorGrabFollowCoords.x,
                top: inspectorGrabFollowCoords.y,
              }}
            >
              <NodeInspector
                {...inspectorPickHandlers}
                canDelete={inspectorCanDelete}
                dragHandleProps={inspectorDragHandleProps}
                minimized
                nodeConfigurationMode={nodeConfigurationMode}
                node={inspectorTarget}
                onAddHashStringInNode={nodeConfigurationMode ? addHashStringInNode : undefined}
                onCreateInstance={promptConvertToNodeInstance}
                onDelete={() => deleteSelectedNodes()}
                onOpenParameterValueLinkPicker={setParameterValueLinkSourceId}
                onPromptToggleRequiredParameter={promptToggleRequiredParameter}
                parameterStubCatalog={inspectorStubCatalog}
                onSwapParameterPositions={swapSelectedNodeParameters}
                onToggleMinimized={toggleInspectorMinimized}
                onUpdateParameter={updateSelectedParameter}
                onUpdatePosition={handleInspectorUpdatePosition}
              />
            </div>
          ) : null}
            </div>
          </div>

        {nodeConfigurationMode && parameterValueLinkPickerModel && inspectorTarget ? (
          <ParameterValueLinkPicker
            candidates={parameterValueLinkPickerModel.candidates}
            linkedPartner={parameterValueLinkPickerModel.linkedPartner}
            onClose={closeParameterValueLinkPicker}
            onPick={(otherParameterId) => {
              const schemaId = inspectorTarget.node.schema.id
              const jsonRel = schemaJsonRelativePathBySchemaId[schemaId]
              const catalog = mergedBaseParameterCatalogBySchemaId[schemaId] ?? []
              const [diskA, diskB] = resolveLinkedPairForDisk(
                inspectorTarget.node,
                parameterValueLinkPickerModel.sourceParameter.id,
                otherParameterId,
                catalog,
              )
              linkParameterValuePairForNode(
                inspectorTarget.id,
                parameterValueLinkPickerModel.sourceParameter.id,
                otherParameterId,
              )
              setParameterValueLinkSourceId(null)
              if (jsonRel) {
                void persistLinkedParameterValuesToSchemaJson({
                  relativePath: jsonRel,
                  unlink: false,
                  parameterIdA: diskA,
                  parameterIdB: diskB,
                })
              }
            }}
            onUnlink={() => {
              const schemaId = inspectorTarget.node.schema.id
              const jsonRel = schemaJsonRelativePathBySchemaId[schemaId]
              const catalog = mergedBaseParameterCatalogBySchemaId[schemaId] ?? []
              const listId = resolveRequiredParameterListId(
                parameterValueLinkPickerModel.sourceParameter,
                catalog,
              )
              unlinkParameterValueForNode(
                inspectorTarget.id,
                parameterValueLinkPickerModel.sourceParameter.id,
              )
              if (jsonRel) {
                void persistLinkedParameterValuesToSchemaJson({
                  relativePath: jsonRel,
                  unlink: true,
                  parameterIdA: listId,
                })
              }
            }}
            open
            sourceParameter={parameterValueLinkPickerModel.sourceParameter}
          />
        ) : null}

        {inspectorTarget ? (
          <NodeInstanceStringPicker
            candidates={nodeInstanceStringCandidates}
            nodeTitle={inspectorTarget.node.schema.title}
            onClose={closeNodeInstanceStringPicker}
            onPick={saveNodeInstanceFromStringParameter}
            open={nodeInstanceStringPickerNodeId === inspectorTarget.id}
          />
        ) : null}

        {inspectorTarget ? (
          <NodeInstanceStringPicker
            candidates={nodeInstanceStringCandidates}
            dialogSubtitle={`Escolha qual parâmetro string de ${inspectorTarget.node.schema.title} será a base para gravar hashString no JSON do schema.`}
            dialogTitle="Definir hashString"
            nodeTitle={inspectorTarget.node.schema.title}
            onClose={closeHashStringPicker}
            onPick={saveHashStringFromPicker}
            open={hashStringPickerNodeId === inspectorTarget.id}
            titleDomId="hash-string-picker-title"
          />
        ) : null}
        </div>

        {vfxDockOpen ? (
          <div
            className={vfxDockFloating ? styles.vfxDockPortalSlot : styles.vfxDockColumn}
            style={
              vfxDockFloating
                ? undefined
                : { width: vfxDockWidth, minWidth: VFX_DOCK_MIN_WIDTH }
            }
          >
            <VfxDock
              dockOpen={vfxDockOpen}
              dockedWidth={vfxDockWidth}
              floatingActive={vfxDockFloating}
              floatingRect={vfxDockFloatingRect}
              onClose={handleCloseVfxDock}
              onDockedWidthChange={setVfxDockWidth}
              onFloatingRectChange={setVfxDockFloatingRect}
              onResetFloatingDimensions={() =>
                setVfxDockFloatingRect(clampFloatingDockRect(createDefaultFloatingCodeDockRect()))
              }
              onToggleFloating={() => setVfxDockFloating((value) => !value)}
              ritualText={vfxPreviewRitualText}
            />
          </div>
        ) : null}

        {codeDockOpen ? (
          <div
            className={codeDockFloating ? styles.codeDockPortalSlot : styles.codeDockColumn}
            style={
              codeDockFloating
                ? undefined
                : { width: codeDockWidth, minWidth: CODE_DOCK_MIN_WIDTH }
            }
          >
            <input
              accept={CODE_DOCK_FILE_INPUT_ACCEPT}
              hidden
              onChange={(e) => {
                const picked = e.target.files?.[0]
                e.target.value = ''
                if (picked) void handleCodeDockImportFile(picked)
              }}
              ref={codeDockFileInputRef}
              type="file"
            />
            <CodeDock
              activeFileName={codeDockFileName}
              activeTabId={activeCodeDockTabId}
              codeToNewGraphProgress={codeToNewNodeGraphProgress}
              dockedWidth={codeDockWidth}
              jadeEditorBanner={codeDockJadeBanner}
              fileBridge={codeDockFileBridge}
              floatingActive={codeDockFloating}
              floatingRect={codeDockFloatingRect}
              nodeActions={{
                deleteFolder: deleteNodeStructurePackFolder,
                listDeletableFolders: listDeletablePackFolders,
                listStructurePackFolders,
                onConvertClassGroup: handleConvertClassGroupPack,
                onConvertJadeFxEditor: handleConvertJadeFxEditorPack,
                onHumanizePropRitual: handleHumanizePropRitualInEditor,
                onApplyBinNomenclatura: handleApplyBinNomenclaturaPack,
                onExtractNodeBase: handleExtractNodeBasePack,
                onCodeToNodeGraph: handleCodeToNodeGraphPack,
                onCodeToNodeGraphStepByStep: handleCodeToNodeGraphStepByStep,
                onCodeToNewNodeGraph: handleCodeToNewNodeGraph,
                onCodeToNewNodeGraphStepByStep: handleCodeToNewNodeGraphStepByStep,
                onCodeToNodeBlock: handleCodeToNodeBlock,
                onCodeBuildBlock: handleCodeBuildBlock,
                getDefaultStructurePackFolder: getCodeToNodeGraphPackFolder,
                getDefaultNewNodeGraphPackFolder: getCodeToNewNodeGraphPackFolder,
              }}
              onActivateTab={activateCodeDockTab}
              onChange={setCodeText}
              onClose={handleCloseCodeDock}
              onCloseTab={closeCodeDockTab}
              onDockedWidthChange={setCodeDockWidth}
              onFloatingRectChange={setCodeDockFloatingRect}
              onNewTab={() => openNewCodeDockTab()}
              onTabAction={handleCodeDockTabAction}
              onResetFloatingDimensions={resetFloatingDockDimensions}
              onToggleFloating={() => setCodeDockFloating((v) => !v)}
              neekoSendTarget={neekoSendTarget}
              onSendCodeToNeeko={handleNeekoDropCode}
              onReplaceValueToGraph={handleReplaceValueToGraph}
              primarySelectedNodeId={primarySelectedId}
              tabs={codeDockTabBarItems}
              value={codeText}
            />
          </div>
        ) : null}
      </div>

      {graphsToCodeProgress ? (
        <GraphsToCodeProgressDialog progress={graphsToCodeProgress} />
      ) : null}

      {blockCardPreviewUi ? (
        <BlockingProgressDialog
          cancelConfirmMessage="Tem a certeza que deseja cancelar a conversão do Código Preview Block?"
          cancelConfirmNoLabel="Continuar conversão"
          cancelConfirmTitle="Cancelar conversão"
          cancelConfirmYesLabel="Sim, cancelar"
          cancelLabel="Cancelar"
          closeLabel="OK"
          completed={blockCardPreviewUi.completed}
          onCancelConfirm={() => {
            blockCardPreviewCancelRef.current = true
            setBlockCardPreviewUi((current) =>
              current ? { ...current, phase: 'running' } : current,
            )
          }}
          onCancelDismiss={() => {
            setBlockCardPreviewUi((current) =>
              current ? { ...current, phase: 'running' } : current,
            )
          }}
          onCancelRequest={() => {
            setBlockCardPreviewUi((current) =>
              current && current.phase === 'running'
                ? { ...current, phase: 'confirmCancel' }
                : current,
            )
          }}
          onClose={() => {
            blockCardPreviewCancelRef.current = false
            setBlockCardPreviewUi(null)
          }}
          phase={blockCardPreviewUi.phase}
          progressCountLabel={`${String(blockCardPreviewUi.completed)}/${String(blockCardPreviewUi.total)}`}
          statusLabel={blockCardPreviewUi.phase === 'running' ? blockCardPreviewUi.currentLabel : undefined}
          summaryBody={blockCardPreviewUi.summaryBody}
          summaryTitle={blockCardPreviewUi.summaryTitle}
          title="Código Preview Block"
          total={blockCardPreviewUi.total}
        />
      ) : null}

      {autoBuildUi ? (
        <BlockingProgressDialog
          cancelConfirmMessage={t(LangId.BlockInspectorAutoBuildCancelConfirmMessage)}
          cancelConfirmNoLabel={t(LangId.BlockInspectorAutoBuildCancelConfirmContinue)}
          cancelConfirmTitle={t(LangId.BlockInspectorAutoBuildCancelConfirmTitle)}
          cancelConfirmYesLabel={t(LangId.BlockInspectorAutoBuildCancelConfirmYes)}
          cancelLabel={t(LangId.BlockInspectorAutoBuildCancel)}
          closeLabel={t(LangId.BlockInspectorAutoBuildClose)}
          completed={autoBuildUi.progress.completed}
          onCancelConfirm={() => {
            autoBuildCancelRef.current = true
            setAutoBuildUi((current) =>
              current ? { ...current, phase: 'running' } : current,
            )
          }}
          onCancelDismiss={() => {
            setAutoBuildUi((current) =>
              current ? { ...current, phase: 'running' } : current,
            )
          }}
          onCancelRequest={() => {
            setAutoBuildUi((current) =>
              current && current.phase === 'running'
                ? { ...current, phase: 'confirmCancel' }
                : current,
            )
          }}
          onClose={closeAutoBuildUi}
          phase={autoBuildUi.phase}
          progressCountLabel={t(LangId.BlockInspectorAutoBuildProgressCount, undefined, {
            completed: String(autoBuildUi.progress.completed),
            total: String(autoBuildUi.progress.total),
          })}
          statusLabel={
            autoBuildUi.phase === 'running'
              ? t(LangId.BlockInspectorAutoBuildBuilding, undefined, {
                  name: autoBuildUi.progress.currentLabel,
                })
              : undefined
          }
          summaryBody={
            autoBuildUi.phase === 'error'
              ? autoBuildUi.errorMessage
              : autoBuildUi.result
                ? formatAutoBuildSummaryBody(autoBuildUi.result)
                : undefined
          }
          summaryTitle={
            autoBuildUi.phase === 'error'
              ? t(LangId.BlockInspectorAutoBuildProgressTitle)
              : autoBuildUi.result?.cancelled
                ? t(LangId.BlockInspectorAutoBuildCancelledTitle)
                : t(LangId.BlockInspectorAutoBuildSummaryTitle)
          }
          title={t(LangId.BlockInspectorAutoBuildProgressTitle)}
          total={autoBuildUi.progress.total}
        />
      ) : null}

      <CodeToCanvasWizardPanel
        controller={codeToCanvasWizardController}
        onDismissDone={handleDismissCodeToCanvasWizard}
      />

      <CodeToCanvasWizardPanel
        controller={codeToNewNodeGraphWizardController as typeof codeToCanvasWizardController}
        onDismissDone={handleDismissCodeToNewNodeGraphWizard}
        title="Code to new node graph — passo a passo"
      />

      {blockParameterInspectorTarget ? (
        <div
          style={{
            position: 'fixed',
            right: 24,
            top: 96,
            zIndex: 9000,
            pointerEvents: 'auto',
          }}
        >
          <BlockParameterInspector
            target={blockParameterInspectorTarget}
            onClose={() => setBlockParameterInspectorTarget(null)}
            onApply={(nodeId, paramId, entry) =>
              updateBlockParameterFromInspector(nodeId, paramId, entry)
            }
          />
        </div>
      ) : null}

      <NewCodeFileDialog
        isOpen={newCodeFileDialogOpen}
        onCancel={() => setNewCodeFileDialogOpen(false)}
        onCreate={handleCreateCodeDockFile}
      />


      <TextInputDialog
        cancelLabel="Cancelar"
        confirmLabel="Renomear"
        hint={
          tabRenameTarget?.kind === 'scene'
            ? 'O nome aparece na aba da grade; ao guardar JSON, o ficheiro pode ter outro nome.'
            : 'Pode incluir extensão (.txt, .md, .json, .py, .bin, …); se omitir, usa-se .txt.'
        }
        initialValue={tabRenameTarget?.initial ?? ''}
        inputLabel={tabRenameTarget?.kind === 'scene' ? 'Nome da cena' : 'Nome do ficheiro'}
        isOpen={tabRenameTarget !== null}
        onCancel={() => setTabRenameTarget(null)}
        onConfirm={handleTabRenameConfirm}
        title={tabRenameTarget?.kind === 'scene' ? 'Renomear cena' : 'Renomear ficheiro'}
      />
      <TextInputDialog
        cancelLabel="Cancelar"
        confirmLabel="Guardar"
        hint={
          classGroupPackFolderDialogMode === 'convert'
            ? 'Com Configurar activo podes usar «default». Cria `src/nodeStructures/<nome>/` em dev.'
            : 'Pasta predefinida ao abrir Converter [Class Group] com Configurar activo.'
        }
        initialValue={getClassGroupConverterPackFolder()}
        inputLabel="Nome da pasta"
        isOpen={classGroupPackFolderDialogOpen}
        onCancel={() => setClassGroupPackFolderDialogOpen(false)}
        onConfirm={handleClassGroupPackFolderConfirm}
        title={
          classGroupPackFolderDialogMode === 'convert'
            ? 'Converter [Class Group] · pasta de destino'
            : 'Pasta predefinida · Converter Class Group'
        }
      />
    </main>
  )
}

export default App
