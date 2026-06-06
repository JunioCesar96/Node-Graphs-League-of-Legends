import type { PointerEventHandler } from 'react'

import type { SlashCommandDocument } from '@/core/slashCommandTypes'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './PaletteSlashCommandOption.module.css'

type PaletteSlashCommandOptionProps = {
  command: SlashCommandDocument
  expanded: boolean
  highlighted: boolean
  onClick: () => void
  onPointerEnter: PointerEventHandler<HTMLButtonElement>
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>
}

export function PaletteSlashCommandOption({
  command,
  expanded,
  highlighted,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: PaletteSlashCommandOptionProps) {
  const { t } = useLanguage()
  const featureLabel =
    command.feature === 'blocks'
      ? t(LangId.SlashCommandFeatureBlocks, 'blocks')
      : command.feature

  return (
    <button
      className={[styles.option, highlighted ? styles.keyboardSelected : ''].filter(Boolean).join(' ')}
      data-expanded={expanded ? 'true' : 'false'}
      type="button"
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span aria-hidden className={styles.prefix}>
        /
      </span>
      <span className={styles.body}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{command.command}</span>
          <span className={styles.featureTag}>{featureLabel}</span>
        </span>
        {expanded ? (
          <span className={styles.meta}>{command.source.rootBlockName}</span>
        ) : null}
      </span>
    </button>
  )
}
