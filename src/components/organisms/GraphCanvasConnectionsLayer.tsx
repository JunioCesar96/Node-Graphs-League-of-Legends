import { memo, useMemo, type MouseEvent } from 'react'

import { connectionInvolvesAddon } from '@/core/addonSlotConnections'
import {
  createBlockDraftConnectionPath,
  isBlockSlotConnection,
  resolveBlockConnectionPath,
} from '@/core/blockSlotConnections'
import type { CanvasConnection, CanvasNode } from '@/core/canvasScene'
import { CANVAS_CONNECTION_ID_ATTR } from '@/core/canvasContextMenuAttributes'
import {
  createGroupDraftConnectionPath,
  isGroupSlotConnection,
  resolveGroupConnectionPath,
} from '@/core/groupSlotConnections'
import type { PortAnchorMaps } from '@/core/graphPortAnchors'

import styles from './GraphCanvas.module.css'

export type GraphCanvasConnectionPath = {
  d: string
  forced?: boolean
  id: string
  routing?: 'flex' | 'rigid' | 'wireless'
}

export type GraphCanvasConnectionsResolveNodePath = (
  connection: CanvasConnection,
  nodes: readonly CanvasNode[],
  connections: readonly CanvasConnection[],
  anchors: PortAnchorMaps,
) => GraphCanvasConnectionPath | null

export type GraphCanvasAddonConnectionPath = GraphCanvasConnectionPath

export type GraphCanvasConnectionsLayerProps = {
  canvasBounds: { height: number; width: number }
  nodePositionsKey: string
  connections: readonly CanvasConnection[]
  nodesForLayout: readonly CanvasNode[]
  portAnchors: PortAnchorMaps
  isConnectionRenderedInViewport: (connection: CanvasConnection) => boolean
  resolveNodeConnectionPath: GraphCanvasConnectionsResolveNodePath
  addonConnectionPaths: readonly GraphCanvasAddonConnectionPath[]
  addonLinkDraftPath: string | null
  pendingBlockLink: {
    draftAnchor: { sx: number; sy: number }
  } | null
  blockLinkDraftPoint: { x: number; y: number } | null
  pendingGroupLink: {
    draftAnchor: { sx: number; sy: number }
  } | null
  groupLinkDraftPoint: { x: number; y: number } | null
  pendingLink: {
    draftAnchor: { sx: number; sy: number }
  } | null
  linkDraftPoint: { x: number; y: number } | null
  createDraftConnectionPath: (sx: number, sy: number, ex: number, ey: number) => string
  onContextMenu: (event: MouseEvent<HTMLElement>) => void
  onRemoveConnection?: (connectionId: string) => void
  onCycleConnectionRouting?: (connectionId: string) => void
}

function areGraphCanvasConnectionsLayerPropsEqual(
  prev: GraphCanvasConnectionsLayerProps,
  next: GraphCanvasConnectionsLayerProps,
): boolean {
  return (
    prev.nodePositionsKey === next.nodePositionsKey &&
    prev.connections === next.connections &&
    prev.portAnchors === next.portAnchors &&
    prev.addonConnectionPaths === next.addonConnectionPaths &&
    prev.addonLinkDraftPath === next.addonLinkDraftPath &&
    prev.pendingBlockLink === next.pendingBlockLink &&
    prev.blockLinkDraftPoint === next.blockLinkDraftPoint &&
    prev.pendingGroupLink === next.pendingGroupLink &&
    prev.groupLinkDraftPoint === next.groupLinkDraftPoint &&
    prev.pendingLink === next.pendingLink &&
    prev.linkDraftPoint === next.linkDraftPoint &&
    prev.canvasBounds.height === next.canvasBounds.height &&
    prev.canvasBounds.width === next.canvasBounds.width &&
    prev.onContextMenu === next.onContextMenu &&
    prev.onRemoveConnection === next.onRemoveConnection &&
    prev.onCycleConnectionRouting === next.onCycleConnectionRouting &&
    prev.createDraftConnectionPath === next.createDraftConnectionPath
  )
}

function GraphCanvasConnectionsLayerInner({
  canvasBounds,
  connections,
  nodesForLayout,
  portAnchors,
  isConnectionRenderedInViewport,
  resolveNodeConnectionPath,
  addonConnectionPaths,
  addonLinkDraftPath,
  pendingBlockLink,
  blockLinkDraftPoint,
  pendingGroupLink,
  groupLinkDraftPoint,
  pendingLink,
  linkDraftPoint,
  createDraftConnectionPath,
  onContextMenu,
  onRemoveConnection,
  onCycleConnectionRouting,
}: GraphCanvasConnectionsLayerProps) {
  const connectionPaths = useMemo(() => {
    return connections
      .filter(
        (connection) =>
          !isBlockSlotConnection(connection) &&
          !isGroupSlotConnection(connection) &&
          connection.routing !== 'wireless' &&
          isConnectionRenderedInViewport(connection),
      )
      .map((connection) =>
        resolveNodeConnectionPath(connection, nodesForLayout, connections, portAnchors),
      )
      .filter((path): path is GraphCanvasConnectionPath => path !== null)
  }, [connections, isConnectionRenderedInViewport, nodesForLayout, portAnchors, resolveNodeConnectionPath])

  const blockConnectionPaths = useMemo(() => {
    return connections
      .filter(
        (connection) =>
          isBlockSlotConnection(connection) &&
          !connectionInvolvesAddon(connection) &&
          connection.routing !== 'wireless' &&
          isConnectionRenderedInViewport(connection),
      )
      .map((connection) => resolveBlockConnectionPath(connection, nodesForLayout))
      .filter((path): path is NonNullable<ReturnType<typeof resolveBlockConnectionPath>> => path !== null)
  }, [connections, isConnectionRenderedInViewport, nodesForLayout])

  const groupConnectionPaths = useMemo(() => {
    return connections
      .filter(
        (connection) =>
          isGroupSlotConnection(connection) &&
          connection.routing !== 'wireless' &&
          isConnectionRenderedInViewport(connection),
      )
      .map((connection) => resolveGroupConnectionPath(connection, nodesForLayout))
      .filter((path): path is NonNullable<ReturnType<typeof resolveGroupConnectionPath>> => path !== null)
  }, [connections, isConnectionRenderedInViewport, nodesForLayout])

  const wireInteractionEnabled = Boolean(onRemoveConnection || onCycleConnectionRouting)

  return (
    <svg
      className={styles.connections}
      height={canvasBounds.height}
      role="presentation"
      viewBox={`0 0 ${canvasBounds.width} ${canvasBounds.height}`}
      width={canvasBounds.width}
    >
      <defs>
        <marker
          id="connection-arrow"
          markerHeight="8"
          markerWidth="8"
          orient="auto"
          refX="6"
          refY="4"
          viewBox="0 0 8 8"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--port-child)" />
        </marker>
        <marker
          id="connection-arrow-block"
          markerHeight="8"
          markerWidth="8"
          orient="auto"
          refX="6"
          refY="4"
          viewBox="0 0 8 8"
        >
          <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--block-slot-out)" />
        </marker>
      </defs>

      {connectionPaths.map((connection) => (
        <g key={connection.id}>
          {wireInteractionEnabled ? (
            <path
              aria-label={`Ligação ${connection.id}`}
              className={styles.connectionHit}
              d={connection.d}
              data-canvas-wire="true"
              {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
              onContextMenu={onContextMenu}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()

                if (event.ctrlKey || event.metaKey) {
                  onRemoveConnection?.(connection.id)
                  return
                }

                onCycleConnectionRouting?.(connection.id)
              }}
            />
          ) : null}
          <path className={styles.connectionHalo} d={connection.d} />
          <path
            className={
              connection.routing === 'rigid' ? `${styles.connection} ${styles.connectionRigid}` : styles.connection
            }
            d={connection.d}
            markerEnd="url(#connection-arrow)"
          />
        </g>
      ))}

      {blockConnectionPaths.map((connection) => (
        <g key={connection.id}>
          {wireInteractionEnabled ? (
            <path
              aria-label={`Ligação bloco ${connection.id}`}
              className={styles.connectionHit}
              d={connection.d}
              data-canvas-wire="true"
              {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
              onContextMenu={onContextMenu}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()

                if (event.ctrlKey || event.metaKey) {
                  onRemoveConnection?.(connection.id)
                  return
                }

                onCycleConnectionRouting?.(connection.id)
              }}
            />
          ) : null}
          <path
            className={[styles.connectionBlockHalo, connection.forced ? styles.connectionBlockHaloForced : '']
              .filter(Boolean)
              .join(' ')}
            d={connection.d}
          />
          <path
            className={[
              styles.connectionBlock,
              connection.routing === 'rigid' ? styles.connectionBlockRigid : '',
              connection.routing === 'wireless' ? styles.connectionBlockWireless : '',
              connection.forced ? styles.connectionBlockForced : '',
            ]
              .filter(Boolean)
              .join(' ')}
            d={connection.d}
            markerEnd="url(#connection-arrow-block)"
          />
        </g>
      ))}

      {addonConnectionPaths.map((connection) => (
        <g key={connection.id}>
          {wireInteractionEnabled ? (
            <path
              aria-label={`Ligação add-on ${connection.id}`}
              className={styles.connectionHit}
              d={connection.d}
              data-canvas-wire="true"
              {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
              onContextMenu={onContextMenu}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                if (event.ctrlKey || event.metaKey) {
                  onRemoveConnection?.(connection.id)
                  return
                }
                onCycleConnectionRouting?.(connection.id)
              }}
            />
          ) : null}
          <path
            className={[styles.connectionBlockHalo, connection.forced ? styles.connectionBlockHaloForced : '']
              .filter(Boolean)
              .join(' ')}
            d={connection.d}
          />
          <path
            className={[
              styles.connectionBlock,
              connection.routing === 'rigid' ? styles.connectionBlockRigid : '',
              connection.routing === 'wireless' ? styles.connectionBlockWireless : '',
              connection.forced ? styles.connectionBlockForced : '',
            ]
              .filter(Boolean)
              .join(' ')}
            d={connection.d}
            markerEnd="url(#connection-arrow-block)"
          />
        </g>
      ))}

      {addonLinkDraftPath ? <path className={styles.connectionBlockDraft} d={addonLinkDraftPath} /> : null}

      {groupConnectionPaths.map((connection) => (
        <g key={connection.id}>
          {wireInteractionEnabled ? (
            <path
              aria-label={`Ligação grupo ${connection.id}`}
              className={styles.connectionHit}
              d={connection.d}
              data-canvas-wire="true"
              {...{ [CANVAS_CONNECTION_ID_ATTR]: connection.id }}
              onContextMenu={onContextMenu}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()

                if (event.ctrlKey || event.metaKey) {
                  onRemoveConnection?.(connection.id)
                  return
                }

                onCycleConnectionRouting?.(connection.id)
              }}
            />
          ) : null}
          <path className={styles.connectionBlockHalo} d={connection.d} />
          <path className={styles.connectionBlock} d={connection.d} markerEnd="url(#connection-arrow-block)" />
        </g>
      ))}

      {pendingBlockLink && blockLinkDraftPoint ? (
        <path
          className={styles.connectionBlockDraft}
          d={createBlockDraftConnectionPath(
            pendingBlockLink.draftAnchor.sx,
            pendingBlockLink.draftAnchor.sy,
            blockLinkDraftPoint.x,
            blockLinkDraftPoint.y,
          )}
        />
      ) : null}

      {pendingGroupLink && groupLinkDraftPoint ? (
        <path
          className={styles.connectionBlockDraft}
          d={createGroupDraftConnectionPath(
            pendingGroupLink.draftAnchor.sx,
            pendingGroupLink.draftAnchor.sy,
            groupLinkDraftPoint.x,
            groupLinkDraftPoint.y,
          )}
        />
      ) : null}

      {pendingLink && linkDraftPoint ? (
        <path
          className={styles.connectionDraft}
          d={createDraftConnectionPath(
            pendingLink.draftAnchor.sx,
            pendingLink.draftAnchor.sy,
            linkDraftPoint.x,
            linkDraftPoint.y,
          )}
        />
      ) : null}
    </svg>
  )
}

export const GraphCanvasConnectionsLayer = memo(
  GraphCanvasConnectionsLayerInner,
  areGraphCanvasConnectionsLayerPropsEqual,
)

GraphCanvasConnectionsLayer.displayName = 'GraphCanvasConnectionsLayer'
