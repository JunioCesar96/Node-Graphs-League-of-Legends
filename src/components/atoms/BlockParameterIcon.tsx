import type { BlockParameterIconHint } from '@/core/blockSchema'

import styles from './BlockParameterIcon.module.css'

type BlockParameterIconProps = {
  hint: BlockParameterIconHint
  iconId?: string
}

export function BlockParameterIcon({ hint, iconId }: BlockParameterIconProps) {
  if (!hint && !iconId?.trim()) {
    return null
  }

  const resolvedHint = hint ?? 'Img'
  const custom = iconId && !['Img', 'Text', 'Input'].includes(iconId) ? iconId : null

  return (
    <span className={styles.icon} data-hint={resolvedHint} aria-hidden title={custom ?? undefined}>
      {custom ? custom.slice(0, 2).toUpperCase() : resolvedHint === 'Img' ? '▣' : resolvedHint === 'Text' ? 'T' : '⌷'}
    </span>
  )
}
