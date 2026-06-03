import { LangId, type LangIdValue } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import { SceneIcon, ViewportMenuIcon, VfxLolIcon } from '@/components/atoms/VfxToolsIcons'

import styles from './VfxScene3dVerticalMenu.module.css'

export type VfxViewportToolId = 'scene' | 'vfxLol'

type ToolEntry = {
  id: VfxViewportToolId
  labelId: LangIdValue
  Icon: typeof SceneIcon
}

const TOOL_ENTRIES: ToolEntry[] = [
  { id: 'scene', labelId: LangId.VfxSceneMenuTitle, Icon: SceneIcon },
  { id: 'vfxLol', labelId: LangId.VfxVfxLolMenuTitle, Icon: VfxLolIcon },
]

type VfxScene3dVerticalMenuProps = {
  activeTool: VfxViewportToolId | null
  expanded: boolean
  onSelectTool: (toolId: VfxViewportToolId) => void
  onToggleMenu: () => void
}

export function VfxScene3dVerticalMenu({
  activeTool,
  expanded,
  onSelectTool,
  onToggleMenu,
}: VfxScene3dVerticalMenuProps) {
  const { t } = useLanguage()

  return (
    <nav
      aria-label={t(LangId.VfxViewportViewMenu)}
      className={[
        styles.menu,
        expanded ? styles.menuExpanded : styles.menuCollapsed,
        activeTool ? styles.menuHasPanel : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <button
        aria-expanded={expanded}
        aria-label={expanded ? t(LangId.VfxScene3dCollapseMenu) : t(LangId.VfxScene3dExpandMenu)}
        className={styles.menuToggle}
        onClick={onToggleMenu}
        title={expanded ? t(LangId.VfxScene3dCollapseMenu) : t(LangId.VfxScene3dExpandMenu)}
        type="button"
      >
        <span className={styles.menuToggleIcon}>
          <ViewportMenuIcon />
        </span>
        {expanded ? <span className={styles.menuToggleLabel}>{t(LangId.VfxViewportViewMenu)}</span> : null}
      </button>

      <div aria-hidden className={styles.separator} />

      <div className={styles.toolList} role="list">
        {TOOL_ENTRIES.map(({ id, labelId, Icon }) => {
          const label = t(labelId)
          const active = activeTool === id

          return (
            <div className={styles.toolBtnWrap} key={id} role="listitem">
              <button
                aria-current={active ? 'true' : undefined}
                aria-label={label}
                className={[styles.toolBtn, active ? styles.toolBtnActive : ''].filter(Boolean).join(' ')}
                onClick={() => onSelectTool(id)}
                title={label}
                type="button"
              >
                <span className={styles.toolBtnIcon}>
                  <Icon />
                </span>
                {expanded ? <span className={styles.toolBtnLabel}>{label}</span> : null}
              </button>
            </div>
          )
        })}
      </div>
    </nav>
  )
}
