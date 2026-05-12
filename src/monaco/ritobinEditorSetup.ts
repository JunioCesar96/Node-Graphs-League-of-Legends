import type { Monaco } from '@monaco-editor/react'
import type * as MonacoType from 'monaco-editor'
import { registerColorProvider } from '@jade/lib/colorProvider'
import {
  registerRitobinLanguage,
  registerRitobinTheme,
  RITOBIN_LANGUAGE_ID,
  RITOBIN_THEME_ID,
} from '@jade/lib/ritobinLanguage'
import { checkSyntax, suggestType } from '@jade/lib/syntaxChecker'

export { RITOBIN_LANGUAGE_ID, RITOBIN_THEME_ID }

/** Evita duplicar ColorProvider / CodeAction ao remontar o painel Código. */
let globalRitobinMonacoExtrasRegistered = false

export function setupRitobinMonacoBeforeMount(monaco: Monaco): void {
  registerRitobinLanguage(monaco)
  registerRitobinTheme(monaco)
  monaco.editor.setTheme(RITOBIN_THEME_ID)

  if (globalRitobinMonacoExtrasRegistered) {
    return
  }

  globalRitobinMonacoExtrasRegistered = true
  registerColorProvider(monaco)

  monaco.languages.registerCodeActionProvider(RITOBIN_LANGUAGE_ID, {
    provideCodeActions(
      model: MonacoType.editor.ITextModel,
      _range: MonacoType.Range,
      context: MonacoType.languages.CodeActionContext,
    ) {
      const actions: MonacoType.languages.CodeAction[] = []
      for (const marker of context.markers) {
        const unknownMatch = marker.message.match(/^Unknown (?:(?:key |value )?type )"(.+?)"/)
        if (!unknownMatch) continue
        const badType = unknownMatch[1]
        const suggestion = suggestType(badType)
        if (!suggestion) continue

        actions.push({
          title: `Change to "${suggestion}"`,
          kind: 'quickfix',
          diagnostics: [marker],
          isPreferred: true,
          edit: {
            edits: [
              {
                resource: model.uri,
                textEdit: {
                  range: {
                    startLineNumber: marker.startLineNumber,
                    startColumn: marker.startColumn,
                    endLineNumber: marker.endLineNumber,
                    endColumn: marker.endColumn,
                  },
                  text: suggestion,
                },
                versionId: model.getVersionId(),
              },
            ],
          },
        })
      }
      return { actions, dispose() {} }
    },
  })
}

export function updateRitobinSyntaxMarkers(
  monaco: Monaco,
  editor: MonacoType.editor.IStandaloneCodeEditor,
  syntaxDecorationIds: { current: string[] },
): void {
  const model = editor.getModel()
  if (!model || model.isDisposed()) {
    return
  }

  const text = model.getValue()
  const errors = checkSyntax(text)

  const markers: MonacoType.editor.IMarkerData[] = errors.map((err) => ({
    severity:
      err.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
    message: err.message,
    startLineNumber: err.line,
    startColumn: err.column,
    endLineNumber: err.line,
    endColumn: err.column + (err.length || 1),
  }))
  monaco.editor.setModelMarkers(model, 'syntax-checker', markers)

  const lineSeverity = new Map<number, 'error' | 'warning'>()
  for (const err of errors) {
    const sev = err.severity === 'warning' ? 'warning' : 'error'
    const prev = lineSeverity.get(err.line)
    if (prev === 'error') continue
    lineSeverity.set(err.line, sev)
  }

  const decorations: MonacoType.editor.IModelDeltaDecoration[] = []
  for (const [lineNum, sev] of lineSeverity.entries()) {
    const isWarn = sev === 'warning'
    decorations.push({
      range: new monaco.Range(lineNum, 1, lineNum, 1),
      options: {
        isWholeLine: true,
        className: isWarn ? 'syntax-warning-line' : 'syntax-error-line',
        glyphMarginClassName: isWarn ? 'syntax-warning-glyph' : 'syntax-error-glyph',
        minimap: {
          color: isWarn ? '#e6b800' : '#ff3333',
          position: monaco.editor.MinimapPosition.Inline,
        },
        overviewRuler: {
          color: isWarn ? '#e6b800' : '#ff3333',
          position: monaco.editor.OverviewRulerLane.Full,
        },
      },
    })
  }

  syntaxDecorationIds.current = model.deltaDecorations(syntaxDecorationIds.current, decorations)
}
