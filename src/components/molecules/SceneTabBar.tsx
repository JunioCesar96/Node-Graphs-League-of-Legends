import { type MouseEvent, useCallback, useState } from 'react'



import {

  TabContextMenu,

  type TabContextMenuAction,

  type TabContextMenuAnchor,

} from '@/components/molecules/TabContextMenu'

import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './SceneTabBar.module.css'



export type SceneTabBarItem = {

  id: string

  title: string

  isActive: boolean

}



export type SceneTabBarProps = {

  tabs: SceneTabBarItem[]

  onActivate: (tabId: string) => void

  onClose: (tabId: string) => void

  onNewTab?: () => void

  onTabAction?: (tabId: string, action: TabContextMenuAction) => void

  canClose?: boolean

  /** Integrado ao contentor da grade (sem borda inferior nem cantos). */

  attached?: boolean

}



export function SceneTabBar({

  tabs,

  onActivate,

  onClose,

  onNewTab,

  onTabAction,

  canClose = true,

  attached = false,

}: SceneTabBarProps) {
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

        aria-label={t(LangId.SceneTabBarAria)}

        className={[styles.bar, attached ? styles.barAttached : ''].filter(Boolean).join(' ')}

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

            {canClose ? (

              <button

                aria-label={`Fechar ${tab.title}`}

                className={styles.tabClose}

                onClick={(event) => {

                  event.stopPropagation()

                  onClose(tab.id)

                }}

                type="button"

              >

                ×

              </button>

            ) : null}

          </div>

        ))}

        {onNewTab ? (

          <button

            aria-label={t(LangId.SceneTabNew)}

            className={styles.newTab}

            onClick={onNewTab}

            title={t(LangId.SceneTabNew)}

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


