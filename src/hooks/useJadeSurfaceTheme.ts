import { useCallback, useEffect, useState } from 'react'
import type { Monaco } from '@monaco-editor/react'

import {
  getJadeSurfaceThemeState,
  JADE_SURFACE_THEME_CHANGED,
  refreshJadeSurfaceTheme,
  toggleJadeBackgroundEnabled,
  toggleJadeFontsEnabled,
  toggleJadeSyntaxEnabled,
  toggleJadeThemeEnabled,
  type JadeSurfaceThemeState,
} from '@/core/jadeSurfaceTheme'

const DEFAULT_STATE: JadeSurfaceThemeState = {
  themeEnabled: false,
  syntaxEnabled: false,
  backgroundEnabled: false,
  fontsEnabled: false,
}

function isSurfaceThemeState(value: unknown): value is JadeSurfaceThemeState {
  if (!value || typeof value !== 'object') {
    return false
  }
  const record = value as JadeSurfaceThemeState
  return (
    typeof record.themeEnabled === 'boolean' &&
    typeof record.syntaxEnabled === 'boolean' &&
    typeof record.backgroundEnabled === 'boolean' &&
    typeof record.fontsEnabled === 'boolean'
  )
}

export function useJadeSurfaceTheme(monacoRef?: { current: Monaco | null }) {
  const [state, setState] = useState<JadeSurfaceThemeState>(DEFAULT_STATE)

  useEffect(() => {
    let cancelled = false
    void getJadeSurfaceThemeState().then((value) => {
      if (!cancelled) {
        setState(value)
      }
    })

    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<JadeSurfaceThemeState>).detail
      if (isSurfaceThemeState(detail)) {
        setState(detail)
      }
    }

    window.addEventListener(JADE_SURFACE_THEME_CHANGED, onChanged)
    return () => {
      cancelled = true
      window.removeEventListener(JADE_SURFACE_THEME_CHANGED, onChanged)
    }
  }, [])

  const applyRefresh = useCallback(async () => {
    await refreshJadeSurfaceTheme(monacoRef?.current ?? null)
    setState(await getJadeSurfaceThemeState())
  }, [monacoRef])

  const toggleTheme = useCallback(async () => {
    await toggleJadeThemeEnabled()
    await applyRefresh()
  }, [applyRefresh])

  const toggleSyntax = useCallback(async () => {
    await toggleJadeSyntaxEnabled()
    await applyRefresh()
  }, [applyRefresh])

  const toggleBackground = useCallback(async () => {
    await toggleJadeBackgroundEnabled()
    await applyRefresh()
  }, [applyRefresh])

  const toggleFonts = useCallback(async () => {
    await toggleJadeFontsEnabled()
    await applyRefresh()
  }, [applyRefresh])

  const refresh = useCallback(async () => {
    await applyRefresh()
  }, [applyRefresh])

  return {
    ...state,
    toggleTheme,
    toggleSyntax,
    toggleBackground,
    toggleFonts,
    refresh,
  }
}
