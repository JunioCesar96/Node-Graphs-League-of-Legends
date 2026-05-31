import type { Monaco } from '@monaco-editor/react'
import { getPreference, setPreference } from '@jade/lib/preferenceStore'
import { registerRitobinTheme, RITOBIN_THEME_ID } from '@jade/lib/ritobinLanguage'
import {
  applyMonacoTheme,
  applySyntaxColorsCss,
  applyTheme,
  resolveActiveSyntaxThemeId,
  type CustomSyntaxOptions,
} from '@jade/lib/themeApplicator'
import type { BracketColors, SyntaxColors } from '@jade/lib/themes'

export const JADE_DYNAMIC_MONACO_THEME = 'jade-dynamic'

export const JADE_THEME_PREF = 'NodeGraphsApplyJadeTheme'
export const JADE_SYNTAX_PREF = 'NodeGraphsApplyJadeSyntax'
/** @deprecated Prefer JADE_THEME_PREF + JADE_SYNTAX_PREF */
export const JADE_SURFACE_THEME_PREF = 'NodeGraphsApplyJadeThemeSyntax'
export const JADE_SURFACE_THEME_CHANGED = 'jade-surface-theme-changed'

export type JadeSurfaceThemeState = {
  themeEnabled: boolean
  syntaxEnabled: boolean
}

const STRUCTURE_SURFACE_VARS = [
  '--group-surface',
  '--group-surface-dark',
  '--group-text',
  '--block-surface',
  '--block-surface-dark',
  '--block-text',
  '--group-block-field-bg',
] as const

const JADE_APP_THEME_VARS = [
  '--window-bg',
  '--editor-bg',
  '--title-bar-bg',
  '--status-bar-bg',
  '--text-color',
  '--tab-bg',
  '--selected-tab-bg',
  '--scrollbar-thumb',
  '--scrollbar-thumb-hover',
  '--jade-accent',
  '--jade-accent-text',
  '--border-color',
  '--text-muted',
  '--status-bar-text',
  '--title-bar-text',
  '--chrome-fg',
  '--window-gradient',
  '--gradient-top',
  '--title-bar-accent-overlay',
] as const

const SYNTAX_INLINE_VARS = [
  '--syntax-keyword-color',
  '--syntax-comment-color',
  '--syntax-string-color',
  '--syntax-number-color',
  '--syntax-property-color',
  '--syntax-symbol-color',
  '--syntax-bracket-color',
  '--port-child',
  '--port-parent',
] as const

async function loadCustomSyntaxOptions(): Promise<CustomSyntaxOptions | undefined> {
  const useCustomSyntax = await getPreference('UseCustomSyntaxTheme', 'false')
  if (useCustomSyntax !== 'true') {
    return undefined
  }

  const customSyntax: SyntaxColors = {
    keyword: await getPreference('CustomSyntax_Keyword', '#569CD6'),
    comment: await getPreference('CustomSyntax_Comment', '#6A9955'),
    stringColor: await getPreference('CustomSyntax_String', '#CE9178'),
    number: await getPreference('CustomSyntax_Number', '#B5CEA8'),
    propertyColor: await getPreference('CustomSyntax_Property', '#569CD6'),
  }
  const customBrackets: BracketColors = {
    color1: await getPreference('CustomSyntax_Bracket1', '#FFD700'),
    color2: await getPreference('CustomSyntax_Bracket2', '#DA70D6'),
    color3: await getPreference('CustomSyntax_Bracket3', '#87CEEB'),
  }

  return { customSyntax, customBrackets }
}

async function resolveSavedThemeContext(): Promise<{
  activeThemeId: string
  activeSyntaxTheme: string
  customSyntaxOpts: CustomSyntaxOptions | undefined
}> {
  const syntaxTheme = await getPreference('SyntaxTheme', 'Default')
  const useCustomSyntax = await getPreference('UseCustomSyntaxTheme', 'false')
  const useCustomTheme = await getPreference('UseCustomTheme', 'false')
  const activeThemeId =
    useCustomTheme === 'true' ? 'Custom' : await getPreference('Theme', 'Default')
  const customSyntaxOpts = await loadCustomSyntaxOptions()
  const activeSyntaxTheme = resolveActiveSyntaxThemeId(
    syntaxTheme,
    activeThemeId,
    useCustomSyntax === 'true',
  )

  return { activeThemeId, activeSyntaxTheme, customSyntaxOpts }
}

async function applyJadeAppTheme(): Promise<void> {
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
    return
  }

  applyTheme(await getPreference('Theme', 'Default'))
}

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function applyStructureSurfacesFromJadeTheme(): void {
  const editorBg = readCssVar('--editor-bg') || '#1e1e1e'
  const tabBg = readCssVar('--tab-bg') || '#252526'
  const text = readCssVar('--text-color') || '#d4d4d4'
  const root = document.documentElement

  root.style.setProperty('--group-surface', tabBg)
  root.style.setProperty('--group-surface-dark', editorBg)
  root.style.setProperty('--block-surface', tabBg)
  root.style.setProperty('--block-surface-dark', editorBg)
  root.style.setProperty('--group-text', text)
  root.style.setProperty('--block-text', text)
  root.style.setProperty(
    '--group-block-field-bg',
    `color-mix(in srgb, ${editorBg} 82%, rgb(0 0 0))`,
  )
  root.dataset.jadeSurfaceTheme = 'on'
}

export function revertStructureSurfacesToDefaults(): void {
  const root = document.documentElement
  for (const name of STRUCTURE_SURFACE_VARS) {
    root.style.removeProperty(name)
  }
  delete root.dataset.jadeSurfaceTheme
}

export function revertJadeAppTheme(): void {
  const root = document.documentElement
  for (const name of JADE_APP_THEME_VARS) {
    root.style.removeProperty(name)
  }
}

export function revertSyntaxColorsCss(): void {
  const root = document.documentElement
  for (const name of SYNTAX_INLINE_VARS) {
    root.style.removeProperty(name)
  }
}

function dispatchSurfaceThemeChanged(state: JadeSurfaceThemeState): void {
  window.dispatchEvent(new CustomEvent(JADE_SURFACE_THEME_CHANGED, { detail: state }))
}

async function readPref(key: string, defaultValue = 'true'): Promise<boolean> {
  return (await getPreference(key, defaultValue)) !== 'false'
}

export async function getJadeSurfaceThemeState(): Promise<JadeSurfaceThemeState> {
  const legacy = await getPreference(JADE_SURFACE_THEME_PREF, '')
  if (legacy === 'true' || legacy === 'false') {
    const enabled = legacy === 'true'
    return { themeEnabled: enabled, syntaxEnabled: enabled }
  }

  return {
    themeEnabled: await readPref(JADE_THEME_PREF),
    syntaxEnabled: await readPref(JADE_SYNTAX_PREF),
  }
}

export async function setJadeThemeEnabled(enabled: boolean): Promise<void> {
  await setPreference(JADE_THEME_PREF, enabled ? 'true' : 'false')
  dispatchSurfaceThemeChanged({
    themeEnabled: enabled,
    syntaxEnabled: await readPref(JADE_SYNTAX_PREF),
  })
}

export async function setJadeSyntaxEnabled(enabled: boolean): Promise<void> {
  await setPreference(JADE_SYNTAX_PREF, enabled ? 'true' : 'false')
  dispatchSurfaceThemeChanged({
    themeEnabled: await readPref(JADE_THEME_PREF),
    syntaxEnabled: enabled,
  })
}

export async function toggleJadeThemeEnabled(): Promise<boolean> {
  const state = await getJadeSurfaceThemeState()
  const next = !state.themeEnabled
  await setJadeThemeEnabled(next)
  return next
}

export async function toggleJadeSyntaxEnabled(): Promise<boolean> {
  const state = await getJadeSurfaceThemeState()
  const next = !state.syntaxEnabled
  await setJadeSyntaxEnabled(next)
  return next
}

function applyDefaultMonacoTheme(monaco: Monaco): void {
  registerRitobinTheme(monaco)
  monaco.editor.setTheme(RITOBIN_THEME_ID)
}

/**
 * Aplica Tema Jade e/ou Syntax Color Scheme no editor, inspetores e cards grupo/bloco.
 */
export async function refreshJadeSurfaceTheme(monaco?: Monaco | null): Promise<string | null> {
  const { themeEnabled, syntaxEnabled } = await getJadeSurfaceThemeState()

  if (!themeEnabled && !syntaxEnabled) {
    revertStructureSurfacesToDefaults()
    revertJadeAppTheme()
    revertSyntaxColorsCss()
    if (monaco) {
      applyDefaultMonacoTheme(monaco)
    }
    return RITOBIN_THEME_ID
  }

  try {
    const { activeThemeId, activeSyntaxTheme, customSyntaxOpts } = await resolveSavedThemeContext()

    if (themeEnabled) {
      await applyJadeAppTheme()
      applyStructureSurfacesFromJadeTheme()
    } else {
      revertStructureSurfacesToDefaults()
      revertJadeAppTheme()
    }

    if (syntaxEnabled) {
      applySyntaxColorsCss(activeSyntaxTheme, customSyntaxOpts)
    } else {
      revertSyntaxColorsCss()
    }

    if (!monaco) {
      return null
    }

    if (!themeEnabled && !syntaxEnabled) {
      applyDefaultMonacoTheme(monaco)
      return RITOBIN_THEME_ID
    }

    applyMonacoTheme(
      monaco,
      themeEnabled ? activeThemeId : 'Default',
      syntaxEnabled ? activeSyntaxTheme : 'Default',
      syntaxEnabled ? customSyntaxOpts : undefined,
    )
    return JADE_DYNAMIC_MONACO_THEME
  } catch (error) {
    console.warn('[JadeSurfaceTheme] Failed to apply theme:', error)
    revertStructureSurfacesToDefaults()
    revertJadeAppTheme()
    revertSyntaxColorsCss()
    if (monaco) {
      applyDefaultMonacoTheme(monaco)
    }
    return RITOBIN_THEME_ID
  }
}
