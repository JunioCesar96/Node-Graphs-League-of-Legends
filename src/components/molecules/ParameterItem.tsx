import type { PointerEventHandler, PointerEvent as ReactPointerEvent, Ref } from 'react'
import { useState } from 'react'

import { SyntaxType } from '@/components/atoms/SyntaxType'
import { ParameterMapHashEmbedInput } from '@/components/molecules/ParameterMapHashEmbedInput'
import { ParameterMapHashPointerInput } from '@/components/molecules/ParameterMapHashPointerInput'
import { ParameterMapU64PointerInput } from '@/components/molecules/ParameterMapU64PointerInput'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { InternalStructureDefinition, NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './ParameterItem.module.css'

type ParameterNameReorderHandlers = {
  onPointerDown: PointerEventHandler<HTMLSpanElement>
  onPointerMove: PointerEventHandler<HTMLSpanElement>
  onPointerUp: PointerEventHandler<HTMLSpanElement>
  onLostPointerCapture: PointerEventHandler<HTMLSpanElement>
}

type ParameterItemProps = {
  activeOutputInternalStructureId?: string
  canvasNodeId?: string
  hint?: string
  isParameterReorderDragSource?: boolean
  onCommitValue?: (value: string) => void
  onOutputWireKeyboard?: (structure: InternalStructureDefinition) => void
  onOutputWirePointerCancel?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerDown?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerMove?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onOutputWirePointerUp?: (
    structure: InternalStructureDefinition,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onMapHashStructureSlotRemoved?: (slotId: string) => void
  parameter: NodeParameterDefinition
  parameterNameReorderHandlers?: ParameterNameReorderHandlers
  registerParameterRowRef?: Ref<HTMLLIElement>
  value: string
}

export function ParameterItem({
  activeOutputInternalStructureId,
  canvasNodeId,
  hint,
  isParameterReorderDragSource = false,
  onCommitValue,
  onOutputWireKeyboard,
  onOutputWirePointerCancel,
  onOutputWirePointerDown,
  onOutputWirePointerMove,
  onOutputWirePointerUp,
  onMapHashStructureSlotRemoved,
  parameter,
  parameterNameReorderHandlers,
  registerParameterRowRef,
  value,
}: ParameterItemProps) {
  const [inputFocused, setInputFocused] = useState(false)
  const isMapHashPointer = parameter.type === 'mapHashPointer'
  const isMapHashEmbed = parameter.type === 'mapHashEmbed'
  const isMapU64Pointer = parameter.type === 'mapU64Pointer'
  const isMapStructure =
    isMapHashPointer || isMapHashEmbed || isMapU64Pointer
  const expandedLayout = isMapStructure || Boolean(onCommitValue && inputFocused)

  const valueInner =
    isMapHashPointer && onCommitValue && canvasNodeId ? (
      <ParameterMapHashPointerInput
        activeSlotId={activeOutputInternalStructureId}
        canvasNodeId={canvasNodeId}
        className={styles.valueInput}
        defaultValue={parameter.defaultValue}
        onCommit={onCommitValue}
        onStructureSlotRemoved={onMapHashStructureSlotRemoved}
        parameterTitle={parameter.name}
        onOutputWireKeyboard={onOutputWireKeyboard}
        onOutputWirePointerCancel={onOutputWirePointerCancel}
        onOutputWirePointerDown={onOutputWirePointerDown}
        onOutputWirePointerMove={onOutputWirePointerMove}
        onOutputWirePointerUp={onOutputWirePointerUp}
        parameterId={parameter.id}
        value={value}
      />
    ) : isMapU64Pointer && onCommitValue && canvasNodeId ? (
      <ParameterMapU64PointerInput
        activeSlotId={activeOutputInternalStructureId}
        canvasNodeId={canvasNodeId}
        className={styles.valueInput}
        defaultValue={parameter.defaultValue}
        onCommit={onCommitValue}
        onStructureSlotRemoved={onMapHashStructureSlotRemoved}
        parameterTitle={parameter.name}
        onOutputWireKeyboard={onOutputWireKeyboard}
        onOutputWirePointerCancel={onOutputWirePointerCancel}
        onOutputWirePointerDown={onOutputWirePointerDown}
        onOutputWirePointerMove={onOutputWirePointerMove}
        onOutputWirePointerUp={onOutputWirePointerUp}
        parameterId={parameter.id}
        value={value}
      />
    ) : isMapHashEmbed && onCommitValue && canvasNodeId ? (
      <ParameterMapHashEmbedInput
        activeSlotId={activeOutputInternalStructureId}
        canvasNodeId={canvasNodeId}
        className={styles.valueInput}
        defaultValue={parameter.defaultValue}
        onCommit={onCommitValue}
        onStructureSlotRemoved={onMapHashStructureSlotRemoved}
        parameterTitle={parameter.name}
        onOutputWireKeyboard={onOutputWireKeyboard}
        onOutputWirePointerCancel={onOutputWirePointerCancel}
        onOutputWirePointerDown={onOutputWirePointerDown}
        onOutputWirePointerMove={onOutputWirePointerMove}
        onOutputWirePointerUp={onOutputWirePointerUp}
        parameterId={parameter.id}
        value={value}
      />
    ) : onCommitValue ? (
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

  const valueShell = isMapStructure ? (
    <div className={styles.mapHashStructureValue}>{valueInner}</div>
  ) : (
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
        {isMapStructure ? null : parameter.name}
      </span>
    </div>
  )

  return (
    <li
      className={[
        styles.item,
        expandedLayout ? styles.itemExpanded : styles.itemCompact,
        isMapHashPointer
          ? styles.itemMapHashPointer
          : isMapHashEmbed
            ? styles.itemMapHashEmbed
            : isMapU64Pointer
              ? styles.itemMapU64Pointer
              : '',
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
        <div
          className={[
            styles.cellValue,
            isMapHashPointer
              ? styles.cellValueMapHashPointer
              : isMapHashEmbed
                ? styles.cellValueMapHashEmbed
                : isMapU64Pointer
                  ? styles.cellValueMapU64Pointer
                  : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {valueShell}
        </div>
      </div>
    </li>
  )
}
