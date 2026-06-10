import { isBoundedIntegerType } from '@/core/parameterBoundedTypes'
import {
  isValidPartialParameterValue,
  usesDecimalInputMode,
  usesNumericInputMode,
} from '@/core/parameterValueInput'
import type { NodeDataType } from '@/core/nodeSchema'

const wiredContainers = new WeakSet<HTMLElement>()

const VECTOR_LIKE_TYPES = new Set<NodeDataType>(['vector2', 'vector3', 'vector4', 'rgba'])

export function isAddonValueInputFilterType(type: string): type is NodeDataType {
  if (isBoundedIntegerType(type)) {
    return true
  }
  if (usesNumericInputMode(type as NodeDataType)) {
    return true
  }
  if (usesDecimalInputMode(type as NodeDataType)) {
    return true
  }
  return VECTOR_LIKE_TYPES.has(type as NodeDataType)
}

function resolveAddonValueInput(target: EventTarget | null): HTMLInputElement | null {
  if (!(target instanceof HTMLInputElement)) {
    return null
  }
  if (!target.classList.contains('addon-value-input')) {
    return null
  }
  if (target.readOnly || target.dataset.addonWired === '1') {
    return null
  }
  const paramType = target.dataset.parameterType?.trim()
  if (!paramType || !isAddonValueInputFilterType(paramType)) {
    return null
  }
  return target
}

function resolveParamType(input: HTMLInputElement): NodeDataType {
  return input.dataset.parameterType!.trim() as NodeDataType
}

export function projectInputValueAfterEdit(input: HTMLInputElement, event: InputEvent): string | null {
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

function filterPasteText(input: HTMLInputElement, type: NodeDataType, pasted: string): string {
  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length
  const prefix = value.slice(0, start)
  const suffix = value.slice(end)

  let accepted = ''
  for (const char of pasted) {
    const trial = `${prefix}${accepted}${char}${suffix}`
    if (isValidPartialParameterValue(type, trial)) {
      accepted += char
    }
  }
  return accepted
}

function applyAddonValueInputModes(cardDOM: HTMLElement): void {
  cardDOM.querySelectorAll<HTMLInputElement>('input.addon-value-input[data-parameter-type]').forEach((input) => {
    const paramType = input.dataset.parameterType?.trim()
    if (!paramType || !isAddonValueInputFilterType(paramType)) {
      return
    }
    if (usesDecimalInputMode(paramType as NodeDataType) || VECTOR_LIKE_TYPES.has(paramType as NodeDataType)) {
      input.inputMode = 'decimal'
      return
    }
    if (usesNumericInputMode(paramType as NodeDataType) || isBoundedIntegerType(paramType)) {
      input.inputMode = 'numeric'
    }
  })
}

function handleBeforeInput(cardDOM: HTMLElement, event: InputEvent): void {
  const input = resolveAddonValueInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const paramType = resolveParamType(input)
  const nextValue = projectInputValueAfterEdit(input, event)
  if (nextValue === null) {
    return
  }
  if (!isValidPartialParameterValue(paramType, nextValue)) {
    event.preventDefault()
  }
}

function handlePaste(cardDOM: HTMLElement, event: ClipboardEvent): void {
  const input = resolveAddonValueInput(event.target)
  if (!input || !cardDOM.contains(input)) {
    return
  }

  const pasted = event.clipboardData?.getData('text/plain') ?? ''
  if (!pasted) {
    return
  }

  event.preventDefault()

  const paramType = resolveParamType(input)
  const value = input.value
  const start = input.selectionStart ?? value.length
  const end = input.selectionEnd ?? value.length
  const prefix = value.slice(0, start)
  const suffix = value.slice(end)

  const direct = `${prefix}${pasted}${suffix}`
  const next = isValidPartialParameterValue(paramType, direct)
    ? direct
    : `${prefix}${filterPasteText(input, paramType, pasted)}${suffix}`

  if (next === value) {
    return
  }

  input.value = next
  const caret = prefix.length + (next.length - prefix.length - suffix.length)
  input.setSelectionRange(caret, caret)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

/**
 * Bloqueia letras e símbolos inválidos nos add-ons `addon-value-*` numéricos.
 */
export function ensureAddonParamValueInputWired(cardDOM: HTMLElement): void {
  if (!(cardDOM instanceof HTMLElement)) {
    return
  }

  applyAddonValueInputModes(cardDOM)

  if (wiredContainers.has(cardDOM)) {
    return
  }

  wiredContainers.add(cardDOM)
  cardDOM.addEventListener('beforeinput', (event) => {
    if (event instanceof InputEvent) {
      handleBeforeInput(cardDOM, event)
    }
  })
  cardDOM.addEventListener('paste', (event) => {
    handlePaste(cardDOM, event)
  })
}
