import type { MouseEvent as ReactMouseEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { elementTitleDoubleClickRetractProps } from '@/core/elementTitleInteraction'

describe('elementTitleDoubleClickRetractProps', () => {
  it('returns empty props when handler omitted', () => {
    expect(elementTitleDoubleClickRetractProps()).toEqual({})
  })

  it('calls retract handler on double click', () => {
    const onRetract = vi.fn()
    const props = elementTitleDoubleClickRetractProps(onRetract)
    const stopPropagation = vi.fn()
    const preventDefault = vi.fn()

    props.onDoubleClick?.({
      stopPropagation,
      preventDefault,
    } as unknown as ReactMouseEvent)

    expect(onRetract).toHaveBeenCalledOnce()
    expect(stopPropagation).toHaveBeenCalled()
    expect(preventDefault).toHaveBeenCalled()
  })
})
