import { LangId } from '@/core/language/languageIds'
import type { LanguageTranslateFn } from '@/core/language/jadeMenuLabels'

/** Strings traduzíveis do ThemesDialog (secção Background Image). */
export type ThemesDialogLabels = {
  dialogTitleJade: string
  dialogTitleNative: string
  backgroundApplyTo: string
  backgroundTargetApp: string
  backgroundTargetGrid: string
  backgroundTargetCodeEditor: string
}

export const DEFAULT_THEMES_DIALOG_LABELS: ThemesDialogLabels = {
  dialogTitleJade: 'Jade Themes',
  dialogTitleNative: 'Native Themes',
  backgroundApplyTo: 'Apply to',
  backgroundTargetApp: 'Background',
  backgroundTargetGrid: 'Grid',
  backgroundTargetCodeEditor: 'Code editor tab',
}

export function buildThemesDialogLabels(t: LanguageTranslateFn): ThemesDialogLabels {
  return {
    dialogTitleJade: t(LangId.ThemeDialogTitleJade, DEFAULT_THEMES_DIALOG_LABELS.dialogTitleJade),
    dialogTitleNative: t(LangId.ThemeDialogTitleNative, DEFAULT_THEMES_DIALOG_LABELS.dialogTitleNative),
    backgroundApplyTo: t(LangId.ThemeBgApplyTo, DEFAULT_THEMES_DIALOG_LABELS.backgroundApplyTo),
    backgroundTargetApp: t(LangId.ThemeBgTargetApp, DEFAULT_THEMES_DIALOG_LABELS.backgroundTargetApp),
    backgroundTargetGrid: t(LangId.ThemeBgTargetGrid, DEFAULT_THEMES_DIALOG_LABELS.backgroundTargetGrid),
    backgroundTargetCodeEditor: t(
      LangId.ThemeBgTargetCodeEditor,
      DEFAULT_THEMES_DIALOG_LABELS.backgroundTargetCodeEditor,
    ),
  }
}
