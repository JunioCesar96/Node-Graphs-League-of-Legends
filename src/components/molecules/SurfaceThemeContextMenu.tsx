import { useMemo } from 'react'

import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import { buildSurfaceThemeMenuItems } from '@/core/surfaceThemeContextMenu'
import { useJadeSurfaceTheme } from '@/hooks/useJadeSurfaceTheme'
import { useLanguage } from '@/language/LanguageProvider'

import { CanvasContextMenu } from '@/components/molecules/CanvasContextMenu'

type SurfaceThemeContextMenuProps = {
  anchor: CanvasContextMenuAnchor
  onClose: () => void
}

export function SurfaceThemeContextMenu({ anchor, onClose }: SurfaceThemeContextMenuProps) {
  const { t } = useLanguage()
  const { themeEnabled, syntaxEnabled, toggleTheme, toggleSyntax } = useJadeSurfaceTheme()

  const items = useMemo(
    () =>
      buildSurfaceThemeMenuItems(
        { themeEnabled, syntaxEnabled },
        (id, fallback) => t(id, fallback),
      ),
    [syntaxEnabled, themeEnabled, t],
  )

  return (
    <CanvasContextMenu
      anchor={anchor}
      items={items}
      onClose={onClose}
      onSelect={(id) => {
        if (id === 'surface.toggleJadeTheme') {
          void toggleTheme()
        }
        if (id === 'surface.toggleJadeSyntax') {
          void toggleSyntax()
        }
      }}
    />
  )
}
