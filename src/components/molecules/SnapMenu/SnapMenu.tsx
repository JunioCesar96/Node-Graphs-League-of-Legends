import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import {
  buildSnapMenuLayout,
  buildSnapMenuPolygonPoints,
  resolveSnapMenuItemFromPointerDelta,
  resolveSnapMenuItemFromShortcut,
  resolveSnapMenuLayoutForActionCount,
  resolveSnapMenuOrbitRadiusPx,
  SNAP_MENU_DEAD_ZONE_PX,
  type SnapMenuActionDefinition,
  type SnapMenuLayoutOptions,
} from '@/core/snapMenu/snapMenu'

import styles from './SnapMenu.module.css'

export type SnapMenuAnchor = {
  left: number
  top: number
}

export type SnapMenuProps = {
  anchor: SnapMenuAnchor
  actions: readonly SnapMenuActionDefinition[]
  disabledActionIds?: ReadonlySet<string>
  layoutOptions?: SnapMenuLayoutOptions
  onActiveActionChange?: (actionId: string | null) => void
  onClose: () => void
  onSelect: (actionId: string) => void
  renderIcon?: (actionId: string) => ReactNode
  showActiveBar?: boolean
  showPolygonVisual?: boolean
  title: string
  titleUpdatesWithActiveAction?: boolean
}

export function SnapMenu({
  anchor,
  actions,
  disabledActionIds = new Set<string>(),
  layoutOptions,
  onActiveActionChange,
  onClose,
  onSelect,
  renderIcon,
  showActiveBar = true,
  showPolygonVisual = true,
  title,
  titleUpdatesWithActiveAction = false,
}: SnapMenuProps) {
  const [activeActionId, setActiveActionId] = useState<string | null>(null)
  const [pointerHint, setPointerHint] = useState<{ angleDeg: number; distance: number } | null>(null)

  const resolvedLayoutOptions = useMemo(
    () => ({
      ...resolveSnapMenuLayoutForActionCount(actions.length),
      ...layoutOptions,
    }),
    [actions.length, layoutOptions],
  )
  const menuLayout = useMemo(
    () => buildSnapMenuLayout(actions, resolvedLayoutOptions),
    [actions, resolvedLayoutOptions],
  )
  const orbitRadiusPx = useMemo(
    () => resolveSnapMenuOrbitRadiusPx(resolvedLayoutOptions),
    [resolvedLayoutOptions],
  )
  const polygonVertexPoints = useMemo(
    () => buildSnapMenuPolygonPoints(orbitRadiusPx, resolvedLayoutOptions),
    [orbitRadiusPx, resolvedLayoutOptions],
  )
  const polygonPoints = useMemo(
    () =>
      polygonVertexPoints
        .map((point) => `${orbitRadiusPx + point.x},${orbitRadiusPx + point.y}`)
        .join(' '),
    [orbitRadiusPx, polygonVertexPoints],
  )

  const activeAction = useMemo(
    () => actions.find((entry) => entry.id === activeActionId) ?? null,
    [actions, activeActionId],
  )
  const activeActionLabel =
    activeAction && !disabledActionIds.has(activeAction.id) ? activeAction.label : ''
  const showActiveActionLabel =
    activeAction !== null &&
    !disabledActionIds.has(activeAction.id) &&
    pointerHint !== null &&
    pointerHint.distance > SNAP_MENU_DEAD_ZONE_PX
  const hubTitle =
    titleUpdatesWithActiveAction && showActiveActionLabel && activeActionLabel
      ? activeActionLabel
      : title
  const shouldShowActiveBar = showActiveBar && showActiveActionLabel && !titleUpdatesWithActiveAction

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const dx = event.clientX - anchor.left
      const dy = event.clientY - anchor.top
      const distance = Math.hypot(dx, dy)
      const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI

      setPointerHint({ angleDeg, distance })
      const nextActionId = resolveSnapMenuItemFromPointerDelta(dx, dy, menuLayout, resolvedLayoutOptions)
      setActiveActionId(nextActionId)
      onActiveActionChange?.(nextActionId)
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      const actionId = resolveSnapMenuItemFromShortcut(event.key, actions)

      if (!actionId || disabledActionIds.has(actionId)) {
        return
      }

      event.preventDefault()
      onSelect(actionId)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    actions,
    anchor.left,
    anchor.top,
    disabledActionIds,
    menuLayout,
    resolvedLayoutOptions,
    onActiveActionChange,
    onClose,
    onSelect,
  ])

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        aria-label={hubTitle}
        className={styles.root}
        style={{ left: anchor.left, top: anchor.top }}
      >
        {showPolygonVisual ? (
          <svg
            aria-hidden
            className={styles.orbitPolygon}
            height={orbitRadiusPx * 2}
            viewBox={`0 0 ${orbitRadiusPx * 2} ${orbitRadiusPx * 2}`}
            width={orbitRadiusPx * 2}
          >
            <polygon className={styles.orbitPolygonShape} points={polygonPoints} />
            {polygonVertexPoints.map((point, vertexIndex) => (
              <circle
                className={styles.orbitPolygonVertex}
                cx={orbitRadiusPx + point.x}
                cy={orbitRadiusPx + point.y}
                key={vertexIndex}
                r={2.5}
              />
            ))}
          </svg>
        ) : null}

        {menuLayout.map((item) => {
          const angleRad = (item.angleDeg * Math.PI) / 180
          const x = Math.cos(angleRad) * orbitRadiusPx
          const y = Math.sin(angleRad) * orbitRadiusPx
          const disabled = disabledActionIds.has(item.id) || item.disabled === true
          const active = activeActionId === item.id

          return (
            <div
              className={styles.sliceWrap}
              data-active={active ? 'true' : undefined}
              key={item.id}
              style={
                {
                  '--slice-x': `${x}px`,
                  '--slice-y': `${y}px`,
                } as CSSProperties
              }
            >
              <button
                aria-label={item.label}
                className={styles.sliceButton}
                data-active={active ? 'true' : undefined}
                disabled={disabled}
                onClick={() => {
                  if (!disabled) {
                    onSelect(item.id)
                  }
                }}
                title={item.label}
                type="button"
              >
                {renderIcon ? <span className={styles.sliceIcon}>{renderIcon(item.id)}</span> : null}
                <span className={styles.sliceLabel}>{item.label}</span>
                <span className={styles.sliceShortcut}>{item.shortcut}</span>
              </button>
            </div>
          )
        })}

        <div className={styles.hubColumn}>
          <div
            className={styles.title}
            data-active={titleUpdatesWithActiveAction && showActiveActionLabel ? 'true' : undefined}
          >
            {hubTitle}
          </div>

          <div className={styles.hub}>
            <div
              aria-hidden
              className={styles.hubPointerArc}
              style={{
                opacity:
                  pointerHint && pointerHint.distance > SNAP_MENU_DEAD_ZONE_PX ? 1 : 0.28,
                transform: `translate(-50%, -50%) rotate(${(pointerHint?.angleDeg ?? -90) + 90}deg)`,
              }}
            />
            <div className={styles.hubIndicator} />
          </div>

          {shouldShowActiveBar ? (
            <div
              aria-live="polite"
              className={styles.hubActiveBar}
              data-visible={showActiveActionLabel ? 'true' : 'false'}
            >
              {activeActionLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
