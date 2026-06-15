import type { MenuBarLabels } from '@jade/components/MenuBar'

import { LangId } from './languageIds'

export type LanguageTranslateFn = (
  id: number,
  fallback?: string,
  vars?: Readonly<Record<string, string | number>>,
) => string

export function buildJadeMenuBarLabels(t: LanguageTranslateFn): MenuBarLabels {
  return {
    about: t(LangId.CodeMenuAbout),
    compareFiles: t(LangId.CodeMenuCompareFiles),
    copy: t(LangId.CodeMenuCopy),
    cut: t(LangId.CodeMenuCut),
    edit: t(LangId.CodeMenuEdit),
    exit: t(LangId.CodeMenuExit),
    file: t(LangId.CodeMenuFile),
    find: t(LangId.CodeMenuFind),
    generalEdit: t(LangId.CodeMenuGeneralEdit),
    materialLibrary: t(LangId.CodeMenuMaterialLibrary),
    options: t(LangId.MenuOptions),
    newFile: t(LangId.CodeMenuNew),
    openFile: t(LangId.CodeMenuOpen),
    openLog: t(LangId.CodeMenuOpenLog),
    particleEdit: t(LangId.CodeMenuParticleEdit),
    paste: t(LangId.CodeMenuPaste),
    preferences: t(LangId.CodeMenuPreferences),
    recentFiles: t(LangId.CodeMenuRecentFiles),
    redo: t(LangId.CodeMenuRedo),
    replace: t(LangId.CodeMenuReplace),
    saveAs: t(LangId.CodeMenuSaveAs),
    saveFile: t(LangId.CodeMenuSave),
    selectAll: t(LangId.CodeMenuSelectAll),
    settings: t(LangId.CodeMenuSettings),
    themes: t(LangId.CodeMenuThemes),
    tools: t(LangId.CodeMenuTools),
    undo: t(LangId.CodeMenuUndo),
  }
}

export function buildJadeEditorContextMenuLabels(t: LanguageTranslateFn) {
  return {
    copy: t(LangId.CodeMenuCopy),
    cut: t(LangId.CodeMenuCut),
    foldEmitters: t(LangId.CodeCtxFoldEmitters),
    foldSystems: t(LangId.CodeCtxFoldSystems),
    paste: t(LangId.CodeMenuPaste),
    convertHashToString: t(LangId.CodeCtxConvertHashToString),
    convertAllUndefinedHashes: t(LangId.CodeCtxConvertAllHashes),
    replaceValueToGraph: t(LangId.CodeCtxReplaceValue),
    selectAll: t(LangId.CodeMenuSelectAll),
    toNeekoNode: t(LangId.CodeCtxToNeeko),
    unfoldEmitters: t(LangId.CodeCtxUnfoldEmitters),
    unfoldSystems: t(LangId.CodeCtxUnfoldSystems),
  }
}
