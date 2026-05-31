import type { Monaco } from '@monaco-editor/react'

import { refreshJadeSurfaceTheme } from '@/core/jadeSurfaceTheme'



export { JADE_DYNAMIC_MONACO_THEME } from '@/core/jadeSurfaceTheme'



/**

 * @deprecated Use refreshJadeSurfaceTheme from @/core/jadeSurfaceTheme

 */

export async function applySavedSyntaxColors(): Promise<void> {

  await refreshJadeSurfaceTheme()

}



/**

 * Applies saved app theme + Syntax Color Scheme to CSS and, when provided, the Monaco editor.

 */

export async function applySavedEditorTheme(monaco?: Monaco | null): Promise<string | null> {

  return refreshJadeSurfaceTheme(monaco)

}

