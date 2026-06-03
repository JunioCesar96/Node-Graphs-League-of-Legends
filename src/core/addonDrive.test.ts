import { describe, expect, it } from 'vitest'

import {
  hasTargetedInputChangeDrive,
  isGlobalInputReactiveDrive,
  matchesAddonDriveElementId,
  parseAddonDrive,
  parseAddonDriveField,
  resolveAddonDrives,
  shouldRunInputDriveForTarget,
} from './addonDrive'

describe('addonDrive', () => {
  it('parseAddonDrive aceita drives simples', () => {
    expect(parseAddonDrive('inputChange')).toBe('inputChange')
    expect(parseAddonDrive('always')).toBe('always')
    expect(parseAddonDrive('manual')).toBe('manual')
  })

  it('parseAddonDrive aceita inputChange{id}', () => {
    expect(parseAddonDrive('inputChange{folder-input}')).toEqual({
      kind: 'inputChange',
      inputId: 'folder-input',
    })
  })

  it('parseAddonDrive aceita buttonClick{id}', () => {
    expect(parseAddonDrive('buttonClick{loadImages}')).toEqual({
      kind: 'buttonClick',
      buttonId: 'loadImages',
    })
  })

  it('parseAddonDriveField aceita array de acionamentos', () => {
    const drives = parseAddonDriveField([
      'inputChange{folder-input}',
      'buttonClick{loadImages}',
      'inputChange{index-input}',
    ])
    expect(drives).toHaveLength(3)
    expect(drives?.[0]).toEqual({ kind: 'inputChange', inputId: 'folder-input' })
    expect(drives?.[1]).toEqual({ kind: 'buttonClick', buttonId: 'loadImages' })
    expect(drives?.[2]).toEqual({ kind: 'inputChange', inputId: 'index-input' })
  })

  it('parseAddonDrive rejeita formato inválido', () => {
    expect(parseAddonDrive('inputChange{}')).toBeNull()
    expect(parseAddonDrive('buttonClick')).toBeNull()
    expect(parseAddonDrive('buttonClick{}')).toBeNull()
    expect(parseAddonDrive('invalid')).toBeNull()
    expect(parseAddonDriveField([])).toBeNull()
    expect(parseAddonDriveField(['invalid'])).toBeNull()
  })

  it('resolveAddonDrives normaliza drive único ou lista', () => {
    expect(resolveAddonDrives('inputChange')).toEqual(['inputChange'])
    expect(resolveAddonDrives([{ kind: 'buttonClick', buttonId: 'go' }])).toHaveLength(1)
  })

  it('shouldRunInputDriveForTarget com vários inputChange{id}', () => {
    const drives = parseAddonDriveField([
      'inputChange{folder-input}',
      'inputChange{index-input}',
    ])!
    const folder = document.createElement('input')
    folder.id = 'folder-input'
    const index = document.createElement('input')
    index.id = 'index-input'
    const other = document.createElement('input')
    other.id = 'other'

    expect(shouldRunInputDriveForTarget(drives, folder, new Set())).toBe(true)
    expect(shouldRunInputDriveForTarget(drives, index, new Set())).toBe(true)
    expect(shouldRunInputDriveForTarget(drives, other, new Set())).toBe(false)
  })

  it('isTargetedInputChangeDrive distingue de inputChange global', () => {
    const targeted = parseAddonDrive('inputChange{folder-input}')
    expect(hasTargetedInputChangeDrive([targeted!])).toBe(true)
    expect(isGlobalInputReactiveDrive('inputChange')).toBe(true)
    expect(isGlobalInputReactiveDrive(targeted!)).toBe(false)
  })

  it('matchesAddonDriveElementId aceita camelCase e kebab-case', () => {
    expect(matchesAddonDriveElementId('folderInput', 'folder-input')).toBe(true)
    expect(matchesAddonDriveElementId('loadImages', 'load-images')).toBe(true)
    expect(matchesAddonDriveElementId('loadImages', 'other')).toBe(false)
  })
})
