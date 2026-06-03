import { describe, expect, it } from 'vitest'

import { resolveAddonI18nText } from './addonLanguage'

describe('addonLanguage', () => {
  const pack = {
    0: 'Galeria',
    2: 'Índice',
    7: 'Índice da imagem atual',
  }

  it('resolve {n} e [{n}]', () => {
    expect(resolveAddonI18nText('[{0}]', pack)).toBe('Galeria')
    expect(resolveAddonI18nText('{2}', pack)).toBe('Índice')
    expect(resolveAddonI18nText('Sem chave', pack)).toBe('Sem chave')
  })
})
