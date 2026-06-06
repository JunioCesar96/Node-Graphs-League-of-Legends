import { useEffect, useLayoutEffect, useState } from 'react'

import {
  readCanvasGridThemeColors,
  type CanvasGridThemeColors,
} from '@/core/canvasGridThemeColors'

export function useCanvasGridThemeColors(): CanvasGridThemeColors {
  const [themeColors, setThemeColors] = useState(readCanvasGridThemeColors)

  const refreshThemeColors = () => {
    setThemeColors(readCanvasGridThemeColors())
  }

  useLayoutEffect(() => {
    refreshThemeColors()
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(refreshThemeColors)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-jade-surface-theme', 'class', 'style'],
    })

    return () => observer.disconnect()
  }, [])

  return themeColors
}
