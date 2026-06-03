import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

import type { NodeSchemaDefinition } from '@/core/nodeSchema'

import { useShortcutScope } from './ShortcutScopeProvider'

type PaletteExpandOverride = 'compact' | 'default' | 'expanded'

export function useAddNodePaletteShortcutHandlers(options: {
  paletteInputRef: RefObject<HTMLInputElement | null>
  filteredSchemasRef: RefObject<readonly NodeSchemaDefinition[]>
  activeSchemaIndexRef: RefObject<number>
  paletteHoveredOptionIndexRef: RefObject<number | null>
  setPaletteExpandOverride: (next: PaletteExpandOverride) => void
  setExpandCapsule: (next: { id: string; kind: 'expanded' | 'collapsed'; stamp: number } | null) => void
}) {
  const { registerShortcutHandlers } = useShortcutScope()
  const optionsRef = useRef(options)
  optionsRef.current = options

  useEffect(() => {
    return registerShortcutHandlers({
      'palette-expand': (event) => {
        const {
          paletteInputRef,
          filteredSchemasRef,
          activeSchemaIndexRef,
          paletteHoveredOptionIndexRef,
          setPaletteExpandOverride,
          setExpandCapsule,
        } = optionsRef.current

        const target = event.target
        const hoveringRow = paletteHoveredOptionIndexRef.current !== null
        const focusOnSearch = target === paletteInputRef.current
        const useCtrlWhileSearching = focusOnSearch && event.ctrlKey

        if (focusOnSearch && !hoveringRow && !useCtrlWhileSearching) {
          return false
        }

        const list = filteredSchemasRef.current
        const targetIdx =
          paletteHoveredOptionIndexRef.current !== null
            ? paletteHoveredOptionIndexRef.current
            : activeSchemaIndexRef.current
        const targetSchema = list[targetIdx]

        setPaletteExpandOverride('expanded')
        if (targetSchema) {
          setExpandCapsule({
            id: targetSchema.id,
            kind: 'expanded',
            stamp: Date.now(),
          })
        }
        return true
      },
      'palette-compact': (event) => {
        const {
          paletteInputRef,
          filteredSchemasRef,
          activeSchemaIndexRef,
          paletteHoveredOptionIndexRef,
          setPaletteExpandOverride,
          setExpandCapsule,
        } = optionsRef.current

        const target = event.target
        const hoveringRow = paletteHoveredOptionIndexRef.current !== null
        const focusOnSearch = target === paletteInputRef.current
        const useCtrlWhileSearching = focusOnSearch && event.ctrlKey

        if (focusOnSearch && !hoveringRow && !useCtrlWhileSearching) {
          return false
        }

        const list = filteredSchemasRef.current
        const targetIdx =
          paletteHoveredOptionIndexRef.current !== null
            ? paletteHoveredOptionIndexRef.current
            : activeSchemaIndexRef.current
        const targetSchema = list[targetIdx]

        setPaletteExpandOverride('compact')
        if (targetSchema) {
          setExpandCapsule({
            id: targetSchema.id,
            kind: 'collapsed',
            stamp: Date.now(),
          })
        }
        return true
      },
    })
  }, [registerShortcutHandlers])
}
