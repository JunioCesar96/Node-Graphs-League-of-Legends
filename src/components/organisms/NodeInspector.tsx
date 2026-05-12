import type { CSSProperties, HTMLAttributes, KeyboardEvent, ReactNode } from 'react'
import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { ViewportDockPinIcon } from '@/components/atoms/ViewportDockPinIcon'
import type { CanvasNode } from '@/core/canvasScene'

import styles from './NodeInspector.module.css'

type NodeInspectorProps = {
  canDelete: boolean
  dragHandleProps: HTMLAttributes<HTMLElement>
  minimized: boolean
  node?: CanvasNode | undefined
  onDelete: () => void
  onDockToViewport?: () => void
  onToggleMinimized: () => void
  onUndockFromViewportToolbar?: () => void
  onUpdateParameter: (parameterId: string, value: string) => void
  /** True quando o painel está dentro da régua «Canvas viewport controls». */
  viewportDocked?: boolean
}

/** Conteúdo flutuante acoplado à barra da vista (portal → body, fora da viewport com overflow:hidden). */
type DockedFloatingPlacement = null | 'toolbarAnchoredFloating'

function getParameterValue(node: CanvasNode, parameterId: string, fallback: string) {
  return node.node.values.find((value) => value.parameterId === parameterId)?.value ?? fallback
}

type BodyProps = {
  canDelete: boolean
  handleParameterKeyDown: (event: KeyboardEvent<HTMLInputElement>, parameterId: string) => void
  node: CanvasNode
  onCommitParameter: (parameterId: string, value: string) => void
  onDelete: () => void
}

function SelectedNodeInspectorBody({
  canDelete,
  handleParameterKeyDown,
  node,
  onCommitParameter,
  onDelete,
}: BodyProps) {
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
          {node.node.schema.parameters.map((parameter) => (
            <li className={styles.listItem} key={parameter.id}>
              <span className={styles.name}>{parameter.name}</span>
              <label className={styles.parameterEditor}>
                <span className={styles.type}>{parameter.type}</span>
                <input
                  aria-label={`${parameter.name} value`}
                  defaultValue={getParameterValue(node, parameter.id, parameter.defaultValue)}
                  key={`${node.id}:${parameter.id}:${getParameterValue(node, parameter.id, parameter.defaultValue)}`}
                  onBlur={(event) => onCommitParameter(parameter.id, event.target.value)}
                  onKeyDown={(event) => handleParameterKeyDown(event, parameter.id)}
                />
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="inspector-entities">
        <h3 className={styles.sectionTitle} id="inspector-entities">
          Entities
        </h3>
        <ul className={styles.list}>
          {node.node.schema.entities.map((entity) => (
            <li className={styles.listItem} key={entity.id}>
              <span className={styles.name}>{entity.name}</span>
              <span className={styles.type}>{entity.schemaId}</span>
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
  node,
  onDelete,
  onDockToViewport,
  onToggleMinimized,
  onUndockFromViewportToolbar,
  onUpdateParameter,
  viewportDocked = false,
}: NodeInspectorProps) {
  const commitParameter = (parameterId: string, value: string) => {
    onUpdateParameter(parameterId, value)
  }

  const dockedFloating: DockedFloatingPlacement =
    !minimized && viewportDocked ? 'toolbarAnchoredFloating' : null

  const { flyoutStyle, stripRef } = useDockedFloatingLayout(dockedFloating)

  const handleParameterKeyDown = (event: KeyboardEvent<HTMLInputElement>, parameterId: string) => {
    if (!node) {
      return
    }

    if (event.key === 'Enter') {
      event.currentTarget.blur()
    }

    if (event.key === 'Escape') {
      const parameter = node.node.schema.parameters.find((currentParameter) => currentParameter.id === parameterId)

      if (parameter) {
        event.currentTarget.value = getParameterValue(node, parameterId, parameter.defaultValue)
      }

      event.currentTarget.blur()
    }
  }

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
          handleParameterKeyDown={handleParameterKeyDown}
          node={node}
          onCommitParameter={commitParameter}
          onDelete={onDelete}
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
        handleParameterKeyDown={handleParameterKeyDown}
        node={node}
        onCommitParameter={commitParameter}
        onDelete={onDelete}
      />
    </aside>
  )
}
