import { SyntaxType } from '@/components/atoms/SyntaxType'
import type { NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './ParameterItem.module.css'

type ParameterItemProps = {
  hint?: string
  parameter: NodeParameterDefinition
  value: string
}

export function ParameterItem({ hint, parameter, value }: ParameterItemProps) {
  return (
    <li className={styles.item}>
      <span className={styles.meta}>
        {hint ? (
          <span className={styles.hintDot} aria-label={hint} title={hint}>
            ?
          </span>
        ) : (
          <span className={styles.hintPlaceholder} aria-hidden />
        )}
        <span className={styles.name}>{parameter.name}</span>
        <SyntaxType type={parameter.type} />
      </span>
      <span className={styles.value}>
        <span className={styles.bracket}>{'{'}</span>
        {value}
        <span className={styles.bracket}>{'}'}</span>
      </span>
    </li>
  )
}
