import type { BlockStructurePayload } from './blockSchema'
import { blockHeaderSlotId, parseBlockHeaderSlotId } from './blockSchema'
import { blockTypeDefinitionById } from './blockStructureRegistry'

export type BlockHeaderSlotPort = {
  slotId: string
  direction: 'input' | 'output'
  types: string[]
  slotIndex: number
  fieldKey?: string
}

/** Uma entrada `in[a,b,c]` ou `in[number]` no array = uma porta; a lista entre colchetes são tipos suportados. */
export function expandBlockHeaderSlotPorts(
  blockType: string,
  headerSlots: readonly string[],
): BlockHeaderSlotPort[] {
  const normalized = normalizeBlockHeaderSlots(headerSlots)
  const ports: BlockHeaderSlotPort[] = []

  normalized.forEach((descriptor, index) => {
    const parsed = parseBlockHeaderSlotDescriptor(descriptor)
    if (!parsed) {
      return
    }

    const direction = parsed.direction === 'input' ? 'input' : 'output'
    ports.push({
      slotId: blockHeaderSlotId(
        blockType,
        index,
        parsed.types.length === 1 ? parsed.types[0] : undefined,
      ),
      direction,
      types: [...parsed.types],
      slotIndex: index,
      fieldKey: parsed.types.length === 1 ? parsed.types[0] : undefined,
    })
  })

  return ports
}

/** Parseia descriptor de slot de cabeçalho (`input[T]`, `output[T]`, `in[T]`, `out[T]`). */
export function parseBlockHeaderSlotDescriptor(
  descriptor: string,
): { direction: 'input' | 'output'; types: string[] } | null {
  const trimmed = descriptor.trim()
  const outputMatch = /^(?:output|out)\[(.+)\]$/i.exec(trimmed)
  if (outputMatch) {
    return {
      direction: 'output',
      types: outputMatch[1].split(',').map((item) => item.trim()).filter(Boolean),
    }
  }
  const inputMatch = /^(?:input|in)\[(.+)\]$/i.exec(trimmed)
  if (inputMatch) {
    return {
      direction: 'input',
      types: inputMatch[1].split(',').map((item) => item.trim()).filter(Boolean),
    }
  }
  return null
}

/** Slots de cabeçalho do registo antigo ou do JSON de bloco (`appearance`). */
export function resolveBlockHeaderSlotsForStructure(structure: BlockStructurePayload): string[] {
  const fromRegistry = blockTypeDefinitionById(structure.blockType)?.headerSlots
  if (fromRegistry && fromRegistry.length > 0) {
    return normalizeBlockHeaderSlots(fromRegistry)
  }
  if (structure.appearance?.headerSlots?.length) {
    return normalizeBlockHeaderSlots(structure.appearance.headerSlots)
  }
  return normalizeBlockHeaderSlots([])
}

/** Índice do slot de cabeçalho IN/OUT (suporta `input[`/`output[` e `in[`/`out[`). */
export function blockHeaderSlotIndex(headerSlots: readonly string[], direction: 'in' | 'out'): number {
  const legacy = direction === 'in' ? 'input[' : 'output['
  const compact = direction === 'in' ? 'in[' : 'out['
  return headerSlots.findIndex((slot) => slot.startsWith(legacy) || slot.startsWith(compact))
}

export function blockHeaderSlotIndices(
  headerSlots: readonly string[],
  direction: 'in' | 'out',
): number[] {
  const parsedDirection = direction === 'in' ? 'input' : 'output'
  const indices: number[] = []
  for (let index = 0; index < headerSlots.length; index += 1) {
    const parsed = parseBlockHeaderSlotDescriptor(headerSlots[index] ?? '')
    if (parsed?.direction === parsedDirection) {
      indices.push(index)
    }
  }
  return indices
}

const HEADER_SLOT_STACK_SPACING = 12

export function blockHeaderSlotOffsetY(totalSlotsInDirection: number, indexInDirection: number): number {
  if (totalSlotsInDirection <= 1) {
    return 0
  }
  return (indexInDirection - (totalSlotsInDirection - 1) / 2) * HEADER_SLOT_STACK_SPACING
}

export function blockHeaderPortStackOffsetY(
  ports: readonly BlockHeaderSlotPort[],
  port: BlockHeaderSlotPort,
): number {
  const sameDirection = ports.filter((entry) => entry.direction === port.direction)
  if (sameDirection.length <= 1) {
    return 0
  }
  const indexInDirection = sameDirection.findIndex((entry) => entry.slotId === port.slotId)
  return blockHeaderSlotOffsetY(sameDirection.length, indexInDirection >= 0 ? indexInDirection : 0)
}

export type BlockHeaderLinkMatchContext = {
  fromParameterName?: string
  outTypes: readonly string[]
  targetBlockName: string
  targetDisplayName?: string
}

function normalizeBlockTypeName(value: string): string {
  return value.trim().toLowerCase().replace(/preview$/i, '')
}

function headerInputTypesMatchLink(
  inTypes: readonly string[],
  context: BlockHeaderLinkMatchContext,
): boolean {
  const normalizedParam = normalizeBlockTypeName(context.fromParameterName ?? '')
  const normalizedBlockName = normalizeBlockTypeName(context.targetBlockName)
  const normalizedDisplayName = normalizeBlockTypeName(context.targetDisplayName ?? '')

  return inTypes.some((inType) => {
    const normalizedIn = normalizeBlockTypeName(inType)
    if (normalizedParam && normalizedIn === normalizedParam) {
      return true
    }
    return context.outTypes.some((outType) => {
      const normalizedOut = normalizeBlockTypeName(outType)
      return (
        normalizedIn === normalizedOut ||
        normalizedOut === normalizedBlockName ||
        normalizedOut === normalizedDisplayName
      )
    })
  })
}

function firstCanvasHeaderInputIndex(canvasSlots: readonly string[]): number | null {
  for (let index = 0; index < canvasSlots.length; index += 1) {
    const parsed = parseBlockHeaderSlotDescriptor(canvasSlots[index] ?? '')
    if (parsed?.direction === 'input') {
      return index
    }
  }
  return null
}

/**
 * Resolve o `slotId` IN de cabeçalho para ligação automática.
 * Com `in[a,b,c]` num único descriptor devolve a porta `block-header:Type:0`.
 */
export function resolveBlockHeaderInputSlotIdForLink(
  blockType: string,
  headerSlots: readonly string[],
  context: BlockHeaderLinkMatchContext,
): string | null {
  const ports = expandBlockHeaderSlotPorts(blockType, headerSlots).filter(
    (port) => port.direction === 'input',
  )
  if (ports.length === 0) {
    return null
  }

  const normalizedParam = normalizeBlockTypeName(context.fromParameterName ?? '')

  if (normalizedParam) {
    const paramPort = ports.find((port) =>
      port.types.some((inType) => normalizeBlockTypeName(inType) === normalizedParam),
    )
    if (paramPort) {
      return paramPort.slotId
    }
  }

  for (const port of ports) {
    if (headerInputTypesMatchLink(port.types, context)) {
      return port.slotId
    }
  }

  return ports[0]?.slotId ?? null
}

/**
 * Índice do descriptor IN normalizado (compat. com código que ainda usa índice).
 */
export function resolveBlockHeaderInputSlotIndexForLink(
  headerSlots: readonly string[],
  context: BlockHeaderLinkMatchContext,
): number | null {
  const canvasSlots = normalizeBlockHeaderSlots(headerSlots)
  const slotId = resolveBlockHeaderInputSlotIdForLink(context.targetBlockName, headerSlots, context)
  if (!slotId) {
    return firstCanvasHeaderInputIndex(canvasSlots)
  }
  const parsed = parseBlockHeaderSlotId(slotId)
  return parsed?.slotIndex ?? firstCanvasHeaderInputIndex(canvasSlots)
}

export function normalizeBlockHeaderSlots(headerSlots: readonly string[]): string[] {
  const normalized: string[] = []

  for (const descriptor of headerSlots) {
    const parsed = parseBlockHeaderSlotDescriptor(descriptor)
    if (!parsed) {
      const trimmed = descriptor.trim()
      if (trimmed && !normalized.includes(trimmed)) {
        normalized.push(trimmed)
      }
      continue
    }

    const prefix = parsed.direction === 'input' ? 'in' : 'out'
    normalized.push(`${prefix}[${parsed.types.join(',')}]`)
  }

  return normalized
}

export function resolveBlockCardAppearance(structure: {
  blockType: string
  appearance?: { color: string; headerSlots: string[] }
}): { color: string; headerSlots: string[] } | undefined {
  if (structure.appearance) {
    return structure.appearance
  }
  return undefined
}
