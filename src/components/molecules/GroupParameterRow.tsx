import type { PointerEventHandler } from 'react'
import { useState } from 'react'

import { GroupParameterIcon } from '@/components/atoms/GroupParameterIcon'
import { GroupSlot } from '@/components/atoms/GroupSlot'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { GroupParameterDef } from '@/core/groupSchema'
import { groupRitualTypeToNodeDataType } from '@/core/groupSchema'
import type { GroupSlotWirelessLink } from '@/core/groupConnectionDisplay'
import { isGroupSlotPulsing } from '@/core/groupConnectionDisplay'

import styles from './GroupBlockParameterRow.module.css'

type GroupParameterRowProps = {
  parameter: GroupParameterDef
  value: string
  interactionLocked?: boolean
  hasInputSlot: boolean
  hasOutputSlot: boolean
  activeSlotId?: string
  inputSlotLink?: GroupSlotWirelessLink
  outputSlotLink?: GroupSlotWirelessLink
  pulseSlotId?: string
  canvasNodeId?: string
  hideValueInput?: boolean
  onCommitValue: (value: string) => void
  onOutputPointerDown?: PointerEventHandler<HTMLButtonElement>
  onOutputPointerUp?: PointerEventHandler<HTMLButtonElement>
  onOutputPointerMove?: PointerEventHandler<HTMLButtonElement>
  onInputPointerUp?: PointerEventHandler<HTMLButtonElement>
  onSlotWirelessHoverStart?: (slotId: string, link: GroupSlotWirelessLink) => void
  onSlotWirelessHoverEnd?: () => void
  onSlotCycleRouting?: (connectionId: string) => void
}

export function GroupParameterRow({
  parameter,
  value,
  interactionLocked = false,
  hasInputSlot,
  hasOutputSlot,
  activeSlotId,
  inputSlotLink,
  outputSlotLink,
  pulseSlotId,
  hideValueInput = false,
  onCommitValue,
  onOutputPointerDown,
  onOutputPointerUp,
  onOutputPointerMove,
  onInputPointerUp,
  canvasNodeId,
  onSlotWirelessHoverStart,
  onSlotWirelessHoverEnd,
  onSlotCycleRouting,
}: GroupParameterRowProps) {
  const outputSlotId = `group-param:${parameter.idParameter}:output`
  const inputSlotId = `group-param:${parameter.idParameter}:input`
  const dataType = groupRitualTypeToNodeDataType(parameter.typeParameter)
  const isStringInput = dataType === 'string'
  const [inputFocused, setInputFocused] = useState(false)

  return (
    <div
      className={styles.row}
      data-input-focused={inputFocused ? '1' : '0'}
      data-no-value={hideValueInput ? '1' : '0'}
    >
      <div className={styles.slotIn}>
        {hasInputSlot ? (
          <GroupSlot
            variant="in"
            ariaLabel={`Entrada ${parameter.nameParameter}`}
            disabled={interactionLocked}
            active={activeSlotId === inputSlotId}
            linked={Boolean(inputSlotLink)}
            pulsing={isGroupSlotPulsing(
              pulseSlotId ? { nodeId: canvasNodeId ?? '', slotId: pulseSlotId } : null,
              canvasNodeId ?? '',
              inputSlotId,
            )}
            slotId={inputSlotId}
            nodeId={canvasNodeId}
            onPointerUp={onInputPointerUp}
            onPointerEnter={() => {
              if (inputSlotLink) {
                onSlotWirelessHoverStart?.(inputSlotId, inputSlotLink)
              }
            }}
            onPointerLeave={onSlotWirelessHoverEnd}
            onContextMenu={(event) => {
              if (!inputSlotLink || !onSlotCycleRouting) {
                return
              }
              event.preventDefault()
              event.stopPropagation()
              onSlotCycleRouting(inputSlotLink.connectionId)
            }}
          />
        ) : null}
      </div>
      <div className={styles.iconCell}>
        <GroupParameterIcon hint={parameter.iconHint ?? null} iconId={parameter.iconId} />
      </div>
      <span className={styles.label}>{parameter.nameParameter}</span>
      <div className={styles.field} data-empty={hideValueInput ? '1' : '0'}>
        {hideValueInput ? null : (
          <>
            {isStringInput ? (
              <span className={styles.focusedTitle}>{parameter.nameParameter}</span>
            ) : null}
            <ParameterValueInput
              ariaLabel={parameter.nameParameter}
              className={styles.input}
              type={dataType}
              fieldTitle={parameter.nameParameter}
              value={value}
              onCommit={onCommitValue}
              onFocusChange={isStringInput ? setInputFocused : undefined}
            />
          </>
        )}
      </div>
      <div className={styles.slotOut}>
        {hasOutputSlot ? (
          <GroupSlot
            variant="out"
            ariaLabel={`Saída ${parameter.nameParameter}`}
            disabled={interactionLocked}
            active={activeSlotId === outputSlotId}
            linked={Boolean(outputSlotLink)}
            pulsing={isGroupSlotPulsing(
              pulseSlotId ? { nodeId: canvasNodeId ?? '', slotId: pulseSlotId } : null,
              canvasNodeId ?? '',
              outputSlotId,
            )}
            slotId={outputSlotId}
            nodeId={canvasNodeId}
            onPointerDown={onOutputPointerDown}
            onPointerUp={onOutputPointerUp}
            onPointerMove={onOutputPointerMove}
            onPointerEnter={() => {
              if (outputSlotLink) {
                onSlotWirelessHoverStart?.(outputSlotId, outputSlotLink)
              }
            }}
            onPointerLeave={onSlotWirelessHoverEnd}
            onContextMenu={(event) => {
              if (!outputSlotLink || !onSlotCycleRouting) {
                return
              }
              event.preventDefault()
              event.stopPropagation()
              onSlotCycleRouting(outputSlotLink.connectionId)
            }}
          />
        ) : null}
      </div>
    </div>
  )
}
