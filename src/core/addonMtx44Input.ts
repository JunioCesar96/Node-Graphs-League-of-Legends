/** Grelha 4×4 no add-on `addon-value-mtx44`. */

const wiredContainers = new WeakSet<HTMLElement>()
const CELL_COUNT = 16
const AXIS_FLOAT_PARTIAL = /^-?(\d+\.?\d*|\d*\.\d*)?$/

export const MTX44_CELL_LABELS = [
  'xx',
  'xy',
  'xz',
  'xw',
  'yx',
  'yy',
  'yz',
  'yw',
  'zx',
  'zy',
  'zz',
  'zw',
  'wx',
  'wy',
  'wz',
  'ww',
] as const

export const MTX44_IDENTITY_LITERAL =
  '1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1'

export function parseMtx44LiteralComponents(raw: string): string[] {
  let inner = raw.trim()
  const braced = /^\{\s*([\s\S]*)\s*\}$/.exec(inner)
  if (braced?.[1] !== undefined) {
    inner = braced[1].trim()
  }
  const parts = inner.split(/[\s,]+/).filter(Boolean)
  const result: string[] = []
  for (let index = 0; index < CELL_COUNT; index += 1) {
    result.push(parts[index] ?? '0')
  }
  return result
}

export function composeLiteralFromMtx44Panel(panel: HTMLElement): string {
  const inputs = [...panel.querySelectorAll<HTMLInputElement>('.addon-mtx44-cell-input')]
  if (inputs.length === 0) {
    return MTX44_IDENTITY_LITERAL
  }
  return inputs
    .map((input) => {
      const trimmed = input.value.trim()
      return trimmed === '' ? '0' : trimmed
    })
    .join(', ')
}

export function syncAddonMtx44GridFromLiteral(cardDOM: HTMLElement, literal: string): void {
  const panel = cardDOM.querySelector('[data-addon-mtx44-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const parts = parseMtx44LiteralComponents(literal)
  panel.querySelectorAll<HTMLInputElement>('.addon-mtx44-cell-input').forEach((input, index) => {
    input.value = parts[index] ?? '0'
  })

  const hidden = panel.querySelector('input[name="literal"]')
  if (hidden instanceof HTMLInputElement) {
    hidden.value = parts.join(', ')
  }
}

export function applyAddonMtx44FieldInteraction(
  wiredSlotNames: ReadonlySet<string>,
  cardDOM: HTMLElement,
): void {
  const panel = cardDOM.querySelector('[data-addon-mtx44-panel]')
  if (!(panel instanceof HTMLElement)) {
    return
  }

  const wired = wiredSlotNames.has('literal')
  panel.querySelectorAll<HTMLInputElement>('.addon-mtx44-cell-input').forEach((input) => {
    input.readOnly = wired
    input.dataset.addonWired = wired ? '1' : '0'
    if (wired) {
      input.title = 'Slot ligado no grafo — edição bloqueada'
    } else {
      input.removeAttribute('title')
    }
  })
}

function resolveMtx44CellInput(target: EventTarget | null): HTMLInputElement | null {
  if (!(target instanceof HTMLInputElement)) {
    return null
  }
  if (!target.classList.contains('addon-mtx44-cell-input')) {
    return null
  }
  if (target.readOnly || target.dataset.addonWired === '1') {
    return null
  }
  return target
}

function isValidCellPartial(value: string): boolean {
  return AXIS_FLOAT_PARTIAL.test(value)
}

function projectCellValueAfterEdit(input: HTMLInputElement, event: InputEvent): string | null {
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

function filterCellPasteText(input: HTMLInputElement, pasted: string): string {
  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length
  const prefix = value.slice(0, start)
  const suffix = value.slice(end)

  let accepted = ''
  for (const char of pasted) {
    const trial = `${prefix}${accepted}${char}${suffix}`
    if (isValidCellPartial(trial)) {
      accepted += char
    }
  }
  return accepted
}

function emitLiteralFromMtx44Panel(panel: HTMLElement): void {
  const hidden = panel.querySelector('input[name="literal"]')
  if (!(hidden instanceof HTMLInputElement)) {
    return
  }
  const next = composeLiteralFromMtx44Panel(panel)
  if (hidden.value === next) {
    return
  }
  hidden.value = next
  hidden.dispatchEvent(new Event('input', { bubbles: true }))
  hidden.dispatchEvent(new Event('change', { bubbles: true }))
}

function handleCellBeforeInput(cardDOM: HTMLElement, event: InputEvent): void {
  const input = resolveMtx44CellInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const nextValue = projectCellValueAfterEdit(input, event)
  if (nextValue === null) {
    return
  }
  if (!isValidCellPartial(nextValue)) {
    event.preventDefault()
  }
}

function handleCellPaste(cardDOM: HTMLElement, event: ClipboardEvent): void {
  const input = resolveMtx44CellInput(event.target)
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
  const next = isValidCellPartial(direct)
    ? direct
    : `${prefix}${filterCellPasteText(input, pasted)}${suffix}`

  if (next === value) {
    return
  }

  input.value = next
  const caret = prefix.length + (next.length - prefix.length - suffix.length)
  input.setSelectionRange(caret, caret)

  const panel = input.closest('[data-addon-mtx44-panel]')
  if (panel instanceof HTMLElement) {
    emitLiteralFromMtx44Panel(panel)
  }
}

function handleCellInput(cardDOM: HTMLElement, event: Event): void {
  const input = resolveMtx44CellInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const panel = input.closest('[data-addon-mtx44-panel]')
  if (panel instanceof HTMLElement) {
    emitLiteralFromMtx44Panel(panel)
  }
}

export function ensureAddonMtx44InputWired(cardDOM: HTMLElement): void {
  if (!(cardDOM instanceof HTMLElement)) {
    return
  }

  cardDOM.querySelectorAll<HTMLElement>('[data-addon-mtx44-panel]').forEach((panel) => {
    const hidden = panel.querySelector('input[name="literal"]')
    if (hidden instanceof HTMLInputElement) {
      syncAddonMtx44GridFromLiteral(cardDOM, hidden.value)
    }
    panel.querySelectorAll<HTMLInputElement>('.addon-mtx44-cell-input').forEach((input) => {
      input.inputMode = 'decimal'
    })
  })

  if (wiredContainers.has(cardDOM)) {
    return
  }

  wiredContainers.add(cardDOM)
  cardDOM.addEventListener('beforeinput', (event) => {
    if (event instanceof InputEvent) {
      handleCellBeforeInput(cardDOM, event)
    }
  })
  cardDOM.addEventListener('paste', (event) => {
    handleCellPaste(cardDOM, event)
  })
  cardDOM.addEventListener('input', (event) => {
    handleCellInput(cardDOM, event)
  })
}
