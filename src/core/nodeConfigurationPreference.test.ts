import { describe, expect, it, beforeEach } from 'vitest'

import {
  DEFAULT_CLASS_GROUP_PACK_FOLDER,
  STORAGE_CLASS_GROUP_PACK_FOLDER_KEY,
  getClassGroupConverterPackFolder,
  parseClassGroupPackFolderName,
  setClassGroupConverterPackFolder,
} from '@/core/nodeConfigurationPreference'

describe('nodeConfigurationPreference', () => {
  beforeEach(() => {
    window.localStorage.removeItem(STORAGE_CLASS_GROUP_PACK_FOLDER_KEY)
  })

  it('usa importado por defeito', () => {
    expect(getClassGroupConverterPackFolder()).toBe(DEFAULT_CLASS_GROUP_PACK_FOLDER)
  })

  it('persiste e sanitiza o nome da pasta', () => {
    expect(setClassGroupConverterPackFolder('  Meu Pack  ')).toBe('meu-pack')
    expect(getClassGroupConverterPackFolder()).toBe('meu-pack')
  })

  it('permite default com allowDefault', () => {
    expect(parseClassGroupPackFolderName('default', { allowDefault: true })).toBe('default')
    expect(setClassGroupConverterPackFolder('default')).toBe('default')
    expect(getClassGroupConverterPackFolder()).toBe('default')
  })

  it('bloqueia default sem allowDefault', () => {
    expect(parseClassGroupPackFolderName('default')).toBeNull()
    expect(setClassGroupConverterPackFolder('')).toBeNull()
    expect(getClassGroupConverterPackFolder()).toBe(DEFAULT_CLASS_GROUP_PACK_FOLDER)
  })
})
