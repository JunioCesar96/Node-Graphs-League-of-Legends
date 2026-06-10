/** Painel de eixos (X/Y/Z/…) nos add-ons `addon-value-vec*` e `addon-value-rgba`. */

const wiredContainers = new WeakSet<HTMLElement>()
const AXIS_FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/

export function parseLiteralComponents(raw: string, count: number): string[] {
  let inner = raw.trim()
  const braced = /^\{\s*([^}]*)\s*\}$/.exec(inner)
  if (braced?.[1] !== undefined) {
    inner = braced[1].trim()
  }
  const parts = inner.split(/[\s,]+/).filter(Boolean)
  const result: string[] = []
  for (let index = 0; index < count; index += 1) {
    result.push(parts[index] ?? '0')
  }
  return result
}

export function composeLiteralFromPanel(panel: HTMLElement): string {
  const inputs = [...panel.querySelectorAll<HTMLInputElement>('.addon-vec-axis-input')]
  if (inputs.length === 0) {
    return '0'
  }
  return inputs
    .map((input) => {
      const trimmed = input.value.trim()
      return trimmed === '' ? '0' : trimmed
    })
    .join(', ')
}

export function syncAddonVecAxisFromLiteral(cardDOM: HTMLElement, literal: string): void {
  const panel = cardDOM.querySelector('[data-addon-vec-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const inputs = [...panel.querySelectorAll<HTMLInputElement>('.addon-vec-axis-input')]
  const parts = parseLiteralComponents(literal, inputs.length)
  inputs.forEach((input, index) => {
    input.value = parts[index] ?? '0'
  })

  const hidden = panel.querySelector('input[name="literal"]')
  if (hidden instanceof HTMLInputElement) {
    hidden.value = parts.join(', ')
  }
}

export function applyAddonVecAxisFieldInteraction(
  wiredSlotNames: ReadonlySet<string>,
  cardDOM: HTMLElement,
): void {
  const panel = cardDOM.querySelector('[data-addon-vec-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const wired = wiredSlotNames.has('literal')
  panel.querySelectorAll<HTMLInputElement>('.addon-vec-axis-input').forEach((input) => {
    input.readOnly = wired
    input.dataset.addonWired = wired ? '1' : '0'
    if (wired) {
      input.title = 'Slot ligado no grafo — edição bloqueada'
    } else {
      input.removeAttribute('title')
    }
  })
}

function resolveVecAxisInput(target: EventTarget | null): HTMLInputElement | null {
  if (!(target instanceof HTMLInputElement)) {
    return null
  }
  if (!target.classList.contains('addon-vec-axis-input')) {
    return null
  }
  if (target.readOnly || target.dataset.addonWired === '1') {
    return null
  }
  return target
}

function isValidAxisPartial(value: string): boolean {
  return AXIS_FLOAT_PARTIAL.test(value)
}

function projectAxisValueAfterEdit(input: HTMLInputElement, event: InputEvent): string | null {
  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length

  switch (event.inputType) {
    case 'insertText':
    case 'insertReplacementText':
    case 'insertFromPaste':
    case 'insertFromDrop':
    case 'insertCompositionText':
      return value.slice(0, start) + (event.data ?? '') + value.slice(end)
    case 'deleteContentBackward':
      if (start === end && start > 0) {
        return value.slice(0, start - 1) + value.slice(end)
      }
      return value.slice(0, start) + value.slice(end)
    case 'deleteContentForward':
      if (start === end && end < value.length) {
        return value.slice(0, start) + value.slice(end + 1)
      }
      return value.slice(0, start) + value.slice(end)
    case 'deleteByCut':
    case 'deleteWordBackward':
    case 'deleteWordForward':
    case 'deleteSoftLineBackward':
    case 'deleteSoftLineForward':
    case 'deleteHardLineBackward':
    case 'deleteHardLineForward':
      return value.slice(0, start) + value.slice(end)
    default:
      return null
  }
}

function filterAxisPasteText(input: HTMLInputElement, pasted: string): string {
  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length
  const prefix = value.slice(0, start)
  const suffix = value.slice(end)

  let accepted = ''
  for (const char of pasted) {
    const trial = `${prefix}${accepted}${char}${suffix}`
    if (isValidAxisPartial(trial)) {
      accepted += char
    }
  }
  return accepted
}

function emitLiteralFromPanel(panel: HTMLElement): void {
  const hidden = panel.querySelector('input[name="literal"]')
  if (!(hidden instanceof HTMLInputElement)) {
    return
  }
  const next = composeLiteralFromPanel(panel)
  if (hidden.value === next) {
    return
  }
  hidden.value = next
  hidden.dispatchEvent(new Event('input', { bubbles: true }))
  hidden.dispatchEvent(new Event('change', { bubbles: true }))
}

function handleAxisBeforeInput(cardDOM: HTMLElement, event: InputEvent): void {
  const input = resolveVecAxisInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const nextValue = projectAxisValueAfterEdit(input, event)
  if (nextValue === null) {
    return
  }
  if (!isValidAxisPartial(nextValue)) {
    event.preventDefault()
  }
}

function handleAxisPaste(cardDOM: HTMLElement, event: ClipboardEvent): void {
  const input = resolveVecAxisInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const pasted = event.clipboardData?.getData('text/plain') ?? ''
  if (!pasted) {
    return
  }

  event.preventDefault()

  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length
  const prefix = value.slice(0, start)
  const suffix = value.slice(end)

  const direct = `${prefix}${pasted}${suffix}`
  const next = isValidAxisPartial(direct)
    ? direct
    : `${prefix}${filterAxisPasteText(input, pasted)}${suffix}`

  if (next === value) {
    return
  }

  input.value = next
  const caret = prefix.length + (next.length - prefix.length - suffix.length)
  input.setSelectionRange(caret, caret)

  const panel = input.closest('[data-addon-vec-panel]')
  if (panel instanceof HTMLElement) {
    emitLiteralFromPanel(panel)
  }
}

function handleAxisInput(cardDOM: HTMLElement, event: Event): void {
  const input = resolveVecAxisInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const panel = input.closest('[data-addon-vec-panel]')
  if (panel instanceof HTMLElement) {
    emitLiteralFromPanel(panel)
  }
}

/**
 * Liga edição por eixo e mantém `input[name="literal"]` como `x, y, z`.
 */
export function ensureAddonVecAxisInputWired(cardDOM: HTMLElement): void {
  if (!(cardDOM instanceof HTMLElement)) {
    return
  }

  cardDOM.querySelectorAll<HTMLElement>('[data-addon-vec-panel]').forEach((panel) => {
    const hidden = panel.querySelector('input[name="literal"]')
    if (hidden instanceof HTMLInputElement) {
      syncAddonVecAxisFromLiteral(cardDOM, hidden.value)
    }
    panel.querySelectorAll<HTMLInputElement>('.addon-vec-axis-input').forEach((input) => {
      input.inputMode = 'decimal'
    })
  })

  if (wiredContainers.has(cardDOM)) {
    return
  }

  wiredContainers.add(cardDOM)
  cardDOM.addEventListener('beforeinput', (event) => {
    if (event instanceof InputEvent) {
      handleAxisBeforeInput(cardDOM, event)
    }
  })
  cardDOM.addEventListener('paste', (event) => {
    handleAxisPaste(cardDOM, event)
  })
  cardDOM.addEventListener('input', (event) => {
    handleAxisInput(cardDOM, event)
  })
}
