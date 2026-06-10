/**
 * Toggle bool/flag para add-ons `addon-value-bool` e `addon-value-flag`.
 */

/**
 * @param {HTMLElement | null} toggle
 * @param {string} value
 */
export function syncBoolToggleUi(toggle, value) {
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

/**
 * Usa delegação no contentor para sobreviver a `innerHTML` do add-on.
 * @param {HTMLElement} cardDOM
 */
export function ensureBoolToggleWired(cardDOM) {
  if (!(cardDOM instanceof HTMLElement)) {
    return
  }
  if (cardDOM.dataset.boolToggleDelegated === '1') {
    return
  }

  cardDOM.dataset.boolToggleDelegated = '1'
  cardDOM.addEventListener(
    'pointerdown',
    (event) => {
      if (event.button !== 0) {
        return
      }

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
      syncBoolToggleUi(toggle, next)
      hidden.dispatchEvent(new Event('input', { bubbles: true }))
      hidden.dispatchEvent(new Event('change', { bubbles: true }))
    },
    { capture: true },
  )
}
