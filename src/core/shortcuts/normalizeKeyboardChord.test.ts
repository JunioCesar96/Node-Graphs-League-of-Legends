import { describe, expect, it } from 'vitest'

import {
  chordIdFromBinding,
  normalizeKeyboardChord,
  resolveLogicalKey,
} from './normalizeKeyboardChord'
import { buildShortcutScopeIndex, dispatchShortcut } from './shortcutDispatcher'
import type { ShortcutsRegistry } from './shortcutTypes'
import {
  SHORTCUT_SCOPE_GRAPH_CANVAS,
  SHORTCUT_SCOPE_VFX_DOCK,
  SHORTCUT_SCOPE_VFX_VIEWPORT,
} from './shortcutScopes'

describe('normalizeKeyboardChord', () => {
  it('normaliza Digit7 para tecla lógica 7', () => {
    const event = new KeyboardEvent('keydown', { code: 'Digit7', key: '7' })
    expect(resolveLogicalKey(event)).toBe('7')
    expect(normalizeKeyboardChord(event).chordId).toBe('7')
  })

  it('constrói chordId com modificadores ordenados', () => {
    expect(chordIdFromBinding('z', ['ctrl', 'shift'])).toBe('ctrl+shift+z')
  })
})

describe('dispatchShortcut scope gating', () => {
  const miniRegistry: ShortcutsRegistry = {
    scopes: [
      { id: SHORTCUT_SCOPE_GRAPH_CANVAS, label: 'Graph' },
      { id: SHORTCUT_SCOPE_VFX_VIEWPORT, label: 'VFX' },
    ],
    bindings: [
      {
        id: 'test-vfx-seven',
        scopeId: SHORTCUT_SCOPE_VFX_VIEWPORT,
        key: '7',
        modifiers: [],
        requiresOpen: ['vfx-dock'],
      },
    ],
  }

  const scopeIndex = buildShortcutScopeIndex(miniRegistry)
  let handled = false

  const handlers = {
    'test-vfx-seven': () => {
      handled = true
      return true
    },
  }

  it('ignora atalho VFX quando scope activo é graph-canvas', () => {
    handled = false
    const event = new KeyboardEvent('keydown', { code: 'Digit7', key: '7', bubbles: true })
    const result = dispatchShortcut({
      event,
      registry: miniRegistry,
      scopeIndex,
      activeScopeId: SHORTCUT_SCOPE_GRAPH_CANVAS,
      openDocks: { 'vfx-dock': true, 'code-dock': false, 'node-palette': false },
      handlers,
    })
    expect(result).toBe(false)
    expect(handled).toBe(false)
  })

  it('executa atalho VFX com scope vfx-viewport e dock aberto', () => {
    handled = false
    const event = new KeyboardEvent('keydown', { code: 'Digit7', key: '7', bubbles: true })
    const result = dispatchShortcut({
      event,
      registry: miniRegistry,
      scopeIndex,
      activeScopeId: SHORTCUT_SCOPE_VFX_VIEWPORT,
      openDocks: { 'vfx-dock': true, 'code-dock': false, 'node-palette': false },
      handlers,
    })
    expect(result).toBe(true)
    expect(handled).toBe(true)
  })

  it('aceita eventTypes como array (registry JSON)', () => {
    handled = false
    const registryWithKeyup: ShortcutsRegistry = {
      scopes: miniRegistry.scopes,
      bindings: [
        {
          ...miniRegistry.bindings[0]!,
          eventTypes: ['keydown', 'keyup'],
        },
      ],
    }
    const index = buildShortcutScopeIndex(registryWithKeyup)
    const event = new KeyboardEvent('keyup', { code: 'Digit7', key: '7', bubbles: true })
    const result = dispatchShortcut({
      event,
      registry: registryWithKeyup,
      scopeIndex: index,
      activeScopeId: SHORTCUT_SCOPE_VFX_VIEWPORT,
      openDocks: { 'vfx-dock': true, 'code-dock': false, 'node-palette': false },
      handlers,
    })
    expect(result).toBe(true)
    expect(handled).toBe(true)
  })

  it('executa isolamento VFX com Ctrl+Space no scope vfx-dock', () => {
    const registryWithIsolation: ShortcutsRegistry = {
      scopes: [
        { id: SHORTCUT_SCOPE_VFX_DOCK, label: 'VFX Dock' },
        { id: SHORTCUT_SCOPE_VFX_VIEWPORT, label: 'VFX Viewport' },
      ],
      bindings: [
        {
          id: 'vfx-window-isolation',
          scopeId: SHORTCUT_SCOPE_VFX_DOCK,
          key: ' ',
          modifiers: ['ctrl'],
          requiresOpen: ['vfx-dock'],
        },
      ],
    }
    const index = buildShortcutScopeIndex(registryWithIsolation)
    let handled = false
    const event = new KeyboardEvent('keydown', { code: 'Space', key: ' ', ctrlKey: true, bubbles: true })
    const result = dispatchShortcut({
      event,
      registry: registryWithIsolation,
      scopeIndex: index,
      activeScopeId: SHORTCUT_SCOPE_VFX_DOCK,
      openDocks: { 'vfx-dock': true, 'code-dock': false, 'node-palette': false },
      handlers: {
        'vfx-window-isolation': () => {
          handled = true
          return true
        },
      },
    })
    expect(result).toBe(true)
    expect(handled).toBe(true)
  })
})
