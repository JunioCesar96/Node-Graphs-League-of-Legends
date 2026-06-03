import { describe, expect, it } from 'vitest'

import type { VfxTimelineLayer } from '@/core/vfx/vfxTimelineLayers'

import {
  annotateTimelineLayers,
  filterAndSortTimelineLayers,
} from './vfxTimelineLayers'

function makeLayer(id: string, name: string): VfxTimelineLayer {
  return {
    id,
    name,
    duration: 1,
    activeStart: 0,
    activeEnd: 1,
    activeAtPlayhead: false,
    visible: true,
    focused: false,
  }
}

describe('filterAndSortTimelineLayers', () => {
  it('filters by name and source index', () => {
    const annotated = annotateTimelineLayers([
      makeLayer('a', 'Alpha'),
      makeLayer('b', 'Beta'),
      makeLayer('c', 'Gamma'),
    ])

    expect(filterAndSortTimelineLayers(annotated, 'beta', 'asc').map((layer) => layer.id)).toEqual(['b'])
    expect(filterAndSortTimelineLayers(annotated, '2', 'asc').map((layer) => layer.id)).toEqual(['b'])
  })

  it('sorts by name ascending and descending', () => {
    const annotated = annotateTimelineLayers([
      makeLayer('c', 'Gamma'),
      makeLayer('a', 'Alpha'),
      makeLayer('b', 'Beta'),
    ])

    expect(filterAndSortTimelineLayers(annotated, '', 'asc').map((layer) => layer.name)).toEqual([
      'Alpha',
      'Beta',
      'Gamma',
    ])
    expect(filterAndSortTimelineLayers(annotated, '', 'desc').map((layer) => layer.name)).toEqual([
      'Gamma',
      'Beta',
      'Alpha',
    ])
  })
})
