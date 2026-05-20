import type { ElementViewKey, ElementViewMode } from '@/core/nodeSchema'

export type StructureBlockViewProps = {
  viewMode?: ElementViewMode
  selectedIndex?: number
  onViewModeChange?: (mode: ElementViewMode) => void
  onSelectedIndexChange?: (index: number) => void
  retracted?: boolean
  onExpandFromRetracted?: () => void
  /** Duplo clique no título retraí o elemento (só quando expandido). */
  onRetractFromTitle?: () => void
  elementViewKey?: ElementViewKey
}
