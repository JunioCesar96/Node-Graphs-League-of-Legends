import { useCallback, useEffect, useRef, useState } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type * as MonacoType from 'monaco-editor'

import { getPreference } from '@jade/lib/preferenceStore'
import { registerRitobinTheme, RITOBIN_THEME_ID } from '@jade/lib/ritobinLanguage'
import { applyTheme } from '@jade/lib/themeApplicator'

import {
  setupRitobinMonacoBeforeMount,
  updateRitobinSyntaxMarkers,
} from '@/monaco/ritobinEditorSetup'

import {
  buildMonacoOptions,
  PERF_DEFAULTS,
  PERF_PREF_KEYS,
  type PerfKey,
  type PerfPrefs,
} from './buildMonacoOptions'

export type CodeDockCtxMenu = { x: number; y: number } | null

export function useCodeDockJadeEditor(value: string, onContentChange: (next: string) => void) {
  const editorRef = useRef<MonacoType.editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const decorationIdsRef = useRef<string[]>([])
  const emitterDecorationIdsRef = useRef<string[]>([])
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentDisposableRef = useRef<MonacoType.IDisposable | null>(null)
  const editorDisposablesRef = useRef<MonacoType.IDisposable[]>([])

  const emitterHintsEnabledRef = useRef(true)
  const syntaxCheckingEnabledRef = useRef(true)

  const [perfPrefs, setPerfPrefs] = useState<PerfPrefs>(PERF_DEFAULTS)
  const [lineCount, setLineCount] = useState(0)
  const [editorFontFamily, setEditorFontFamily] = useState('')
  const [editorTheme, setEditorTheme] = useState(RITOBIN_THEME_ID)

  const [findActive, setFindActive] = useState(false)
  const [replaceActive, setReplaceActive] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<CodeDockCtxMenu>(null)

  const [generalEditOpen, setGeneralEditOpen] = useState(false)
  const [particlePanelOpen, setParticlePanelOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showPreferences, setShowPreferences] = useState(false)
  const [showThemes, setShowThemes] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const [focused, setFocused] = useState(false)

  const monacoOptions = buildMonacoOptions(perfPrefs, lineCount, editorFontFamily || undefined)

  const loadPerfPrefs = useCallback(async () => {
    const next: PerfPrefs = { ...PERF_DEFAULTS }
    for (const key of Object.keys(PERF_PREF_KEYS) as PerfKey[]) {
      try {
        const raw = await getPreference(PERF_PREF_KEYS[key], PERF_DEFAULTS[key])
        if (raw === 'on' || raw === 'auto' || raw === 'off') {
          next[key] = raw
        }
      } catch {
        /* default */
      }
    }
    setPerfPrefs(next)
  }, [])

  const loadEditorPrefs = useCallback(async () => {
    emitterHintsEnabledRef.current =
      (await getPreference('EmitterNameHints', 'True')) !== 'False'
    syntaxCheckingEnabledRef.current =
      (await getPreference('SyntaxChecking', 'True')) !== 'False'
    const font = await getPreference('EditorFont', '')
    setEditorFontFamily(font)
  }, [])

  useEffect(() => {
    void loadPerfPrefs()
    void loadEditorPrefs()

    const onPerf = (e: Event) => {
      const detail = (e as CustomEvent<{ key: PerfKey; mode: PerfPrefs[PerfKey] }>).detail
      if (!detail) return
      setPerfPrefs((prev) => ({ ...prev, [detail.key]: detail.mode }))
    }
    window.addEventListener('perf-pref-changed', onPerf)
    return () => window.removeEventListener('perf-pref-changed', onPerf)
  }, [loadPerfPrefs, loadEditorPrefs])

  const updateEmitterNameDecorations = useCallback(
    (editor: MonacoType.editor.IStandaloneCodeEditor) => {
      const model = editor.getModel()
      if (!model || model.isDisposed()) return

      if (!emitterHintsEnabledRef.current) {
        emitterDecorationIdsRef.current = model.deltaDecorations(emitterDecorationIdsRef.current, [])
        const styleEl = document.getElementById('code-dock-emitter-hint-styles')
        if (styleEl) styleEl.textContent = ''
        return
      }

      const lines = model.getValue().split('\n')
      const decorations: MonacoType.editor.IModelDeltaDecoration[] = []
      const cssRules: string[] = []

      for (let i = 0; i < lines.length; i++) {
        if (!/VfxEmitterDefinitionData\s*\{/.test(lines[i])) continue

        let braceDepth = 0
        let emitterName = ''
        for (let j = i; j < Math.min(i + 80, lines.length); j++) {
          for (const c of lines[j]) {
            if (c === '{') braceDepth++
            else if (c === '}') braceDepth--
          }
          const nameMatch = lines[j].match(/emitterName:\s*string\s*=\s*"([^"]+)"/)
          if (nameMatch) {
            emitterName = nameMatch[1]
            break
          }
          if (braceDepth <= 0 && j > i) break
        }

        if (emitterName) {
          const lineNum = i + 1
          const className = `code-dock-emitter-hint-${lineNum}`
          const escaped = emitterName.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
          cssRules.push(
            `.${className}::after { content: "  // ${escaped}"; color: var(--syntax-comment-color, #6a9955); font-style: italic; opacity: 0.8; }`,
          )
          decorations.push({
            range: { startLineNumber: lineNum, startColumn: 1, endLineNumber: lineNum, endColumn: 1 },
            options: { afterContentClassName: className, isWholeLine: true },
          })
        }
      }

      let styleEl = document.getElementById('code-dock-emitter-hint-styles')
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = 'code-dock-emitter-hint-styles'
        document.head.appendChild(styleEl)
      }
      styleEl.textContent = cssRules.join('\n')
      emitterDecorationIdsRef.current = model.deltaDecorations(
        emitterDecorationIdsRef.current,
        decorations,
      )
    },
    [],
  )

  const runSyntaxPass = useCallback(() => {
    const monaco = monacoRef.current
    const editor = editorRef.current
    if (!monaco || !editor) return

    if (!syntaxCheckingEnabledRef.current) {
      const model = editor.getModel()
      if (model && !model.isDisposed()) {
        monaco.editor.setModelMarkers(model, 'syntax-checker', [])
        decorationIdsRef.current = model.deltaDecorations(decorationIdsRef.current, [])
      }
      return
    }

    updateRitobinSyntaxMarkers(monaco, editor, decorationIdsRef)
    updateEmitterNameDecorations(editor)
  }, [updateEmitterNameDecorations])

  const scheduleSyntaxPass = useCallback(() => {
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = window.setTimeout(() => {
      debounceTimerRef.current = null
      runSyntaxPass()
    }, 220)
  }, [runSyntaxPass])

  const syncLineCount = useCallback(() => {
    const model = editorRef.current?.getModel()
    if (model && !model.isDisposed()) {
      setLineCount(model.getLineCount())
    }
  }, [])

  const handleFind = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (findActive) {
      editor.trigger('keyboard', 'closeFindWidget', null)
      setFindActive(false)
    } else {
      setGeneralEditOpen(false)
      setParticlePanelOpen(false)
      editor.trigger('keyboard', 'actions.find', null)
      setFindActive(true)
      setReplaceActive(false)
    }
  }, [findActive])

  const handleReplace = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    if (replaceActive) {
      editor.trigger('keyboard', 'closeFindWidget', null)
      setReplaceActive(false)
    } else {
      setGeneralEditOpen(false)
      setParticlePanelOpen(false)
      editor.trigger('keyboard', 'editor.action.startFindReplaceAction', null)
      setReplaceActive(true)
      setFindActive(false)
    }
  }, [replaceActive])

  const handleUndo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'undo', null)
  }, [])

  const handleRedo = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'redo', null)
  }, [])

  const handleCut = useCallback(() => {
    editorRef.current?.focus()
    document.execCommand('cut')
  }, [])

  const handleCopy = useCallback(() => {
    editorRef.current?.focus()
    document.execCommand('copy')
  }, [])

  const handlePaste = useCallback(() => {
    editorRef.current?.focus()
    document.execCommand('paste')
  }, [])

  const handleSelectAll = useCallback(() => {
    editorRef.current?.trigger('keyboard', 'editor.action.selectAll', null)
  }, [])

  const setEmittersFolded = useCallback((collapse: boolean) => {
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model) return

    const lines = model.getValue().split('\n')
    const emitterLineSet = new Set<number>()
    for (let i = 0; i < lines.length; i++) {
      if (/VfxEmitterDefinitionData\s*\{/.test(lines[i])) {
        emitterLineSet.add(i + 1)
      }
    }
    if (emitterLineSet.size === 0) return

    const foldingCtrl = (editor as unknown as { getContribution?: (id: string) => unknown }).getContribution?.(
      'editor.contrib.folding',
    ) as
      | { getFoldingModel?: () => Promise<{ regions: unknown; update: (r: unknown) => void }> }
      | undefined

    foldingCtrl?.getFoldingModel?.()?.then((foldingModel) => {
      const regions = foldingModel?.regions as {
        length: number
        getStartLineNumber: (i: number) => number
        isCollapsed: (i: number) => boolean
        setCollapsed: (i: number, v: boolean) => void
      }
      if (!regions) return
      for (let i = 0; i < regions.length; i++) {
        const startLine = regions.getStartLineNumber(i)
        if (emitterLineSet.has(startLine) && regions.isCollapsed(i) !== collapse) {
          regions.setCollapsed(i, collapse)
        }
      }
      foldingModel.update(regions)
    })
  }, [])

  const hasEmitters = useCallback(() => /VfxEmitterDefinitionData\s*\{/.test(value), [value])

  const handleGeneralEdit = useCallback(() => {
    setFindActive(false)
    setReplaceActive(false)
    editorRef.current?.trigger('keyboard', 'closeFindWidget', null)
    setGeneralEditOpen((o) => !o)
  }, [])

  const handleParticlePanel = useCallback(() => {
    setFindActive(false)
    setReplaceActive(false)
    editorRef.current?.trigger('keyboard', 'closeFindWidget', null)
    setParticlePanelOpen((o) => !o)
  }, [])

  const handlePanelContentChange = useCallback(
    (newContent: string) => {
      onContentChange(newContent)
      const editor = editorRef.current
      const model = editor?.getModel()
      if (editor && model) {
        editor.setValue(newContent)
      }
      scheduleSyntaxPass()
    },
    [onContentChange, scheduleSyntaxPass],
  )

  const scrollToLine = useCallback((line: number) => {
    editorRef.current?.revealLineInCenter(line)
    editorRef.current?.setPosition({ lineNumber: line, column: 1 })
  }, [])

  const showTauriToast = useCallback(() => {
    window.alert('Esta acção requer o Jade desktop ou a ponte HTTP Tauri (Fase 2).')
  }, [])

  const handleMaterialLibrary = useCallback(() => {
    showTauriToast()
  }, [showTauriToast])

  const handleCompareFiles = useCallback(() => {
    window.alert('Compare Files: disponível no Jade desktop.')
  }, [])

  const applyCodeDockTheme = useCallback(async () => {
    try {
      const theme = await getPreference('Theme', 'Default')
      const useCustom = await getPreference('UseCustomTheme', 'false')
      if (useCustom === 'true') {
        applyTheme('Custom', {
          windowBg: await getPreference('Custom_Bg', '#0F1928'),
          editorBg: await getPreference('Custom_EditorBg', '#141E2D'),
          titleBar: await getPreference('Custom_TitleBar', '#0F1928'),
          statusBar: await getPreference('Custom_StatusBar', '#005A9E'),
          text: await getPreference('Custom_Text', '#D4D4D4'),
          tabBg: await getPreference('Custom_TabBg', '#1E1E1E'),
          selectedTab: await getPreference('Custom_SelectedTab', '#007ACC'),
        })
      } else {
        applyTheme(theme)
      }
      const monaco = monacoRef.current
      if (monaco) {
        registerRitobinTheme(monaco)
        monaco.editor.setTheme(RITOBIN_THEME_ID)
        setEditorTheme(RITOBIN_THEME_ID)
      }
    } catch (e) {
      console.warn('CodeDock theme apply failed', e)
    }
  }, [])

  const handleBeforeMount = useCallback((monaco: Monaco) => {
    monacoRef.current = monaco
    setupRitobinMonacoBeforeMount(monaco)
    void applyCodeDockTheme()
  }, [applyCodeDockTheme])

  const handleMount = useCallback(
    (editor: MonacoType.editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor
      monacoRef.current = monaco

      editorDisposablesRef.current.forEach((d) => {
        try {
          d.dispose()
        } catch {
          /* ignore */
        }
      })
      editorDisposablesRef.current = []

      decorationIdsRef.current = []
      emitterDecorationIdsRef.current = []

      contentDisposableRef.current?.dispose()
      const model = editor.getModel()
      if (model) {
        setLineCount(model.getLineCount())
        contentDisposableRef.current = model.onDidChangeContent(() => {
          syncLineCount()
          scheduleSyntaxPass()
        })
      }

      const ctxDisposable = editor.onContextMenu((e) => {
        e.event.preventDefault()
        e.event.stopPropagation()
        setCtxMenu({ x: e.event.posx, y: e.event.posy })
      })
      editorDisposablesRef.current.push(ctxDisposable)

      const focusIn = editor.onDidFocusEditorText(() => setFocused(true))
      const focusOut = editor.onDidBlurEditorText(() => setFocused(false))
      editorDisposablesRef.current.push(focusIn, focusOut)

      runSyntaxPass()
    },
    [runSyntaxPass, scheduleSyntaxPass, syncLineCount],
  )

  useEffect(() => {
    scheduleSyntaxPass()
    syncLineCount()
  }, [scheduleSyntaxPass, syncLineCount, value])

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current)
      contentDisposableRef.current?.dispose()
      editorDisposablesRef.current.forEach((d) => {
        try {
          d.dispose()
        } catch {
          /* ignore */
        }
      })
      editorRef.current = null
      monacoRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!focused) return

    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const key = e.key.toLowerCase()
      if (key === 'f') {
        e.preventDefault()
        handleFind()
      } else if (key === 'h') {
        e.preventDefault()
        handleReplace()
      } else if (key === 'z' && !e.shiftKey) {
        e.preventDefault()
        handleUndo()
      } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault()
        handleRedo()
      } else if (key === 'o') {
        e.preventDefault()
        handleGeneralEdit()
      } else if (key === 'p') {
        e.preventDefault()
        handleParticlePanel()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [
    focused,
    handleFind,
    handleReplace,
    handleUndo,
    handleRedo,
    handleGeneralEdit,
    handleParticlePanel,
  ])

  const onEmitterHintsChange = useCallback(
    (enabled: boolean) => {
      emitterHintsEnabledRef.current = enabled
      const editor = editorRef.current
      if (editor) updateEmitterNameDecorations(editor)
    },
    [updateEmitterNameDecorations],
  )

  const onSyntaxCheckingChange = useCallback(
    (enabled: boolean) => {
      syntaxCheckingEnabledRef.current = enabled
      runSyntaxPass()
    },
    [runSyntaxPass],
  )

  const onThemeApplied = useCallback(
    (_themeId: string) => {
      void applyCodeDockTheme()
      void loadEditorPrefs()
    },
    [applyCodeDockTheme, loadEditorPrefs],
  )

  return {
    editorRef,
    monacoRef,
    monacoOptions,
    editorTheme,
    findActive,
    replaceActive,
    ctxMenu,
    setCtxMenu,
    generalEditOpen,
    setGeneralEditOpen,
    particlePanelOpen,
    setParticlePanelOpen,
    showSettings,
    setShowSettings,
    showPreferences,
    setShowPreferences,
    showThemes,
    setShowThemes,
    showAbout,
    setShowAbout,
    handleBeforeMount,
    handleMount,
    handleFind,
    handleReplace,
    handleUndo,
    handleRedo,
    handleCut,
    handleCopy,
    handlePaste,
    handleSelectAll,
    foldAllEmitters: () => setEmittersFolded(true),
    unfoldAllEmitters: () => setEmittersFolded(false),
    hasEmitters,
    handleGeneralEdit,
    handleParticlePanel,
    handlePanelContentChange,
    scrollToLine,
    handleMaterialLibrary,
    handleCompareFiles,
    showTauriToast,
    onEmitterHintsChange,
    onSyntaxCheckingChange,
    onThemeApplied,
    particleDisabled: false,
    generalEditActive: generalEditOpen,
    particlePanelActive: particlePanelOpen,
  }
}
