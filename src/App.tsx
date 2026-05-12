import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent } from 'react'

import { ConsoleNotificationCapsule } from '@/components/molecules/ConsoleNotificationCapsule'
import { AppMenuBar } from '@/components/organisms/AppMenuBar'
import { CodeDock } from '@/components/organisms/CodeDock'
import {
  clampFloatingDockRect,
  createDefaultFloatingCodeDockRect,
} from '@/components/organisms/codeDockFloatingRect'
import { GraphCanvas } from '@/components/organisms/GraphCanvas'
import { NodeInspector } from '@/components/organisms/NodeInspector'
import { stubBinStructureDocument } from '@/core/binImportStub'
import { convertBinViaOptionalBridge } from '@/core/jadeBinBridge'
import { binTreeJsonToCanvasScene } from '@/core/ltkBinTreeScene'
import { getStoredRitobinExePath } from '@/core/ritobinExePreference'
import { convertBinViaRitobinExeBridge } from '@/core/ritobinInvokeBridge'
import { convertRitualTextToNodeSchemas } from '@/core/convertRitualTextToNodeStructures'
import { hydrateScene, schemaPackFolderBySchemaId, schemaRegistry } from '@/core/canvasScene'
import {
  dynamicPackFolderMap,
  dynamicPacksSchemaRecord,
  loadDynamicStructurePacksFromStorage,
  sanitizeStructurePackFolderName,
  saveDynamicStructurePacksToStorage,
} from '@/core/nodeStructurePackStorage'
import { parseSceneDocument, serializeScene } from '@/core/leagueBinScene'
import { flattenEntityTemplates, flattenParameterTemplates } from '@/core/schemaCatalog'
import { STORAGE_LAST_STRUCTURE_META, triggerJsonDownload } from '@/core/workspaceStorage'
import {
  ROOT_NODE_ID,
  isCanvasScene,
  useSceneHistory,
} from '@/hooks/useSceneHistory'

import styles from './App.module.css'

/** Notificação de teste ao carregar a app (cápsula consola / 3s). */
const BOOT_CONSOLE_TEST_MESSAGE = 'Teste, console de notificação funcionado.'
const BOOT_CONSOLE_TEST_SECONDS = 3

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
  const graphColumnRef = useRef<HTMLDivElement | null>(null)

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

  const {
    cycleConnectionRouting,
    redoScene,
    resetScene,
    sceneHistory,
    moveNode,
    connectNodes,
    removeConnection,
    createChildNode,
    createRootNode,
    deleteSelectedNodes,
    updateSelectedParameter,
    commitMarqueeSelection,
    undoScene,
    scene,
    selectedNodeIds,
    primarySelectedId,
    selectNode,
    selectAllNodes,
    clearSelection,
    replaceScene,
    addDynamicEntitySlot,
    addDynamicParameter,
  } = useSceneHistory({ extendSchemaLookup })

  const availableSchemas = useMemo(() => Object.values(extendSchemaLookup), [extendSchemaLookup])
  const parameterCatalog = useMemo(
    () => flattenParameterTemplates(availableSchemas),
    [availableSchemas],
  )
  const entityCatalog = useMemo(() => flattenEntityTemplates(availableSchemas), [availableSchemas])

  const [inspectorMinimized, setInspectorMinimized] = useState(false)
  const [inspectorOffset, setInspectorOffset] = useState<InspectorOffset>({ x: 0, y: 0 })
  const [inspectorViewportDocked, setInspectorViewportDocked] = useState(true)
  const [inspectorGrabFollowActive, setInspectorGrabFollowActive] = useState(false)
  const [inspectorGrabFollowCoords, setInspectorGrabFollowCoords] = useState({ x: 0, y: 0 })
  const [codeDockOpen, setCodeDockOpen] = useState(false)
  const [codeDockWidth, setCodeDockWidth] = useState(360)
  const [codeDockFloating, setCodeDockFloating] = useState(false)
  const [codeDockFloatingRect, setCodeDockFloatingRect] = useState(() =>
    clampFloatingDockRect(createDefaultFloatingCodeDockRect()),
  )
  const [codeText, setCodeText] = useState('// Stub do editor League-Bin\n// Sincronização bidirecional chega na fase E.\n')
  const [paletteSignal, setPaletteSignal] = useState(0)
  const [tooltipHints, setTooltipHints] = useState<TooltipDictionary>({})
  const [bootConsoleTestStamp, setBootConsoleTestStamp] = useState<number | null>(() => Date.now())

  const dismissBootConsoleTest = useCallback(() => {
    setBootConsoleTestStamp(null)
  }, [])

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

  const handleConvertRitualToNodeStructures = useCallback(async () => {
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

    const converted = convertRitualTextToNodeSchemas(codeText)

    if ('error' in converted) {
      window.alert(converted.error)
      return
    }

    setDynamicStructurePacks((previous) => {
      const next = previous.filter((pack) => pack.folder !== folder)
      next.push({ folder, schemas: converted.schemas })
      saveDynamicStructurePacksToStorage(next)
      return next
    })

    let diskLine = ''

    if (import.meta.env.DEV) {
      try {
        const res = await fetch('/api/node-structures-write', {
          body: JSON.stringify({ folder, schemas: converted.schemas }),
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
      converted.warnings.length > 0
        ? `\n\nNotas:\n${converted.warnings.slice(0, 15).join('\n')}${converted.warnings.length > 15 ? '\n…' : ''}`
        : ''

    window.alert(
      `Pack «${folder}» · ${String(converted.schemas.length)} tipo(s) na paleta (📂 [${folder}]).${diskLine}${warnPreview}`,
    )
  }, [codeText])

  const listDeletableStructureFolders = useCallback(async () => {
    const unique = new Set<string>()

    for (const pack of dynamicStructurePacks) {
      if (pack.folder !== 'default') {
        unique.add(pack.folder)
      }
    }

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
            for (const entry of folders) {
              const name = String(entry).trim()

              if (name && name !== 'default') {
                unique.add(name)
              }
            }
          }
        }
      } catch {
        /** ignorar falha da API — mantém só pastas dos packs dinâmicos */
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
  }

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

  const inspectorDockClassName = [
    styles.inspectorDock,
    inspectorMinimized ? styles.inspectorDockMinimized : styles.inspectorDockExpanded,
  ]
    .filter(Boolean)
    .join(' ')

  const inspectorDockStyle = {
    transform: `translate(${inspectorOffset.x}px, ${inspectorOffset.y}px)`,
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
      if (isEditableTarget(event.target)) {
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

        event.preventDefault()
        deleteSelectedNodes()
      }
    }

    window.addEventListener('keydown', handleKeyboardShortcut)

    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcut)
    }
  }, [
    deleteSelectedNodes,
    primarySelectedId,
    redoScene,
    selectedNodeIds,
    undoScene,
  ])

  const inspectorTarget =
    selectedNodeIds.length > 0 && primarySelectedId
      ? scene.nodes.find((node) => node.id === primarySelectedId)
      : undefined

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
        <AppMenuBar
          onDeleteSelection={() => deleteSelectedNodes()}
          onExportGraph={handleExportGraph}
          onImportGraph={handleImportWorkspaceFile}
          onOpenStubBin={handleStubPipeline}
          onRequestAddNode={requestPalette}
          onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
        />
        <p className={styles.empty}>Nenhum nó disponível. Use File → Stub .bin ou add node.</p>
      </main>
    )
  }

  const showInspectorPinnedToToolbar = inspectorViewportDocked && !inspectorGrabFollowActive
  const inspectorDockShowsSidebar = !inspectorGrabFollowActive && !showInspectorPinnedToToolbar
  const inspectorCanDelete =
    selectedNodeIds.length > 0 &&
    !(
      selectedNodeIds.length === 1 &&
      selectedNodeIds[0] === ROOT_NODE_ID &&
      primarySelectedId === ROOT_NODE_ID
    )
  const inspectorDragHandleProps = {
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
      <AppMenuBar
        onDeleteSelection={() => deleteSelectedNodes()}
        onExportGraph={handleExportGraph}
        onImportGraph={handleImportWorkspaceFile}
        onOpenStubBin={handleStubPipeline}
        onRequestAddNode={requestPalette}
        onToggleCodeDock={() => setCodeDockOpen((isOpen) => !isOpen)}
      />

      <div className={styles.workspace} data-workspace>
        <div className={styles.graphColumn} ref={graphColumnRef}>
          <GraphCanvas
            availableSchemas={availableSchemas}
            canRedo={sceneHistory.future.length > 0}
            canUndo={sceneHistory.past.length > 0}
            entityCatalog={entityCatalog}
            hints={tooltipHints}
            onCatalogEntityAppend={(canvasNodeId, entity) => addDynamicEntitySlot(canvasNodeId, entity)}
            onCatalogParameterAppend={(canvasNodeId, definition) =>
              addDynamicParameter(canvasNodeId, definition)
            }
            onCloseCodePanelShortcut={handleCloseCodeDock}
            onConnectNodes={connectNodes}
            onCreateChildNode={createChildNode}
            onCreateRootNode={createRootNode}
            onCycleConnectionRouting={cycleConnectionRouting}
            onMarqueeCommit={commitMarqueeSelection}
            onMoveNode={moveNode}
            onRedo={redoScene}
            onRemoveConnection={removeConnection}
            onResetScene={resetScene}
            onClearSelection={clearSelection}
            onSelectAllNodesShortcut={selectAllNodes}
            onSelectNode={(nodeId, options) => selectNode(nodeId, options)}
            onUndo={undoScene}
            parameterCatalog={parameterCatalog}
            paletteRequestSignal={paletteSignal}
            scene={scene}
            schemaPackFolderBySchemaId={mergedPackFolderBySchemaId}
            selectedNodeId={primarySelectedId}
            selectedNodeIds={selectedNodeIds}
            viewportControlsSlot={
              showInspectorPinnedToToolbar ? (
                <NodeInspector
                  {...inspectorPickHandlers}
                  canDelete={inspectorCanDelete}
                  dragHandleProps={inspectorDragHandleProps}
                  minimized={inspectorMinimized}
                  node={inspectorTarget}
                  onDelete={() => deleteSelectedNodes()}
                  onToggleMinimized={toggleInspectorMinimized}
                  onUpdateParameter={updateSelectedParameter}
                  viewportDocked
                />
              ) : null
            }
          />
          {inspectorDockShowsSidebar ? (
            <div className={inspectorDockClassName} style={inspectorDockStyle}>
              <NodeInspector
                {...inspectorPickHandlers}
                canDelete={inspectorCanDelete}
                dragHandleProps={inspectorDragHandleProps}
                minimized={inspectorMinimized}
                node={inspectorTarget}
                onDelete={() => deleteSelectedNodes()}
                onToggleMinimized={toggleInspectorMinimized}
                onUpdateParameter={updateSelectedParameter}
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
                node={inspectorTarget}
                onDelete={() => deleteSelectedNodes()}
                onToggleMinimized={toggleInspectorMinimized}
                onUpdateParameter={updateSelectedParameter}
              />
            </div>
          ) : null}
        </div>

        {codeDockOpen ? (
          <div className={codeDockFloating ? styles.codeDockPortalSlot : styles.codeDockColumn}>
            <CodeDock
              dockedWidth={codeDockWidth}
              floatingActive={codeDockFloating}
              floatingRect={codeDockFloatingRect}
              nodeActions={{
                deleteFolder: deleteNodeStructurePackFolder,
                listDeletableFolders: listDeletableStructureFolders,
                onConvert: handleConvertRitualToNodeStructures,
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
