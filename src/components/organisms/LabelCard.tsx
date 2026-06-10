import type { MouseEvent as ReactMouseEvent, PointerEvent, PointerEventHandler } from 'react'
import { useMemo } from 'react'

import { BlockParameterRow } from '@/components/molecules/BlockParameterRow'
import { BlockSlot } from '@/components/atoms/BlockSlot'
import { LabelCardParameterMenu } from '@/components/molecules/LabelCardParameterMenu'
import { StructureCardResizeHandles } from '@/components/molecules/StructureCardResizeHandles'
import { BLOCK_CARD_CONTEXT_ZONE_ATTR } from '@/core/canvasContextMenuAttributes'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import {
  blockParameterSlotId,
  isBlockStructuralSourcePath,
  type BlockParameterDef,
} from '@/core/blockSchema'
import { labelHeaderSlotId } from '@/core/labelSchema'
import type { CanvasContextMenuAnchor } from '@/core/canvasContextMenuTypes'
import type { BlockWirelessNodeDisplay, BlockSlotWirelessLink } from '@/core/blockConnectionDisplay'
import type { BlockSlotPeerActions } from '@/core/blockSlotPeerActions'
import { findConnectionsForBlockOutputSlot } from '@/core/blockSlotConnections'
import type { BlockElementViewKey, BlockElementViewState } from '@/core/blockElementViewState'
import {
  STRUCTURE_CARD_MAX_WIDTH,
  isStructureCardDragTarget,
  resolveLabelCardWidth,
} from '@/core/structureCardLayout'
import { LABEL_CARD_WIDTH } from '@/core/labelSchema'
import { resolveLabelEffectsForParent } from '@/core/labelParentEffects'
import {
  catalogParametersForLabelPicker,
  isLabelParentUnlinked,
  listLinkableBlockNodesForCatalogType,
  resolveCatalogParameterLabel,
  resolveLabelCatalogBlockType,
} from '@/core/labelParentLinking'
import {
  resolveLabelParameterDef,
  resolveLabelParameterDisplayValue,
  resolveLabelParentNode,
  normalizeLabelColor,
} from '@/core/syncLabelToParent'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './LabelCard.module.css'

type LabelCardProps = {
  canvasNode: CanvasNode
  scene: CanvasScene
  selected?: boolean
  interactionLocked?: boolean
  activeLabelSlotId?: string
  activeBlockSlotId?: string
  blockWirelessDisplay?: BlockWirelessNodeDisplay
  blockWirelessPulseSlotId?: string
  slotToolsEnabled?: boolean
  slotPagerEnabled?: boolean
  lightModeEnabled?: boolean
  blockElementView?: Partial<Record<BlockElementViewKey, BlockElementViewState>>
  onBlockElementSelectedIndexChange?: (elementKey: BlockElementViewKey, index: number) => void
  blockSlotPeerActions?: BlockSlotPeerActions
  onSlotToolsEnabledChange?: (enabled: boolean) => void
  resolveBlockOutputSlotConnectionIndex?: (slotId: string, connectionCount: number) => number
  onBlockOutputSlotConnectionIndexChange?: (slotId: string, index: number) => void
  onUpdateParentParameter: (paramId: string, value: string) => void
  onBlockOutputPointerDown?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockOutputPointerUp?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockOutputPointerMove?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockInputPointerUp?: (
    paramId: string,
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onBlockSlotWirelessHoverStart?: (slotId: string, link: BlockSlotWirelessLink) => void
  onBlockSlotWirelessHoverEnd?: () => void
  onMapHashStructureSlotRemoved?: (slotId: string) => void
  onLabelHeaderOutputPointerDown?: (
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onLabelHeaderOutputPointerUp?: (
    slotId: string,
    event: PointerEvent<HTMLButtonElement>,
  ) => void
  onAddLabelParameter?: (parameterId: string) => void
  onRemoveLabelParameter?: (parameterId: string) => void
  onEditParentParameter?: (param: BlockParameterDef, screenAnchor?: CanvasContextMenuAnchor) => void
  onToggleAllLabelParametersHiddenInParent?: () => void
  onSelectLinkedParentBlock?: () => void
  onLinkLabelToParentBlock?: (parentNodeId: string) => void
  onHoverLinkBlockCandidate?: (parentNodeId: string | null) => void
  parameterPanelRequest?: 'add' | 'edit' | 'remove' | null
  parameterPanelScreenAnchor?: CanvasContextMenuAnchor | null
  onParameterPanelRequestHandled?: () => void
  onParameterPanelDismiss?: () => void
  canvasScale?: number
  structureCardResizeModifierActive?: boolean
  onStructureCardResize?: (payload: { width: number; positionX: number }) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
}

export function LabelCard({
  canvasNode,
  scene,
  selected = false,
  interactionLocked = false,
  activeLabelSlotId,
  activeBlockSlotId,
  blockWirelessDisplay,
  blockWirelessPulseSlotId,
  slotToolsEnabled = false,
  slotPagerEnabled = false,
  lightModeEnabled = false,
  blockElementView,
  onBlockElementSelectedIndexChange,
  blockSlotPeerActions,
  onSlotToolsEnabledChange,
  resolveBlockOutputSlotConnectionIndex,
  onBlockOutputSlotConnectionIndexChange,
  onUpdateParentParameter,
  onBlockOutputPointerDown,
  onBlockOutputPointerUp,
  onBlockOutputPointerMove,
  onBlockInputPointerUp,
  onBlockSlotWirelessHoverStart,
  onBlockSlotWirelessHoverEnd,
  onMapHashStructureSlotRemoved,
  onLabelHeaderOutputPointerDown,
  onLabelHeaderOutputPointerUp,
  onAddLabelParameter,
  onRemoveLabelParameter,
  onEditParentParameter,
  onToggleAllLabelParametersHiddenInParent,
  onSelectLinkedParentBlock,
  onLinkLabelToParentBlock,
  onHoverLinkBlockCandidate,
  parameterPanelRequest = null,
  parameterPanelScreenAnchor = null,
  onParameterPanelRequestHandled,
  onParameterPanelDismiss,
  canvasScale = 1,
  structureCardResizeModifierActive = false,
  onStructureCardResize,
  onSelect,
  onStartDrag,
}: LabelCardProps) {
  const { t } = useLanguage()
  const structure = canvasNode.labelStructure
  const cardWidth = resolveLabelCardWidth(canvasNode)
  const headerColor = normalizeLabelColor(structure?.color ?? '#f5d000')
  const headerOutputSlotId = labelHeaderSlotId(canvasNode.id, 0)

  const parentUnlinked = Boolean(structure && isLabelParentUnlinked(structure.parentBlockNodeId))

  const parentNode = useMemo(
    () => (structure && !parentUnlinked ? resolveLabelParentNode(scene, structure) : undefined),
    [parentUnlinked, scene, structure],
  )

  const catalogParameterPool = useMemo(
    () =>
      catalogParametersForLabelPicker().map((entry) => ({
        idParameter: entry.idParameter,
        nameParameter: entry.nameParameter,
      })),
    [],
  )

  const parentParameters = parentUnlinked
    ? catalogParameterPool
    : (parentNode?.blockStructure?.parameters ?? [])
  const parentStructure = parentNode?.blockStructure
  const parentMissing = Boolean(structure && !parentUnlinked && !parentNode)
  const parentLocked = interactionLocked || parentMissing

  const catalogBlockType = structure ? resolveLabelCatalogBlockType(structure) : undefined

  const labelEffects = useMemo(
    () =>
      parentNode?.id
        ? resolveLabelEffectsForParent(scene, parentNode.id)
        : { highlighted: new Map<string, string>(), hidden: new Set<string>() },
    [parentNode?.id, scene],
  )

  const linkedBlockCandidates = useMemo(
    () =>
      listLinkableBlockNodesForCatalogType(scene, catalogBlockType).map((node, index) => ({
        id: node.id,
        index,
        label:
          node.blockStructure?.blockName?.trim() ||
          node.blockStructure?.blockType ||
          node.id,
      })),
    [catalogBlockType, scene],
  )
  const parentNodeId = parentNode?.id ?? ''

  if (!structure) {
    return null
  }

  return (
    <article
      className={[
        styles.card,
        selected ? styles.selected : '',
        interactionLocked ? styles.locked : '',
        onStartDrag && !interactionLocked ? styles.draggable : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-label-card="1"
      data-slot-tools={slotToolsEnabled ? '1' : '0'}
      style={{ width: `${cardWidth}px` }}
      onClick={(event) => {
        if (interactionLocked || !isStructureCardDragTarget(event.target)) {
          return
        }
        if (onStartDrag) {
          return
        }
        onSelect?.(event)
      }}
      onPointerDown={(event) => {
        if (interactionLocked || !onStartDrag || !isStructureCardDragTarget(event.target)) {
          return
        }
        onStartDrag(event)
      }}
    >
      <StructureCardResizeHandles
        disabled={interactionLocked}
        maxWidth={STRUCTURE_CARD_MAX_WIDTH}
        minWidth={LABEL_CARD_WIDTH}
        resizeModifierActive={structureCardResizeModifierActive}
        scale={canvasScale}
        startPositionX={canvasNode.position.x}
        width={cardWidth}
        onResize={(payload) => onStructureCardResize?.(payload)}
      />
      <header
        className={styles.header}
        style={{ backgroundColor: headerColor, color: '#111' }}
        {...{ [BLOCK_CARD_CONTEXT_ZONE_ATTR]: 'header' }}
      >
        <h3 className={styles.title}>{structure.labelName}</h3>
        <BlockSlot
          active={activeLabelSlotId === headerOutputSlotId}
          ariaLabel="Saída JSON"
          disabled={interactionLocked}
          slotId={headerOutputSlotId}
          nodeId={canvasNode.id}
          variant="out"
          onPointerDown={(event) => onLabelHeaderOutputPointerDown?.(headerOutputSlotId, event)}
          onPointerUp={(event) => onLabelHeaderOutputPointerUp?.(headerOutputSlotId, event)}
        />
      </header>
      <div className={styles.divider} style={{ backgroundColor: headerColor }} />
      <div
        className={styles.body}
        data-params-layout={canvasNode.structureCardParamsExpanded ? 'expanded' : 'compact'}
        data-slot-tools={slotToolsEnabled ? '1' : '0'}
      >
        {parentUnlinked ? (
          <p className={styles.parentMissing}>
            {t(
              LangId.LabelCardParentUnlinked,
              'Sem bloco vinculado. Use «Bloco vinculado» no rodapé para seleccionar um bloco.',
            )}
          </p>
        ) : null}
        {parentMissing ? (
          <p className={styles.parentMissing}>
            {t(LangId.LabelCardParentMissing, 'Bloco pai removido ou indisponível.')}
          </p>
        ) : null}
        {structure.parameters.length === 0 ? (
          <p className={styles.emptyHint}>
            {t(LangId.LabelCardNoParams, 'Nenhum parâmetro na label. Use Adicionar no rodapé.')}
          </p>
        ) : null}
        {parentUnlinked
          ? structure.parameters.map((entry) => (
              <div className={styles.unlinkedParamRow} key={entry.parameterId}>
                <span>{resolveCatalogParameterLabel(entry.parameterId)}</span>
              </div>
            ))
          : null}
        {parentNode && parentStructure
          ? structure.parameters.map((entry) => {
              const parameter = resolveLabelParameterDef(parentNode, entry.parameterId)
              if (!parameter) {
                return null
              }
              const hasOutput = Boolean(parameter.slotRules?.outputs?.length)
              const hasInput = Boolean(parameter.slotRules?.inputs?.length)
              const value = resolveLabelParameterDisplayValue(scene, parentNode, entry.parameterId)
              const outputSlotId = blockParameterSlotId(parameter.idParameter, 'output')
              const inputSlotId = blockParameterSlotId(parameter.idParameter, 'input')
              const outputConnectionCount = findConnectionsForBlockOutputSlot(
                scene,
                parentNodeId,
                outputSlotId,
              ).length
              const outputConnectionIndex =
                resolveBlockOutputSlotConnectionIndex?.(outputSlotId, outputConnectionCount) ?? 0

              return (
                <BlockParameterRow
                  key={entry.parameterId}
                  activeSlotId={activeBlockSlotId}
                  blockElementView={blockElementView ?? parentNode.blockElementView}
                  blockSlotPeerActions={blockSlotPeerActions}
                  blockType={parentStructure.blockType}
                  blockWirelessSlots={blockWirelessDisplay?.slots}
                  canvasNodeId={parentNodeId}
                  hasInputSlot={hasInput}
                  hasOutputSlot={hasOutput}
                  hideValueInput={isBlockStructuralSourcePath(parameter.sourcePath)}
                  inputSlotLink={blockWirelessDisplay?.slots.get(inputSlotId)}
                  interactionLocked={parentLocked}
                  labelHighlightColor={labelEffects.highlighted.get(parameter.idParameter)}
                  lightModeEnabled={lightModeEnabled}
                  outputConnectionCount={outputConnectionCount}
                  outputConnectionIndex={outputConnectionIndex}
                  outputSlotLink={blockWirelessDisplay?.slots.get(outputSlotId)}
                  parameter={parameter}
                  pulseSlotId={blockWirelessPulseSlotId}
                  slotPagerEnabled={slotPagerEnabled}
                  slotToolsEnabled={slotToolsEnabled}
                  value={value}
                  onBlockElementSelectedIndexChange={onBlockElementSelectedIndexChange}
                  onCommitValue={(nextValue) =>
                    onUpdateParentParameter(parameter.idParameter, nextValue)
                  }
                  onInputPointerUp={(event) =>
                    onBlockInputPointerUp?.(parameter.idParameter, inputSlotId, event)
                  }
                  onMapHashOutputPointerDown={(slotId, event) =>
                    onBlockOutputPointerDown?.(parameter.idParameter, slotId, event)
                  }
                  onMapHashOutputPointerMove={(slotId, event) =>
                    onBlockOutputPointerMove?.(parameter.idParameter, slotId, event)
                  }
                  onMapHashOutputPointerUp={(slotId, event) =>
                    onBlockOutputPointerUp?.(parameter.idParameter, slotId, event)
                  }
                  onMapHashStructureSlotRemoved={onMapHashStructureSlotRemoved}
                  onOutputConnectionIndexChange={(index) =>
                    onBlockOutputSlotConnectionIndexChange?.(outputSlotId, index)
                  }
                  onOutputPointerDown={(event) =>
                    onBlockOutputPointerDown?.(parameter.idParameter, outputSlotId, event)
                  }
                  onOutputPointerMove={(event) =>
                    onBlockOutputPointerMove?.(parameter.idParameter, outputSlotId, event)
                  }
                  onOutputPointerUp={(event) =>
                    onBlockOutputPointerUp?.(parameter.idParameter, outputSlotId, event)
                  }
                  onSlotWirelessHoverEnd={onBlockSlotWirelessHoverEnd}
                  onSlotWirelessHoverStart={onBlockSlotWirelessHoverStart}
                />
              )
            })
          : null}
      </div>
      <footer className={styles.footer} {...{ [BLOCK_CARD_CONTEXT_ZONE_ATTR]: 'footer' }}>
        <LabelCardParameterMenu
          interactionLocked={parentLocked}
          labelParameters={structure.parameters}
          parentParameters={parentParameters}
          slotToolsEnabled={slotToolsEnabled}
          externalPanelRequest={parameterPanelRequest}
          externalScreenAnchor={parameterPanelScreenAnchor}
          onAddParameter={onAddLabelParameter}
          onEditParameter={parentUnlinked ? undefined : onEditParentParameter}
          onExternalPanelRequestHandled={onParameterPanelRequestHandled}
          onPanelDismiss={onParameterPanelDismiss}
          onRemoveParameter={onRemoveLabelParameter}
          linkedParentBlock={
            parentNode && parentStructure
              ? {
                  id: parentNode.id,
                  label: parentStructure.blockName?.trim() || parentStructure.blockType,
                }
              : null
          }
          linkedBlockCandidates={linkedBlockCandidates}
          onHoverLinkedBlockCandidate={onHoverLinkBlockCandidate}
          onLinkParentBlock={onLinkLabelToParentBlock}
          onSelectLinkedParentBlock={onSelectLinkedParentBlock}
          onSlotToolsEnabledChange={onSlotToolsEnabledChange}
          onToggleAllHiddenInParent={onToggleAllLabelParametersHiddenInParent}
        />
      </footer>
    </article>
  )
}
