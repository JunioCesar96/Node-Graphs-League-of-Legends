import { useCallback, useMemo, useRef, useState } from 'react'

import type { SceneJsonFileContext } from '@/core/sceneJsonFileSave'
import {
  createDefaultTabSnapshot,
  createEmptyWorkspaceSnapshot,
  getInitialSceneTabsPersisted,
  loadRecentSceneList,
  loadRecentSceneById,
  pushRecentScene,
  saveSceneTabsPersistedPresentOnly,
  snapshotFromScene,
  stripExtension,
  uniqueTabTitle,
  type RecentSceneListItem,
  type SceneTabSnapshot,
  type SceneTabsPersisted,
} from '@/core/sceneTabsStorage'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { saveSceneJsonManual } from '@/core/sceneJsonFileSave'
import { useSceneHistory } from '@/hooks/useSceneHistory'

export type UseSceneTabsOptions = {
  extendSchemaLookup?: Record<string, NodeSchemaDefinition>
  lightModeEnabled?: boolean
}

export function useSceneTabs(options?: UseSceneTabsOptions) {
  const initialPersisted = useMemo(() => getInitialSceneTabsPersisted(), [])
  const activeInitial = initialPersisted.tabs.find((tab) => tab.id === initialPersisted.activeTabId)

  const [tabsPersisted, setTabsPersisted] = useState<SceneTabsPersisted>(initialPersisted)
  const [recentScenes, setRecentScenes] = useState<RecentSceneListItem[]>(() => loadRecentSceneList())
  const jsonFileContextByTabRef = useRef<Map<string, SceneJsonFileContext>>(new Map())

  const hasOpenSceneTabs = tabsPersisted.tabs.length > 0

  const activeTab = tabsPersisted.tabs.find((tab) => tab.id === tabsPersisted.activeTabId)

  const sceneHistoryApi = useSceneHistory({
    extendSchemaLookup: options?.extendSchemaLookup,
    initialTabSnapshot: activeInitial,
    lightModeEnabled: options?.lightModeEnabled,
  })

  const { getTabSnapshot, applyTabSnapshot, sceneHistory, scene } = sceneHistoryApi

  const setTabJsonFileContext = useCallback((tabId: string, context: SceneJsonFileContext) => {
    jsonFileContextByTabRef.current.set(tabId, context)
    setTabsPersisted((previous) => ({
      ...previous,
      tabs: previous.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, jsonFileName: context.fileName } : tab,
      ),
    }))
  }, [])

  const activeTabTitle = activeTab?.title ?? ''
  const activeTabJsonFileName = activeTab?.jsonFileName

  const tabBarItems = useMemo(
    () =>
      tabsPersisted.tabs.map((tab) => ({
        id: tab.id,
        title: tab.id === activeTab?.id ? activeTabTitle : tab.title,
        isActive: tab.id === tabsPersisted.activeTabId,
        hasUndo: tab.id === activeTab?.id ? sceneHistory.past.length > 0 : tab.past.length > 0,
      })),
    [tabsPersisted.tabs, tabsPersisted.activeTabId, activeTab, activeTabTitle, sceneHistory.past.length],
  )

  const flushTabsToLocalStorage = useCallback((data: SceneTabsPersisted) => {
    saveSceneTabsPersistedPresentOnly(data)
  }, [])

  const refreshRecentList = useCallback(() => {
    setRecentScenes(loadRecentSceneList())
  }, [])

  const mergeActiveSnapshotIntoTabs = useCallback(
    (tabs: SceneTabSnapshot[]): SceneTabSnapshot[] => {
      if (!activeTab) {
        return tabs
      }

      const snap = getTabSnapshot(activeTab.id, activeTab.title)
      const withFileName = activeTab.jsonFileName ? { ...snap, jsonFileName: activeTab.jsonFileName } : snap

      return tabs.map((tab) => (tab.id === withFileName.id ? withFileName : tab))
    },
    [activeTab, getTabSnapshot],
  )

  const activateTab = useCallback(
    (tabId: string) => {
      if (tabId === tabsPersisted.activeTabId) {
        return
      }

      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const target = mergedTabs.find((tab) => tab.id === tabId)

      if (!target) {
        return
      }

      applyTabSnapshot(target)
      const next: SceneTabsPersisted = { activeTabId: tabId, tabs: mergedTabs }
      setTabsPersisted(next)
      flushTabsToLocalStorage(next)
    },
    [
      applyTabSnapshot,
      flushTabsToLocalStorage,
      mergeActiveSnapshotIntoTabs,
      tabsPersisted.activeTabId,
      tabsPersisted.tabs,
    ],
  )

  const createWorkScene = useCallback(
    (requestedTitle: string) => {
      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const title = uniqueTabTitle(
        requestedTitle,
        mergedTabs.map((tab) => tab.title),
      )
      const newTab = createDefaultTabSnapshot(title)

      applyTabSnapshot(newTab, { initMainEntriesVfxIndex: true })
      const next: SceneTabsPersisted = {
        activeTabId: newTab.id,
        tabs: [...mergedTabs, newTab],
      }
      setTabsPersisted(next)
      flushTabsToLocalStorage(next)
    },
    [applyTabSnapshot, flushTabsToLocalStorage, mergeActiveSnapshotIntoTabs, tabsPersisted.tabs],
  )

  const openSceneInNewTab = useCallback(
    (
      requestedTitle: string,
      nextScene: CanvasScene,
      options?: { addToRecents?: boolean; sourceFileName?: string },
    ): string => {
      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const title = uniqueTabTitle(
        requestedTitle,
        mergedTabs.map((tab) => tab.title),
      )
      const jsonFileName = options?.sourceFileName?.trim()
      const newTab = snapshotFromScene(title, nextScene, jsonFileName)

      if (options?.addToRecents !== false) {
        pushRecentScene(title, nextScene, options?.sourceFileName)
        refreshRecentList()
      }

      if (jsonFileName) {
        jsonFileContextByTabRef.current.set(newTab.id, { fileName: jsonFileName, handle: null })
      }

      applyTabSnapshot(newTab, { initMainEntriesVfxIndex: true })
      const next: SceneTabsPersisted = {
        activeTabId: newTab.id,
        tabs: [...mergedTabs, newTab],
      }
      setTabsPersisted(next)
      flushTabsToLocalStorage(next)
      return newTab.id
    },
    [
      applyTabSnapshot,
      flushTabsToLocalStorage,
      mergeActiveSnapshotIntoTabs,
      refreshRecentList,
      tabsPersisted.tabs,
    ],
  )

  const openOrReplaceSceneByTitle = useCallback(
    (requestedTitle: string, nextScene: CanvasScene): string => {
      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const title = requestedTitle.trim() || 'Cena'
      const existing = mergedTabs.find((tab) => tab.title === title)

      if (existing) {
        const replacement = snapshotFromScene(title, nextScene, existing.jsonFileName)
        const updatedTab: SceneTabSnapshot = {
          ...replacement,
          id: existing.id,
        }

        applyTabSnapshot(updatedTab, { initMainEntriesVfxIndex: true })
        const next: SceneTabsPersisted = {
          activeTabId: existing.id,
          tabs: mergedTabs.map((tab) => (tab.id === existing.id ? updatedTab : tab)),
        }
        setTabsPersisted(next)
        flushTabsToLocalStorage(next)
        pushRecentScene(title, nextScene)
        refreshRecentList()
        return existing.id
      }

      return openSceneInNewTab(title, nextScene, { addToRecents: true })
    },
    [
      applyTabSnapshot,
      flushTabsToLocalStorage,
      mergeActiveSnapshotIntoTabs,
      openSceneInNewTab,
      refreshRecentList,
      tabsPersisted.tabs,
    ],
  )

  const openRecentScene = useCallback(
    (recentId: string) => {
      const entry = loadRecentSceneById(recentId)

      if (!entry) {
        refreshRecentList()
        return
      }

      const matchKey = entry.sourceFileName ?? entry.title
      const existing = tabsPersisted.tabs.find(
        (tab) => tab.jsonFileName === entry.sourceFileName || tab.title === entry.title,
      )

      if (existing) {
        activateTab(existing.id)
        return
      }

      openSceneInNewTab(entry.title, entry.scene, {
        addToRecents: false,
        sourceFileName: entry.sourceFileName ?? `${matchKey}.json`,
      })
      pushRecentScene(entry.title, entry.scene, entry.sourceFileName)
      refreshRecentList()
    },
    [activateTab, openSceneInNewTab, refreshRecentList, tabsPersisted.tabs],
  )

  const closeTab = useCallback(
    (tabId: string): boolean => {
      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const closing = mergedTabs.find((tab) => tab.id === tabId)

      if (!closing) {
        return false
      }

      const hasEdits =
        tabId === tabsPersisted.activeTabId ? sceneHistory.past.length > 0 : closing.past.length > 0

      if (hasEdits) {
        const ok = window.confirm(
          `Fechar a cena «${closing.title}»? As alterações não guardadas em ficheiro serão perdidas.`,
        )

        if (!ok) {
          return false
        }
      }

      jsonFileContextByTabRef.current.delete(tabId)
      const remaining = mergedTabs.filter((tab) => tab.id !== tabId)

      if (remaining.length === 0) {
        applyTabSnapshot(createEmptyWorkspaceSnapshot())
        const next: SceneTabsPersisted = { activeTabId: '', tabs: [] }
        setTabsPersisted(next)
        flushTabsToLocalStorage(next)
        return true
      }

      if (tabId === tabsPersisted.activeTabId) {
        const nextActive = remaining[remaining.length - 1]!

        applyTabSnapshot(nextActive)
        const next: SceneTabsPersisted = { activeTabId: nextActive.id, tabs: remaining }
        setTabsPersisted(next)
        flushTabsToLocalStorage(next)
      } else {
        const next: SceneTabsPersisted = {
          activeTabId: tabsPersisted.activeTabId,
          tabs: remaining,
        }
        setTabsPersisted(next)
        flushTabsToLocalStorage(next)
      }

      return true
    },
    [
      applyTabSnapshot,
      flushTabsToLocalStorage,
      mergeActiveSnapshotIntoTabs,
      sceneHistory.past.length,
      tabsPersisted.activeTabId,
      tabsPersisted.tabs,
    ],
  )

  const renameTab = useCallback(
    (tabId: string, requestedTitle: string) => {
      const trimmed = requestedTitle.trim()

      if (!trimmed) {
        return false
      }

      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const others = mergedTabs.filter((tab) => tab.id !== tabId).map((tab) => tab.title)
      const title = uniqueTabTitle(trimmed, others)

      setTabsPersisted((previous) => ({
        ...previous,
        tabs: previous.tabs.map((tab) => (tab.id === tabId ? { ...tab, title } : tab)),
      }))

      return true
    },
    [mergeActiveSnapshotIntoTabs, tabsPersisted.tabs],
  )

  const saveSceneTab = useCallback(
    async (tabId: string) => {
      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const tab = mergedTabs.find((entry) => entry.id === tabId)

      if (!tab) {
        return { cancelled: true as const }
      }

      const sceneToSave =
        tabId === tabsPersisted.activeTabId ? sceneHistory.present : tab.present
      const suggested = tab.jsonFileName ?? `${tab.title}.json`
      const result = await saveSceneJsonManual(sceneToSave, suggested)

      if (!result.cancelled) {
        jsonFileContextByTabRef.current.set(tabId, {
          fileName: result.fileName,
          handle: result.handle,
        })

        const displayTitle = stripExtension(result.fileName)
        const others = mergedTabs.filter((entry) => entry.id !== tabId).map((entry) => entry.title)
        const title = uniqueTabTitle(displayTitle, others)

        setTabsPersisted((previous) => ({
          ...previous,
          tabs: previous.tabs.map((entry) =>
            entry.id === tabId ? { ...entry, title, jsonFileName: result.fileName } : entry,
          ),
        }))
      }

      return result
    },
    [
      mergeActiveSnapshotIntoTabs,
      sceneHistory.present,
      tabsPersisted.activeTabId,
      tabsPersisted.tabs,
    ],
  )

  const promptNewWorkScene = useCallback(() => {
    const raw = window.prompt('Nome da cena de trabalho:', 'Nova cena')

    if (raw === null) {
      return
    }

    const trimmed = raw.trim()

    if (!trimmed) {
      window.alert('Indica um nome para a cena.')
      return
    }

    createWorkScene(trimmed)
  }, [createWorkScene])

  return {
    ...sceneHistoryApi,
    scene,
    tabBarItems,
    recentScenes,
    hasOpenSceneTabs,
    activeTabId: tabsPersisted.activeTabId,
    activeTabTitle,
    activeTabJsonFileName,
    activateTab,
    closeTab,
    createWorkScene,
    renameTab,
    saveSceneTab,
    openSceneInNewTab,
    openOrReplaceSceneByTitle,
    openRecentScene,
    promptNewWorkScene,
    setTabJsonFileContext,
  }
}
