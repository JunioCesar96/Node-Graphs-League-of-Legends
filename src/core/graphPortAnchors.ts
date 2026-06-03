export type GraphPanPoint = {
  x: number
  y: number
}

export type PortAnchorMaps = {
  inputs: Map<string, GraphPanPoint>
  outputs: Map<string, GraphPanPoint>
}

export function graphPointFromElementCenter(
  canvasEl: HTMLElement,
  scale: number,
  innerEl: HTMLElement,
): GraphPanPoint {
  const canvasRect = canvasEl.getBoundingClientRect()
  const bounds = innerEl.getBoundingClientRect()
  const clientX = bounds.left + bounds.width / 2
  const clientY = bounds.top + bounds.height / 2

  return {
    x: (clientX - canvasRect.left) / scale,
    y: (clientY - canvasRect.top) / scale,
  }
}

export function outputAnchorKey(nodeId: string, structureId: string): string {
  return `${nodeId}|${structureId}`
}

export function addonSlotAnchorKey(nodeId: string, slotId: string): string {
  return `${nodeId}|${slotId}`
}

export function collectAddonSlotAnchors(canvasEl: HTMLElement, scale: number): Map<string, GraphPanPoint> {
  const anchors = new Map<string, GraphPanPoint>()
  const elements = canvasEl.querySelectorAll('[data-addon-slot-id][data-addon-slot-node-id]')

  elements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return
    }
    const nodeId = element.getAttribute('data-addon-slot-node-id')
    const slotId = element.getAttribute('data-addon-slot-id')
    if (!nodeId || !slotId) {
      return
    }
    anchors.set(addonSlotAnchorKey(nodeId, slotId), graphPointFromElementCenter(canvasEl, scale, element))
  })

  return anchors
}

export function collectGraphPortAnchors(canvasEl: HTMLElement, scale: number): PortAnchorMaps {
  const outputs = new Map<string, GraphPanPoint>()
  const inputs = new Map<string, GraphPanPoint>()
  const elements = canvasEl.querySelectorAll('[data-graph-node-id][data-graph-port]')

  elements.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      return
    }

    const nodeId = node.getAttribute('data-graph-node-id')
    const kind = node.getAttribute('data-graph-port')

    if (!nodeId || !kind) {
      return
    }

    const p = graphPointFromElementCenter(canvasEl, scale, node)

    if (kind === 'output') {
      const structureId = node.getAttribute('data-graph-internal-structure-id')
      if (structureId) {
        outputs.set(outputAnchorKey(nodeId, structureId), p)
      }
      return
    }

    if (kind === 'input') {
      inputs.set(nodeId, p)
    }
  })

  return { inputs, outputs }
}

export function emptyPortAnchorMaps(): PortAnchorMaps {
  return {
    inputs: new Map(),
    outputs: new Map(),
  }
}
