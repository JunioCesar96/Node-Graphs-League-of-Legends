import type { GroupParameterIconHint } from '@/core/groupSchema'

import styles from './GroupParameterIcon.module.css'

type GroupParameterIconProps = {
  hint: GroupParameterIconHint
  iconId?: string
}

export function GroupParameterIcon({ hint, iconId }: GroupParameterIconProps) {
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
