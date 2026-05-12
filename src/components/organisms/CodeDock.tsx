import { useCallback, useEffect, useRef, useState } from 'react'

import styles from './CodeDock.module.css'

type CodeDockProps = {
  onChange: (value: string) => void
  onClose: () => void
  onWidthChange: (nextWidth: number) => void
  value: string
  width: number
}

const MIN_WIDTH = 260
const MAX_WIDTH = 760

export function CodeDock({ onChange, onClose, onWidthChange, value, width }: CodeDockProps) {
  const [resizing, setResizing] = useState(false)
  const shellRef = useRef<HTMLElement | null>(null)

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const shell = shellRef.current

      if (!shell?.parentElement) {
        return
      }

      const parentRect = shell.parentElement.getBoundingClientRect()
      const nextWidth = parentRect.right - event.clientX
      const clampedWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, nextWidth))

      onWidthChange(clampedWidth)
    },
    [onWidthChange],
  )

  const stopResize = useCallback(() => {
    setResizing(false)
  }, [])

  useEffect(() => {
    if (!resizing) {
      return
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', stopResize)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', stopResize)
    }
  }, [handlePointerMove, resizing, stopResize])

  return (
    <aside aria-label="Editor de texto (stub Jade)" className={styles.shell} ref={shellRef} style={{ width }}>
      <button
        aria-label="Redimensionar painel"
        className={styles.resizeHandle}
        onPointerDown={() => setResizing(true)}
        type="button"
      />
      <div className={styles.header}>
        <span>código league-bin (stub)</span>
        <button className={styles.close} onClick={onClose} type="button">
          fechar
        </button>
      </div>
      <textarea
        className={styles.editor}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        value={value}
      />
    </aside>
  )
}
