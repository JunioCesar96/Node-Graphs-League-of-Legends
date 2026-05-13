import { describe, expect, it } from 'vitest'

import { nomenclatureGroupNumberFromLabel } from './nodeStructureJson'

describe('nomenclatureGroupNumberFromLabel', () => {
  it('extrai o número após #', () => {
    expect(nomenclatureGroupNumberFromLabel('#2 Entidades')).toBe(2)
    expect(nomenclatureGroupNumberFromLabel('  #12 X')).toBe(12)
  })

  it('devolve null se não houver padrão', () => {
    expect(nomenclatureGroupNumberFromLabel(undefined)).toBeNull()
    expect(nomenclatureGroupNumberFromLabel('Sem número')).toBeNull()
  })
})
