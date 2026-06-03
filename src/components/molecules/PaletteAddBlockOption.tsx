import { Fragment, useMemo } from 'react'
import type { PointerEventHandler } from 'react'

import syntaxTypeStyles from '@/components/atoms/SyntaxType.module.css'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import { resolveBlockPaletteParameters } from '@/core/blockDefinitionPaletteParameters'

import styles from './PaletteAddBlockOption.module.css'

type PaletteAddBlockOptionProps = {
  definition: BlockDefinitionJsonDocument
  expanded: boolean
  highlighted: boolean
  onClick: () => void
  onPointerEnter: PointerEventHandler<HTMLButtonElement>
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>
}

export function PaletteAddBlockOption({
  definition,
  expanded,
  highlighted,
  onClick,
  onPointerEnter,
  onPointerLeave,
}: PaletteAddBlockOptionProps) {
  const parameterEntries = useMemo(
    () => resolveBlockPaletteParameters(definition),
    [definition],
  )

  return (
    <button
      className={[styles.option, highlighted ? styles.keyboardSelected : ''].filter(Boolean).join(' ')}
      data-expanded={expanded ? 'true' : 'false'}
      type="button"
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span
        aria-hidden
        className={styles.swatch}
        style={{ backgroundColor: definition.color }}
      />
      <span className={styles.body}>
        <span className={styles.titleRow}>
          <span className={styles.title}>{definition.name}</span>
          <span className={styles.blockName}>{definition.blockName}</span>
        </span>
        <span className={styles.meta}>
          {definition.type} · {definition.block}
        </span>
        {parameterEntries.length > 0 ? (
          <span className={styles.params}>
            {parameterEntries.map((entry, index) => (
              <Fragment key={entry.name}>
                {index > 0 ? <span className={styles.paramSep}>, </span> : null}
                <span
                  className={[
                    styles.paramName,
                    syntaxTypeStyles.type,
                    syntaxTypeStyles[entry.dataType],
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {entry.name}
                </span>
              </Fragment>
            ))}
          </span>
        ) : null}
      </span>
    </button>
  )
}
