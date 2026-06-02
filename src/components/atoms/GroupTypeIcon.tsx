import { resolveGroupStructureIcon } from '@/core/groupStructureIconResolver'

import styles from './GroupTypeIcon.module.css'

type GroupTypeIconProps = {
  icon?: string
  color?: string
  className?: string
}

export function GroupTypeIcon({ icon, color, className }: GroupTypeIconProps) {
  const resolved = resolveGroupStructureIcon(icon)

  if (resolved.kind === 'none') {
    return null
  }

  if (resolved.kind === 'fontawesome') {
    return (
      <i
        className={[resolved.className, styles.icon, className].filter(Boolean).join(' ')}
        style={color ? { color } : undefined}
        aria-hidden
      />
    )
  }

  return (
    <img
      className={[styles.imageIcon, className].filter(Boolean).join(' ')}
      src={resolved.url}
      alt={resolved.alt}
      draggable={false}
    />
  )
}
