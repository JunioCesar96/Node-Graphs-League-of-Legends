import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import {
  CODE_DOCK_EDITOR_ROOT_ATTR,
  isCodeDockEditorFocused,
  shouldIgnoreCanvasKeyboardShortcut,
} from './canvasKeyboardGuard'

describe('canvasKeyboardGuard code dock focus', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('aside')
    root.setAttribute(CODE_DOCK_EDITOR_ROOT_ATTR, '')
    document.body.appendChild(root)
  })

  afterEach(() => {
    root.remove()
  })

  it('isCodeDockEditorFocused detecta Monaco com classe focused', () => {
    const editor = document.createElement('motionless-div')
    editor.className = 'monaco-editor focused'
    root.appendChild(editor)

    expect(isCodeDockEditorFocused()).toBe(true)
  })

  it('shouldIgnoreCanvasKeyboardShortcut ignora atalhos com editor focado', () => {
    const editor = document.createElement('div')
    editor.className = 'monaco-editor focused'
    root.appendChild(editor)

    const event = new KeyboardEvent('keydown', { key: 'g', bubbles: true })
    Object.defineProperty(event, 'target', { value: editor })

    expect(shouldIgnoreCanvasKeyboardShortcut(event)).toBe(true)
  })
})
