import { describe, expect, it } from 'vitest'

import { normalizeApiPathname } from '../../vite.devApiPath'

describe('normalizeApiPathname', () => {
  it('strips query string', () => {
    expect(normalizeApiPathname('/api/save-workspace?x=1')).toBe('/api/save-workspace')
  })

  it('removes trailing slash', () => {
    expect(normalizeApiPathname('/api/save-workspace/')).toBe('/api/save-workspace')
  })
})
