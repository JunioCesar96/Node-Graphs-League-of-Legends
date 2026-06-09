import type { InputAddonBindingChange } from '@/services/inputAddonLoader.service'

export const DEFAULT_INPUT_ADDON_CHANGE_ID = 'inputaddon'

function escapeSelectorId(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value)
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

export function resolveChangeElementId(change: InputAddonBindingChange | undefined): string {
  if (change === undefined || change === null || change === false) {
    return DEFAULT_INPUT_ADDON_CHANGE_ID
  }
  if (typeof change === 'string') {
    const trimmed = change.trim()
    if (!trimmed || trimmed.toLowerCase() === 'none') {
      return DEFAULT_INPUT_ADDON_CHANGE_ID
    }
    return trimmed
  }
  return DEFAULT_INPUT_ADDON_CHANGE_ID
}

export function findChangeElement(host: ParentNode, changeId: string): HTMLElement | null {
  const byId = host.querySelector(`#${escapeSelectorId(changeId)}`)
  if (byId instanceof HTMLElement) {
    return byId
  }

  const byDataAttr = host.querySelector(`[data-inputaddon-change="${escapeSelectorId(changeId)}"]`)
  if (byDataAttr instanceof HTMLElement) {
    return byDataAttr
  }

  if (changeId !== DEFAULT_INPUT_ADDON_CHANGE_ID) {
    return null
  }

  const fallback = host.querySelector(`#${escapeSelectorId(DEFAULT_INPUT_ADDON_CHANGE_ID)}`)
  if (fallback instanceof HTMLElement) {
    return fallback
  }

  const fallbackData = host.querySelector('[data-inputaddon-change]')
  if (fallbackData instanceof HTMLElement) {
    return fallbackData
  }

  return null
}

export function cloneChangeElementForDisplay(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement
  clone.removeAttribute('id')
  clone.setAttribute('data-inputaddon-change-clone', '1')
  return clone
}
