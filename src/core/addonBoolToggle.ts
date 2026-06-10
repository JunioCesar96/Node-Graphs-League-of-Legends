/** Toggle bool/flag nos add-ons `addon-value-bool` e `addon-value-flag`. */

const wiredContainers = new WeakSet<HTMLElement>()

export function syncAddonBoolToggleUi(toggle: HTMLElement | null, value: string): void {
  if (!(toggle instanceof HTMLElement)) {
    return
  }
  const on = value.trim().toLowerCase() === 'true'
  toggle.setAttribute('aria-checked', on ? 'true' : 'false')
  toggle.dataset.checked = on ? '1' : '0'

  const stateLabel = toggle
    .closest('.addon-bool-toggle-wrap')
    ?.querySelector('[data-bool-state]')
  if (stateLabel instanceof HTMLElement) {
    stateLabel.textContent = on ? 'true' : 'false'
  }
}

function handleBoolTogglePointer(cardDOM: HTMLElement, event: PointerEvent): void {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const toggle = target.closest('[data-addon-bool-toggle]')
  if (!(toggle instanceof HTMLButtonElement) || !cardDOM.contains(toggle)) {
    return
  }

  if (toggle.disabled) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const hidden = toggle
    .closest('.addon-bool-toggle-wrap')
    ?.querySelector('input[name="literal"]')
  if (!(hidden instanceof HTMLInputElement)) {
    return
  }

  const next = hidden.value.trim().toLowerCase() === 'true' ? 'false' : 'true'
  hidden.value = next
  syncAddonBoolToggleUi(toggle, next)
  hidden.dispatchEvent(new Event('input', { bubbles: true }))
  hidden.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Delegação no contentor do card — sobrevive a `innerHTML` do add-on.
 */
export function ensureAddonBoolToggleWired(cardDOM: HTMLElement): void {
  if (!(cardDOM instanceof HTMLElement)) {
    return
  }
  if (wiredContainers.has(cardDOM)) {
    return
  }

  wiredContainers.add(cardDOM)
  cardDOM.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) {
        return
      }
      handleBoolTogglePointer(cardDOM, event)
    },
    { capture: true },
  )
}
