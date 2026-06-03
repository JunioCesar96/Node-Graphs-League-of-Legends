import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'

import {
  applyVfxViewportView,
  computeVfxViewportViewPosition,
  orthographicZoomToPerspectiveDistance,
  perspectiveDistanceToOrthographicZoom,
  resolveVfxViewportProjectionToggleFromKeyboard,
  resolveVfxViewportViewFromKeyboard,
} from './vfxViewportViews'

describe('resolveVfxViewportViewFromKeyboard', () => {
  it('7 top, Ctrl+7 bottom', () => {
    expect(
      resolveVfxViewportViewFromKeyboard({ key: '7', code: 'Numpad7', ctrlKey: false } as KeyboardEvent),
    ).toBe('top')
    expect(
      resolveVfxViewportViewFromKeyboard({ key: '7', code: 'Digit7', ctrlKey: true } as KeyboardEvent),
    ).toBe('bottom')
  })

  it('3 right, Ctrl+3 left', () => {
    expect(
      resolveVfxViewportViewFromKeyboard({ key: '3', code: 'Numpad3', ctrlKey: false } as KeyboardEvent),
    ).toBe('right')
    expect(
      resolveVfxViewportViewFromKeyboard({ key: '3', code: 'Digit3', ctrlKey: true } as KeyboardEvent),
    ).toBe('left')
  })

  it('1 front, Ctrl+1 back', () => {
    expect(
      resolveVfxViewportViewFromKeyboard({ key: '1', code: 'Numpad1', ctrlKey: false } as KeyboardEvent),
    ).toBe('front')
    expect(
      resolveVfxViewportViewFromKeyboard({ key: '1', code: 'Digit1', ctrlKey: true } as KeyboardEvent),
    ).toBe('back')
  })
})

describe('computeVfxViewportViewPosition', () => {
  const target = new Vector3(0, 0, 1)

  it('top está em +Z', () => {
    const pos = computeVfxViewportViewPosition('top', target, 10, new Vector3())
    expect(pos.z).toBeGreaterThan(target.z)
    expect(pos.x).toBeCloseTo(0, 5)
    expect(pos.y).toBeCloseTo(0, 5)
  })

  it('right está em +X', () => {
    const pos = computeVfxViewportViewPosition('right', target, 10, new Vector3())
    expect(pos.x).toBeGreaterThan(target.x)
  })
})

describe('resolveVfxViewportProjectionToggleFromKeyboard', () => {
  it('5 alterna projeção', () => {
    expect(
      resolveVfxViewportProjectionToggleFromKeyboard({
        key: '5',
        code: 'Numpad5',
        ctrlKey: false,
      } as KeyboardEvent),
    ).toBe(true)
    expect(
      resolveVfxViewportProjectionToggleFromKeyboard({
        key: '5',
        code: 'Digit5',
        ctrlKey: true,
      } as KeyboardEvent),
    ).toBe(false)
  })
})

describe('perspectiveDistanceToOrthographicZoom', () => {
  it('round-trip aproximado', () => {
    const viewportHeight = 720
    const distance = 12
    const fov = 50
    const zoom = perspectiveDistanceToOrthographicZoom(distance, fov, viewportHeight)
    const back = orthographicZoomToPerspectiveDistance(zoom, fov, viewportHeight)
    expect(back).toBeCloseTo(distance, 1)
  })
})

describe('applyVfxViewportView', () => {
  it('define camera.up para Z-up', () => {
    const camera = new PerspectiveCamera()
    const target = new Vector3(0, 0, 0.5)
    applyVfxViewportView({
      viewId: 'top',
      camera,
      controls: { target, update: () => {} },
      target,
      distance: 8,
    })
    expect(camera.up.z).toBeCloseTo(1, 5)
    expect(camera.position.z).toBeGreaterThan(target.z)
  })
})
