/**
 * Vistas ortográficas estilo Blender para preview VFX (Z-up = cima LoL).
 *
 * Eixos Three: X = LoL X, Y = LoL Z (profundidade), Z = LoL Y (cima).
 * Top/Bottom olham ao longo de ±Z; Front/Back ao longo de ±Y; Right/Left ao longo de ±X.
 */

import { OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'

export type VfxViewportViewId = 'top' | 'bottom' | 'right' | 'left' | 'front' | 'back'

export const VFX_VIEWPORT_UP = new Vector3(0, 0, 1)

/** FOV da câmara perspectiva do preview VFX. */
export const VFX_VIEWPORT_CAMERA_FOV = 50

export const VFX_VIEWPORT_PROJECTION_TOGGLE_KEY = '5'

export type VfxViewportViewDefinition = {
  id: VfxViewportViewId
  label: string
  /** Tecla principal (numpad ou número superior). */
  key: string
  invertedKey?: string
  /** Posição da câmara = target + offset * distance. */
  offset: [number, number, number]
}

export const VFX_VIEWPORT_VIEWS: VfxViewportViewDefinition[] = [
  { id: 'top', label: 'Top (+Z)', key: '7', offset: [0, 0, 1] },
  { id: 'bottom', label: 'Bottom (−Z)', key: '7', invertedKey: 'ctrl', offset: [0, 0, -1] },
  { id: 'right', label: 'Right (+X)', key: '3', offset: [1, 0, 0] },
  { id: 'left', label: 'Left (−X)', key: '3', invertedKey: 'ctrl', offset: [-1, 0, 0] },
  { id: 'front', label: 'Front (+Y)', key: '1', offset: [0, 1, 0] },
  { id: 'back', label: 'Back (−Y)', key: '1', invertedKey: 'ctrl', offset: [0, -1, 0] },
]

const _position = new Vector3()
const _offset = new Vector3()

/** Tecla 5 (Blender): alterna perspectiva ↔ ortográfica. */
export function resolveVfxViewportProjectionToggleFromKeyboard(event: KeyboardEvent): boolean {
  if (event.altKey || event.metaKey || event.shiftKey || event.ctrlKey) return false
  const key = event.key.length === 1 ? event.key : ''
  return (
    key === VFX_VIEWPORT_PROJECTION_TOGGLE_KEY ||
    event.code === 'Digit5' ||
    event.code === 'Numpad5'
  )
}

/** Converte distância perspectiva → zoom ortográfico (frustum R3F = altura do viewport). */
export function perspectiveDistanceToOrthographicZoom(
  distance: number,
  fovDegrees: number,
  viewportHeight: number,
): number {
  const vFov = (fovDegrees * Math.PI) / 180
  const visibleHeight = 2 * Math.tan(vFov / 2) * Math.max(distance, 0.001)
  return viewportHeight / visibleHeight
}

export function orthographicZoomToPerspectiveDistance(
  zoom: number,
  fovDegrees: number,
  viewportHeight: number,
): number {
  const visibleHeight = viewportHeight / Math.max(zoom, 0.001)
  const vFov = (fovDegrees * Math.PI) / 180
  return visibleHeight / (2 * Math.tan(vFov / 2))
}

export type VfxViewportProjectionFraming = {
  target: Vector3
  direction: Vector3
  distance: number
  orthographicZoom: number
}

const _target = new Vector3()
const _direction = new Vector3()

export function captureVfxViewportProjectionFraming(
  camera: PerspectiveCamera | OrthographicCamera,
  controlsTarget: Vector3,
  fovDegrees: number,
  viewportHeight: number,
): VfxViewportProjectionFraming {
  _target.copy(controlsTarget)
  _direction.copy(camera.position).sub(_target)
  const distance = Math.max(_direction.length(), 0.001)
  _direction.divideScalar(distance)

  const orthographicZoom =
    camera instanceof OrthographicCamera
      ? camera.zoom
      : perspectiveDistanceToOrthographicZoom(distance, fovDegrees, viewportHeight)

  return {
    target: _target.clone(),
    direction: _direction.clone(),
    distance,
    orthographicZoom,
  }
}

export function applyVfxViewportProjectionFraming(
  camera: PerspectiveCamera | OrthographicCamera,
  framing: VfxViewportProjectionFraming,
  orthographic: boolean,
  fovDegrees: number,
  viewportHeight: number,
): void {
  camera.up.copy(VFX_VIEWPORT_UP)
  const distance = orthographic
    ? framing.distance
    : orthographicZoomToPerspectiveDistance(
        framing.orthographicZoom,
        fovDegrees,
        viewportHeight,
      )

  camera.position
    .copy(framing.target)
    .add(framing.direction.clone().multiplyScalar(distance))

  if (camera instanceof OrthographicCamera) {
    camera.zoom = framing.orthographicZoom
  }

  camera.lookAt(framing.target)
  camera.updateProjectionMatrix()
}

export function resolveVfxViewportViewFromKeyboard(
  event: KeyboardEvent,
): VfxViewportViewId | null {
  if (event.altKey || event.metaKey || event.shiftKey) return null
  const code = event.code
  const key = event.key.length === 1 ? event.key : ''
  const ctrl = event.ctrlKey

  for (const view of VFX_VIEWPORT_VIEWS) {
    const matchesKey =
      key === view.key ||
      code === `Digit${view.key}` ||
      code === `Numpad${view.key}`
    if (!matchesKey) continue
    const wantsInverted = view.invertedKey === 'ctrl'
    if (wantsInverted === ctrl) return view.id
  }
  return null
}

export function computeVfxViewportViewPosition(
  viewId: VfxViewportViewId,
  target: Vector3,
  distance: number,
  out = _position,
): Vector3 {
  const def = VFX_VIEWPORT_VIEWS.find((view) => view.id === viewId)
  if (!def) return out.copy(target)
  _offset.set(def.offset[0], def.offset[1], def.offset[2]).multiplyScalar(distance)
  return out.copy(target).add(_offset)
}

export type ApplyVfxViewportViewInput = {
  viewId: VfxViewportViewId
  camera: { position: Vector3; up: Vector3; lookAt: (target: Vector3) => void; updateProjectionMatrix: () => void }
  controls: { target: Vector3; update: () => void; object?: { up: Vector3 } } | null
  target?: Vector3
  distance?: number
}

export function applyVfxViewportView(input: ApplyVfxViewportViewInput): void {
  const target = input.target ?? input.controls?.target ?? new Vector3(0, 0, 0)
  const distance =
    input.distance ??
    Math.max(input.camera.position.distanceTo(target), 2)

  computeVfxViewportViewPosition(input.viewId, target, distance, input.camera.position)
  input.camera.up.copy(VFX_VIEWPORT_UP)
  if (input.controls?.object) {
    input.controls.object.up.copy(VFX_VIEWPORT_UP)
  }
  input.camera.lookAt(target)
  input.camera.updateProjectionMatrix()
  input.controls?.update()
}

/** Posição inicial 3/4 (Z-up). */
export const VFX_VIEWPORT_DEFAULT_CAMERA_POSITION: [number, number, number] = [7, -7, 5.5]

export const VFX_VIEWPORT_DEFAULT_TARGET: [number, number, number] = [0, 0, 0.5]
