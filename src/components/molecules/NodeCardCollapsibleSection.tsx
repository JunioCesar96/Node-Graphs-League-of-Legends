import type { CSSProperties, PointerEventHandler, ReactNode } from 'react'
import { forwardRef } from 'react'

import styles from './NodeCardCollapsibleSection.module.css'

export type NodeCardSectionReorderHandlers = {
  onPointerDown: PointerEventHandler<HTMLButtonElement>
  onPointerMove: PointerEventHandler<HTMLButtonElement>
  onPointerUp: PointerEventHandler<HTMLButtonElement>
  onLostPointerCapture: PointerEventHandler<HTMLButtonElement>
}

type NodeCardCollapsibleSectionProps = {
  title: string
  sectionId: string
  expanded: boolean
  onToggle: () => void
  children: ReactNode
  reorderable?: boolean
  isReorderDragSource?: boolean
  reorderHandlers?: NodeCardSectionReorderHandlers
  style?: CSSProperties
}

export const NodeCardCollapsibleSection = forwardRef<HTMLElement, NodeCardCollapsibleSectionProps>(
  function NodeCardCollapsibleSection(
    {
      title,
      sectionId,
      expanded,
      onToggle,
      children,
      reorderable = false,
      isReorderDragSource = false,
      reorderHandlers,
      style,
    },
    ref,
  ) {
    const panelId = `${sectionId}-panel`
    const canReorder = Boolean(reorderable && reorderHandlers)

    return (
      <section
        ref={ref}
        className={[
          styles.section,
          isReorderDragSource ? styles.sectionReorderSource : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-labelledby={sectionId}
        style={style}
      >
        <div className={styles.header}>
          <button
            aria-controls={panelId}
            aria-expanded={expanded}
            className={[
              styles.toggleButton,
              expanded ? styles.toggleButtonExpanded : '',
            ]
              .filter(Boolean)
              .join(' ')}
            id={sectionId}
            onClick={(event) => {
              event.stopPropagation()
              onToggle()
            }}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
          >
            <span aria-hidden className={styles.chevron} />
            <span className={styles.title}>{title}</span>
          </button>
          <button
            aria-label={`Reposicionar secção ${title}`}
            className={styles.reorderButton}
            disabled={!canReorder}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => {
              event.stopPropagation()
              reorderHandlers?.onPointerDown(event)
            }}
            onPointerMove={reorderHandlers?.onPointerMove}
            onPointerUp={reorderHandlers?.onPointerUp}
            onLostPointerCapture={reorderHandlers?.onLostPointerCapture}
            title={canReorder ? 'Arrastar para reordenar secções' : undefined}
            type="button"
          >
            <span aria-hidden className={styles.grip} />
          </button>
        </div>
        {expanded ? (
          <div className={styles.panel} id={panelId} role="region">
            <div className={styles.panelInner}>{children}</div>
          </div>
        ) : null}
      </section>
    )
  },
)
