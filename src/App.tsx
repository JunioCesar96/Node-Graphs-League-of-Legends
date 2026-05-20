import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { GraphCanvasHandle } from '@/components/organisms/GraphCanvas'
import type { CSSProperties, PointerEvent } from 'react'

import { ConsoleNotificationCapsule } from '@/components/molecules/ConsoleNotificationCapsule'
import { AppMenuBar } from '@/components/organisms/AppMenuBar'
import { CodeDock } from '@/components/organisms/CodeDock'
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
import { ParameterValueLinkPicker } from '@/components/molecules/ParameterValueLinkPicker'
import { NodeInspector } from '@/components/organisms/NodeInspector'
import { SceneNodesPanel } from '@/components/organisms/SceneNodesPanel'
import {
  filterRemovableNodeIds,
  getNodeDisplayTitle,
  isNodeLocked,
} from '@/core/canvasNodePresentation'
import { stubBinStructureDocument } from '@/core/binImportStub'
import { convertBinViaOptionalBridge } from '@/core/jadeBinBridge'
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
import { parseSceneDocument, serializeScene } from '@/core/leagueBinScene'
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
  getSceneAutoSaveEnabled,
  setSceneAutoSaveEnabled,
} from '@/core/sceneAutoSavePreference'
import { STORAGE_LAST_STRUCTURE_META, triggerJsonDownload } from '@/core/workspaceStorage'
import { workspaceService } from '@/services/workspaceService'
import {
  ROOT_NODE_ID,
  isCanvasScene,
  useSceneHistory,
} from '@/hooks/useSceneHistory'

import styles from './App.module.css'

/** Notificação de teste ao carregar a app (cápsula consola / 3s). */
const BOOT_CONSOLE_TEST_MESSAGE = 'Teste, console de notificação funcionado.'
const BOOT_CONSOLE_TEST_SECONDS = 3

const SAVE_STATUS_NOTICE_SECONDS = 10

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

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
}

function shouldIgnoreAppKeyboardShortcut(event: KeyboardEvent): boolean {
  if (isEditableTarget(event.target)) {
    return true
  }
  if (!(event.target instanceof HTMLElement)) {
    return false
  }
  return Boolean(
    event.target.closest('[data-structure-index-picker], [role="dialog"][aria-modal="true"]'),
  )
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

function App() {
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

  const [workspaceAutoSave, setWorkspaceAutoSave] = useState(() => getSceneAutoSaveEnabled())

  const {
    cycleConnectionRouting,
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
    connectNodes,
    relinkInternalStructureSlot,
    removeConnection,
    removeConnectionsFromOutputSlot,
    createChildNode,
    createRootNode,
    deleteSelectedNodes,
    deleteNodeIds,
    patchNodeSceneOverlay,
    setAllNodesSceneHidden,
    setAllNodesLocked,
    resetNodePosition,
    toggleNodeBodyCollapsed,
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
    replaceScene,
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
  } = useSceneHistory({ extendSchemaLookup, workspaceAutoSave })

  const { showConfirmByCatalogId, showToastByCatalogId } = useMessengerPopup()

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
  const [inspectorGrabFollowActive, setInspectorGrabFollowActive] = useState(false)
  const [inspectorGrabFollowCoords, setInspectorGrabFollowCoords] = useState({ x: 0, y: 0 })
  const sceneNodesMinimized = scene.sceneChrome?.sceneNodes?.minimized ?? true
  const sceneNodesSortMode = scene.sceneChrome?.sceneNodes?.sortMode ?? 'name'
  const [sceneNodesOffset, setSceneNodesOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const [sceneNodesViewportDocked, setSceneNodesViewportDocked] = useState(true)
  const [codeDockOpen, setCodeDockOpen] = useState(false)
  const [codeDockWidth, setCodeDockWidth] = useState(360)
  const [codeDockFloating, setCodeDockFloating] = useState(false)
  const [codeDockFloatingRect, setCodeDockFloatingRect] = useState(() =>
    clampFloatingDockRect(createDefaultFloatingCodeDockRect()),
  )
  const [codeText, setCodeText] = useState('// Stub do editor League-Bin\n// Sincronização bidirecional chega na fase E.\n')
  const [nodeConfigurationMode, setNodeConfigurationMode] = useState(false)
  const [parameterValueLinkSourceId, setParameterValueLinkSourceId] = useState<null | string>(null)
  const [nodeInstanceStringPickerNodeId, setNodeInstanceStringPickerNodeId] = useState<null | string>(null)
  const [hashStringPickerNodeId, setHashStringPickerNodeId] = useState<null | string>(null)
  const [hashStringNoticeStamp, setHashStringNoticeStamp] = useState<number | null>(null)
  const [paletteSignal, setPaletteSignal] = useState(0)
  const [tooltipHints, setTooltipHints] = useState<TooltipDictionary>({})
  const [bootConsoleTestStamp, setBootConsoleTestStamp] = useState<number | null>(() => Date.now())
  const [saveStatusNotice, setSaveStatusNotice] = useState<{
    lifetimeSeconds: number
    message: string
    stamp: number
  } | null>(null)

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

  useEffect(() => {
    workspaceService.setSaveStatusListener((event) => {
      if (event.trigger === 'migration' || event.trigger === 'auto') {
        return
      }

      if (event.ok) {
        showSaveStatusNotice(
          'Cena gravada em src/data/workspace/ (logic.json, layout.json, graph.json).',
        )
        return
      }

      showSaveStatusNotice(event.detail ?? 'Falha ao gravar a cena no disco.')
    })

    return () => {
      workspaceService.setSaveStatusListener(null)
    }
  }, [showSaveStatusNotice])

  const toggleNodeConfigurationMode = useCallback(() => {
    if (nodeConfigurationMode) {
      setNodeConfigurationMode(false)
      setParameterValueLinkSourceId(null)
      setHashStringPickerNodeId(null)
      return
    }

    showConfirmByCatalogId(MESSENGER_CONFIRM_NODE_CONFIGURATION_MODE, {
      onConfirm: () => setNodeConfigurationMode(true),
      onCancel: () => {
        setNodeConfigurationMode(false)
        setParameterValueLinkSourceId(null)
      },
    })
  }, [nodeConfigurationMode, showConfirmByCatalogId])

  /** Ao desacoplar pelo pin: alinha o inspector lateral ao chip da barra (X) e coloca o topo a stripBottom + `--space-3`. */
  const applyInspectorOffsetFromViewportStrip = useCallback(() => {
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

    const sr = strip.getBoundingClientRect()
    const col = column.getBoundingClientRect()
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
    const marginEdge = readRootSpacePx(narrow ? '--space-3' : '--space-5')
    const marginBelowStrip = readRootSpacePx('--space-3')

    const defaultRight = col.right - marginEdge

    /** Coincide com `.inspectorDockExpanded` / `.inspectorDockMinimized` + altura da faixa chrome. */
    const defaultTop = inspectorMinimized
      ? col.bottom - marginEdge - INSPECTOR_CHROME_STRIP_PX
      : col.top + col.height - marginEdge - INSPECTOR_CHROME_STRIP_PX

    setInspectorOffset({
      x: sr.right - defaultRight,
      y: sr.bottom + marginBelowStrip - defaultTop,
    })
  }, [inspectorMinimized])

  const handleUndockFromViewportToolbar = useCallback(() => {
    applyInspectorOffsetFromViewportStrip()
    setInspectorViewportDocked(false)
  }, [applyInspectorOffsetFromViewportStrip])

  const applySceneNodesOffsetFromViewportStrip = useCallback(() => {
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

    const sr = strip.getBoundingClientRect()
    const col = column.getBoundingClientRect()
    const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
    const marginEdge = readRootSpacePx(narrow ? '--space-3' : '--space-5')
    const marginBelowStrip = readRootSpacePx('--space-3')
    const defaultLeft = col.left + marginEdge
    const defaultTop = sceneNodesMinimized
      ? col.bottom - marginEdge - INSPECTOR_CHROME_STRIP_PX
      : col.top + col.height - marginEdge - INSPECTOR_CHROME_STRIP_PX

    setSceneNodesOffset({
      x: sr.left - defaultLeft,
      y: sr.bottom + marginBelowStrip - defaultTop,
    })
  }, [sceneNodesMinimized])

  const handleUndockSceneNodesFromViewportToolbar = useCallback(() => {
    applySceneNodesOffsetFromViewportStrip()
    setSceneNodesViewportDocked(false)
  }, [applySceneNodesOffsetFromViewportStrip])

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
  }, [])

  const requestPalette = () => {
    setPaletteSignal((ticket) => ticket + 1)
  }

  const persistConvertedStructurePack = useCallback(
    async (
      folder: string,
      schemas: NodeSchemaDefinition[],
      warnings: string[],
      modeBanner: string,
      rootSchemaIds?: string[],
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
              '\nRecarrega (F5) se a paleta não actualizar logo.'

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

      window.alert(
        `${modeBanner}Pack «${folder}» · ${String(schemas.length)} tipo(s) na paleta (📂 [${folder}]).${diskLine}${warnPreview}`,
      )
    },
    [],
  )

  const handleConvertRitualToStructurePack = useCallback(
    async (
      convertFn: (text: string) => ConvertRitobinToStructuresResult,
      modeBanner: string,
    ) => {
      const rawName = window.prompt(
        'Nome da pasta (cria `src/nodeStructures/<nome>/` em dev; aparece na paleta como 📂 [nome]):',
        'importado',
      )

      if (rawName === null) {
        return
      }

      const folder = sanitizeStructurePackFolderName(rawName)

      if (!folder) {
        window.alert(
          'Nome de pasta inválido. Usa letras minúsculas, números, hífen (-) e sublinhado (_), até 48 caracteres.',
        )
        return
      }

      if (folder === 'default') {
        window.alert('«default» é reservada aos tipos estáticos da app; escolhe outro nome de pasta.')
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
    [codeText, persistConvertedStructurePack],
  )

  const handleConvertJadeFxEditorPack = useCallback(() => {
    void handleConvertRitualToStructurePack(
      convertRitualTextJadeFxEditor,
      '[Converter · Jade fx_editor]\n\n',
    )
  }, [handleConvertRitualToStructurePack])

  const handleConvertClassGroupPack = useCallback(() => {
    void handleConvertRitualToStructurePack(
      convertRitualTextClassGroup,
      '[Converter · Class Group]\n\n',
    )
  }, [handleConvertRitualToStructurePack])

  const listStructurePackFolders = useCallback(async () => {
    if (import.meta.env.DEV) {
      try {
        const res = await fetch('/api/node-structures-folders')
        const payload: unknown = await res.json().catch(() => null)

        const apiOk =
          res.ok &&
          typeof payload === 'object' &&
          payload !== null &&
          Reflect.get(payload, 'ok') === true

        if (apiOk && typeof payload === 'object' && payload !== null) {
          const folders = Reflect.get(payload, 'folders')

          if (Array.isArray(folders)) {
            /** Lista alinhada ao que existe em `src/nodeStructures/` (evita pastas só no localStorage). */
            return folders
              .map((entry: unknown) => String(entry).trim())
              .filter((name) => name.length > 0 && name !== 'default')
              .sort((a, b) => a.localeCompare(b))
          }
        }
      } catch {
        /** API indisponível — cai no fallback */
      }
    }

    const unique = new Set<string>()
    for (const pack of dynamicStructurePacks) {
      if (pack.folder !== 'default') {
        unique.add(pack.folder)
      }
    }
    return Array.from(unique).sort((a, b) => a.localeCompare(b))
  }, [dynamicStructurePacks])

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

  const handleExtractNodeBasePack = useCallback(async (folder: string): Promise<boolean> => {
    const safe = sanitizeStructurePackFolderName(folder)

    if (!safe || safe === 'default') {
      window.alert('Pasta inválida ou reservada (default).')
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
  }, [])

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

  const loadRitobinTextIntoCodeDock = useCallback((ritualText: string, fileName: string, via: string) => {
    const maxPreview = 500_000
    setCodeText(ritualText.length > maxPreview ? `${ritualText.slice(0, maxPreview)}\n…` : ritualText)
    setCodeDockOpen(true)
    window.alert(`«${fileName}» carregado no painel Código (${via}). O grafo mock não foi alterado.`)
  }, [])

  const handleExportGraph = () => {
    const documentPayload = serializeScene(scene)
    const timestampLabel = Date.now()

    triggerJsonDownload(documentPayload, `node-structure-${timestampLabel}.json`)
    showSaveStatusNotice('Grafo JSON exportado para download (node-graphs-lol v2).')
  }

  const handleToggleWorkspaceAutoSave = useCallback(() => {
    setWorkspaceAutoSave((current) => {
      const next = !current
      setSceneAutoSaveEnabled(next)
      return next
    })
  }, [])

  const handleSaveSceneGraph = useCallback(() => {
    if (!import.meta.env.DEV) {
      showSaveStatusNotice('Cena guardada no localStorage do browser (disco só em npm run dev).')
      return
    }

    workspaceService.saveSceneNow(scene)
  }, [scene, showSaveStatusNotice])

  const handleImportWorkspaceFile = async (file: File) => {
    if (file.name.toLowerCase().endsWith('.bin')) {
      const exeConfigured = getStoredRitobinExePath()

      if (exeConfigured) {
        const rit = await convertBinViaRitobinExeBridge(file, exeConfigured)

        if (rit.branch === 'success') {
          loadRitobinTextIntoCodeDock(rit.text, file.name, 'ponte ritobin + executável local')
          return
        }

        if (rit.branch === 'not_configured') {
          window.alert(
            'Executável ritobin guardado, mas o cliente não tem ponte Ritobin: corre `npm run ritobin-bridge:dev`. Em dev, `VITE_JADE_USE_PROXY=true` faz também uso de `/api/ritobin` (via `vite.config.ts` — reinicia `npm run dev` após alterar `.env`). Opcionalmente define `VITE_RITOBIN_USE_PROXY=false` só para Ritobin, ou `VITE_RITOBIN_INVOKE_BRIDGE` com URL absoluta.',
          )
        } else if (rit.branch === 'network_error' || rit.branch === 'bridge_error') {
          const detail =
            rit.branch === 'network_error' ? rit.message : `${String(rit.status)} — ${rit.message}`

          window.alert(
            `Ponte ritobin (executável local) falhou (${rit.branch}).\n${detail}\nA tentar o Jade bridge (/convert).`,
          )
        }
      }

      const bridge = await convertBinViaOptionalBridge(file)

      if (bridge.branch === 'success') {
        loadRitobinTextIntoCodeDock(bridge.text, file.name, 'Jade bridge /convert')
        return
      }

      if (bridge.branch === 'not_configured') {
        window.alert(
          'Jade bridge não configurado: define `VITE_JADE_BIN_BRIDGE`, ou em dev `VITE_JADE_USE_PROXY=true` + proxy em `vite.config.ts` (reinicia `npm run dev`). Ou usa só a ponte Ritobin com.executável no menu Ritobin.',
        )
      } else if (bridge.branch === 'network_error' || bridge.branch === 'bridge_error') {
        const detail =
          bridge.branch === 'network_error' ? bridge.message : `${String(bridge.status)} — ${bridge.message}`

        window.alert(
          `Não foi possível obter texto ritual (${bridge.branch}).\n${detail}\nConfigura a ponte Ritobin e/ou ` +
            '`VITE_JADE_BIN_BRIDGE` / proxy Jade, ou define executável no menu Ritobin.',
        )
      }

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

      replaceScene(graphCandidate)
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

  const toggleInspectorMinimized = () => {
    if (inspectorMovedDuringPointer.current) {
      inspectorMovedDuringPointer.current = false
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

    patchSceneChrome({ sceneNodes: { minimized: !sceneNodesMinimized } })
  }

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

  const prevDockFloatingRef = useRef(codeDockFloating)

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

  const resetFloatingDockDimensions = useCallback(() => {
    setCodeDockFloatingRect(clampFloatingDockRect(createDefaultFloatingCodeDockRect()))
  }, [])

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (shouldIgnoreAppKeyboardShortcut(event)) {
        return
      }

      const key = event.key.toLowerCase()

      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          redoScene()
          return
        }

        undoScene()
        return
      }

      if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault()
        redoScene()
        return
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        const hasProtectedOnly =
          selectedNodeIds.length === 1 && selectedNodeIds[0] === ROOT_NODE_ID && primarySelectedId === ROOT_NODE_ID

        if (hasProtectedOnly) {
          return
        }

        const deletableIds = filterRemovableNodeIds(scene, selectedNodeIds).filter(
          (id) => id !== ROOT_NODE_ID,
        )

        if (deletableIds.length === 0) {
          const hasLocked = selectedNodeIds.some((id) => {
            const node = scene.nodes.find((entry) => entry.id === id)

            return node !== undefined && isNodeLocked(node)
          })

          if (hasLocked) {
            event.preventDefault()
            showToastByCatalogId(MESSENGER_TOAST_NODE_LOCKED)
          }

          return
        }

        event.preventDefault()
        deleteNodeIds(deletableIds)
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut)

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut)
    }
  }, [
    deleteNodeIds,
    deleteSelectedNodes,
    primarySelectedId,
    redoScene,
    scene,
    selectedNodeIds,
    showToastByCatalogId,
    undoScene,
  ])

  const inspectorTarget =
    selectedNodeIds.length > 0 && primarySelectedId
      ? scene.nodes.find((node) => node.id === primarySelectedId)
      : undefined

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

    if (
      selectedNodeIds.length === 1 &&
      selectedNodeIds[0] === ROOT_NODE_ID &&
      primarySelectedId === ROOT_NODE_ID
    ) {
      return false
    }

    const primary = primarySelectedId
      ? scene.nodes.find((node) => node.id === primarySelectedId)
      : undefined

    if (primary && isNodeLocked(primary)) {
      return false
    }

    return filterRemovableNodeIds(scene, selectedNodeIds).some((id) => id !== ROOT_NODE_ID)
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
        setInspectorMinimized(false)
      },
      onUndockFromViewportToolbar: handleUndockFromViewportToolbar,
    }),
    [handleUndockFromViewportToolbar],
  )

  const sceneNodesPickHandlers = useMemo(
    () => ({
      onDockToViewport: () => {
        setSceneNodesViewportDocked(true)
        setSceneNodesMinimized(false)
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

  const sceneNodesPanelProps = {
    ...sceneNodesPickHandlers,
    canDeleteSelected: sceneNodesCanDelete,
    dragHandleProps: sceneNodesDragHandleProps,
    minimized: sceneNodesMinimized,
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
  }

  if (!scene.nodes.length) {
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
        <AppMenuBar
          autoSaveEnabled={workspaceAutoSave}
          nodeConfigurationMode={nodeConfigurationMode}
          onDeleteSelection={() => deleteSelectedNodes()}
          onExportGraph={handleExportGraph}
          onImportGraph={handleImportWorkspaceFile}
          onOpenStubBin={handleStubPipeline}
          onRequestAddNode={requestPalette}
          onSaveSceneGraph={handleSaveSceneGraph}
          onToggleAutoSave={handleToggleWorkspaceAutoSave}
          onToggleNodeConfigurationMode={toggleNodeConfigurationMode}
          onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
        />
        <p className={styles.empty}>Nenhum nó disponível. Use File → Stub .bin ou add node.</p>
      </main>
    )
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
      <AppMenuBar
        autoSaveEnabled={workspaceAutoSave}
        nodeConfigurationMode={nodeConfigurationMode}
        onDeleteSelection={() => deleteSelectedNodes()}
        onExportGraph={handleExportGraph}
        onImportGraph={handleImportWorkspaceFile}
        onOpenStubBin={handleStubPipeline}
        onRequestAddNode={requestPalette}
        onSaveSceneGraph={handleSaveSceneGraph}
        onToggleAutoSave={handleToggleWorkspaceAutoSave}
        onToggleNodeConfigurationMode={toggleNodeConfigurationMode}
        onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
      />

      <div className={styles.workspace} data-workspace>
        <div className={styles.graphColumn} ref={graphColumnRef}>
          <GraphCanvas
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
            onCloseCodePanelShortcut={handleCloseCodeDock}
            onConnectNodes={connectNodes}
            onRelinkInternalStructure={relinkInternalStructureSlot}
            onCreateChildNode={createChildNode}
            onCreateRootNode={createRootNode}
            onDeleteNodeIds={deleteNodeIds}
            onToggleNodeBodyCollapsed={toggleNodeBodyCollapsed}
            onToggleNodeCardSection={toggleNodeCardSection}
            onSetNodeCardSectionOrder={setNodeCardSectionOrder}
            onSetNodeCardBodyLayout={setNodeCardBodyLayout}
            onCycleConnectionRouting={cycleConnectionRouting}
            onMarqueeCommit={commitMarqueeSelection}
            onMoveNode={moveNode}
            onSceneCameraChange={setSceneCamera}
            onToolbarVisibilityChange={(toolbarVisibility) =>
              patchSceneChrome({ toolbarVisibility })
            }
            toolbarVisibility={
              scene.sceneChrome?.toolbarVisibility ?? DEFAULT_CANVAS_TOOLBAR_VISIBILITY
            }
            onNodeLockedInteraction={() => showToastByCatalogId(MESSENGER_TOAST_NODE_LOCKED)}
            onSceneNodesPanelRequest={() =>
              patchSceneChrome({ sceneNodes: { minimized: false } })
            }
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
            onSetNodeParameterOrder={setNodeParameterOrder}
            paletteRequestSignal={paletteSignal}
            scene={scene}
            schemaBaseInternalStructureCatalogBySchemaId={mergedBaseInternalStructureCatalogBySchemaId}
            schemaBaseParameterCatalogBySchemaId={mergedBaseParameterCatalogBySchemaId}
            schemaNodeKindBySchemaId={mergedSchemaNodeKindBySchemaId}
            schemaPackFolderBySchemaId={mergedPackFolderBySchemaId}
            schemaStructureSubfolderBySchemaId={mergedStructureSubfolderBySchemaId}
            selectedNodeId={primarySelectedId}
            selectedNodeIds={selectedNodeIds}
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
                  viewportDocked
                />
              ) : null
            }
          />
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

        {codeDockOpen ? (
          <div className={codeDockFloating ? styles.codeDockPortalSlot : styles.codeDockColumn}>
            <CodeDock
              dockedWidth={codeDockWidth}
              floatingActive={codeDockFloating}
              floatingRect={codeDockFloatingRect}
              nodeActions={{
                deleteFolder: deleteNodeStructurePackFolder,
                listDeletableFolders: listStructurePackFolders,
                listStructurePackFolders,
                onConvertClassGroup: handleConvertClassGroupPack,
                onConvertJadeFxEditor: handleConvertJadeFxEditorPack,
                onApplyBinNomenclatura: handleApplyBinNomenclaturaPack,
                onExtractNodeBase: handleExtractNodeBasePack,
              }}
              onChange={setCodeText}
              onClose={handleCloseCodeDock}
              onDockedWidthChange={setCodeDockWidth}
              onFloatingRectChange={setCodeDockFloatingRect}
              onResetFloatingDimensions={resetFloatingDockDimensions}
              onToggleFloating={() => setCodeDockFloating((v) => !v)}
              value={codeText}
            />
          </div>
        ) : null}
      </div>
    </main>
  )
}

export default App
