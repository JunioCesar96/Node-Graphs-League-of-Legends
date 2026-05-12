import type { NodeDataType } from '@/core/nodeSchema'

import styles from './SyntaxType.module.css'

type SyntaxTypeProps = {
  className?: string
  type: NodeDataType
}

export function SyntaxType({ className, type }: SyntaxTypeProps) {
  return <span className={[styles.type, styles[type], className ?? ''].filter(Boolean).join(' ')}>{type}</span>
}
