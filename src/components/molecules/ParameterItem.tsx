import type { PointerEventHandler, Ref } from 'react'
import { useState } from 'react'

import { SyntaxType } from '@/components/atoms/SyntaxType'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './ParameterItem.module.css'

type ParameterNameReorderHandlers = {
  onPointerDown: PointerEventHandler<HTMLSpanElement>
  onPointerMove: PointerEventHandler<HTMLSpanElement>
  onPointerUp: PointerEventHandler<HTMLSpanElement>
  onLostPointerCapture: PointerEventHandler<HTMLSpanElement>
}

type ParameterItemProps = {
  hint?: string
  isParameterReorderDragSource?: boolean
  onCommitValue?: (value: string) => void
  parameter: NodeParameterDefinition
  parameterNameReorderHandlers?: ParameterNameReorderHandlers
  registerParameterRowRef?: Ref<HTMLLIElement>
  value: string
}

export function ParameterItem({
  hint,
  isParameterReorderDragSource = false,
  onCommitValue,
  parameter,
  parameterNameReorderHandlers,
  registerParameterRowRef,
  value,
}: ParameterItemProps) {
  const [inputFocused, setInputFocused] = useState(false)
  const expandedLayout = Boolean(onCommitValue && inputFocused)

  const valueInner = onCommitValue ? (
    <ParameterValueInput
      ariaLabel={`${parameter.name} value`}
      className={styles.valueInput}
      onCommit={onCommitValue}
      onFocusChange={setInputFocused}
      type={parameter.type}
      value={value}
    />
  ) : (
    value
  )

  const valueShell = (
    <span className={styles.value}>
      <span className={styles.bracket}>{'{'}</span>
      {valueInner}
      <span className={styles.bracket}>{'}'}</span>
    </span>
  )

  const hintAndName = (
    <div className={styles.stackName}>
      {hint ? (
        <span className={styles.hintDot} aria-label={hint} title={hint}>
          ?
        </span>
      ) : (
        <span className={styles.hintPlaceholder} aria-hidden />
      )}
      <span
        className={[
          styles.name,
          parameterNameReorderHandlers ? styles.nameDraggable : '',
        ]
          .filter(Boolean)
          .join(' ')}
        {...(parameterNameReorderHandlers ?? {})}
      >
        {parameter.name}
      </span>
    </div>
  )

  return (
    <li
      className={[
        styles.item,
        expandedLayout ? styles.itemExpanded : styles.itemCompact,
        isParameterReorderDragSource ? styles.itemParamDragSource : '',
      ]
        .filter(Boolean)
        .join(' ')}
      ref={registerParameterRowRef}
    >
      <div className={styles.paramShell}>
        <div className={styles.cellName}>{hintAndName}</div>
        <div className={styles.cellType}>
          <div className={styles.typeUnderName}>
            <SyntaxType className={styles.typeLabel} type={parameter.type} />
          </div>
        </div>
        <div className={styles.cellValue}>{valueShell}</div>
      </div>
    </li>
  )
}
