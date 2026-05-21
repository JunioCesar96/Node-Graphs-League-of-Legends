import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  JSON_AUTO_SAVE_DEBOUNCE_MS,
  saveSceneJsonAuto,
  type SceneJsonFileContext,
} from '@/core/sceneJsonFileSave'
import {
  createDefaultTabSnapshot,
  getInitialSceneTabsPersisted,
  loadRecentSceneList,
  loadRecentSceneById,
  pushRecentScene,
  saveSceneTabsPersisted,
  snapshotFromScene,
  uniqueTabTitle,
  type RecentSceneListItem,
  type SceneTabSnapshot,
  type SceneTabsPersisted,
} from '@/core/sceneTabsStorage'
import type { CanvasScene } from '@/core/canvasScene'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { useSceneHistory } from '@/hooks/useSceneHistory'

const TABS_PERSIST_DEBOUNCE_MS = 300

export type UseSceneTabsOptions = {
  extendSchemaLookup?: Record<string, NodeSchemaDefinition>
  jsonFileAutoSave?: boolean
}

export function useSceneTabs(options?: UseSceneTabsOptions) {
  const jsonFileAutoSave = options?.jsonFileAutoSave === true
  const initialPersisted = useMemo(() => getInitialSceneTabsPersisted(), [])
  const activeInitial = initialPersisted.tabs.find((tab) => tab.id === initialPersisted.activeTabId) ??
    initialPersisted.tabs[0]!

  const [tabsPersisted, setTabsPersisted] = useState<SceneTabsPersisted>(initialPersisted)
  const [recentScenes, setRecentScenes] = useState<RecentSceneListItem[]>(() => loadRecentSceneList())
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jsonAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const jsonFileContextByTabRef = useRef<Map<string, SceneJsonFileContext>>(new Map())

  const activeTab =
    tabsPersisted.tabs.find((tab) => tab.id === tabsPersisted.activeTabId) ?? tabsPersisted.tabs[0]!

  const scheduleJsonAutoSave = useCallback(
    (scene: CanvasScene) => {
      if (!jsonFileAutoSave) {
        return
      }

      if (jsonAutoSaveTimerRef.current !== null) {
        clearTimeout(jsonAutoSaveTimerRef.current)
      }

      jsonAutoSaveTimerRef.current = setTimeout(() => {
        jsonAutoSaveTimerRef.current = null
        const context = jsonFileContextByTabRef.current.get(activeTab.id) ?? null

        void saveSceneJsonAuto(scene, context)
      }, JSON_AUTO_SAVE_DEBOUNCE_MS)
    },
    [activeTab.id, jsonFileAutoSave],
  )

  const sceneHistoryApi = useSceneHistory({
    extendSchemaLookup: options?.extendSchemaLookup,
    jsonFileAutoSave,
    onAutoSaveScene: scheduleJsonAutoSave,
    initialTabSnapshot: activeInitial,
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

  const activeTabTitle = activeTab.title
  const activeTabJsonFileName = activeTab.jsonFileName

  const tabBarItems = useMemo(
    () =>
      tabsPersisted.tabs.map((tab) => ({
        id: tab.id,
        title: tab.id === activeTab.id ? activeTabTitle : tab.title,
        isActive: tab.id === tabsPersisted.activeTabId,
        hasUndo: tab.id === activeTab.id ? sceneHistory.past.length > 0 : tab.past.length > 0,
      })),
    [tabsPersisted.tabs, tabsPersisted.activeTabId, activeTab, activeTabTitle, sceneHistory.past.length],
  )

  const schedulePersistTabs = useCallback(() => {
    if (persistTimerRef.current !== null) {
      clearTimeout(persistTimerRef.current)
    }

    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null
      const snap = getTabSnapshot(activeTab.id, activeTab.title)
      const withFileName = activeTab.jsonFileName
        ? { ...snap, jsonFileName: activeTab.jsonFileName }
        : snap
      const merged: SceneTabsPersisted = {
        activeTabId: tabsPersisted.activeTabId,
        tabs: tabsPersisted.tabs.map((tab) => (tab.id === withFileName.id ? withFileName : tab)),
      }

      saveSceneTabsPersisted(merged)
    }, TABS_PERSIST_DEBOUNCE_MS)
  }, [
    activeTab.id,
    activeTab.title,
    activeTab.jsonFileName,
    getTabSnapshot,
    tabsPersisted.activeTabId,
    tabsPersisted.tabs,
  ])

  useEffect(() => {
    schedulePersistTabs()

    return () => {
      if (persistTimerRef.current !== null) {
        clearTimeout(persistTimerRef.current)
      }
      if (jsonAutoSaveTimerRef.current !== null) {
        clearTimeout(jsonAutoSaveTimerRef.current)
      }
    }
  }, [sceneHistory, tabsPersisted.activeTabId, schedulePersistTabs])

  const refreshRecentList = useCallback(() => {
    setRecentScenes(loadRecentSceneList())
  }, [])

  const mergeActiveSnapshotIntoTabs = useCallback(
    (tabs: SceneTabSnapshot[]): SceneTabSnapshot[] => {
      const snap = getTabSnapshot(activeTab.id, activeTab.title)
      const withFileName = activeTab.jsonFileName ? { ...snap, jsonFileName: activeTab.jsonFileName } : snap

      return tabs.map((tab) => (tab.id === withFileName.id ? withFileName : tab))
    },
    [activeTab.id, activeTab.title, activeTab.jsonFileName, getTabSnapshot],
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
      setTabsPersisted({ activeTabId: tabId, tabs: mergedTabs })
    },
    [applyTabSnapshot, mergeActiveSnapshotIntoTabs, tabsPersisted.activeTabId, tabsPersisted.tabs],
  )

  const createWorkScene = useCallback(
    (requestedTitle: string) => {
      const mergedTabs = mergeActiveSnapshotIntoTabs(tabsPersisted.tabs)
      const title = uniqueTabTitle(
        requestedTitle,
        mergedTabs.map((tab) => tab.title),
      )
      const newTab = createDefaultTabSnapshot(title)

      applyTabSnapshot(newTab)
      setTabsPersisted({
        activeTabId: newTab.id,
        tabs: [...mergedTabs, newTab],
      })
    },
    [applyTabSnapshot, mergeActiveSnapshotIntoTabs, tabsPersisted.tabs],
  )

  const openSceneInNewTab = useCallback(
    (
      requestedTitle: string,
      nextScene: CanvasScene,
      options?: { addToRecents?: boolean; sourceFileName?: string },
    ) => {
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

      applyTabSnapshot(newTab)
      setTabsPersisted({
        activeTabId: newTab.id,
        tabs: [...mergedTabs, newTab],
      })
    },
    [applyTabSnapshot, mergeActiveSnapshotIntoTabs, refreshRecentList, tabsPersisted.tabs],
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
      if (tabsPersisted.tabs.length <= 1) {
        return false
      }

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

      if (tabId === tabsPersisted.activeTabId) {
        const nextActive = remaining[remaining.length - 1]!

        applyTabSnapshot(nextActive)
        setTabsPersisted({ activeTabId: nextActive.id, tabs: remaining })
      } else {
        setTabsPersisted({ activeTabId: tabsPersisted.activeTabId, tabs: remaining })
      }

      return true
    },
    [
      applyTabSnapshot,
      mergeActiveSnapshotIntoTabs,
      sceneHistory.past.length,
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
    activeTabId: tabsPersisted.activeTabId,
    activeTabTitle,
    activeTabJsonFileName,
    activateTab,
    closeTab,
    createWorkScene,
    openSceneInNewTab,
    openRecentScene,
    promptNewWorkScene,
    setTabJsonFileContext,
  }
}
