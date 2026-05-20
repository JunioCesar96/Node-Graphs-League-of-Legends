import { describe, expect, it } from 'vitest'

import {
  applyCharacterRenameInPath,
  formatLinkPath,
  formatLinkPathPreview,
  isCharacterSegmentIndex,
  normalizeLinkPath,
  parseLinkPath,
  reorderLinkSegments,
} from '@/core/linkValue'

describe('linkValue', () => {
  it('parse e format preservam caminho ritual', () => {
    const raw = 'Characters/Zac/CAC/Zac_Base'
    expect(parseLinkPath(raw)).toEqual(['Characters', 'Zac', 'CAC', 'Zac_Base'])
    expect(formatLinkPath(parseLinkPath(raw))).toBe(raw)
  })

  it('string vazia vira um segmento editável', () => {
    expect(parseLinkPath('')).toEqual([''])
    expect(normalizeLinkPath('')).toBe('')
  })

  it('remove segmentos vazios no normalize', () => {
    expect(normalizeLinkPath('Characters//Zac/')).toBe('Characters/Zac')
  })

  it('isCharacterSegmentIndex só após Characters', () => {
    const segments = ['Characters', 'Zac', 'CAC']
    expect(isCharacterSegmentIndex(segments, 0)).toBe(false)
    expect(isCharacterSegmentIndex(segments, 1)).toBe(true)
    expect(isCharacterSegmentIndex(segments, 2)).toBe(false)
  })

  it('reorderLinkSegments move índices', () => {
    const segments = ['Characters', 'Zac', 'CAC', 'Zac_Base']
    expect(reorderLinkSegments(segments, 1, 3)).toEqual(['Characters', 'CAC', 'Zac_Base', 'Zac'])
  })

  it('applyCharacterRenameInPath propaga nome do campeão em todos os segmentos', () => {
    const segments = ['Characters', 'Zac', 'CAC', 'Zac_Base']
    expect(applyCharacterRenameInPath(segments, 1, 'Lulu')).toEqual([
      'Characters',
      'Lulu',
      'CAC',
      'Lulu_Base',
    ])
  })

  it('formatLinkPathPreview trunca caminhos longos', () => {
    const long = 'Characters/Zac/Skins/Skin0/Particles/Zac_Base_Q_tar'
    expect(formatLinkPathPreview(long, 20).startsWith('…')).toBe(true)
  })
})
