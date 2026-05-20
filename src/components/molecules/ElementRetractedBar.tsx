import type { PointerEventHandler } from 'react'

import { SyntaxType } from '@/components/atoms/SyntaxType'
import type { NodeDataType } from '@/core/nodeSchema'

import styles from './ElementRetractedBar.module.css'

export type ElementRetractedReorderHandlers = {
  onPointerDown: PointerEventHandler<HTMLElement>
  onPointerMove: PointerEventHandler<HTMLElement>
  onPointerUp: PointerEventHandler<HTMLElement>
  onLostPointerCapture: PointerEventHandler<HTMLElement>
}

type ElementRetractedBarProps = {
  title: string
  /** Tipo de parâmetro (SyntaxType). */
  parameterType?: NodeDataType
  /** Rótulo de tipo para blocos (ex. embed, pointer). */
  typeLabel?: string
  onExpand: () => void
  reorderHandlers?: ElementRetractedReorderHandlers
  expandAriaLabel?: string
  wirelessPulse?: boolean
}

export function ElementRetractedBar({
  title,
  parameterType,
  typeLabel,
  onExpand,
  reorderHandlers,
  expandAriaLabel,
  wirelessPulse = false,
}: ElementRetractedBarProps) {
  return (
    <div
      className={[styles.bar, wirelessPulse ? styles.barWirelessPulse : ''].filter(Boolean).join(' ')}
    >
      <button
        aria-label={expandAriaLabel ?? `Expandir ${title}`}
        className={styles.expandButton}
        onClick={(event) => {
          event.stopPropagation()
          onExpand()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <span aria-hidden className={styles.chevron} />
        <span
          className={[
            styles.title,
            reorderHandlers ? styles.nameDraggable : '',
          ]
            .filter(Boolean)
            .join(' ')}
          {...(reorderHandlers ?? {})}
        >
          {title}
        </span>
      </button>
      <div className={styles.typeCell}>
        {parameterType ? (
          <SyntaxType className={styles.typeLabel} type={parameterType} />
        ) : typeLabel ? (
          <span className={styles.typeLabel}>{typeLabel}</span>
        ) : null}
      </div>
      {reorderHandlers ? (
        <span
          aria-label={`Reposicionar ${title}`}
          className={styles.reorderGrip}
          {...reorderHandlers}
        >
          <span aria-hidden className={styles.gripDots} />
        </span>
      ) : null}
    </div>
  )
}
