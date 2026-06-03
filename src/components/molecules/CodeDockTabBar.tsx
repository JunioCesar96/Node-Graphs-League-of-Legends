import { type MouseEvent, useCallback, useState } from 'react'

import {
  TabContextMenu,
  type TabContextMenuAction,
  type TabContextMenuAnchor,
} from '@/components/molecules/TabContextMenu'
import { LangId } from '@/core/language/languageIds'
import type { CodeDockTabBarItem } from '@/hooks/useCodeDockTabs'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './CodeDockTabBar.module.css'

export type CodeDockTabBarProps = {
  tabs: CodeDockTabBarItem[]
  onActivate: (tabId: string) => void
  onClose: (tabId: string) => void
  onNewTab?: () => void
  onTabAction?: (tabId: string, action: TabContextMenuAction) => void
}

export function CodeDockTabBar({
  tabs,
  onActivate,
  onClose,
  onNewTab,
  onTabAction,
}: CodeDockTabBarProps) {
  const { t } = useLanguage()
  const [contextMenu, setContextMenu] = useState<{
    anchor: TabContextMenuAnchor
    tabId: string
  } | null>(null)

  const openContextMenu = useCallback(
    (tabId: string, event: MouseEvent) => {
      if (!onTabAction) {
        return
      }

      event.preventDefault()
      event.stopPropagation()
      setContextMenu({ tabId, anchor: { left: event.clientX, top: event.clientY } })
    },
    [onTabAction],
  )

  const handleContextAction = useCallback(
    (action: TabContextMenuAction) => {
      if (!contextMenu) {
        return
      }

      const { tabId } = contextMenu
      setContextMenu(null)

      if (action === 'close') {
        onClose(tabId)
        return
      }

      onTabAction?.(tabId, action)
    },
    [contextMenu, onClose, onTabAction],
  )

  if (tabs.length === 0 && !onNewTab) {
    return null
  }

  return (
    <>
      <div
        aria-label={t(LangId.CodeTabBarAria)}
        className={styles.bar}
        onPointerDown={(event) => event.stopPropagation()}
        role="tablist"
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            aria-selected={tab.isActive}
            className={[styles.tab, tab.isActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
            onContextMenu={(event) => openContextMenu(tab.id, event)}
            role="tab"
          >
            <button
              className={styles.tabLabel}
              onClick={() => onActivate(tab.id)}
              title={tab.title}
              type="button"
            >
              {tab.title}
            </button>
            <button
              aria-label={t(LangId.CodeTabCloseAria, undefined, { title: tab.title })}
              className={styles.tabClose}
              onClick={(event) => {
                event.stopPropagation()
                onClose(tab.id)
              }}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
        {onNewTab ? (
          <button
            aria-label={t(LangId.CodeTabNew)}
            className={styles.newTab}
            onClick={onNewTab}
            title={t(LangId.CodeTabNew)}
            type="button"
          >
            +
          </button>
        ) : null}
      </div>
      {contextMenu && onTabAction ? (
        <TabContextMenu
          anchor={contextMenu.anchor}
          onClose={() => setContextMenu(null)}
          onSelect={handleContextAction}
        />
      ) : null}
    </>
  )
}
