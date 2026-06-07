import { useCallback, useMemo, useRef, useState } from 'react'

import { showAppAlert } from '@/messenger_popup/appMessenger'
import type { CodeDockFileBridge } from '@/components/organisms/CodeDock'
import type { CodeDockEditorTab } from '@/hooks/useCodeDockTabs'
import {
  CODE_DOCK_FILE_INPUT_ACCEPT,
  importCodeDockFile,
  pickCodeDockFileFromDisk,
  reopenRecentCodeDockFile,
} from '@/core/codeDock/openCodeDockFile'
import { saveCodeDockFileContent } from '@/core/codeDock/saveCodeDockFile'
import { clearCodeDockTabFileHandle } from '@/core/codeDock/codeDockFileHandleStore'
import { readCodeRecentFiles, pushCodeRecentFile } from '@/jade/codeRecentFiles'

export type LoadTextIntoCodeDock = (
  text: string,
  fileName: string,
  via: string,
  options?: {
    fullText?: boolean
    suppressConvertedOpenAlert?: boolean
    fileHandle?: FileSystemFileHandle | null
  },
) => void | Promise<void>

type UseCodeDockFileBridgeOptions = {
  activeTabId: string
  activeContent: string
  tabs: CodeDockEditorTab[]
  loadTextIntoCodeDock: LoadTextIntoCodeDock
  markTabSaved: (tabId: string, fileName?: string) => void
  renameCodeDockTab: (tabId: string, fileName: string) => void
  onRequestNewFile: () => void
}

export function useCodeDockFileBridge(options: UseCodeDockFileBridgeOptions) {
  const {
    activeTabId,
    activeContent,
    tabs,
    loadTextIntoCodeDock,
    markTabSaved,
    renameCodeDockTab,
    onRequestNewFile,
  } = options

  const [recentFiles, setRecentFiles] = useState<string[]>(() => readCodeRecentFiles())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const refreshRecent = useCallback(() => {
    setRecentFiles(readCodeRecentFiles())
  }, [])

  const ingestOpenedFile = useCallback(
    async (file: File, handle: FileSystemFileHandle | null) => {
      const payload = await importCodeDockFile({ file, handle })
      if (payload.branch === 'error') {
        showAppAlert(payload.message)
        return
      }

      await loadTextIntoCodeDock(payload.text, payload.fileName, payload.via, {
        fullText: true,
        suppressConvertedOpenAlert: payload.branch === 'bin',
        fileHandle: handle,
      })

      pushCodeRecentFile(payload.fileName)
      refreshRecent()
    },
    [loadTextIntoCodeDock, refreshRecent],
  )

  const openFromDisk = useCallback(async () => {
    const picked = await pickCodeDockFileFromDisk()
    if (picked.branch === 'cancelled') {
      fileInputRef.current?.click()
      return
    }
    if (picked.branch === 'error') {
      showAppAlert(picked.message)
      return
    }
    await ingestOpenedFile(picked.opened.file, picked.opened.handle)
  }, [ingestOpenedFile])

  const openFromInput = useCallback(
    async (file: File) => {
      await ingestOpenedFile(file, null)
    },
    [ingestOpenedFile],
  )

  const openRecent = useCallback(
    async (fileName: string) => {
      const picked = await reopenRecentCodeDockFile(fileName)
      if (picked.branch === 'cancelled') {
        return
      }
      if (picked.branch === 'error') {
        showAppAlert(picked.message)
        return
      }
      await ingestOpenedFile(picked.opened.file, picked.opened.handle)
    },
    [ingestOpenedFile],
  )

  const saveTabById = useCallback(
    async (tabId: string, saveAs = false) => {
      const tab = tabs.find((entry) => entry.id === tabId)
      if (!tab) {
        return
      }

      const content = tabId === activeTabId ? activeContent : tab.content
      const result = await saveCodeDockFileContent({
        tabId,
        content,
        suggestedName: tab.fileName,
        saveAs,
      })

      if (result.cancelled) {
        return
      }

      renameCodeDockTab(tabId, result.fileName)
      markTabSaved(tabId, result.fileName)

      pushCodeRecentFile(result.fileName)
      refreshRecent()
    },
    [activeContent, activeTabId, markTabSaved, refreshRecent, renameCodeDockTab, tabs],
  )

  const saveActive = useCallback(async () => {
    if (!activeTabId) {
      return
    }
    await saveTabById(activeTabId, false)
  }, [activeTabId, saveTabById])

  const saveActiveAs = useCallback(async () => {
    if (!activeTabId) {
      return
    }
    await saveTabById(activeTabId, true)
  }, [activeTabId, saveTabById])

  const fileBridge = useMemo<CodeDockFileBridge>(
    () => ({
      onOpenFile: () => void openFromDisk(),
      onNewFile: onRequestNewFile,
      onSaveFile: () => void saveActive(),
      onSaveFileAs: () => void saveActiveAs(),
      onOpenLog: () => {
        showAppAlert('Open Log File: disponível no Jade desktop (Tauri). No browser usa a ponte HTTP.')
      },
      recentFiles,
      onOpenRecentFile: (path) => void openRecent(path),
    }),
    [onRequestNewFile, openFromDisk, openRecent, recentFiles, saveActive, saveActiveAs],
  )

  const onTabClosed = useCallback((tabId: string) => {
    clearCodeDockTabFileHandle(tabId)
  }, [])

  return {
    CODE_DOCK_FILE_INPUT_ACCEPT,
    fileBridge,
    fileInputRef,
    onTabClosed,
    openFromInput,
    refreshRecent,
    saveTabById,
  }
}
