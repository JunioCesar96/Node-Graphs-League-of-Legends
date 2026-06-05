import type { OutputSlotPeerViewState } from '@/core/outputSlotPeerActions'

export type BlockSlotDirection = 'input' | 'output'

export type BlockSlotPeerActions = {
  getPeerState: (
    slotId: string,
    slotDirection: BlockSlotDirection,
    connectionIndex?: number,
  ) => OutputSlotPeerViewState | undefined
  onToggleLock: (slotId: string, slotDirection: BlockSlotDirection, connectionIndex?: number) => void
  onToggleVisibility: (
    slotId: string,
    slotDirection: BlockSlotDirection,
    connectionIndex?: number,
  ) => void
  onFocusPeer: (slotId: string, slotDirection: BlockSlotDirection, connectionIndex?: number) => void
  onRemoveConnection: (
    slotId: string,
    slotDirection: BlockSlotDirection,
    connectionIndex?: number,
  ) => void
}
