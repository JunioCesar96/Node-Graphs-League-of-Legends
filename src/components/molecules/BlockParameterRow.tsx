import type { PointerEvent as ReactPointerEvent, PointerEventHandler } from 'react'
import { useRef, useState } from 'react'

import { BlockParameterIcon } from '@/components/atoms/BlockParameterIcon'
import { BlockSlot } from '@/components/atoms/BlockSlot'
import { BlockSlotConnectionPager } from '@/components/molecules/BlockSlotConnectionPager'
import { BlockSlotPeerToolbar } from '@/components/molecules/BlockSlotPeerToolbar'
import { BlockMapHashEmbedField } from '@/components/molecules/BlockMapHashEmbedField'
import { BlockMapHashPointerField } from '@/components/molecules/BlockMapHashPointerField'
import { BlockMapU64PointerField } from '@/components/molecules/BlockMapU64PointerField'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { BlockParameterDef } from '@/core/blockSchema'
import { blockRitualTypeToNodeDataType, isBlockMapStructureType } from '@/core/blockSchema'
import type { BlockSlotWirelessLink } from '@/core/blockConnectionDisplay'
import { isBlockSlotPulsing } from '@/core/blockConnectionDisplay'
import type { BlockSlotPeerActions } from '@/core/blockSlotPeerActions'
import type { BlockElementViewKey, BlockElementViewState } from '@/core/blockElementViewState'
import {
  blockElementViewKeyForParameter,
} from '@/core/blockElementViewState'

import styles from './GroupBlockParameterRow.module.css'

type BlockParameterRowProps = {
  parameter: BlockParameterDef
  value: string
  interactionLocked?: boolean
  hasInputSlot: boolean
  hasOutputSlot: boolean
  activeSlotId?: string
  inputSlotLink?: BlockSlotWirelessLink
  outputSlotLink?: BlockSlotWirelessLink
  blockWirelessSlots?: ReadonlyMap<string, BlockSlotWirelessLink>
  pulseSlotId?: string
  canvasNodeId?: string
  hideValueInput?: boolean
  onCommitValue: (value: string) => void
  onOutputPointerDown?: PointerEventHandler<HTMLButtonElement>
  onOutputPointerUp?: PointerEventHandler<HTMLButtonElement>
  onOutputPointerMove?: PointerEventHandler<HTMLButtonElement>
  onInputPointerUp?: PointerEventHandler<HTMLButtonElement>
  onMapHashOutputPointerDown?: (
    slotId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onMapHashOutputPointerUp?: (
    slotId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onMapHashOutputPointerMove?: (
    slotId: string,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => void
  onMapHashStructureSlotRemoved?: (slotId: string) => void
  onSlotWirelessHoverStart?: (slotId: string, link: BlockSlotWirelessLink) => void
  onSlotWirelessHoverEnd?: () => void
  outputConnectionCount?: number
  outputConnectionIndex?: number
  onOutputConnectionIndexChange?: (index: number) => void
  slotToolsEnabled?: boolean
  slotPagerEnabled?: boolean
  lightModeEnabled?: boolean
  blockElementView?: Partial<Record<BlockElementViewKey, BlockElementViewState>>
  onBlockElementSelectedIndexChange?: (elementKey: BlockElementViewKey, index: number) => void
  blockSlotPeerActions?: BlockSlotPeerActions
}

export function BlockParameterRow({
  parameter,
  value,
  interactionLocked = false,
  hasInputSlot,
  hasOutputSlot,
  activeSlotId,
  inputSlotLink,
  outputSlotLink,
  blockWirelessSlots,
  pulseSlotId,
  hideValueInput = false,
  onCommitValue,
  onOutputPointerDown,
  onOutputPointerUp,
  onOutputPointerMove,
  onInputPointerUp,
  onMapHashOutputPointerDown,
  onMapHashOutputPointerUp,
  onMapHashOutputPointerMove,
  onMapHashStructureSlotRemoved,
  canvasNodeId,
  onSlotWirelessHoverStart,
  onSlotWirelessHoverEnd,
  outputConnectionCount = 0,
  outputConnectionIndex = 0,
  onOutputConnectionIndexChange,
  slotToolsEnabled = false,
  slotPagerEnabled = false,
  lightModeEnabled = false,
  blockElementView,
  onBlockElementSelectedIndexChange,
  blockSlotPeerActions,
}: BlockParameterRowProps) {
  const outputSlotId = `block-param:${parameter.idParameter}:output`
  const inputSlotId = `block-param:${parameter.idParameter}:input`
  const dataType = blockRitualTypeToNodeDataType(parameter.typeParameter)
  const isStringInput = dataType === 'string'
  const isMapHashEmbed = parameter.typeParameter === 'mapHashEmbed'
  const isMapHashPointer = parameter.typeParameter === 'mapHashPointer'
  const isMapU64Pointer = parameter.typeParameter === 'mapU64Pointer'
  const isMapStructure = isBlockMapStructureType(parameter.typeParameter)
  const [inputFocused, setInputFocused] = useState(false)
  const mapSlotOutRef = useRef<HTMLDivElement>(null)

  const paramViewKey = blockElementViewKeyForParameter(parameter.idParameter)
  const persistedMapIndex =
    blockElementView?.[paramViewKey]?.selectedIndex ?? (lightModeEnabled ? 0 : undefined)

  const mapHashFieldProps = {
    activeSlotId,
    blockWirelessSlots,
    canvasNodeId: canvasNodeId ?? '',
    defaultValue: parameter.defaultValue,
    interactionLocked,
    lightModeEnabled,
    persistedSelectedIndex: persistedMapIndex,
    onPersistedSelectedIndexChange: onBlockElementSelectedIndexChange
      ? (index: number) => onBlockElementSelectedIndexChange(paramViewKey, index)
      : undefined,
    onCommit: onCommitValue,
    onInputFocusChange: setInputFocused,
    onOutputPointerDown: onMapHashOutputPointerDown,
    onOutputPointerMove: onMapHashOutputPointerMove,
    onOutputPointerUp: onMapHashOutputPointerUp,
    onSlotWirelessHoverEnd,
    onSlotWirelessHoverStart,
    onStructureSlotRemoved: onMapHashStructureSlotRemoved,
    parameterId: parameter.idParameter,
    parameterTitle: parameter.nameParameter,
    pulseSlotId,
    slotOutRef: mapSlotOutRef,
    value,
  }

  const inputPeerState =
    slotToolsEnabled && inputSlotLink && blockSlotPeerActions
      ? blockSlotPeerActions.getPeerState(inputSlotId, 'input')
      : undefined
  const outputPeerState =
    slotToolsEnabled && outputSlotLink && blockSlotPeerActions
      ? blockSlotPeerActions.getPeerState(outputSlotId, 'output', outputConnectionIndex)
      : undefined
  const showSlotPagerBelow = slotPagerEnabled && slotToolsEnabled && outputConnectionCount > 1
  const showInlineSlotPager = slotPagerEnabled && !slotToolsEnabled && outputConnectionCount > 1

  const mapHashField =
    isMapStructure && canvasNodeId ? (
      isMapHashEmbed ? (
        <BlockMapHashEmbedField {...mapHashFieldProps} />
      ) : isMapHashPointer ? (
        <BlockMapHashPointerField {...mapHashFieldProps} />
      ) : isMapU64Pointer ? (
        <BlockMapU64PointerField {...mapHashFieldProps} />
      ) : null
    ) : null

  return (
    <div
      className={styles.row}
      data-input-focused={inputFocused ? '1' : '0'}
      data-map-structure={isMapStructure ? '1' : '0'}
      data-map-list={isMapStructure ? '1' : '0'}
      data-no-value={hideValueInput ? '1' : '0'}
      data-slot-tools={slotToolsEnabled ? '1' : '0'}
      data-slot-pager-below={showSlotPagerBelow ? '1' : '0'}
    >
      <div className={styles.slotIn}>
        {hasInputSlot ? (
          <div className={styles.slotInStack}>
            <BlockSlot
              variant="in"
              ariaLabel={`Entrada ${parameter.nameParameter}`}
              disabled={interactionLocked}
              active={activeSlotId === inputSlotId}
              linked={Boolean(inputSlotLink)}
              wireless={inputSlotLink?.routing === 'wireless'}
              forced={inputSlotLink?.forced === true}
              pulsing={isBlockSlotPulsing(
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
            />
            {inputPeerState ? (
              <BlockSlotPeerToolbar
                peer={inputPeerState}
                onFocusPeer={() => blockSlotPeerActions!.onFocusPeer(inputSlotId, 'input')}
                onRemoveConnection={() =>
                  blockSlotPeerActions!.onRemoveConnection(inputSlotId, 'input')
                }
                onToggleLock={() => blockSlotPeerActions!.onToggleLock(inputSlotId, 'input')}
                onToggleVisibility={() =>
                  blockSlotPeerActions!.onToggleVisibility(inputSlotId, 'input')
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={styles.iconCell}>
        {!isMapStructure ? (
          <BlockParameterIcon hint={parameter.iconHint ?? null} iconId={parameter.iconId} />
        ) : null}
      </div>
      <span
        className={styles.label}
        data-block-param-label="1"
        title={parameter.nameParameter}
      >
        {parameter.nameParameter}
      </span>
      {!isMapStructure ? (
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
                readOnly={Boolean(inputSlotLink)}
                value={value}
                onCommit={onCommitValue}
                onFocusChange={isStringInput ? setInputFocused : undefined}
              />
            </>
          )}
        </div>
      ) : (
        <div className={styles.field}>
          <span className={styles.focusedTitle}>{parameter.nameParameter}</span>
          {mapHashField}
        </div>
      )}
      <div
        className={styles.slotOut}
        data-block-map-hash-slot-out={isMapStructure ? '1' : '0'}
        ref={isMapStructure ? mapSlotOutRef : undefined}
      >
        {hasOutputSlot && !isMapStructure ? (
          <div className={styles.slotOutStack}>
            {!showSlotPagerBelow && showInlineSlotPager ? (
              <BlockSlotConnectionPager
                onSelectedIndexChange={(index) => onOutputConnectionIndexChange?.(index)}
                selectedIndex={outputConnectionIndex}
                total={outputConnectionCount}
              />
            ) : null}
            <BlockSlot
              variant="out"
              ariaLabel={`Saída ${parameter.nameParameter}`}
              disabled={interactionLocked}
              active={activeSlotId === outputSlotId}
              linked={Boolean(outputSlotLink)}
              wireless={outputSlotLink?.routing === 'wireless'}
              forced={outputSlotLink?.forced === true}
              pulsing={isBlockSlotPulsing(
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
            />
            {outputPeerState ? (
              <BlockSlotPeerToolbar
                peer={outputPeerState}
                onFocusPeer={() =>
                  blockSlotPeerActions!.onFocusPeer(outputSlotId, 'output', outputConnectionIndex)
                }
                onRemoveConnection={() =>
                  blockSlotPeerActions!.onRemoveConnection(
                    outputSlotId,
                    'output',
                    outputConnectionIndex,
                  )
                }
                onToggleLock={() =>
                  blockSlotPeerActions!.onToggleLock(outputSlotId, 'output', outputConnectionIndex)
                }
                onToggleVisibility={() =>
                  blockSlotPeerActions!.onToggleVisibility(
                    outputSlotId,
                    'output',
                    outputConnectionIndex,
                  )
                }
              />
            ) : null}
          </div>
        ) : null}
      </div>
      {showSlotPagerBelow ? (
        <div className={styles.slotPagerBelow}>
          <BlockSlotConnectionPager
            layout="below"
            onSelectedIndexChange={(index) => onOutputConnectionIndexChange?.(index)}
            selectedIndex={outputConnectionIndex}
            total={outputConnectionCount}
          />
        </div>
      ) : null}
    </div>
  )
}
