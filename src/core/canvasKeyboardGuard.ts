import { isParameterPickerOpen } from '@/core/parameterPickerModal'

/** Dataset no root do modal de índice (estruturas compactas). */
export const STRUCTURE_INDEX_PICKER_ROOT_ATTR = 'data-structure-index-picker'

export function isStructureIndexPickerOpen(): boolean {
  return document.querySelector(`[${STRUCTURE_INDEX_PICKER_ROOT_ATTR}]`) !== null
}

function isModalDialogTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return Boolean(target.closest(`[${STRUCTURE_INDEX_PICKER_ROOT_ATTR}], [role="dialog"][aria-modal="true"]`))
}

function isFormControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
}

/** Ignora atalhos do canvas (grelha/glue, seleccionar todos, foco, etc.) em inputs e modais. */
export function shouldIgnoreCanvasKeyboardShortcut(event: KeyboardEvent): boolean {
  if (isParameterPickerOpen() || isStructureIndexPickerOpen()) {
    return true
  }
  return isModalDialogTarget(event.target) || isFormControlTarget(event.target)
}

/** Ignora gestos de scroll/zoom do canvas quando um modal de parâmetro está aberto. */
export function shouldIgnoreCanvasWheelShortcut(target: EventTarget | null): boolean {
  if (isParameterPickerOpen() || isStructureIndexPickerOpen()) {
    return true
  }
  return isModalDialogTarget(target) || isFormControlTarget(target)
}
