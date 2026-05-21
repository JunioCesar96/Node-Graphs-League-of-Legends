import type * as MonacoType from 'monaco-editor'

export type PerfMode = 'on' | 'auto' | 'off'

export type PerfKey =
  | 'minimap'
  | 'bracketColors'
  | 'occurrencesHighlight'
  | 'selectionHighlight'
  | 'lineHighlight'
  | 'folding'
  | 'stopRenderingLine'

export type PerfPrefs = Record<PerfKey, PerfMode>

export const PERF_PREF_KEYS: Record<PerfKey, string> = {
  minimap: 'Perf_Minimap',
  bracketColors: 'Perf_BracketColors',
  occurrencesHighlight: 'Perf_OccurrencesHighlight',
  selectionHighlight: 'Perf_SelectionHighlight',
  lineHighlight: 'Perf_LineHighlight',
  folding: 'Perf_Folding',
  stopRenderingLine: 'Perf_StopRenderingLine',
}

export const PERF_DEFAULTS: PerfPrefs = {
  minimap: 'auto',
  bracketColors: 'auto',
  occurrencesHighlight: 'auto',
  selectionHighlight: 'auto',
  lineHighlight: 'auto',
  folding: 'auto',
  stopRenderingLine: 'auto',
}

export const BIG_FILE_LINES = 75_000

function isPerfOn(mode: PerfMode, lineCount: number): boolean {
  if (mode === 'on') return true
  if (mode === 'off') return false
  return lineCount <= BIG_FILE_LINES
}

/** Opções Monaco alinhadas ao shell VSCode do Jade (EditorPane). */
export function buildMonacoOptions(
  perfPrefs: PerfPrefs,
  lineCount: number,
  editorFontFamily?: string,
): MonacoType.editor.IStandaloneEditorConstructionOptions {
  const isOn = (key: PerfKey) => isPerfOn(perfPrefs[key], lineCount)

  return {
    minimap: { enabled: isOn('minimap') },
    glyphMargin: true,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    fontSize: 14,
    fontFamily: editorFontFamily || undefined,
    lineNumbersMinChars: 6,
    fixedOverflowWidgets: true,
    contextmenu: false,
    largeFileOptimizations: false,
    maxTokenizationLineLength: 100_000,
    folding: isOn('folding'),
    occurrencesHighlight: isOn('occurrencesHighlight') ? 'singleFile' : 'off',
    selectionHighlight: isOn('selectionHighlight'),
    renderLineHighlight: isOn('lineHighlight') ? 'all' : 'gutter',
    stopRenderingLineAfter: isOn('stopRenderingLine') ? -1 : 10_000,
    renderWhitespace: 'none',
    overviewRulerLanes: 3,
    overviewRulerBorder: true,
    wordWrap: 'off',
    find: {
      addExtraSpaceOnTop: false,
      autoFindInSelection: 'never',
      seedSearchStringFromSelection: 'always',
    },
    ...({
      'bracketPairColorization.enabled': isOn('bracketColors'),
      'suggest.maxVisibleSuggestions': 5,
      'semanticHighlighting.enabled': false,
      'guides.indentation': true,
    } as MonacoType.editor.IEditorOptions),
  }
}
