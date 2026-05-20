import type { ElementViewKey, ElementViewMode } from '@/core/nodeSchema'

export type StructureBlockViewProps = {
  viewMode?: ElementViewMode
  selectedIndex?: number
  onViewModeChange?: (mode: ElementViewMode) => void
  onSelectedIndexChange?: (index: number) => void
  retracted?: boolean
  onExpandFromRetracted?: () => void
  elementViewKey?: ElementViewKey
}
