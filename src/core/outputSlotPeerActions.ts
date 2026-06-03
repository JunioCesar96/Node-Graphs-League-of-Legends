export type OutputSlotPeerViewState = {
  peerNodeId: string
  hidden: boolean
  policyHidden: boolean
  locked: boolean
}

export type OutputSlotPeerActions = {
  getPeerState: (slotId: string) => OutputSlotPeerViewState | undefined
  onToggleLock: (slotId: string) => void
  onToggleVisibility: (slotId: string) => void
  onFocusPeer: (slotId: string) => void
}
