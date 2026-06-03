import { isParameterPickerOpen } from '@/core/parameterPickerModal'

/** Dataset no root do painel CodeDock (Monaco Jade). */
export const CODE_DOCK_EDITOR_ROOT_ATTR = 'data-code-dock-editor-root'

/** Dataset no root do modal de índice (estruturas compactas). */
export const STRUCTURE_INDEX_PICKER_ROOT_ATTR = 'data-structure-index-picker'

/** Monaco marca `.focused` no widget quando o texto do editor tem foco. */
export function isCodeDockEditorFocused(): boolean {
  if (typeof document === 'undefined') {
    return false
  }

  const root = document.querySelector(`[${CODE_DOCK_EDITOR_ROOT_ATTR}]`)
  if (!root) {
    return false
  }

  return root.querySelector('.monaco-editor.focused') !== null
}

export function isStructureIndexPickerOpen(): boolean {
  return document.querySelector(`[${STRUCTURE_INDEX_PICKER_ROOT_ATTR}]`) !== null
}

function isModalDialogTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return Boolean(
    target.closest(`[${STRUCTURE_INDEX_PICKER_ROOT_ATTR}], [role="dialog"][aria-modal="true"]`),
  )
}

function isFormControlTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  return Boolean(target.closest('input, textarea, select, button, [contenteditable="true"]'))
}

function isCodeDockEditorTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  const root = document.querySelector(`[${CODE_DOCK_EDITOR_ROOT_ATTR}]`)
  if (!root || !root.contains(target)) {
    return false
  }

  return Boolean(
    target.closest('.monaco-editor, .monaco-inputbox, .find-widget, .editor-widget'),
  )
}

export type ShortcutGuardOptions = {
  allowInFormControls?: boolean
}

/** Bloqueia atalhos de workspace em modais, pickers e controlos de formulário. */
export function shouldBlockWorkspaceShortcut(
  event: KeyboardEvent,
  options: ShortcutGuardOptions = {},
): boolean {
  if (isParameterPickerOpen() || isStructureIndexPickerOpen()) {
    return true
  }

  if (!options.allowInFormControls) {
    if (isModalDialogTarget(event.target) || isFormControlTarget(event.target)) {
      return true
    }
  }

  return false
}

/** Ignora atalhos do canvas (legado — delega para shortcutGuards). */
export function shouldIgnoreCanvasKeyboardShortcut(event: KeyboardEvent): boolean {
  if (isParameterPickerOpen() || isStructureIndexPickerOpen()) {
    return true
  }
  if (isCodeDockEditorFocused() || isCodeDockEditorTarget(event.target)) {
    return true
  }
  return isModalDialogTarget(event.target) || isFormControlTarget(event.target)
}

export function shouldIgnoreCanvasWheelShortcut(target: EventTarget | null): boolean {
  if (isParameterPickerOpen() || isStructureIndexPickerOpen()) {
    return true
  }
  return isModalDialogTarget(target) || isFormControlTarget(target)
}
