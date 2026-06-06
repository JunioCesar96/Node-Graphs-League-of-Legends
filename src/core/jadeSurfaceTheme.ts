import type { Monaco } from '@monaco-editor/react'
import { getPreference, setPreference } from '@jade/lib/preferenceStore'
import {
  applyCustomBackground,
  applyMonacoTheme,
  applyModernUI,
  applyRoundedCorners,
  applyStructureSurfacesForTheme,
  applySyntaxColorsCss,
  applyTheme,
  applyUIFont,
  loadSavedBackgroundFromPreferences,
  loadSavedFontsFromPreferences,
  refreshCustomBackgroundLayerHosts,
  readCustomBackgroundTargets,
  resolveActiveSyntaxThemeId,
  type CustomSyntaxOptions,
} from '@jade/lib/themeApplicator'
import type { BracketColors, SyntaxColors } from '@jade/lib/themes'
import { normalizeNativeThemeId, normalizeJadeThemeId } from '@jade/lib/themes'

import { initAppTheme } from './appTheme'

export const DEFAULT_JADE_THEME_ID = 'Default'
export const DEFAULT_JADE_SYNTAX_ID = 'Default'

/** Preferências quando Tema/Syntax estão desactivados (stack nativa Node Graphs). */
export const NATIVE_THEME_PREF = 'NodeGraphsNativeTheme'
export const NATIVE_SYNTAX_PREF = 'NodeGraphsNativeSyntaxTheme'

export const JADE_DYNAMIC_MONACO_THEME = 'jade-dynamic'

export const JADE_THEME_PREF = 'NodeGraphsApplyJadeTheme'
export const JADE_SYNTAX_PREF = 'NodeGraphsApplyJadeSyntax'
export const JADE_BACKGROUND_PREF = 'NodeGraphsApplyJadeBackground'
export const JADE_FONTS_PREF = 'NodeGraphsApplyJadeFonts'
/** @deprecated Prefer JADE_THEME_PREF + JADE_SYNTAX_PREF */
export const JADE_SURFACE_THEME_PREF = 'NodeGraphsApplyJadeThemeSyntax'
export const JADE_SURFACE_THEME_CHANGED = 'jade-surface-theme-changed'

export type JadeSurfaceThemeState = {
  themeEnabled: boolean
  syntaxEnabled: boolean
  backgroundEnabled: boolean
  fontsEnabled: boolean
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
  const syntaxThemeRaw = await getPreference('SyntaxTheme', 'DarkBlue')
  const useCustomSyntax = await getPreference('UseCustomSyntaxTheme', 'false')
  const useCustomTheme = await getPreference('UseCustomTheme', 'false')
  const themeRaw = await getPreference('Theme', 'DarkBlue')
  const activeThemeId =
    useCustomTheme === 'true' ? 'Custom' : normalizeJadeThemeId(themeRaw)
  const customSyntaxOpts = await loadCustomSyntaxOptions()
  const syntaxTheme = useCustomSyntax === 'true'
    ? syntaxThemeRaw
    : normalizeJadeThemeId(syntaxThemeRaw)
  const activeSyntaxTheme = resolveActiveSyntaxThemeId(
    syntaxTheme,
    activeThemeId,
    useCustomSyntax === 'true',
  )

  return { activeThemeId, activeSyntaxTheme, customSyntaxOpts }
}

async function resolveNativeThemeContext(): Promise<{
  activeThemeId: string
  activeSyntaxTheme: string
}> {
  const themeId = normalizeNativeThemeId(await getPreference(NATIVE_THEME_PREF, DEFAULT_JADE_THEME_ID))
  const syntaxRaw = await getPreference(NATIVE_SYNTAX_PREF, DEFAULT_JADE_SYNTAX_ID)
  const syntaxTheme = normalizeNativeThemeId(syntaxRaw)
  const activeSyntaxTheme = resolveActiveSyntaxThemeId(syntaxTheme, themeId, false)

  return { activeThemeId: themeId, activeSyntaxTheme }
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

export function applyStructureSurfacesFromJadeTheme(themeId = 'Default'): void {
  applyStructureSurfacesForTheme(themeId)
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
  root.removeAttribute('data-theme')
}

export function revertSyntaxColorsCss(): void {
  const root = document.documentElement
  for (const name of SYNTAX_INLINE_VARS) {
    root.style.removeProperty(name)
  }
}

function revertCustomBackground(): void {
  applyCustomBackground({ enabled: false, imageDataUrl: '', blur: 0 })
}

function revertUIFontAndEditorFont(): void {
  applyUIFont('')
  window.dispatchEvent(new CustomEvent('jade-editor-font-changed', { detail: '' }))
}

async function applyChromePreferences(
  activeThemeId: string,
  backgroundEnabled: boolean,
  fontsEnabled: boolean,
): Promise<void> {
  const roundedCorners = await getPreference('RoundedCorners', 'true')
  const modernUI = await getPreference('ModernUI', 'true')
  applyRoundedCorners(roundedCorners === 'true')
  applyModernUI(modernUI !== 'false')

  if (backgroundEnabled) {
    await loadSavedBackgroundFromPreferences(activeThemeId)
    refreshCustomBackgroundLayerHosts()
  } else {
    revertCustomBackground()
  }

  if (fontsEnabled) {
    await loadSavedFontsFromPreferences()
  } else {
    revertUIFontAndEditorFont()
  }
}

function dispatchSurfaceThemeChanged(state: JadeSurfaceThemeState): void {
  window.dispatchEvent(new CustomEvent(JADE_SURFACE_THEME_CHANGED, { detail: state }))
}

function isStoredTriState(value: string): value is 'true' | 'false' {
  return value === 'true' || value === 'false'
}

/** Preferências antigas (toggle único) bloqueavam Tema/Syntax independentes. */
async function clearLegacySurfaceThemePref(): Promise<void> {
  await setPreference(JADE_SURFACE_THEME_PREF, '')
}

async function readSplitPref(key: string, fallback = true): Promise<boolean> {
  const raw = await getPreference(key, '')
  if (!isStoredTriState(raw)) {
    return fallback
  }
  return raw === 'true'
}

export async function getJadeSurfaceThemeState(): Promise<JadeSurfaceThemeState> {
  const themeRaw = await getPreference(JADE_THEME_PREF, '')
  const syntaxRaw = await getPreference(JADE_SYNTAX_PREF, '')
  const hasSplitPrefs = isStoredTriState(themeRaw) || isStoredTriState(syntaxRaw)

  let themeEnabled = true
  let syntaxEnabled = true

  if (hasSplitPrefs) {
    themeEnabled = await readSplitPref(JADE_THEME_PREF)
    syntaxEnabled = await readSplitPref(JADE_SYNTAX_PREF)
  } else {
    const legacy = await getPreference(JADE_SURFACE_THEME_PREF, '')
    if (isStoredTriState(legacy)) {
      const enabled = legacy === 'true'
      await setPreference(JADE_THEME_PREF, legacy)
      await setPreference(JADE_SYNTAX_PREF, legacy)
      await clearLegacySurfaceThemePref()
      themeEnabled = enabled
      syntaxEnabled = enabled
    }
  }

  return {
    themeEnabled,
    syntaxEnabled,
    backgroundEnabled: await readSplitPref(JADE_BACKGROUND_PREF),
    fontsEnabled: await readSplitPref(JADE_FONTS_PREF),
  }
}

export async function setJadeThemeEnabled(enabled: boolean): Promise<void> {
  await clearLegacySurfaceThemePref()
  await setPreference(JADE_THEME_PREF, enabled ? 'true' : 'false')
  dispatchSurfaceThemeChanged(await getJadeSurfaceThemeState())
}

export async function setJadeSyntaxEnabled(enabled: boolean): Promise<void> {
  await clearLegacySurfaceThemePref()
  await setPreference(JADE_SYNTAX_PREF, enabled ? 'true' : 'false')
  dispatchSurfaceThemeChanged(await getJadeSurfaceThemeState())
}

export async function setJadeBackgroundEnabled(enabled: boolean): Promise<void> {
  await setPreference(JADE_BACKGROUND_PREF, enabled ? 'true' : 'false')
  dispatchSurfaceThemeChanged(await getJadeSurfaceThemeState())
}

export async function setJadeFontsEnabled(enabled: boolean): Promise<void> {
  await setPreference(JADE_FONTS_PREF, enabled ? 'true' : 'false')
  dispatchSurfaceThemeChanged(await getJadeSurfaceThemeState())
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

export async function toggleJadeBackgroundEnabled(): Promise<boolean> {
  const state = await getJadeSurfaceThemeState()
  const next = !state.backgroundEnabled
  await setJadeBackgroundEnabled(next)
  return next
}

export async function toggleJadeFontsEnabled(): Promise<boolean> {
  const state = await getJadeSurfaceThemeState()
  const next = !state.fontsEnabled
  await setJadeFontsEnabled(next)
  return next
}

/**
 * Aplica Tema Jade e/ou Syntax Color Scheme no editor, inspetores e cards grupo/bloco.
 * Com toggle desactivado, usa sempre o tema / esquema Default (design system).
 */
export async function refreshJadeSurfaceTheme(monaco?: Monaco | null): Promise<string | null> {
  const { themeEnabled, syntaxEnabled, backgroundEnabled, fontsEnabled } =
    await getJadeSurfaceThemeState()

  try {
    const jadeContext = await resolveSavedThemeContext()
    const nativeContext = await resolveNativeThemeContext()

    const effectiveThemeId = themeEnabled ? jadeContext.activeThemeId : nativeContext.activeThemeId
    const effectiveSyntaxId = themeEnabled ? jadeContext.activeSyntaxTheme : nativeContext.activeSyntaxTheme

    if (themeEnabled) {
      await applyJadeAppTheme()
    } else {
      applyTheme(nativeContext.activeThemeId)
      await initAppTheme()
    }

    applyStructureSurfacesForTheme(effectiveThemeId)

    if (syntaxEnabled) {
      applySyntaxColorsCss(jadeContext.activeSyntaxTheme, jadeContext.customSyntaxOpts)
    } else {
      applySyntaxColorsCss(nativeContext.activeSyntaxTheme)
    }

    await applyChromePreferences(effectiveThemeId, backgroundEnabled, fontsEnabled)

    if (monaco) {
      applyMonacoTheme(
        monaco,
        effectiveThemeId,
        effectiveSyntaxId,
        syntaxEnabled ? jadeContext.customSyntaxOpts : undefined,
      )
    }

    if (!monaco) {
      return null
    }

    return JADE_DYNAMIC_MONACO_THEME
  } catch (error) {
    console.warn('[JadeSurfaceTheme] Failed to apply theme:', error)
    const fallbackState = await getJadeSurfaceThemeState()
    applyTheme(DEFAULT_JADE_THEME_ID)
    applyStructureSurfacesForTheme(DEFAULT_JADE_THEME_ID)
    applySyntaxColorsCss(DEFAULT_JADE_SYNTAX_ID)
    await initAppTheme()
    await applyChromePreferences(
      DEFAULT_JADE_THEME_ID,
      fallbackState.backgroundEnabled,
      fallbackState.fontsEnabled,
    )
    if (monaco) {
      applyMonacoTheme(monaco, DEFAULT_JADE_THEME_ID, DEFAULT_JADE_SYNTAX_ID)
    }
    return JADE_DYNAMIC_MONACO_THEME
  }
}
