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
  countNodesInTabsPersist,
  saveSceneTabsPersistedPresentOnly,
  SCENE_TABS_PERSIST_MAX_NODES,
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

  it('não restaura cena legacy ao iniciar', () => {
    localStorage.removeItem(STORAGE_SCENE_TABS_KEY)
    localStorage.setItem(
      SCENE_STORAGE_KEY,
      JSON.stringify({ width: 1120, height: 760, nodes: [], connections: [] }),
    )

    const initial = getInitialSceneTabsPersisted()

    expect(initial.tabs).toHaveLength(0)
    expect(initial.activeTabId).toBe('')
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

describe('saveSceneTabsPersistedPresentOnly', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('grava abas sem stacks undo no localStorage', () => {
    const tab = createDefaultTabSnapshot('Cena teste')
    tab.past = [emptyCanvasScene]
    tab.future = [emptyCanvasScene]

    saveSceneTabsPersistedPresentOnly({ activeTabId: tab.id, tabs: [tab] })

    const raw = localStorage.getItem(STORAGE_SCENE_TABS_KEY)
    expect(raw).not.toBeNull()

    const parsed = JSON.parse(raw!) as { tabs: Array<{ past: unknown[]; future: unknown[] }> }
    expect(parsed.tabs[0]?.past).toEqual([])
    expect(parsed.tabs[0]?.future).toEqual([])
  })

  it('não grava quando o total de nós excede o limite', () => {
    const tab = createDefaultTabSnapshot('Grande')
    const stubNode = {
      id: 'stub',
      position: { x: 0, y: 0 },
      node: {
        schema: { id: 's', title: 's', parameters: [], internalStructures: [] },
        values: [],
      },
    }
    const manyNodes = Array.from({ length: SCENE_TABS_PERSIST_MAX_NODES + 1 }, (_, index) => ({
      ...stubNode,
      id: `n-${index}`,
    }))
    tab.present = { ...tab.present, nodes: manyNodes }

    const ok = saveSceneTabsPersistedPresentOnly({ activeTabId: tab.id, tabs: [tab] })

    expect(ok).toBe(false)
    expect(localStorage.getItem(STORAGE_SCENE_TABS_KEY)).toBeNull()
    expect(countNodesInTabsPersist({ activeTabId: tab.id, tabs: [tab] })).toBeGreaterThan(
      SCENE_TABS_PERSIST_MAX_NODES,
    )
  })
})
