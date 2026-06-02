import { LangId, type LangIdValue } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import { CharacterIcon, InspectorIcon, ToolsIcon } from '@/components/atoms/VfxToolsIcons'

import styles from './VfxToolsVerticalMenu.module.css'

export type VfxToolId = 'inspector' | 'character'

type ToolEntry = {
  id: VfxToolId
  labelId: LangIdValue
  Icon: typeof InspectorIcon
}

const TOOL_ENTRIES: ToolEntry[] = [
  { id: 'inspector', labelId: LangId.VfxInspectorTitle, Icon: InspectorIcon },
  { id: 'character', labelId: LangId.VfxToolsCharacter, Icon: CharacterIcon },
]

type VfxToolsVerticalMenuProps = {
  activeTool: VfxToolId | null
  expanded: boolean
  onSelectTool: (toolId: VfxToolId) => void
  onToggleMenu: () => void
}

export function VfxToolsVerticalMenu({
  activeTool,
  expanded,
  onSelectTool,
  onToggleMenu,
}: VfxToolsVerticalMenuProps) {
  const { t } = useLanguage()

  return (
    <nav
      aria-label={t(LangId.VfxToolsTitle)}
      className={[styles.menu, expanded ? styles.menuExpanded : styles.menuCollapsed].join(' ')}
    >
      <button
        aria-expanded={expanded}
        aria-label={expanded ? t(LangId.VfxToolsCollapseMenu) : t(LangId.VfxToolsExpandMenu)}
        className={styles.toolsToggle}
        onClick={onToggleMenu}
        title={expanded ? t(LangId.VfxToolsCollapseMenu) : t(LangId.VfxToolsExpandMenu)}
        type="button"
      >
        <span className={styles.toolsToggleIcon}>
          <ToolsIcon />
        </span>
        {expanded ? <span className={styles.toolsToggleLabel}>{t(LangId.VfxToolsTitle)}</span> : null}
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
