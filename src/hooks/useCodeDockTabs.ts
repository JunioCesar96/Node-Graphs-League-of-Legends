import {

  defaultContentForNewFile,

  normalizeCodeDockFileName,

  uniqueUntitledFileName,

} from '@/core/codeDockFileTypes'

import { saveCodeDockTextManual } from '@/core/codeDockFileSave'

import { useCallback, useMemo, useState } from 'react'



export type CodeDockEditorTab = {

  id: string

  fileName: string

  content: string

  dirty: boolean

}



export type CodeDockTabBarItem = {

  id: string

  title: string

  isActive: boolean

  dirty: boolean

}



let tabIdCounter = 0



function nextTabId(): string {

  tabIdCounter += 1

  return `codedock-tab-${Date.now()}-${tabIdCounter}`

}



function createTab(fileName: string, content: string): CodeDockEditorTab {

  return {

    id: nextTabId(),

    content,

    dirty: false,

    fileName,

  }

}



export function useCodeDockTabs() {

  const [tabs, setTabs] = useState<CodeDockEditorTab[]>([])

  const [activeTabId, setActiveTabId] = useState('')



  const hasOpenCodeTabs = tabs.length > 0



  const activeTab = useMemo(() => tabs.find((t) => t.id === activeTabId), [activeTabId, tabs])



  const codeText = activeTab?.content ?? ''

  const codeDockFileName = activeTab?.fileName ?? ''



  const tabBarItems = useMemo<CodeDockTabBarItem[]>(

    () =>

      tabs.map((t) => ({

        dirty: t.dirty,

        id: t.id,

        isActive: t.id === activeTabId,

        title: t.dirty ? `${t.fileName} *` : t.fileName,

      })),

    [activeTabId, tabs],

  )



  const setCodeText = useCallback(

    (content: string) => {

      setTabs((prev) =>

        prev.map((t) =>

          t.id === activeTabId ? { ...t, content, dirty: true } : t,

        ),

      )

    },

    [activeTabId],

  )



  const setCodeDockFileName = useCallback(

    (fileName: string) => {

      setTabs((prev) => prev.map((t) => (t.id === activeTabId ? { ...t, fileName } : t)))

    },

    [activeTabId],

  )



  const markActiveTabSaved = useCallback((fileName?: string) => {

    setTabs((prev) =>

      prev.map((t) =>

        t.id === activeTabId

          ? { ...t, dirty: false, ...(fileName ? { fileName } : {}) }

          : t,

      ),

    )

  }, [activeTabId])



  const openInTab = useCallback((content: string, fileName: string) => {
    const normalized = normalizeCodeDockFileName(fileName)
    let activateId = ''

    setTabs((prev) => {
      const existing = prev.find(
        (tab) => tab.fileName.toLowerCase() === normalized.toLowerCase(),
      )

      if (existing) {
        activateId = existing.id
        return prev.map((tab) =>
          tab.id === existing.id
            ? { ...tab, content, dirty: false, fileName: normalized }
            : tab,
        )
      }

      const tab = createTab(normalized, content)
      activateId = tab.id
      return [...prev, tab]
    })

    if (activateId) {
      setActiveTabId(activateId)
    }
  }, [])



  const openNewTab = useCallback((fileName?: string, content?: string) => {
    let activateId = ''
    const safeFileName = typeof fileName === 'string' && fileName.trim() ? fileName : undefined
    const safeContent = typeof content === 'string' ? content : undefined

    setTabs((prev) => {
      const resolvedName = safeFileName
        ? normalizeCodeDockFileName(safeFileName)
        : uniqueUntitledFileName(
            prev.map((tab) => tab.fileName),
            'txt',
          )
      const resolvedContent = safeContent ?? defaultContentForNewFile(resolvedName)
      const tab = createTab(resolvedName, resolvedContent)
      activateId = tab.id
      return [...prev, tab]
    })

    if (activateId) {
      setActiveTabId(activateId)
    }
  }, [])



  const activateTab = useCallback((tabId: string) => {

    if (tabs.some((t) => t.id === tabId)) {

      setActiveTabId(tabId)

    }

  }, [tabs])



  const renameTab = useCallback((tabId: string, requestedFileName: string) => {

    const trimmed = requestedFileName.trim()



    if (!trimmed) {

      return false

    }



    const fileName = normalizeCodeDockFileName(trimmed)



    setTabs((prev) => prev.map((tab) => (tab.id === tabId ? { ...tab, fileName } : tab)))



    return true

  }, [])



  const saveTab = useCallback(async (tabId: string, contentOverride?: string) => {

    const tab = tabs.find((entry) => entry.id === tabId)



    if (!tab) {

      return { cancelled: true as const }

    }



    const content = contentOverride ?? tab.content

    const result = await saveCodeDockTextManual(content, tab.fileName)



    if (!result.cancelled) {

      setTabs((prev) =>

        prev.map((entry) =>

          entry.id === tabId ? { ...entry, fileName: result.fileName, dirty: false } : entry,

        ),

      )

    }



    return result

  }, [tabs])



  const closeTab = useCallback((tabId: string) => {

    setTabs((prev) => {

      const index = prev.findIndex((t) => t.id === tabId)

      if (index < 0) {

        return prev

      }



      const next = prev.filter((t) => t.id !== tabId)



      if (next.length === 0) {

        setActiveTabId('')

        return next

      }



      if (activeTabId === tabId) {

        const neighbor = next[Math.min(index, next.length - 1)]

        if (neighbor) {

          setActiveTabId(neighbor.id)

        }

      }



      return next

    })

  }, [activeTabId])



  return {

    activateTab,

    activeTabId,

    closeTab,

    hasOpenCodeTabs,

    renameTab,

    saveTab,

    codeDockFileName,

    codeText,

    markActiveTabSaved,

    openInTab,

    openNewTab,

    setCodeDockFileName,

    setCodeText,

    tabBarItems,

    tabs,

  }

}


