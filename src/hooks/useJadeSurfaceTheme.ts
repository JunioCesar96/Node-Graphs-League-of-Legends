import { useCallback, useEffect, useState } from 'react'
import type { Monaco } from '@monaco-editor/react'

import {
  getJadeSurfaceThemeState,
  JADE_SURFACE_THEME_CHANGED,
  refreshJadeSurfaceTheme,
  toggleJadeSyntaxEnabled,
  toggleJadeThemeEnabled,
  type JadeSurfaceThemeState,
} from '@/core/jadeSurfaceTheme'

const DEFAULT_STATE: JadeSurfaceThemeState = {
  themeEnabled: true,
  syntaxEnabled: true,
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
      if (detail && typeof detail.themeEnabled === 'boolean' && typeof detail.syntaxEnabled === 'boolean') {
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

  const refresh = useCallback(async () => {
    await applyRefresh()
  }, [applyRefresh])

  return { ...state, toggleTheme, toggleSyntax, refresh }
}
