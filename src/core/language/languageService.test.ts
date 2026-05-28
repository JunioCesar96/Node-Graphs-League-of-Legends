import { describe, expect, it } from 'vitest'

import { isValidLanguageLocaleId, pickInitialLanguageLocale } from './languageService'

describe('languageService', () => {
  it('validates locale ids', () => {
    expect(isValidLanguageLocaleId('en')).toBe(true)
    expect(isValidLanguageLocaleId('pt-br')).toBe(true)
    expect(isValidLanguageLocaleId('../etc')).toBe(false)
    expect(isValidLanguageLocaleId('')).toBe(false)
  })

  it('picks stored, default, or first available locale', () => {
    expect(pickInitialLanguageLocale(['en', 'pt-br'], 'pt-br')).toBe('pt-br')
    expect(pickInitialLanguageLocale(['en', 'pt-br'], 'es')).toBe('en')
    expect(pickInitialLanguageLocale(['pt-br'], null)).toBe('pt-br')
    expect(pickInitialLanguageLocale([], null)).toBe('en')
  })
})
