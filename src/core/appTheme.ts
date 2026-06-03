import { getPreference, setPreference } from '@jade/lib/preferenceStore'

import {
  DEFAULT_APP_THEME_ID,
  appThemeDefinitionById,
  resolveAppThemeId,
} from './appThemeRegistry'

export const APP_THEME_PREF = 'NodeGraphsAppTheme'
export const APP_THEME_CHANGED = 'app-theme-changed'

export function applyAppTheme(themeId: string): string {
  const resolved = resolveAppThemeId(themeId)
  document.documentElement.dataset.appTheme = resolved
  return resolved
}

export function getActiveAppThemeId(): string {
  return document.documentElement.dataset.appTheme ?? DEFAULT_APP_THEME_ID
}

export async function getSavedAppThemeId(): Promise<string> {
  const saved = await getPreference(APP_THEME_PREF, DEFAULT_APP_THEME_ID)
  return resolveAppThemeId(saved)
}

export async function setAppTheme(themeId: string): Promise<string> {
  const resolved = applyAppTheme(themeId)
  await setPreference(APP_THEME_PREF, resolved)
  window.dispatchEvent(new CustomEvent(APP_THEME_CHANGED, { detail: { themeId: resolved } }))
  return resolved
}

/** Define `data-app-theme` antes do primeiro paint (fallback síncrono). */
export function initAppThemeSync(): string {
  return applyAppTheme(DEFAULT_APP_THEME_ID)
}

/** Carrega preferência guardada e actualiza o atributo no `<html>`. */
export async function initAppTheme(): Promise<string> {
  const resolved = applyAppTheme(await getSavedAppThemeId())
  return resolved
}

export function appThemeTitle(themeId: string): string {
  return appThemeDefinitionById(themeId)?.title ?? themeId
}
