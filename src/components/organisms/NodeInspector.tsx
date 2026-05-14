import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import { ParameterValueInput } from '@/components/molecules/ParameterValueInput'
import type { CanvasNode } from '@/core/canvasScene'
import { fx_required_parameter_isMarked } from '@/core/fx_required_parameter'
import { link_parameter_value_is_linked } from '@/core/link_parameter_value'
import type { NodeParameterDefinition } from '@/core/nodeSchema'

import styles from './NodeInspector.module.css'

type NodeInspectorProps = {
  canDelete: boolean
  dragHandleProps: HTMLAttributes<HTMLElement>
  minimized: boolean
  nodeConfigurationMode?: boolean
  node?: CanvasNode | undefined
  onDelete: () => void
  onDockToViewport?: () => void
  onToggleMinimized: () => void
  onUndockFromViewportToolbar?: () => void
  onUpdateParameter: (parameterId: string, value: string) => void
  /** Troca de posição entre o parâmetro arrastado e o parâmetro alvo (mesma lista). */
  onSwapParameterPositions: (draggedParameterId: string, targetParameterId: string) => void
  /** Confirmação: em dev grava `required_parameter` no JSON do schema sob `nodeStructures/` e actualiza a instância. */
  onPromptToggleRequiredParameter?: (parameterId: string) => void
  /** Abre o diálogo para vincular o valor deste parâmetro a outro do mesmo tipo (`link_parameter_value`). */
  onOpenParameterValueLinkPicker?: (parameterId: string) => void
  /** Catálogo de stubs do mesmo pack (nós base); usado para alinhar ids com o JSON em disco. */
  parameterStubCatalog?: readonly NodeParameterDefinition[]
  /** True quando o painel está dentro da régua «Canvas viewport controls». */
  viewportDocked?: boolean
}

/** Conteúdo flutuante acoplado à barra da vista (portal → body, fora da viewport com overflow:hidden). */
type DockedFloatingPlacement = null | 'toolbarAnchoredFloating'

const PARAMETER_DRAG_MIME = 'application/x-node-graph-parameter-id'

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
  onDelete: () => void
  onSwapParameterPositions: (draggedParameterId: string, targetParameterId: string) => void
  onPromptToggleRequiredParameter?: (parameterId: string) => void
  onOpenParameterValueLinkPicker?: (parameterId: string) => void
  parameterStubCatalog?: readonly NodeParameterDefinition[]
}

function SelectedNodeInspectorBody({
  canDelete,
  nodeConfigurationMode = false,
  node,
  onCommitParameter,
  onDelete,
  onSwapParameterPositions,
  onPromptToggleRequiredParameter,
  onOpenParameterValueLinkPicker,
  parameterStubCatalog,
}: BodyProps) {
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
          <span className={styles.value}>
            {node.position.x}, {node.position.y}
          </span>
        </span>
      </div>

      <div className={styles.actions}>
        <button disabled={!canDelete} onClick={onDelete} type="button">
          Delete node
        </button>
      </div>

      <section className={styles.section} aria-labelledby="inspector-parameters">
        <h3 className={styles.sectionTitle} id="inspector-parameters">
          Parameters
        </h3>
        <ul className={styles.list}>
          {node.node.schema.parameters.map((parameter, parameterIndex) => {
            const parameterRequired = fx_required_parameter_isMarked(
              node.node,
              parameter.id,
              parameterStubCatalog,
            )
            const parameterValueLinked = link_parameter_value_is_linked(node.node, parameter.id)

            return (
            <li
              className={[
                styles.listItem,
                dragOverIndex === parameterIndex ? styles.listItemDropOver : '',
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
              <span className={styles.name}>{structure.name}</span>
              <span className={styles.type}>{structure.schemaId}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

function readCssSpacePx(variables: readonly string[]) {
  if (typeof window === 'undefined') {
    return 0
  }

  for (const name of variables) {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()

    if (raw.endsWith('px')) {
      const value = Number.parseFloat(raw)

      if (Number.isFinite(value)) {
        return value
      }
    }
  }

  return undefined
}

/** z-index entre o grafo e a AppMenuBar (≈20) para flutuar sobre o canvas sem roubar foco ao menu topo. */
const INSPECTOR_VIEWPORT_FLOAT_Z = 18

function useDockedFloatingLayout(placement: DockedFloatingPlacement) {
  const stripRef = useRef<HTMLDivElement | null>(null)
  const [flyoutStyle, setFlyoutStyle] = useState<CSSProperties>({})

  useLayoutEffect(() => {
    if (!placement) {
      setFlyoutStyle({})
      return
    }

    let raf = 0

    const syncPosition = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const strip = stripRef.current
        const toolbar = strip?.closest('[data-canvas-toolbar]')

        if (!strip || !(toolbar instanceof HTMLElement)) {
          return
        }

        const toolbarRect = toolbar.getBoundingClientRect()
        const stripRect = strip.getBoundingClientRect()
        const space = readCssSpacePx(['--space-3']) ?? 12
        const marginX = readCssSpacePx(['--space-4']) ?? 16
        const bottomPad = readCssSpacePx(['--space-5']) ?? 20

        const panelWidth = Math.min(340, window.innerWidth - 32)
        let left = stripRect.right - panelWidth
        left = Math.min(Math.max(marginX, left), Math.max(marginX, window.innerWidth - marginX - panelWidth))

        const top = toolbarRect.bottom + space
        const maxHeight = Math.max(180, window.innerHeight - top - bottomPad)

        setFlyoutStyle({
          position: 'fixed',
          top,
          left,
          width: panelWidth,
          maxHeight,
          zIndex: INSPECTOR_VIEWPORT_FLOAT_Z,
        })
      })
    }

    syncPosition()

    window.addEventListener('resize', syncPosition)
    window.addEventListener('scroll', syncPosition, true)

    const toolbarObserved = stripRef.current?.closest('[data-canvas-toolbar]')
    const stripObserved = stripRef.current

    let resizeObserver: ResizeObserver | undefined

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(syncPosition)

      if (toolbarObserved instanceof HTMLElement) {
        resizeObserver.observe(toolbarObserved)
      }

      if (stripObserved instanceof HTMLElement) {
        resizeObserver.observe(stripObserved)
      }
    }

    return () => {
      window.removeEventListener('resize', syncPosition)
      window.removeEventListener('scroll', syncPosition, true)
      cancelAnimationFrame(raf)
      resizeObserver?.disconnect()
    }
  }, [placement])

  return { flyoutStyle, stripRef }
}

function renderFloatingBodyToBody(flyout: ReactNode) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(flyout, document.body)
}

export function NodeInspector({
  dragHandleProps,
  canDelete,
  minimized,
  nodeConfigurationMode = false,
  node,
  onDelete,
  onDockToViewport,
  onToggleMinimized,
  onUndockFromViewportToolbar,
  onUpdateParameter,
  onSwapParameterPositions,
  onPromptToggleRequiredParameter,
  onOpenParameterValueLinkPicker,
  parameterStubCatalog,
  viewportDocked = false,
}: NodeInspectorProps) {
  const commitParameter = (parameterId: string, value: string) => {
    onUpdateParameter(parameterId, value)
  }

  const dockedFloating: DockedFloatingPlacement =
    !minimized && viewportDocked ? 'toolbarAnchoredFloating' : null

  const { flyoutStyle, stripRef } = useDockedFloatingLayout(dockedFloating)

  const dockPinButton =
    onDockToViewport || onUndockFromViewportToolbar ? (
      <button
        aria-label={
          viewportDocked ? 'Desacoplar inspector da barra da vista' : 'Acoplar inspector à barra da vista'
        }
        className={styles.dockToggle}
        onClick={(event) => {
          event.stopPropagation()
          if (viewportDocked) {
            onUndockFromViewportToolbar?.()
          } else {
            onDockToViewport?.()
          }
        }}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <ViewportDockPinIcon filled={viewportDocked} />
      </button>
    ) : null

  const inspectorToolbarActions = (
    <>
      {dockPinButton}
      <button
        aria-label={
          node ? 'Minimizar inspector do nó' : 'Minimizar inspector sem nó seleccionado'
        }
        className={styles.toggle}
        onClick={onToggleMinimized}
        type="button"
      >
        -
      </button>
    </>
  )

  if (!node) {
    if (minimized) {
      return (
        <div className={styles.inspectorMinimizedDockRow}>
          <button
            aria-label="Expandir inspector (sem nó seleccionado)"
            className={[styles.minimized, styles.minimizedReveal].join(' ')}
            onClick={onToggleMinimized}
            {...dragHandleProps}
            type="button"
          >
            <span className={styles.minimizedIcon}>—</span>
            <span className={styles.minimizedText}>Sem seleção</span>
          </button>
          {dockPinButton}
        </div>
      )
    }

    if (viewportDocked) {
      const flyoutAside = (
        <aside
          aria-label="Inspector sem nó seleccionado — detalhes"
          className={[styles.panel, styles.panelViewportFloatingBody].join(' ')}
          style={flyoutStyle}
        >
          <h2 className={styles.title}>Nenhum nó seleccionado</h2>
          <p className={styles.emptyMessage}>Clique num nó no canvas ou abra a paleta (add node).</p>
        </aside>
      )

      return (
        <>
          <div
            className={styles.inspectorChromeStrip}
            data-inspector-viewport-strip
            ref={stripRef}
          >
            <span className={styles.chromeStripEyebrow} {...dragHandleProps}>
              Inspector
            </span>
            <h2 className={styles.chromeStripTitle}>Sem nó seleccionado</h2>
            <div className={styles.headerActions}>{inspectorToolbarActions}</div>
          </div>
          {renderFloatingBodyToBody(flyoutAside)}
        </>
      )
    }

    return (
      <aside className={styles.panel} aria-label="Inspector sem seleção">
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow} {...dragHandleProps}>
              Inspector
            </span>
            <h2 className={styles.title}>Nenhum nó seleccionado</h2>
          </div>
          <div className={styles.headerActions}>{inspectorToolbarActions}</div>
        </div>
        <p className={styles.emptyMessage}>Clique num nó no canvas ou abra a paleta (add node).</p>
      </aside>
    )
  }

  if (minimized) {
    return (
      <div className={styles.inspectorMinimizedDockRow}>
        <button
          aria-label="Expandir inspector do nó seleccionado"
          className={[styles.minimized, styles.minimizedReveal].join(' ')}
          onClick={onToggleMinimized}
          {...dragHandleProps}
          type="button"
        >
          <span className={styles.minimizedIcon}>N</span>
          <span className={styles.minimizedText}>{node.node.schema.title}</span>
        </button>
        {dockPinButton}
      </div>
    )
  }

  if (viewportDocked) {
    const flyoutAside = (
      <aside
        aria-label={`Inspector: ${node.node.schema.title}`}
        className={[styles.panel, styles.panelViewportFloatingBody].join(' ')}
        style={flyoutStyle}
      >
        <SelectedNodeInspectorBody
          canDelete={canDelete}
          nodeConfigurationMode={nodeConfigurationMode}
          node={node}
          onCommitParameter={commitParameter}
          onDelete={onDelete}
          onOpenParameterValueLinkPicker={onOpenParameterValueLinkPicker}
          onPromptToggleRequiredParameter={onPromptToggleRequiredParameter}
          parameterStubCatalog={parameterStubCatalog}
          onSwapParameterPositions={onSwapParameterPositions}
        />
      </aside>
    )

    return (
      <>
        <div
          className={styles.inspectorChromeStrip}
          data-inspector-viewport-strip
          ref={stripRef}
        >
          <span className={styles.chromeStripEyebrow} {...dragHandleProps}>
            Nó
          </span>
          <h2 className={styles.chromeStripTitle}>{node.node.schema.title}</h2>
          <div className={styles.headerActions}>{inspectorToolbarActions}</div>
        </div>
        {renderFloatingBodyToBody(flyoutAside)}
      </>
    )
  }

  return (
    <aside className={styles.panel} aria-label={`Inspector: ${node.node.schema.title}`}>
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow} {...dragHandleProps}>
            Nó seleccionado
          </span>
          <h2 className={styles.title}>{node.node.schema.title}</h2>
        </div>
        <div className={styles.headerActions}>{inspectorToolbarActions}</div>
      </div>

      <SelectedNodeInspectorBody
        canDelete={canDelete}
        nodeConfigurationMode={nodeConfigurationMode}
        node={node}
        onCommitParameter={commitParameter}
        onDelete={onDelete}
        onOpenParameterValueLinkPicker={onOpenParameterValueLinkPicker}
        onPromptToggleRequiredParameter={onPromptToggleRequiredParameter}
        parameterStubCatalog={parameterStubCatalog}
        onSwapParameterPositions={onSwapParameterPositions}
      />
    </aside>
  )
}
