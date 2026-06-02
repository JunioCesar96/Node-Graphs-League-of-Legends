import { useEffect, useState, type HTMLAttributes } from 'react'

import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { DockTabIcon } from '@/components/atoms/DockTabIcon'
import { InspectorViewportDockShell } from '@/components/molecules/InspectorViewportDockShell'
import { InspectorFloatingPanelShell } from '@/components/molecules/InspectorFloatingPanelShell'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { CanvasNode, CanvasPosition } from '@/core/canvasScene'
import { fx_required_parameter_isMarked } from '@/core/fx_required_parameter'
import { link_parameter_value_is_linked } from '@/core/link_parameter_value'
import { parameterMatchesHashStringSource } from '@/core/hashString'
import { LangId } from '@/core/language/languageIds'
import type { NodeParameterDefinition } from '@/core/nodeSchema'
import { useLanguage } from '@/language/LanguageProvider'

import dockStyles from '@/styles/inspectorViewportDock.module.css'
import styles from './NodeInspector.module.css'

type NodeInspectorProps = {
  canDelete: boolean
  dragHandleProps: HTMLAttributes<HTMLElement>
  minimized: boolean
  nodeConfigurationMode?: boolean
  node?: CanvasNode | undefined
  onCreateInstance?: () => void
  onDelete: () => void
  onDockToViewport?: () => void
  onToggleMinimized: () => void
  onUndockFromViewportToolbar?: () => void
  onUpdateParameter: (parameterId: string, value: string) => void
  /** Actualiza a posição do nó no canvas (coordenadas em px). */
  onUpdatePosition: (position: CanvasPosition) => void
  /** Troca de posição entre o parâmetro arrastado e o parâmetro alvo (mesma lista). */
  onSwapParameterPositions: (draggedParameterId: string, targetParameterId: string) => void
  /** Confirmação: em dev grava `required_parameter` no JSON do schema sob `nodeStructures/` e actualiza a instância. */
  onPromptToggleRequiredParameter?: (parameterId: string) => void
  /** Abre o diálogo para vincular o valor deste parâmetro a outro do mesmo tipo (`link_parameter_value`). */
  onOpenParameterValueLinkPicker?: (parameterId: string) => void
  /** Catálogo de stubs do mesmo pack (nós base); usado para alinhar ids com o JSON em disco. */
  parameterStubCatalog?: readonly NodeParameterDefinition[]
  /** Modo Configurar: abre fluxo para escolher parâmetro string fonte da hashString. */
  onAddHashStringInNode?: () => void
  /** True quando o painel está dentro da régua «Canvas viewport controls». */
  viewportDocked?: boolean
}

const PARAMETER_DRAG_MIME = 'application/x-node-graph-parameter-id'

function parsePositionChannel(raw: string): number | null {
  const parsed = Number.parseFloat(raw.trim())

  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.round(parsed)
}

function NodePositionEditor({
  position,
  onCommit,
}: {
  position: CanvasPosition
  onCommit: (position: CanvasPosition) => void
}) {
  const [draftX, setDraftX] = useState(String(position.x))
  const [draftY, setDraftY] = useState(String(position.y))

  useEffect(() => {
    setDraftX(String(position.x))
    setDraftY(String(position.y))
  }, [position.x, position.y])

  const handleXChange = (raw: string) => {
    setDraftX(raw)

    const x = parsePositionChannel(raw)

    if (x === null) {
      return
    }

    const y = parsePositionChannel(draftY) ?? position.y
    onCommit({ x, y })
  }

  const handleYChange = (raw: string) => {
    setDraftY(raw)

    const y = parsePositionChannel(raw)

    if (y === null) {
      return
    }

    const x = parsePositionChannel(draftX) ?? position.x
    onCommit({ x, y })
  }

  return (
    <div className={styles.positionFields}>
      <label className={styles.positionField}>
        <input
          aria-label="Posição X"
          inputMode="numeric"
          onChange={(event) => handleXChange(event.target.value)}
          type="number"
          value={draftX}
        />
        <span>X</span>
      </label>
      <label className={styles.positionField}>
        <input
          aria-label="Posição Y"
          inputMode="numeric"
          onChange={(event) => handleYChange(event.target.value)}
          type="number"
          value={draftY}
        />
        <span>Y</span>
      </label>
    </div>
  )
}

function HashStringInspectorButton({
  active,
  compact,
  onClick,
}: {
  active: boolean
  compact?: boolean
  onClick: () => void
}) {
  return (
    <button
      aria-label="Definir hashString a partir de um parâmetro string"
      className={[
        styles.hashStringButton,
        compact ? styles.hashStringButtonCompact : '',
        active ? styles.hashStringButtonActive : styles.hashStringButtonIdle,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      type="button"
    >
      #
    </button>
  )
}

function getParameterValue(node: CanvasNode, parameterId: string, fallback: string) {
  return node.node.values.find((value) => value.parameterId === parameterId)?.value ?? fallback
}

function ParameterOrderDragHandle({
  onDragEnd,
  parameterId,
}: {
  onDragEnd: () => void
  parameterId: string
}) {
  return (
    <div
      aria-label="Arrastar para reordenar o parâmetro na lista"
      className={styles.listOrderHandle}
      draggable
      onDragEnd={() => {
        onDragEnd()
      }}
      onDragStart={(event) => {
        event.dataTransfer.setData(PARAMETER_DRAG_MIME, parameterId)
        event.dataTransfer.setData('text/plain', parameterId)
        event.dataTransfer.effectAllowed = 'move'
        event.stopPropagation()
      }}
      onPointerDown={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
    >
      <svg aria-hidden className={styles.listOrderGrip} viewBox="0 0 20 20">
        <circle cx="6" cy="5" r="1.35" fill="currentColor" />
        <circle cx="14" cy="5" r="1.35" fill="currentColor" />
        <circle cx="6" cy="10" r="1.35" fill="currentColor" />
        <circle cx="14" cy="10" r="1.35" fill="currentColor" />
        <circle cx="6" cy="15" r="1.35" fill="currentColor" />
        <circle cx="14" cy="15" r="1.35" fill="currentColor" />
      </svg>
    </div>
  )
}

type BodyProps = {
  canDelete: boolean
  nodeConfigurationMode?: boolean
  node: CanvasNode
  onCommitParameter: (parameterId: string, value: string) => void
  onCreateInstance?: () => void
  onDelete: () => void
  onSwapParameterPositions: (draggedParameterId: string, targetParameterId: string) => void
  onUpdatePosition: (position: CanvasPosition) => void
  onPromptToggleRequiredParameter?: (parameterId: string) => void
  onOpenParameterValueLinkPicker?: (parameterId: string) => void
  parameterStubCatalog?: readonly NodeParameterDefinition[]
}

function SelectedNodeInspectorBody({
  canDelete,
  nodeConfigurationMode = false,
  node,
  onCommitParameter,
  onCreateInstance,
  onDelete,
  onSwapParameterPositions,
  onUpdatePosition,
  onPromptToggleRequiredParameter,
  onOpenParameterValueLinkPicker,
  parameterStubCatalog,
}: BodyProps) {
  const { t } = useLanguage()
  const [dragOverIndex, setDragOverIndex] = useState<null | number>(null)

  const parameterCount = node.node.schema.parameters.length

  return (
    <>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <span className={styles.label}>instance</span>
          <span className={styles.value}>{node.node.id}</span>
        </span>
        <span className={styles.metaItem}>
          <span className={styles.label}>position</span>
          <NodePositionEditor onCommit={onUpdatePosition} position={node.position} />
        </span>
      </div>

      <div className={styles.actions}>
        {onCreateInstance ? (
          <button className={styles.instanceAction} onClick={onCreateInstance} type="button">
            Instance
          </button>
        ) : null}
        <button className={styles.deleteAction} disabled={!canDelete} onClick={onDelete} type="button">
          {t(LangId.NodeInspectorActionDelete)}
        </button>
      </div>

      <section className={styles.section} aria-labelledby="inspector-parameters">
        <h3 className={styles.sectionTitle} id="inspector-parameters">
          {t(LangId.NodeInspectorSectionParameters)}
        </h3>
        <ul className={styles.list}>
          {node.node.schema.parameters.map((parameter, parameterIndex) => {
            const parameterRequired = fx_required_parameter_isMarked(
              node.node,
              parameter.id,
              parameterStubCatalog,
            )
            const parameterValueLinked = link_parameter_value_is_linked(node.node, parameter.id)
            const hashSource = parameterMatchesHashStringSource(
              parameter.id,
              node.node,
              parameterStubCatalog,
            )

            return (
            <li
              className={[
                styles.listItem,
                dragOverIndex === parameterIndex ? styles.listItemDropOver : '',
                hashSource ? styles.listItemHashSource : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={parameter.id}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = 'move'
                setDragOverIndex(parameterIndex)
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragOverIndex((previous) => (previous === parameterIndex ? null : previous))
                }
              }}
              onDrop={(event) => {
                event.preventDefault()
                const draggedId =
                  event.dataTransfer.getData(PARAMETER_DRAG_MIME) ||
                  event.dataTransfer.getData('text/plain')
                if (!draggedId || draggedId === parameter.id) {
                  setDragOverIndex(null)
                  return
                }
                onSwapParameterPositions(draggedId, parameter.id)
                setDragOverIndex(null)
              }}
            >
              <div className={styles.paramListRow}>
                <div className={styles.paramListRowMain}>
                  {nodeConfigurationMode && onPromptToggleRequiredParameter ? (
                    <button
                      aria-label={
                        parameterRequired
                          ? 'Remover parâmetro obrigatório (confirmação)'
                          : 'Marcar como parâmetro obrigatório (confirmação)'
                      }
                      aria-pressed={parameterRequired}
                      className={[
                        styles.requiredClip,
                        parameterRequired ? styles.requiredClipOn : styles.requiredClipOff,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onPromptToggleRequiredParameter(parameter.id)
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      title="Parâmetro obrigatório (clip)"
                      type="button"
                    >
                      <svg aria-hidden className={styles.requiredClipSvg} viewBox="0 0 24 24">
                        <path
                          d="M8.5 14.5L15.5 7.5C16.6 6.4 18.3 6.35 19.45 7.4 20.55 8.45 20.58 10.15 19.5 11.25L12.25 18.5C10.45 20.3 7.55 20.3 5.75 18.5 3.95 16.7 3.95 13.8 5.75 12L13 4.75C14.35 3.4 16.6 3.35 18 4.7 19.4 6.05 19.42 8.3 18.1 9.65L10.65 17.1"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.6"
                        />
                      </svg>
                    </button>
                  ) : null}
                  {nodeConfigurationMode && onOpenParameterValueLinkPicker ? (
                    <button
                      aria-label="Vincular valor a outro parâmetro do mesmo tipo"
                      aria-pressed={parameterValueLinked}
                      className={[
                        styles.valueLink,
                        parameterValueLinked ? styles.valueLinkOn : styles.valueLinkOff,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        onOpenParameterValueLinkPicker(parameter.id)
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                      title="Vincular valor (mesmo tipo)"
                      type="button"
                    >
                      <svg aria-hidden className={styles.valueLinkSvg} viewBox="0 0 24 24">
                        <path
                          d="M10.5 13.5a4.5 4.5 0 010-6.36l1.06-1.06a4.5 4.5 0 016.36 6.36l-.71.71M13.5 10.5a4.5 4.5 0 010 6.36l-1.06 1.06a4.5 4.5 0 01-6.36-6.36l.71-.71"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeWidth="1.7"
                        />
                      </svg>
                    </button>
                  ) : null}
                  <span className={styles.name}>{parameter.name}</span>
                </div>
                {parameterCount > 1 ? (
                  <ParameterOrderDragHandle
                    onDragEnd={() => setDragOverIndex(null)}
                    parameterId={parameter.id}
                  />
                ) : null}
              </div>
              <label className={styles.parameterEditor}>
                <span className={styles.type}>{parameter.type}</span>
                <ParameterValueInput
                  ariaLabel={`${parameter.name} value`}
                  key={`${node.id}:${parameter.id}`}
                  onCommit={(nextValue) => onCommitParameter(parameter.id, nextValue)}
                  type={parameter.type}
                  value={getParameterValue(node, parameter.id, parameter.defaultValue)}
                />
              </label>
            </li>
            )
          })}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="inspector-internal-structures">
        <h3 className={styles.sectionTitle} id="inspector-internal-structures">
          Internal_Structures
        </h3>
        <ul className={styles.list}>
          {node.node.schema.internalStructures.map((structure) => (
            <li className={styles.listItem} key={structure.id}>
              <span className={styles.name} title={structure.name}>
                {structure.name}
              </span>
              <span className={styles.type}>{structure.schemaId}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export function NodeInspector({
  dragHandleProps,
  canDelete,
  minimized,
  nodeConfigurationMode = false,
  node,
  onCreateInstance,
  onDelete,
  onDockToViewport,
  onToggleMinimized,
  onUndockFromViewportToolbar,
  onUpdateParameter,
  onUpdatePosition,
  onSwapParameterPositions,
  onPromptToggleRequiredParameter,
  onOpenParameterValueLinkPicker,
  parameterStubCatalog,
  onAddHashStringInNode,
  viewportDocked = false,
}: NodeInspectorProps) {
  const { t } = useLanguage()
  const commitParameter = (parameterId: string, value: string) => {
    onUpdateParameter(parameterId, value)
  }

  const hashBindingActive = Boolean(
    node && (node.node.hashStringParameterId ?? node.node.schema.hashStringParameterId),
  )

  /** Acoplado à barra da vista: sem arrastar o painel (só desacoplar pelo ícone de pin). */
  const panelDragHandleProps = viewportDocked ? {} : dragHandleProps

  const dockPinButton =
    viewportDocked && onUndockFromViewportToolbar ? (
      <button
        aria-label="Desacoplar inspector da barra da vista"
        className={styles.dockToggle}
        onClick={(event) => {
          event.stopPropagation()
          onUndockFromViewportToolbar()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <ViewportDockPinIcon filled />
      </button>
    ) : onDockToViewport ? (
      <button
        aria-label="Acoplar inspector à barra da vista"
        className={styles.dockToggle}
        onClick={(event) => {
          event.stopPropagation()
          onDockToViewport()
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <ViewportDockPinIcon filled={false} />
      </button>
    ) : null

  const headerActions = (
    <>
      <button
        aria-label={
          node ? 'Minimizar inspector do nó' : 'Minimizar inspector sem nó seleccionado'
        }
        className={styles.toggle}
        onClick={onToggleMinimized}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        −
      </button>
      {dockPinButton}
    </>
  )

  if (viewportDocked) {
    if (!node) {
      return (
        <InspectorViewportDockShell
          body={<p className={styles.emptyMessage}>{t(LangId.NodeInspectorEmptyHint)}</p>}
          bodyClassName="inspectorScrollHost"
          expandAriaLabel="Expandir inspector (sem nó seleccionado)"
          expandContent={<DockTabIcon kind="node" />}
          eyebrow={t(LangId.NodeInspectorEmptyTitle)}
          headerActions={headerActions}
          minimized={minimized}
          onExpand={onToggleMinimized}
          shellSurfaceClassName={dockStyles.dockedShellNode}
          title={t(LangId.NodeInspectorEyebrow)}
        />
      )
    }

    return (
      <InspectorViewportDockShell
        body={
          <SelectedNodeInspectorBody
            canDelete={canDelete}
            nodeConfigurationMode={nodeConfigurationMode}
            node={node}
            onCommitParameter={commitParameter}
            onCreateInstance={onCreateInstance}
            onDelete={onDelete}
            onOpenParameterValueLinkPicker={onOpenParameterValueLinkPicker}
            onPromptToggleRequiredParameter={onPromptToggleRequiredParameter}
            parameterStubCatalog={parameterStubCatalog}
            onSwapParameterPositions={onSwapParameterPositions}
            onUpdatePosition={onUpdatePosition}
          />
        }
        bodyClassName="inspectorScrollHost"
        expandAriaLabel="Expandir inspector do nó seleccionado"
        expandContent={<DockTabIcon kind="node" />}
        eyebrow={node.node.schema.title}
        headerActions={headerActions}
        minimized={minimized}
        onExpand={onToggleMinimized}
        shellSurfaceClassName={dockStyles.dockedShellNode}
        title={t(LangId.NodeInspectorEyebrow)}
      />
    )
  }

  if (!node) {
    if (minimized) {
      const minimizedRowClassName = [
        styles.minimizedDockRow,
        panelDragHandleProps?.onPointerDown ? styles.minimizedDockRowDraggable : '',
      ]
        .filter(Boolean)
        .join(' ')

      return (
        <div className={minimizedRowClassName}>
          <button
            aria-label="Expandir inspector (sem nó seleccionado)"
            className={styles.minimizedButton}
            onClick={onToggleMinimized}
            {...panelDragHandleProps}
            type="button"
          >
            <span className={styles.minimizedIcon}>—</span>
            <span className={styles.minimizedLabel} title="Sem seleção">
              Sem seleção
            </span>
          </button>
          <div className={styles.minimizedDockActions}>{dockPinButton}</div>
        </div>
      )
    }

    return (
      <InspectorFloatingPanelShell
        ariaLabel="Inspector sem seleção"
        body={<p className={styles.emptyMessage}>{t(LangId.NodeInspectorEmptyHint)}</p>}
        bodyClassName="inspectorScrollHost"
        dragHandleProps={panelDragHandleProps}
        eyebrow={t(LangId.NodeInspectorEmptyTitle)}
        headerActions={headerActions}
        shellSurfaceClassName={dockStyles.dockedShellNode}
        title={t(LangId.NodeInspectorEyebrow)}
      />
    )
  }

  if (minimized) {
    const minimizedRowClassName = [
      styles.minimizedDockRow,
      panelDragHandleProps?.onPointerDown ? styles.minimizedDockRowDraggable : '',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={minimizedRowClassName}>
        <button
          aria-label="Expandir inspector do nó seleccionado"
          className={styles.minimizedButton}
          onClick={onToggleMinimized}
          {...panelDragHandleProps}
          type="button"
        >
          <span className={styles.minimizedIcon}>N</span>
          {nodeConfigurationMode && onAddHashStringInNode ? (
            <HashStringInspectorButton
              active={hashBindingActive}
              compact
              onClick={onAddHashStringInNode}
            />
          ) : null}
          <span className={styles.minimizedLabel} title={node.node.schema.title}>
            {node.node.schema.title}
          </span>
        </button>
        <div className={styles.minimizedDockActions}>{dockPinButton}</div>
      </div>
    )
  }

  return (
    <InspectorFloatingPanelShell
      ariaLabel={`Inspector: ${node.node.schema.title}`}
      body={
        <SelectedNodeInspectorBody
          canDelete={canDelete}
          nodeConfigurationMode={nodeConfigurationMode}
          node={node}
          onCommitParameter={commitParameter}
          onCreateInstance={onCreateInstance}
          onDelete={onDelete}
          onOpenParameterValueLinkPicker={onOpenParameterValueLinkPicker}
          onPromptToggleRequiredParameter={onPromptToggleRequiredParameter}
          parameterStubCatalog={parameterStubCatalog}
          onSwapParameterPositions={onSwapParameterPositions}
          onUpdatePosition={onUpdatePosition}
        />
      }
      bodyClassName="inspectorScrollHost"
      dragHandleProps={panelDragHandleProps}
      eyebrow={node.node.schema.title}
      headerActions={headerActions}
      shellSurfaceClassName={dockStyles.dockedShellNode}
      title={t(LangId.NodeInspectorEyebrow)}
    />
  )
}
