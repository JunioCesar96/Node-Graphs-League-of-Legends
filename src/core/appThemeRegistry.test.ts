import { describe, expect, it } from 'vitest'

import {
  DEFAULT_APP_THEME_ID,
  appThemeDefinitionById,
  appThemeDefinitionsList,
  resolveAppThemeId,
} from './appThemeRegistry'

describe('appThemeRegistry', () => {
  it('regista o tema default', () => {
    const theme = appThemeDefinitionById('default')
    expect(theme).toBeDefined()
    expect(theme?.id).toBe('default')
    expect(theme?.title).toBe('Default')
  })

  it('resolve id desconhecido para default', () => {
    expect(resolveAppThemeId('inexistente')).toBe(DEFAULT_APP_THEME_ID)
    expect(resolveAppThemeId(null)).toBe(DEFAULT_APP_THEME_ID)
  })

  it('lista pelo menos o tema default', () => {
    const ids = appThemeDefinitionsList().map((theme) => theme.id)
    expect(ids).toContain('default')
  })
})
