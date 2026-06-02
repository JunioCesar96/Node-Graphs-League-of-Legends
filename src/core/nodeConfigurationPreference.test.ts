import { describe, expect, it, beforeEach } from 'vitest'

import {
  DEFAULT_CLASS_GROUP_PACK_FOLDER,
  DEFAULT_CODE_TO_NODE_GRAPH_PACK_FOLDER,
  STORAGE_CLASS_GROUP_PACK_FOLDER_KEY,
  STORAGE_CODE_TO_NODE_GRAPH_PACK_FOLDER_KEY,
  getClassGroupConverterPackFolder,
  getCodeToNodeGraphPackFolder,
  parseClassGroupPackFolderName,
  setClassGroupConverterPackFolder,
  setCodeToNodeGraphPackFolder,
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

  it('usa default por defeito em Code To Node Graph', () => {
    window.localStorage.removeItem(STORAGE_CODE_TO_NODE_GRAPH_PACK_FOLDER_KEY)
    expect(getCodeToNodeGraphPackFolder()).toBe(DEFAULT_CODE_TO_NODE_GRAPH_PACK_FOLDER)
  })

  it('persiste pasta Code To Node Graph', () => {
    window.localStorage.removeItem(STORAGE_CODE_TO_NODE_GRAPH_PACK_FOLDER_KEY)
    expect(setCodeToNodeGraphPackFolder('meu-pack')).toBe('meu-pack')
    expect(getCodeToNodeGraphPackFolder()).toBe('meu-pack')
  })
})
