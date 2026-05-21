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
  canClose?: boolean
  /** Integrado ao contentor da grade (sem borda inferior nem cantos). */
  attached?: boolean
}

export function SceneTabBar({
  tabs,
  onActivate,
  onClose,
  canClose = true,
  attached = false,
}: SceneTabBarProps) {
  if (tabs.length === 0) {
    return null
  }

  return (
    <div
      aria-label="Cenas de trabalho"
      className={[styles.bar, attached ? styles.barAttached : ''].filter(Boolean).join(' ')}
      role="tablist"
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          aria-selected={tab.isActive}
          className={[styles.tab, tab.isActive ? styles.tabActive : ''].filter(Boolean).join(' ')}
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
          {canClose && tabs.length > 1 ? (
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
    </div>
  )
}
