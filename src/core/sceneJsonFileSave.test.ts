import { describe, expect, it } from 'vitest'

import { normalizeSceneJsonFileName } from '@/core/sceneJsonFileSave'

describe('normalizeSceneJsonFileName', () => {
  it('adiciona .json se ausente', () => {
    expect(normalizeSceneJsonFileName('minha-cena')).toBe('minha-cena.json')
  })

  it('mantém um único sufixo .json', () => {
    expect(normalizeSceneJsonFileName('teste.json')).toBe('teste.json')
  })

  it('substitui caracteres inválidos', () => {
    expect(normalizeSceneJsonFileName('a<b>:c')).toBe('a_b__c.json')
  })

  it('fallback para nome vazio', () => {
    expect(normalizeSceneJsonFileName('   ')).toBe('cena.json')
  })
})
