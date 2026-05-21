import { describe, expect, it, beforeEach } from 'vitest'

import { emptyCanvasScene } from '@/core/canvasScene'
import { SCENE_STORAGE_KEY } from '@/core/sceneStorage'
import {
  MAX_RECENT_SCENES,
  STORAGE_SCENE_TABS_KEY,
  createDefaultTabSnapshot,
  getInitialSceneTabsPersisted,
  loadRecentSceneList,
  loadSceneTabsPersisted,
  pushRecentScene,
  stripExtension,
  uniqueTabTitle,
} from '@/core/sceneTabsStorage'

describe('stripExtension', () => {
  it('remove extensão json', () => {
    expect(stripExtension('teste.json')).toBe('teste')
  })

  it('mantém nome sem extensão', () => {
    expect(stripExtension('minha-cena')).toBe('minha-cena')
  })

  it('não remove ponto inicial', () => {
    expect(stripExtension('.hidden')).toBe('.hidden')
  })
})

describe('uniqueTabTitle', () => {
  it('devolve base se livre', () => {
    expect(uniqueTabTitle('Foo', ['Bar'])).toBe('Foo')
  })

  it('acrescenta sufixo numérico se duplicado', () => {
    expect(uniqueTabTitle('Foo', ['Foo'])).toBe('Foo (2)')
    expect(uniqueTabTitle('Foo', ['Foo', 'Foo (2)'])).toBe('Foo (3)')
  })
})

describe('pushRecentScene', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('deduplica por título e promove ao topo', () => {
    pushRecentScene('A', emptyCanvasScene)
    pushRecentScene('B', emptyCanvasScene)
    pushRecentScene('A', emptyCanvasScene)

    const list = loadRecentSceneList()
    expect(list).toHaveLength(2)
    expect(list[0]?.title).toBe('A')
    expect(list[1]?.title).toBe('B')
  })

  it('deduplica por sourceFileName', () => {
    pushRecentScene('foo', emptyCanvasScene, 'foo.json')
    pushRecentScene('bar', emptyCanvasScene, 'bar.json')
    pushRecentScene('outro-titulo', emptyCanvasScene, 'foo.json')

    const list = loadRecentSceneList()
    expect(list).toHaveLength(2)
    expect(list[0]?.sourceFileName).toBe('foo.json')
  })

  it('limita ao máximo de entradas', () => {
    for (let index = 0; index < MAX_RECENT_SCENES + 3; index += 1) {
      pushRecentScene(`Cena ${index}`, emptyCanvasScene)
    }

    expect(loadRecentSceneList()).toHaveLength(MAX_RECENT_SCENES)
  })
})

describe('getInitialSceneTabsPersisted', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('começa sem abas quando não há legacy nem tabs guardados', () => {
    const initial = getInitialSceneTabsPersisted()

    expect(initial.tabs).toHaveLength(0)
    expect(initial.activeTabId).toBe('')
  })

  it('migra cena legacy quando não há tabs', () => {
    localStorage.removeItem(STORAGE_SCENE_TABS_KEY)
    // Cena mínima no storage legacy (o payload completo de emptyCanvasScene excede quota em jsdom).
    localStorage.setItem(
      SCENE_STORAGE_KEY,
      JSON.stringify({ width: 1120, height: 760, nodes: [], connections: [] }),
    )

    expect(localStorage.getItem(SCENE_STORAGE_KEY)).not.toBeNull()

    const initial = getInitialSceneTabsPersisted()

    expect(initial.tabs).toHaveLength(1)
    expect(initial.tabs[0]?.title).toBe('Cena 1')
    expect(initial.activeTabId).toBe(initial.tabs[0]?.id)
  })

  it('restaura tabs persistidos', () => {
    const tab = createDefaultTabSnapshot('Cena teste')
    const payload = { activeTabId: tab.id, tabs: [tab] }
    localStorage.setItem(STORAGE_SCENE_TABS_KEY, JSON.stringify(payload))

    const loaded = loadSceneTabsPersisted()

    expect(loaded?.tabs).toHaveLength(1)
    expect(loaded?.activeTabId).toBe(tab.id)
  })

  it('restaura estado sem abas abertas', () => {
    localStorage.setItem(
      STORAGE_SCENE_TABS_KEY,
      JSON.stringify({ activeTabId: '', tabs: [] }),
    )

    const loaded = loadSceneTabsPersisted()

    expect(loaded?.tabs).toHaveLength(0)
    expect(loaded?.activeTabId).toBe('')
  })
})
