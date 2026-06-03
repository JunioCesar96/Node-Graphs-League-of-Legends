import type { ContextMenuItem } from '@/core/canvasContextMenuTypes'
import type { JadeSurfaceThemeState } from '@/core/jadeSurfaceTheme'
import { LangId } from '@/core/language/languageIds'

export function buildSurfaceThemeMenuItems(
  state: JadeSurfaceThemeState,
  tr: (id: number, fallback: string) => string,
): ContextMenuItem[] {
  return [
    {
      id: 'surface.toggleJadeTheme',
      label: tr(LangId.CtxApplyJadeTheme, 'Tema'),
      selected: state.themeEnabled,
      separatorBefore: true,
      toggleCheckbox: true,
    },
    {
      id: 'surface.toggleJadeSyntax',
      label: tr(LangId.CtxApplyJadeSyntax, 'Syntax Color Scheme'),
      selected: state.syntaxEnabled,
      toggleCheckbox: true,
    },
  ]
}

export function appendSurfaceThemeMenuItems(
  items: ContextMenuItem[],
  state: JadeSurfaceThemeState,
  tr: (id: number, fallback: string) => string,
): void {
  items.push(...buildSurfaceThemeMenuItems(state, tr))
}
