import { describe, expect, it, beforeEach } from 'vitest'

import { staticCanvasScene } from '@/core/canvasScene'
import { SCENE_STORAGE_KEY } from '@/core/sceneStorage'
import {
  MAX_RECENT_SCENES,
  STORAGE_SCENE_TABS_KEY,
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
    pushRecentScene('A', staticCanvasScene)
    pushRecentScene('B', staticCanvasScene)
    pushRecentScene('A', staticCanvasScene)

    const list = loadRecentSceneList()
    expect(list).toHaveLength(2)
    expect(list[0]?.title).toBe('A')
    expect(list[1]?.title).toBe('B')
  })

  it('deduplica por sourceFileName', () => {
    pushRecentScene('foo', staticCanvasScene, 'foo.json')
    pushRecentScene('bar', staticCanvasScene, 'bar.json')
    pushRecentScene('outro-titulo', staticCanvasScene, 'foo.json')

    const list = loadRecentSceneList()
    expect(list).toHaveLength(2)
    expect(list[0]?.sourceFileName).toBe('foo.json')
  })

  it('limita ao máximo de entradas', () => {
    for (let index = 0; index < MAX_RECENT_SCENES + 3; index += 1) {
      pushRecentScene(`Cena ${index}`, staticCanvasScene)
    }

    expect(loadRecentSceneList()).toHaveLength(MAX_RECENT_SCENES)
  })
})

describe('getInitialSceneTabsPersisted', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('migra cena legacy quando não há tabs', () => {
    localStorage.setItem(SCENE_STORAGE_KEY, JSON.stringify(staticCanvasScene))

    const initial = getInitialSceneTabsPersisted()

    expect(initial.tabs).toHaveLength(1)
    expect(initial.tabs[0]?.title).toBe('Cena guardada')
    expect(initial.activeTabId).toBe(initial.tabs[0]?.id)
  })

  it('restaura tabs persistidos', () => {
    const payload = getInitialSceneTabsPersisted()
    localStorage.setItem(STORAGE_SCENE_TABS_KEY, JSON.stringify(payload))

    const loaded = loadSceneTabsPersisted()

    expect(loaded?.tabs).toHaveLength(payload.tabs.length)
    expect(loaded?.activeTabId).toBe(payload.activeTabId)
  })
})
