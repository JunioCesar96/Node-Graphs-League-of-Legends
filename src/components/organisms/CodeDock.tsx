import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import Editor, { type Monaco } from '@monaco-editor/react'
import type * as MonacoType from 'monaco-editor'

import {
  setupRitobinMonacoBeforeMount,
  updateRitobinSyntaxMarkers,
  RITOBIN_LANGUAGE_ID,
  RITOBIN_THEME_ID,
} from '@/monaco/ritobinEditorSetup'

import { clampFloatingDockRect, type CodeDockFloatingRect } from './codeDockFloatingRect'

import '@/monaco/jade-syntax-globals.css'

import styles from './CodeDock.module.css'

export type { CodeDockFloatingRect } from './codeDockFloatingRect'
export { clampFloatingDockRect, createDefaultFloatingCodeDockRect } from './codeDockFloatingRect'

export type CodeDockFloatingResizeCorner = 'e' | 's' | 'se'

export type CodeDockNodeActions = {
  onConvertClassGroup: () => void | Promise<void>
  /** Particle Editor Jade — só `… = VfxSystemDefinitionData {`. */
  onConvertJadeFxEditor: () => void | Promise<void>
  /** Pastas em `src/nodeStructures/` (exceto `default`) — eliminar pack */
  listDeletableFolders: () => Promise<string[]>
  /** Igual à lista de packs; usado por «Extrair Node Base». */
  listStructurePackFolders: () => Promise<string[]>
  onExtractNodeBase: (folder: string) => boolean | Promise<boolean>
  deleteFolder: (folder: string) => Promise<{ ok: boolean; error?: string; notice?: string }>
}

type FloatingDragPhase =
  | null
  | { kind: 'move'; sx: number; sy: number; rx: number; ry: number }
  | { kind: 'east'; sx: number; rw: number }
  | { kind: 'south'; sy: number; rh: number }
  | { kind: 'southEast'; sx: number; sy: number; rw: number; rh: number }

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
  value: string
}

const MIN_DOCK_WIDTH = 260
const MAX_DOCK_WIDTH = 760
const DEBOUNCE_MS = 220
const MODEL_PATH = '/workspace/opened.bin'

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
  value,
}: CodeDockProps) {
  const [converterMenuOpen, setConverterMenuOpen] = useState(false)
  const converterMenuRef = useRef<HTMLDivElement | null>(null)
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

  const dragPhaseRef = useRef<FloatingDragPhase>(null)
  const dockedResizePhaseRef = useRef(false)

  /** Evita ler `floatingRect` em closure obsoleta durante drag. */
  const floatingRectRef = useRef(floatingRect)
  floatingRectRef.current = floatingRect

  const shellRef = useRef<HTMLElement | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null)
  const decorationIdsRef = useRef<string[]>([])
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentDisposableRef = useRef<MonacoType.IDisposable | null>(null)

  const applyFloatingRect = useCallback(
    (incoming: CodeDockFloatingRect) => {
      onFloatingRectChange(clampFloatingDockRect(incoming))
    },
    [onFloatingRectChange],
  )

  /** Arrastar e redimensionar janela flutuante */
  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const phase = dragPhaseRef.current
      if (!phase || !floatingActive) {
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
      dragPhaseRef.current = null
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointercancel', stopFloatingDrag)
    window.addEventListener('pointerup', stopFloatingDrag)

    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointercancel', stopFloatingDrag)
      window.removeEventListener('pointerup', stopFloatingDrag)
    }
  }, [applyFloatingRect, floatingActive])

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

  const closeConverterMenu = useCallback(() => {
    setConverterMenuOpen(false)
  }, [])

  useEffect(() => {
    if (!converterMenuOpen) {
      return
    }

    const onDocMouseDown = (event: MouseEvent) => {
      const el = converterMenuRef.current
      if (el && !el.contains(event.target as Node)) {
        setConverterMenuOpen(false)
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setConverterMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [converterMenuOpen])

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
        window.alert(outcome.error ?? 'Não foi possível eliminar.')
        return
      }
      if (outcome.notice) {
        window.alert(outcome.notice)
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

  const beginDockWidthResize = useCallback((event: ReactPointerEvent) => {
    event.preventDefault()
    dockedResizePhaseRef.current = true
  }, [])

  const startFloatMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!floatingActive) {
      return
    }
    event.preventDefault()
    const r = floatingRectRef.current
    dragPhaseRef.current = {
      kind: 'move',
      rx: r.left,
      ry: r.top,
      sx: event.clientX,
      sy: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [floatingActive])

  const startFloatResize = useCallback(
    (corner: CodeDockFloatingResizeCorner, event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!floatingActive) {
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
    [floatingActive],
  )

  const runSyntaxPass = useCallback(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor) {
      return
    }
    updateRitobinSyntaxMarkers(monaco, editor, decorationIdsRef)
  }, [])

  const scheduleSyntaxPass = useCallback(() => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current)
    }
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      runSyntaxPass()
    }, DEBOUNCE_MS)
  }, [runSyntaxPass])

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monacoRef.current = monaco
    setupRitobinMonacoBeforeMount(monaco)
  }, [])

  const handleMount = useCallback(
    (editor: MonacoType.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco
      decorationIdsRef.current = []

      contentDisposableRef.current?.dispose()
      const model = editor.getModel()
      if (model) {
        contentDisposableRef.current = model.onDidChangeContent(() => {
          scheduleSyntaxPass()
        })
      }

      runSyntaxPass()
    },
    [runSyntaxPass, scheduleSyntaxPass],
  )

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current)
      }
      contentDisposableRef.current?.dispose()
      contentDisposableRef.current = null
      editorRef.current = null
      monacoRef.current = null
    }
  }, [])

  useEffect(() => {
    scheduleSyntaxPass()
  }, [scheduleSyntaxPass, value])

  useEffect(() => {
    editorRef.current?.layout()
    const id = window.setTimeout(() => editorRef.current?.layout(), 72)
    return () => window.clearTimeout(id)
  }, [floatingActive, dockedWidth, floatingRect.height, floatingRect.width])

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
    <aside aria-label="Editor ritual (Monaco Jade)" className={shellClassNames} ref={shellRef} style={shellSizing}>
      {!floatingActive ? (
        <button
          aria-label="Redimensionar largura do painel"
          className={styles.resizeDockWidth}
          onPointerDown={beginDockWidthResize}
          type="button"
        />
      ) : (
        <>
          <button
            aria-label="Redimensionar largura"
            className={styles.resizeE}
            onPointerDown={(e) => startFloatResize('e', e)}
            type="button"
          />
          <button
            aria-label="Redimensionar altura"
            className={styles.resizeS}
            onPointerDown={(e) => startFloatResize('s', e)}
            type="button"
          />
          <button
            aria-label="Redimensionar largura e altura"
            className={styles.resizeSE}
            onPointerDown={(e) => startFloatResize('se', e)}
            type="button"
          />
        </>
      )}

      <header className={styles.header}>
        <div
          className={floatingActive ? `${styles.titleStrip} ${styles.titleStripFloating}` : styles.titleStrip}
          onPointerDown={startFloatMove}
          title={floatingActive ? 'Arrastar janela' : undefined}
        >
          código ritual (Monaco / Jade)
        </div>
        <div className={styles.headerActions}>
          {nodeActions ? (
            <div className={styles.nodeToolbar} role="group" aria-label="Acções pack nodeStructures">
              <span className={styles.nodeToolbarLabel}>node</span>
              <div className={styles.converterDropdown} ref={converterMenuRef}>
                <button
                  aria-expanded={converterMenuOpen}
                  aria-haspopup="true"
                  className={styles.headerGhostButton}
                  onClick={(e) => {
                    e.stopPropagation()
                    setConverterMenuOpen((previous) => !previous)
                  }}
                  type="button"
                  title="Converter ritual → paleta ou eliminar packs"
                >
                  Converter ▾
                </button>
                {converterMenuOpen ? (
                  <ul className={styles.converterSubmenu} role="menu">
                    <li role="presentation">
                      <button
                        className={styles.converterMenuItem}
                        role="menuitem"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeConverterMenu()
                          void nodeActions.onConvertJadeFxEditor()
                        }}
                      >
                        Converter [Jade fx_editor]
                      </button>
                    </li>
                    <li role="presentation">
                      <button
                        className={styles.converterMenuItem}
                        role="menuitem"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeConverterMenu()
                          void nodeActions.onConvertClassGroup()
                        }}
                      >
                        Converter [Class Group]
                      </button>
                    </li>
                    <li role="presentation">
                      <button
                        className={styles.converterMenuItem}
                        role="menuitem"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeConverterMenu()
                          void openExtractDialog()
                        }}
                      >
                        Extrair Node Base
                      </button>
                    </li>
                    <li aria-hidden className={styles.converterDivider} />
                    <li role="presentation">
                      <button
                        className={`${styles.converterMenuItem} ${styles.converterMenuItemDanger}`}
                        role="menuitem"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          closeConverterMenu()
                          void openDeleteDialog()
                        }}
                      >
                        Deletar
                      </button>
                    </li>
                  </ul>
                ) : null}
              </div>
            </div>
          ) : null}
          <button
            className={styles.headerGhostButton}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFloating()
            }}
            type="button"
            title={floatingActive ? 'Fixar na barra lateral' : 'Defixar — painel livre sobre tudo'}
          >
            {floatingActive ? 'Fixar' : 'Defixar'}
          </button>
          {floatingActive ? (
            <button
              className={styles.headerGhostButton}
              onClick={(e) => {
                e.stopPropagation()
                onResetFloatingDimensions()
              }}
              type="button"
              title="Repor dimensões e posição padrão"
            >
              Repor dimensões
            </button>
          ) : null}
          <button
            className={styles.close}
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            type="button"
          >
            fechar
          </button>
        </div>
      </header>
      {deleteDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>Eliminar pasta pack</p>
            {deleteListError ? (
              <p className={styles.dialogHint}>{deleteListError}</p>
            ) : deleteChoices.length === 0 ? (
              <p className={styles.dialogHint}>Nenhuma pasta para eliminar (além da default).</p>
            ) : (
              <>
                <label className={styles.dialogField}>
                  Pasta
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
                Cancelar
              </button>
              <button
                className={styles.dialogDanger}
                disabled={deleteBusy || deleteChoices.length === 0 || !deleteSelected}
                onClick={() => void confirmDeleteFolder()}
                type="button"
              >
                {deleteBusy ? 'A eliminar…' : 'Eliminar pasta'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {extractDialogOpen ? (
        <div aria-modal className={styles.dialogBackdrop} role="dialog">
          <div className={styles.dialogPanel}>
            <p className={styles.dialogTitle}>Extrair Node Base</p>
            {extractListError ? (
              <p className={styles.dialogHint}>{extractListError}</p>
            ) : extractChoices.length === 0 ? (
              <p className={styles.dialogHint}>Nenhuma pasta pack (além da default).</p>
            ) : (
              <>
                <label className={styles.dialogField}>
                  Pasta do pack
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
                  Cria <code>temp/parameters_list.json</code> e um JSON por parâmetro dentro de subpastas{' '}
                  <code>{'{pack}_{collectionType}'}</code> (apenas com <code>npm run dev</code>).
                </p>
              </>
            )}
            <div className={styles.dialogActions}>
              <button className={styles.headerGhostButton} onClick={closeExtractDialog} type="button">
                Cancelar
              </button>
              <button
                className={styles.headerGhostButton}
                disabled={extractBusy || extractChoices.length === 0 || !extractSelected}
                onClick={() => void confirmExtractNodeBase()}
                type="button"
              >
                {extractBusy ? 'A processar…' : 'Extrair'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className={styles.editorHost}>
        <Editor
          beforeMount={handleBeforeMount}
          defaultLanguage={RITOBIN_LANGUAGE_ID}
          height="100%"
          loading={<span className={styles.loading}>A carregar editor…</span>}
          onChange={(next) => onChange(next ?? '')}
          onMount={handleMount}
          options={{
            minimap: { enabled: true },
            glyphMargin: true,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontSize: 14,
            fixedOverflowWidgets: true,
            contextmenu: true,
            largeFileOptimizations: false,
            maxTokenizationLineLength: 100_000,
            folding: true,
            occurrencesHighlight: 'singleFile',
            wordWrap: 'off',
          }}
          path={MODEL_PATH}
          theme={RITOBIN_THEME_ID}
          value={value}
        />
      </div>
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
