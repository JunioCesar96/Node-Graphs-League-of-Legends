import { refreshCustomBackgroundLayerHosts } from '@jade/lib/themeApplicator'
import { showAppAlert } from '@/messenger_popup/appMessenger'
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import Editor from '@monaco-editor/react'
import MenuBar from '@jade/components/MenuBar'
import { CodeDockBridgeMenu } from '@/components/molecules/CodeDockBridgeMenu'
import { CodeDockNativeMenu, codeDockConverterMenuLabel } from '@/components/molecules/CodeDockNativeMenu'
import { isNativeRitualBinDevMode } from '@/core/ritualBin'
import { getMonacoLanguageForFileName } from '@/core/codeDockFileTypes'
import { useCodeDockJadeEditor } from '@/hooks/useCodeDockJadeEditor'
import {
  SHORTCUT_SCOPE_ATTR,
  SHORTCUT_SCOPE_CODE_DOCK,
} from '@/core/shortcuts/shortcutScopes'
import { useRitualDragOptional } from '@/ritualDrag/RitualDragContext'

import { LangId } from '@/core/language/languageIds'
import { buildJadeMenuBarLabels } from '@/core/language/jadeMenuLabels'
import { sanitizeStructurePackFolderName } from '@/core/nodeStructurePackStorage'
import { useLanguage } from '@/language/LanguageProvider'

import { clampFloatingDockRect, type CodeDockFloatingRect } from './codeDockFloatingRect'
import { CodeDockTabBar } from '@/components/molecules/CodeDockTabBar'
import {
  EditorWindowHeaderChrome,
  EditorWindowHeaderChromeButton,
  EditorWindowHeaderChromeIconButton,
} from '@/components/molecules/EditorWindowHeaderChrome'
import { EditorDockFavicon } from '@/components/atoms/EditorDockFavicon'
import type { TabContextMenuAction } from '@/components/molecules/TabContextMenu'
import type { CodeDockTabBarItem } from '@/hooks/useCodeDockTabs'

import { CodeDockJadeDialogs } from './CodeDockJadeDialogs'

import { configureMonacoLoader } from '@/monaco/configureMonacoLoader'
import '@/monaco/jade-syntax-globals.css'
import './codeDockJade.css'

import { JadeMenuBarOptionsMenu } from '@/components/molecules/JadeThemeOptionsMenu'

import styles from './CodeDock.module.css'

export type { CodeDockFloatingRect } from './codeDockFloatingRect'
export { clampFloatingDockRect, createDefaultFloatingCodeDockRect } from './codeDockFloatingRect'

export type CodeDockFloatingResizeCorner = 'e' | 's' | 'se'

export type CodeDockNodeActions = {
  onConvertClassGroup: () => void | Promise<void>
  /** Particle Editor Jade — só `… = VfxSystemDefinitionData {`. */
  onConvertJadeFxEditor: () => void | Promise<void>
  /** Preenche group/collection nos JSON do pack a partir do texto ritual (VFX Jade). */
  onApplyBinNomenclatura: (folder: string) => boolean | Promise<boolean>
  /** PROP com hashes FNV → nomes legíveis no editor (emitterName, VfxSystemDefinitionData, …). */
  onHumanizePropRitual?: () => void
  /** Pastas em `src/nodeStructures/` (exceto `default`) — eliminar pack */
  listDeletableFolders: () => Promise<string[]>
  /** Igual à lista de packs; usado por «Extrair Node Base». */
  listStructurePackFolders: () => Promise<string[]>
  onExtractNodeBase: (folder: string) => boolean | Promise<boolean>
  deleteFolder: (folder: string) => Promise<{ ok: boolean; error?: string; notice?: string }>
  /** Ritual Class Group → cena gráfica (pack de schemas). */
  onCodeToNodeGraph: (folder: string) => boolean | Promise<boolean>
  /** Ritual Class Group → cena incremental com revisão por passo. */
  onCodeToNodeGraphStepByStep?: (folder: string) => boolean | Promise<boolean>
  getDefaultStructurePackFolder?: () => string
  /** Ritual → novo pack + instâncias na cena (sem pack existente). */
  onCodeToNewNodeGraph?: (folder: string) => boolean | Promise<boolean>
  onCodeToNewNodeGraphStepByStep?: (folder: string) => boolean | Promise<boolean>
  getDefaultNewNodeGraphPackFolder?: () => string
  /** Ritual Class Group → cena com block cards (hierarquia de blocos). */
  onCodeToNodeBlock?: () => boolean | Promise<boolean>
  /** Ritual Class Group → grava JSON em `blockStructures/` (auto build). */
  onCodeBuildBlock?: () => boolean | Promise<boolean>
}

type FloatingDragPhase =
  | null
  | { kind: 'move'; sx: number; sy: number; rx: number; ry: number }
  | { kind: 'east'; sx: number; rw: number }
  | { kind: 'south'; sy: number; rh: number }
  | { kind: 'southEast'; sx: number; sy: number; rw: number; rh: number }

export type CodeDockFileBridge = {
  onOpenFile: () => void
  onNewFile?: () => void
  onSaveFile?: () => void
  onSaveFileAs?: () => void
  onOpenLog?: () => void
  recentFiles?: string[]
  onOpenRecentFile?: (path: string) => void
  openFileDisabled?: boolean
}

export type CodeToNewNodeGraphProgress = {
  label: string
  ratio: number
}

type CodeDockProps = {
  dockedWidth: number
  floatingActive: boolean
  floatingRect: CodeDockFloatingRect
  onFloatingRectChange: (next: CodeDockFloatingRect) => void
  onChange: (value: string) => void
  onClose: () => void
  onToggleFloating: () => void
  onResetFloatingDimensions: () => void
  onDockedWidthChange: (nextWidth: number) => void
  /** Ritual → tipos na paleta; eliminar pastas pack (exceto `default`) */
  nodeActions?: CodeDockNodeActions
  /** Barra de progresso do fluxo «Code to new node graph» (gerar). */
  codeToNewGraphProgress?: CodeToNewNodeGraphProgress | null
  fileBridge?: CodeDockFileBridge
  tabs: CodeDockTabBarItem[]
  activeTabId: string
  activeFileName: string
  onActivateTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onNewTab?: () => void
  onTabAction?: (tabId: string, action: TabContextMenuAction) => void
  value: string
  /** Neeko Node seleccionado no canvas — activa «To Neeko node» no menu do editor. */
  neekoSendTarget?: { canvasNodeId: string } | null
  onSendCodeToNeeko?: (canvasNodeId: string, text: string) => void
  /** Nó primário no canvas — activa «Replace Value to Graph» no menu do editor. */
  primarySelectedNodeId?: string | null
  onReplaceValueToGraph?: (snippet: string) => void
}

export const CODE_DOCK_DEFAULT_WIDTH = 588
export const CODE_DOCK_MIN_WIDTH = 446
export const CODE_DOCK_MAX_WIDTH = 760

const MIN_DOCK_WIDTH = CODE_DOCK_MIN_WIDTH
const MAX_DOCK_WIDTH = CODE_DOCK_MAX_WIDTH
export function CodeDock({
  dockedWidth,
  floatingActive,
  floatingRect,
  onFloatingRectChange,
  onChange,
  onClose,
  onToggleFloating,
  onResetFloatingDimensions,
  onDockedWidthChange,
  nodeActions,
  codeToNewGraphProgress = null,
  fileBridge,
  tabs,
  activeTabId,
  activeFileName,
  onActivateTab,
  onCloseTab,
  onNewTab,
  onTabAction,
  value,
  neekoSendTarget = null,
  onSendCodeToNeeko,
  primarySelectedNodeId = null,
  onReplaceValueToGraph,
}: CodeDockProps) {
  const { t } = useLanguage()
  const menuBarLabels = useMemo(() => buildJadeMenuBarLabels(t), [t])
  const bridgeExtraMenus = useMemo(
    () => [
      {
        id: 'converter',
        label: codeDockConverterMenuLabel(t),
        content: ({ closeMenu }: { closeMenu: () => void }) =>
          isNativeRitualBinDevMode() ? (
            <CodeDockNativeMenu onCloseMenu={closeMenu} />
          ) : (
            <CodeDockBridgeMenu onCloseMenu={closeMenu} />
          ),
      },
    ],
    [t],
  )
  const monacoModelPath = `/workspace/code-dock/${activeTabId}/${activeFileName}`
  const [monacoLoaderReady, setMonacoLoaderReady] = useState(false)
  const [headerActionsCollapsed, setHeaderActionsCollapsed] = useState(true)

  useEffect(() => {
    let cancelled = false
    void configureMonacoLoader().then(() => {
      if (!cancelled) {
        setMonacoLoaderReady(true)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])
  const editorLanguage = getMonacoLanguageForFileName(activeFileName)
  const jade = useCodeDockJadeEditor(value, onChange, editorLanguage)

  useEffect(() => {
    refreshCustomBackgroundLayerHosts()
  }, [])

  const ritualDrag = useRitualDragOptional()
  const ritualDragPhase = ritualDrag?.phase ?? 'idle'
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteChoices, setDeleteChoices] = useState<string[]>([])
  const [deleteSelected, setDeleteSelected] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteListError, setDeleteListError] = useState<string | null>(null)
  const [extractDialogOpen, setExtractDialogOpen] = useState(false)
  const [extractChoices, setExtractChoices] = useState<string[]>([])
  const [extractSelected, setExtractSelected] = useState('')
  const [extractBusy, setExtractBusy] = useState(false)
  const [extractListError, setExtractListError] = useState<string | null>(null)
  const [nomeDialogOpen, setNomeDialogOpen] = useState(false)
  const [nomeChoices, setNomeChoices] = useState<string[]>([])
  const [nomeSelected, setNomeSelected] = useState('')
  const [nomeBusy, setNomeBusy] = useState(false)
  const [nomeListError, setNomeListError] = useState<string | null>(null)
  const [codeToGraphDialogOpen, setCodeToGraphDialogOpen] = useState(false)
  const [codeToGraphChoices, setCodeToGraphChoices] = useState<string[]>([])
  const [codeToGraphSelected, setCodeToGraphSelected] = useState('')
  const [codeToGraphBusy, setCodeToGraphBusy] = useState(false)
  const [codeToGraphListError, setCodeToGraphListError] = useState<string | null>(null)
  const [codeToNewGraphDialogOpen, setCodeToNewGraphDialogOpen] = useState(false)
  const [codeToNewGraphFolder, setCodeToNewGraphFolder] = useState('')
  const [codeToNewGraphBusy, setCodeToNewGraphBusy] = useState(false)
  const [codeToNewGraphError, setCodeToNewGraphError] = useState<string | null>(null)

  const dragPhaseRef = useRef<FloatingDragPhase>(null)
  const floatMovePendingRef = useRef<{
    rx: number
    ry: number
    sx: number
    sy: number
  } | null>(null)
  const dockedResizePhaseRef = useRef(false)
  const [floatDragging, setFloatDragging] = useState(false)

  const FLOAT_DRAG_THRESHOLD_PX = 5

  /** Evita ler `floatingRect` em closure obsoleta durante drag. */
  const floatingRectRef = useRef(floatingRect)
  floatingRectRef.current = floatingRect

  const shellRef = useRef<HTMLElement | null>(null)

  const applyFloatingRect = useCallback(
    (incoming: CodeDockFloatingRect) => {
      onFloatingRectChange(clampFloatingDockRect(incoming))
    },
    [onFloatingRectChange],
  )

  /** Arrastar e redimensionar janela flutuante */
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!floatingActive) {
        return
      }

      const pending = floatMovePendingRef.current
      if (pending && !dragPhaseRef.current) {
        if (
          ritualDragPhase === 'dragging' ||
          ritualDragPhase === 'linkDragging' ||
          ritualDragPhase === 'buildingNeeko' ||
          ritualDragPhase === 'readyNeeko'
        ) {
          floatMovePendingRef.current = null
          return
        }
        const dx = event.clientX - pending.sx
        const dy = event.clientY - pending.sy
        if (Math.hypot(dx, dy) >= FLOAT_DRAG_THRESHOLD_PX) {
          setFloatDragging(true)
          dragPhaseRef.current = {
            kind: 'move',
            rx: pending.rx,
            ry: pending.ry,
            sx: pending.sx,
            sy: pending.sy,
          }
        }
      }

      const phase = dragPhaseRef.current
      if (!phase) {
        return
      }

      const r = floatingRectRef.current

      if (phase.kind === 'move') {
        applyFloatingRect({
          ...r,
          left: phase.rx + (event.clientX - phase.sx),
          top: phase.ry + (event.clientY - phase.sy),
        })
        return
      }

      if (phase.kind === 'east') {
        applyFloatingRect({
          ...r,
          width: phase.rw + (event.clientX - phase.sx),
        })
        return
      }

      if (phase.kind === 'south') {
        applyFloatingRect({
          ...r,
          height: phase.rh + (event.clientY - phase.sy),
        })
        return
      }

      applyFloatingRect({
        ...r,
        height: phase.rh + (event.clientY - phase.sy),
        width: phase.rw + (event.clientX - phase.sx),
      })
    }

    const stopFloatingDrag = () => {
      floatMovePendingRef.current = null
      dragPhaseRef.current = null
      setFloatDragging(false)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointercancel', stopFloatingDrag)
    window.addEventListener('pointerup', stopFloatingDrag)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointercancel', stopFloatingDrag)
      window.removeEventListener('pointerup', stopFloatingDrag)
    }
  }, [applyFloatingRect, floatingActive, ritualDragPhase])

  useEffect(() => {
    if (!floatingActive) {
      floatMovePendingRef.current = null
      setFloatDragging(false)
    }
  }, [floatingActive])

  /** Largura quando docado à direita */
  useEffect(() => {
    const handleDockWidthMove = (event: PointerEvent) => {
      if (!dockedResizePhaseRef.current || floatingActive || !shellRef.current?.parentElement) {
        return
      }

      const parentRect = shellRef.current.parentElement.getBoundingClientRect()
      const nextWidth = parentRect.right - event.clientX
      const clampedWidth = Math.min(MAX_DOCK_WIDTH, Math.max(MIN_DOCK_WIDTH, nextWidth))
      onDockedWidthChange(clampedWidth)
    }

    const stopDockWidth = () => {
      dockedResizePhaseRef.current = false
    }

    window.addEventListener('pointermove', handleDockWidthMove)
    window.addEventListener('pointercancel', stopDockWidth)
    window.addEventListener('pointerup', stopDockWidth)

    return () => {
      window.removeEventListener('pointermove', handleDockWidthMove)
      window.removeEventListener('pointercancel', stopDockWidth)
      window.removeEventListener('pointerup', stopDockWidth)
    }
  }, [floatingActive, onDockedWidthChange])

  const openDeleteDialog = useCallback(async () => {
    if (!nodeActions) {
      return
    }
    setDeleteListError(null)
    setDeleteBusy(false)
    setDeleteDialogOpen(true)
    try {
      const folders = await nodeActions.listDeletableFolders()
      setDeleteChoices(folders)
      setDeleteSelected(folders[0] ?? '')
    } catch {
      setDeleteChoices([])
      setDeleteSelected('')
      setDeleteListError('Não foi possível obter a lista de pastas.')
    }
  }, [nodeActions])

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialogOpen(false)
    setDeleteListError(null)
    setDeleteBusy(false)
  }, [])

  const confirmDeleteFolder = useCallback(async () => {
    if (!nodeActions || !deleteSelected) {
      return
    }
    setDeleteBusy(true)
    try {
      const outcome = await nodeActions.deleteFolder(deleteSelected)
      if (!outcome.ok) {
        showAppAlert(outcome.error ?? 'Não foi possível eliminar.')
        return
      }
      if (outcome.notice) {
        showAppAlert(outcome.notice)
      }
      closeDeleteDialog()
    } finally {
      setDeleteBusy(false)
    }
  }, [closeDeleteDialog, deleteSelected, nodeActions])

  const openExtractDialog = useCallback(async () => {
    if (!nodeActions) {
      return
    }
    setExtractListError(null)
    setExtractBusy(false)
    setExtractDialogOpen(true)
    try {
      const folders = await nodeActions.listStructurePackFolders()
      setExtractChoices(folders)
      setExtractSelected(folders[0] ?? '')
    } catch {
      setExtractChoices([])
      setExtractSelected('')
      setExtractListError('Não foi possível obter a lista de pastas.')
    }
  }, [nodeActions])

  const closeExtractDialog = useCallback(() => {
    setExtractDialogOpen(false)
    setExtractListError(null)
    setExtractBusy(false)
  }, [])

  const confirmExtractNodeBase = useCallback(async () => {
    if (!nodeActions || !extractSelected) {
      return
    }
    setExtractBusy(true)
    try {
      const okOutcome = await nodeActions.onExtractNodeBase(extractSelected)
      if (okOutcome) {
        closeExtractDialog()
      }
    } finally {
      setExtractBusy(false)
    }
  }, [closeExtractDialog, extractSelected, nodeActions])

  const openNomeDialog = useCallback(async () => {
    if (!nodeActions) {
      return
    }
    setNomeListError(null)
    setNomeBusy(false)
    setNomeDialogOpen(true)
    try {
      const folders = await nodeActions.listStructurePackFolders()
      setNomeChoices(folders)
      setNomeSelected(folders[0] ?? '')
    } catch {
      setNomeChoices([])
      setNomeSelected('')
      setNomeListError('Não foi possível obter a lista de pastas.')
    }
  }, [nodeActions])

  const closeNomeDialog = useCallback(() => {
    setNomeDialogOpen(false)
    setNomeListError(null)
    setNomeBusy(false)
  }, [])

  const pickDefaultPackFolder = useCallback(
    (folders: string[]) => {
      const preferred = nodeActions?.getDefaultStructurePackFolder?.()
      if (preferred && folders.includes(preferred)) {
        return preferred
      }
      if (folders.includes('default')) {
        return 'default'
      }
      return folders[0] ?? ''
    },
    [nodeActions],
  )

  const openCodeToGraphDialog = useCallback(async () => {
    if (!nodeActions) {
      return
    }
    setCodeToGraphListError(null)
    setCodeToGraphBusy(false)
    setCodeToGraphDialogOpen(true)
    try {
      const folders = await nodeActions.listStructurePackFolders()
      setCodeToGraphChoices(folders)
      setCodeToGraphSelected(pickDefaultPackFolder(folders))
    } catch {
      setCodeToGraphChoices([])
      setCodeToGraphSelected('')
      setCodeToGraphListError('Não foi possível obter a lista de pastas.')
    }
  }, [nodeActions, pickDefaultPackFolder])

  const closeCodeToGraphDialog = useCallback(() => {
    setCodeToGraphDialogOpen(false)
    setCodeToGraphListError(null)
    setCodeToGraphBusy(false)
  }, [])

  const confirmCodeToNodeGraph = useCallback(async () => {
    if (!nodeActions || !codeToGraphSelected) {
      return
    }
    setCodeToGraphBusy(true)
    try {
      const okOutcome = await nodeActions.onCodeToNodeGraph(codeToGraphSelected)
      if (okOutcome) {
        closeCodeToGraphDialog()
      }
    } finally {
      setCodeToGraphBusy(false)
    }
  }, [closeCodeToGraphDialog, codeToGraphSelected, nodeActions])

  const confirmCodeToNodeGraphStepByStep = useCallback(async () => {
    if (!nodeActions?.onCodeToNodeGraphStepByStep || !codeToGraphSelected) {
      return
    }
    setCodeToGraphBusy(true)
    try {
      const okOutcome = await nodeActions.onCodeToNodeGraphStepByStep(codeToGraphSelected)
      if (okOutcome) {
        closeCodeToGraphDialog()
      }
    } finally {
      setCodeToGraphBusy(false)
    }
  }, [closeCodeToGraphDialog, codeToGraphSelected, nodeActions])

  const openCodeToNewGraphDialog = useCallback(() => {
    if (!nodeActions?.onCodeToNewNodeGraph) {
      return
    }
    setCodeToNewGraphError(null)
    setCodeToNewGraphBusy(false)
    const defaultFolder = nodeActions.getDefaultNewNodeGraphPackFolder?.() ?? 'importado'
    setCodeToNewGraphFolder(defaultFolder)
    setCodeToNewGraphDialogOpen(true)
  }, [nodeActions])

  const closeCodeToNewGraphDialog = useCallback(() => {
    setCodeToNewGraphDialogOpen(false)
    setCodeToNewGraphError(null)
    setCodeToNewGraphBusy(false)
  }, [])

  const resolveNewGraphFolder = useCallback((): string | null => {
    const folder = sanitizeStructurePackFolderName(codeToNewGraphFolder)
    if (!folder) {
      setCodeToNewGraphError(
        'Nome inválido. Usa letras minúsculas, números, hífen (-) e sublinhado (_), até 48 caracteres.',
      )
      return null
    }
    if (folder === 'default') {
      setCodeToNewGraphError('«default» é reservada; escolhe outro nome de pasta.')
      return null
    }
    setCodeToNewGraphError(null)
    return folder
  }, [codeToNewGraphFolder])

  const confirmCodeToNewNodeGraph = useCallback(async () => {
    if (!nodeActions?.onCodeToNewNodeGraph) {
      return
    }
    const folder = resolveNewGraphFolder()
    if (!folder) {
      return
    }
    setCodeToNewGraphBusy(true)
    try {
      const okOutcome = await nodeActions.onCodeToNewNodeGraph(folder)
      if (okOutcome) {
        closeCodeToNewGraphDialog()
      }
    } finally {
      setCodeToNewGraphBusy(false)
    }
  }, [closeCodeToNewGraphDialog, nodeActions, resolveNewGraphFolder])

  const confirmCodeToNewNodeGraphStepByStep = useCallback(async () => {
    if (!nodeActions?.onCodeToNewNodeGraphStepByStep) {
      return
    }
    const folder = resolveNewGraphFolder()
    if (!folder) {
      return
    }
    setCodeToNewGraphBusy(true)
    try {
      const okOutcome = await nodeActions.onCodeToNewNodeGraphStepByStep(folder)
      if (okOutcome) {
        closeCodeToNewGraphDialog()
      }
    } finally {
      setCodeToNewGraphBusy(false)
    }
  }, [closeCodeToNewGraphDialog, nodeActions, resolveNewGraphFolder])

  const confirmApplyNome = useCallback(async () => {
    if (!nodeActions || !nomeSelected) {
      return
    }
    setNomeBusy(true)
    try {
      const okOutcome = await nodeActions.onApplyBinNomenclatura(nomeSelected)
      if (okOutcome) {
        closeNomeDialog()
      }
    } finally {
      setNomeBusy(false)
    }
  }, [closeNomeDialog, nomeSelected, nodeActions])

  const beginDockWidthResize = useCallback((event: ReactPointerEvent) => {
    if (
      ritualDragPhase === 'dragging' ||
      ritualDragPhase === 'linkDragging' ||
      ritualDragPhase === 'buildingNeeko' ||
      ritualDragPhase === 'readyNeeko'
    ) {
      return
    }
    event.preventDefault()
    dockedResizePhaseRef.current = true
  }, [ritualDragPhase])

  const beginFloatMovePending = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        !floatingActive ||
        event.button !== 0 ||
        ritualDragPhase === 'dragging' ||
        ritualDragPhase === 'linkDragging' ||
        ritualDragPhase === 'buildingNeeko' ||
        ritualDragPhase === 'readyNeeko'
      ) {
        return
      }
      const r = floatingRectRef.current
      floatMovePendingRef.current = {
        rx: r.left,
        ry: r.top,
        sx: event.clientX,
        sy: event.clientY,
      }
    },
    [floatingActive, ritualDragPhase],
  )

  const startFloatResize = useCallback(
    (corner: CodeDockFloatingResizeCorner, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (
        !floatingActive ||
        ritualDragPhase === 'dragging' ||
        ritualDragPhase === 'linkDragging'
      ) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      const base = clampFloatingDockRect(floatingRectRef.current)

      if (corner === 'e') {
        dragPhaseRef.current = { kind: 'east', rw: base.width, sx: event.clientX }
      } else if (corner === 's') {
        dragPhaseRef.current = { kind: 'south', rh: base.height, sy: event.clientY }
      } else {
        dragPhaseRef.current = {
          kind: 'southEast',
          rw: base.width,
          rh: base.height,
          sx: event.clientX,
          sy: event.clientY,
        }
      }

      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [floatingActive, ritualDragPhase],
  )

  useEffect(() => {
    jade.editorRef.current?.layout()
    const id = window.setTimeout(() => jade.editorRef.current?.layout(), 72)
    return () => window.clearTimeout(id)
  }, [floatingActive, dockedWidth, floatingRect.height, floatingRect.width, jade.editorRef])

  const nodeGraphTools = nodeActions ? (
    <>
      <span className="codeDockNodeGraphLabel">{t(LangId.CodeToolsNodeGraph)}</span>
      <button
        className="menu-option"
        type="button"
        onClick={() => void nodeActions.onConvertJadeFxEditor()}
      >
        <span>{t(LangId.CodeToolsConvertJadeFx)}</span>
      </button>
      <button
        className="menu-option"
        type="button"
        onClick={() => void nodeActions.onConvertClassGroup()}
      >
        <span>{t(LangId.CodeToolsConvertClassGroup)}</span>
      </button>
      <button className="menu-option" type="button" onClick={() => void openExtractDialog()}>
        <span>{t(LangId.CodeToolsExtractNodeBase)}</span>
      </button>
      <button className="menu-option" type="button" onClick={() => void openNomeDialog()}>
        <span>{t(LangId.CodeToolsApplyNomenclature)}</span>
      </button>
      {nodeActions.onHumanizePropRitual ? (
        <button
          className="menu-option"
          type="button"
          onClick={() => nodeActions.onHumanizePropRitual?.()}
        >
          <span>{t(LangId.CodeToolsResolvePropHashes)}</span>
        </button>
      ) : null}
      <button className="menu-option" type="button" onClick={() => void openDeleteDialog()}>
        <span>{t(LangId.CodeToolsDeletePack)}</span>
      </button>
      <div className="menu-separator" role="separator" />
      <span className="codeDockCodeToNodeGraphSectionLabel">{t(LangId.CodeToolsSectionCodeToGraph)}</span>
      <button className="menu-option" type="button" onClick={() => void openCodeToGraphDialog()}>
        <span>{t(LangId.CodeToolsCodeToGraph)}</span>
      </button>
      <div className="menu-separator" role="separator" />
      <span className="codeDockCodeToNodeGraphSectionLabel">{t(LangId.CodeToolsSectionCodeToNewGraph)}</span>
      <button className="menu-option" type="button" onClick={() => openCodeToNewGraphDialog()}>
        <span>{t(LangId.CodeToolsCodeToNewGraph)}</span>
      </button>
      <div className="menu-separator" role="separator" />
      <span className="codeDockCodeToNodeGraphSectionLabel">{t(LangId.CodeToolsSectionCodeToBlock)}</span>
      <button
        className="menu-option"
        type="button"
        onClick={() => void nodeActions.onCodeToNodeBlock?.()}
      >
        <span>{t(LangId.CodeToolsCodeToBlock)}</span>
      </button>
      <button
        className="menu-option"
        type="button"
        onClick={() => void nodeActions.onCodeBuildBlock?.()}
      >
        <span>{t(LangId.CodeToolsCodeBuildBlock)}</span>
      </button>
    </>
  ) : null

  const shellSizing: CSSProperties = floatingActive
    ? {
        boxSizing: 'border-box',
        height: '100%',
        maxWidth: 'none',
        width: '100%',
      }
    : {
        boxSizing: 'border-box',
        height: '100%',
        width: dockedWidth,
      }

  const shellClassNames = floatingActive ? `${styles.shell} ${styles.shellFloating}` : styles.shell

  const aside = (
    <aside
      aria-label={t(LangId.CodeAriaEditor)}
      className={shellClassNames}
      data-code-dock-editor-root=""
      {...{ [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_CODE_DOCK }}
      ref={shellRef}
      style={shellSizing}
    >
      {!floatingActive ? (
        <button
          aria-label={t(LangId.CodeAriaResizeDockWidth)}
          className={styles.resizeDockWidth}
          onPointerDown={beginDockWidthResize}
          type="button"
        />
      ) : (
        <>
          <button
            aria-label={t(LangId.CodeAriaResizeWidth)}
            className={styles.resizeE}
            onPointerDown={(e) => startFloatResize('e', e)}
            type="button"
          />
          <button
            aria-label={t(LangId.CodeAriaResizeHeight)}
            className={styles.resizeS}
            onPointerDown={(e) => startFloatResize('s', e)}
            type="button"
          />
          <button
            aria-label={t(LangId.CodeAriaResizeBoth)}
            className={styles.resizeSE}
            onPointerDown={(e) => startFloatResize('se', e)}
            type="button"
          />
        </>
      )}

      <div
        className={[
          'codeDockJadeScope',
          styles.menuBarDragShell,
          floatingActive ? styles.menuBarDragShellFloating : '',
          floatDragging ? styles.menuBarDragShellDragging : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onPointerDownCapture={floatingActive ? beginFloatMovePending : undefined}
        title={floatingActive ? t(LangId.CodeTitleDragWindow) : undefined}
      >
        <MenuBar
          labels={menuBarLabels}
          extraMenus={bridgeExtraMenus}
          findActive={jade.findActive}
          interactionsDisabled={floatingActive && floatDragging}
          generalEditActive={jade.generalEditActive}
          openFileDisabled={fileBridge?.openFileDisabled}
          particleDisabled={jade.particleDisabled}
          particlePanelActive={jade.particlePanelActive}
          recentFiles={fileBridge?.recentFiles}
          replaceActive={jade.replaceActive}
          toolsExtraContent={nodeGraphTools}
          hideThemesInTools
          optionsMenuContent={
            <JadeMenuBarOptionsMenu
              onOpenJadeThemes={() => jade.setShowThemes(true)}
              onOpenNativeThemes={() => jade.setShowNativeThemes(true)}
            />
          }
          onAbout={() => jade.setShowAbout(true)}
          onCompareFiles={jade.handleCompareFiles}
          onCopy={jade.handleCopy}
          onCut={jade.handleCut}
          onExit={onClose}
          onFind={jade.handleFind}
          onGeneralEdit={jade.handleGeneralEdit}
          onMaterialLibrary={jade.handleMaterialLibrary}
          onNewFile={() => fileBridge?.onNewFile?.()}
          onOpenFile={() => fileBridge?.onOpenFile?.()}
          onOpenLog={() => fileBridge?.onOpenLog?.() ?? jade.showTauriToast()}
          onOpenRecentFile={fileBridge?.onOpenRecentFile}
          onPaste={jade.handlePaste}
          onParticlePanel={jade.handleParticlePanel}
          onPreferences={() => jade.setShowPreferences(true)}
          onRedo={jade.handleRedo}
          onReplace={jade.handleReplace}
          onSaveFile={() => fileBridge?.onSaveFile?.()}
          onSaveFileAs={() => fileBridge?.onSaveFileAs?.()}
          onSelectAll={jade.handleSelectAll}
          onSettings={() => jade.setShowSettings(true)}
          onThemes={() => jade.setShowThemes(true)}
          onUndo={jade.handleUndo}
        />
      </div>

      <header className={styles.header}>
        <div className={styles.headerTitle}>
          <EditorDockFavicon kind="code" />
        </div>
        <EditorWindowHeaderChrome>
          <EditorWindowHeaderChromeIconButton
            active={!headerActionsCollapsed}
            aria-expanded={!headerActionsCollapsed}
            aria-label={
              headerActionsCollapsed ? t(LangId.GraphToolbarExpand) : t(LangId.GraphToolbarCollapse)
            }
            onClick={(event) => {
              event.stopPropagation()
              setHeaderActionsCollapsed((previous) => !previous)
            }}
            title={
              headerActionsCollapsed ? t(LangId.GraphToolbarExpand) : t(LangId.GraphToolbarCollapse)
            }
          />
          {!headerActionsCollapsed ? (
            <>
              <EditorWindowHeaderChromeButton
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleFloating()
                }}
                title={floatingActive ? t(LangId.CodeTitleDock) : t(LangId.CodeTitleUndock)}
              >
                {floatingActive ? t(LangId.CodeBtnDock) : t(LangId.CodeBtnUndock)}
              </EditorWindowHeaderChromeButton>
              {floatingActive ? (
                <EditorWindowHeaderChromeButton
                  onClick={(e) => {
                    e.stopPropagation()
                    onResetFloatingDimensions()
                  }}
                  title={t(LangId.CodeTitleResetDimensions)}
                >
                  {t(LangId.CodeBtnResetDimensions)}
                </EditorWindowHeaderChromeButton>
              ) : null}
              <EditorWindowHeaderChromeButton
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
              >
                {t(LangId.CodeBtnClose)}
              </EditorWindowHeaderChromeButton>
            </>
          ) : null}
        </EditorWindowHeaderChrome>
        <div className={styles.headerMain}>
          <CodeDockTabBar
            onActivate={onActivateTab}
            onClose={onCloseTab}
            onNewTab={onNewTab}
            onTabAction={onTabAction}
            tabs={tabs}
          />
        </div>
      </header>
      {deleteDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>{t(LangId.CodeDeleteDialogTitle)}</p>
            {deleteListError ? (
              <p className={styles.dialogHint}>{deleteListError}</p>
            ) : deleteChoices.length === 0 ? (
              <p className={styles.dialogHint}>{t(LangId.CodeDeleteDialogEmpty)}</p>
            ) : (
              <>
                <label className={styles.dialogField}>
                  {t(LangId.CodeFieldFolder)}
                  <select
                    className={styles.dialogSelect}
                    onChange={(e) => setDeleteSelected(e.target.value)}
                    value={deleteSelected || deleteChoices[0]}
                  >
                    {deleteChoices.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.dialogHint}>A pasta «default» nunca aparece aqui.</p>
              </>
            )}
            <div className={styles.dialogActions}>
              <button className={styles.headerGhostButton} onClick={closeDeleteDialog} type="button">
                {t(LangId.CodeBtnCancel)}
              </button>
              <button
                className={styles.dialogDanger}
                disabled={deleteBusy || deleteChoices.length === 0 || !deleteSelected}
                onClick={() => void confirmDeleteFolder()}
                type="button"
              >
                {deleteBusy ? t(LangId.CodeDeleteBusy) : t(LangId.CodeDeleteConfirm)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {nomeDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>{t(LangId.CodeNomenclatureDialogTitle)}</p>
            {nomeListError ? (
              <p className={styles.dialogHint}>{nomeListError}</p>
            ) : nomeChoices.length === 0 ? (
              <p className={styles.dialogHint}>Nenhuma pasta pack (além da default).</p>
            ) : (
              <>
                <label className={styles.dialogField}>
                  {t(LangId.CodeFieldPackFolder)}
                  <select
                    className={styles.dialogSelect}
                    onChange={(e) => setNomeSelected(e.target.value)}
                    value={nomeSelected || nomeChoices[0]}
                  >
                    {nomeChoices.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.dialogHint}>
                  Usa o texto do painel Código (VFX Jade) para preencher <code>group</code> e{' '}
                  <code>collection</code> nos JSON do pack em memória; em dev gravam-se de novo no disco.
                </p>
              </>
            )}
            <div className={styles.dialogActions}>
              <button className={styles.headerGhostButton} onClick={closeNomeDialog} type="button">
                {t(LangId.CodeBtnCancel)}
              </button>
              <button
                className={styles.headerGhostButton}
                disabled={nomeBusy || nomeChoices.length === 0 || !nomeSelected}
                onClick={() => void confirmApplyNome()}
                type="button"
              >
                {nomeBusy ? t(LangId.CodeNomenclatureBusy) : t(LangId.CodeNomenclatureApply)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {codeToGraphDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>{t(LangId.CodeCodeToGraphDialogTitle)}</p>
            {codeToGraphListError ? (
              <p className={styles.dialogHint}>{codeToGraphListError}</p>
            ) : codeToGraphChoices.length === 0 ? (
              <p className={styles.dialogHint}>
                Nenhum pack disponível. Converte ritual para um pack ou activa Nodes → Configurar para
                incluir «default».
              </p>
            ) : (
              <>
                <label className={styles.dialogField}>
                  {t(LangId.CodeFieldPackFolder)}
                  <select
                    className={styles.dialogSelect}
                    onChange={(e) => setCodeToGraphSelected(e.target.value)}
                    value={codeToGraphSelected || codeToGraphChoices[0]}
                  >
                    {codeToGraphChoices.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.dialogHint}>
                  Gera a cena a partir do ritual Class Group (raiz main), com ligações sem fio e um nó
                  por estrutura. Só entram parâmetros definidos no código — sem defaults do pack JSON. A
                  aba de cena usa o nome do ficheiro de código.
                </p>
              </>
            )}
            <div className={styles.dialogActions}>
              <button className={styles.headerGhostButton} onClick={closeCodeToGraphDialog} type="button">
                {t(LangId.CodeBtnCancel)}
              </button>
              {nodeActions?.onCodeToNodeGraphStepByStep ? (
                <button
                  className={styles.headerGhostButton}
                  disabled={codeToGraphBusy || codeToGraphChoices.length === 0 || !codeToGraphSelected}
                  onClick={() => void confirmCodeToNodeGraphStepByStep()}
                  type="button"
                >
                  {codeToGraphBusy ? t(LangId.CodeNomenclatureBusy) : t(LangId.CodeCodeToGraphStep)}
                </button>
              ) : null}
              <button
                className={styles.headerGhostButton}
                disabled={codeToGraphBusy || codeToGraphChoices.length === 0 || !codeToGraphSelected}
                onClick={() => void confirmCodeToNodeGraph()}
                type="button"
              >
                {codeToGraphBusy ? t(LangId.CodeNomenclatureBusy) : t(LangId.CodeCodeToGraphGenerate)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {codeToNewGraphDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>{t(LangId.CodeCodeToNewGraphDialogTitle)}</p>
            {codeToNewGraphError ? <p className={styles.dialogHint}>{codeToNewGraphError}</p> : null}
            <label className={styles.dialogField}>
              Nome da pasta (novo pack)
              <input
                className={styles.dialogSelect}
                onChange={(e) => setCodeToNewGraphFolder(e.target.value)}
                placeholder="ex.: meu-pack"
                type="text"
                value={codeToNewGraphFolder}
              />
            </label>
            <p className={styles.dialogHint}>
              Cria schemas em <code>nodeStructures/&lt;nome&gt;/</code> a partir do ritual e gera a cena
              com instâncias (elementos → valores → estruturas internas). Não usa um pack existente.
            </p>
            {codeToNewGraphProgress ? (
              <div className={styles.dialogProgress}>
                <p className={styles.dialogProgressMeta}>{codeToNewGraphProgress.label}</p>
                <div
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={Math.round(codeToNewGraphProgress.ratio * 100)}
                  className={styles.dialogProgressBar}
                  role="progressbar"
                >
                  <div
                    className={styles.dialogProgressFill}
                    style={{ width: `${String(Math.round(codeToNewGraphProgress.ratio * 100))}%` }}
                  />
                </div>
              </div>
            ) : null}
            <div className={styles.dialogActions}>
              <button className={styles.headerGhostButton} onClick={closeCodeToNewGraphDialog} type="button">
                {t(LangId.CodeBtnCancel)}
              </button>
              {nodeActions?.onCodeToNewNodeGraphStepByStep ? (
                <button
                  className={styles.headerGhostButton}
                disabled={
                  codeToNewGraphBusy || codeToNewGraphProgress !== null || !codeToNewGraphFolder.trim()
                }
                onClick={() => void confirmCodeToNewNodeGraphStepByStep()}
                type="button"
              >
                {codeToNewGraphBusy ? t(LangId.CodeNomenclatureBusy) : t(LangId.CodeCodeToGraphStep)}
              </button>
              ) : null}
              <button
                className={styles.headerGhostButton}
                disabled={
                  codeToNewGraphBusy || codeToNewGraphProgress !== null || !codeToNewGraphFolder.trim()
                }
                onClick={() => void confirmCodeToNewNodeGraph()}
                type="button"
              >
                {codeToNewGraphProgress?.label ??
                  (codeToNewGraphBusy ? t(LangId.CodeNomenclatureBusy) : t(LangId.CodeCodeToNewGraphGenerate))}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {extractDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>{t(LangId.CodeExtractDialogTitle)}</p>
            {extractListError ? (
              <p className={styles.dialogHint}>{extractListError}</p>
            ) : extractChoices.length === 0 ? (
              <p className={styles.dialogHint}>
                Nenhum pack disponível. Com Nodes → Configurar activo, converte para a pasta «default» ou
                outra.
              </p>
            ) : (
              <>
                <label className={styles.dialogField}>
                  {t(LangId.CodeFieldPackFolder)}
                  <select
                    className={styles.dialogSelect}
                    onChange={(e) => setExtractSelected(e.target.value)}
                    value={extractSelected || extractChoices[0]}
                  >
                    {extractChoices.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </label>
                <p className={styles.dialogHint}>
                  Cria <code>temp/parameters_list.json</code> e, em subpastas <code>{'{pack}_{collectionType}'}</code>,
                  um JSON por parâmetro (<code>{'{tipo}_{nome}'}</code>) e por LIST_EMBED (
                  <code>{'{tipo}_listEmbed_{campo}'}</code>) — só com <code>npm run dev</code>.
                </p>
              </>
            )}
            <div className={styles.dialogActions}>
              <button className={styles.headerGhostButton} onClick={closeExtractDialog} type="button">
                {t(LangId.CodeBtnCancel)}
              </button>
              <button
                className={styles.headerGhostButton}
                disabled={extractBusy || extractChoices.length === 0 || !extractSelected}
                onClick={() => void confirmExtractNodeBase()}
                type="button"
              >
                {extractBusy ? t(LangId.CodeNomenclatureBusy) : t(LangId.CodeExtractConfirm)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className={`${styles.editorHost} codeDockJadeScope ngl-code-editor-bg-host`}>
        {tabs.length === 0 ? (
          <p className={styles.emptyEditor}>
            {t(LangId.CodeEmptyEditor)}
          </p>
        ) : !monacoLoaderReady ? (
          <span className={styles.loading}>{t(LangId.CodeEditorLoading)}</span>
        ) : (
          <Editor
            key={activeTabId}
            beforeMount={jade.handleBeforeMount}
            defaultLanguage={editorLanguage}
            height="100%"
            loading={<span className={styles.loading}>{t(LangId.CodeEditorLoading)}</span>}
            onChange={(next) => onChange(next ?? '')}
            onMount={jade.handleMount}
            options={jade.monacoOptions}
            path={monacoModelPath}
            theme={jade.editorTheme}
            value={value}
          />
        )}
      </div>

      <CodeDockJadeDialogs
        editor={jade}
        neekoSendTarget={neekoSendTarget}
        onSendCodeToNeeko={onSendCodeToNeeko}
        onReplaceValueToGraph={onReplaceValueToGraph}
        primarySelectedNodeId={primarySelectedNodeId}
        value={value}
      />
    </aside>
  )

  if (!floatingActive) {
    return <div className={`${styles.outer} ${styles.outerStretch}`}>{aside}</div>
  }

  const floatingChrome = (
    <div
      className={styles.floatingChrome}
      style={{
        boxSizing: 'border-box',
        height: floatingRect.height,
        left: floatingRect.left,
        top: floatingRect.top,
        width: floatingRect.width,
      }}
    >
      {aside}
    </div>
  )

  return createPortal(floatingChrome, document.body)
}
