import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './ExpandActionCapsule.module.css'

export type ExpandActionCapsuleKind = 'collapsed' | 'expanded'

const EXIT_MS = 320

type ExpandActionCapsuleProps = {
  schemaId: string
  kind: ExpandActionCapsuleKind
  /** Duração visível em segundos antes da animação de saída e remoção. */
  lifetimeSeconds?: number
  onDismiss: () => void
}

/**
 * Cápsula estilo consola no canto superior direito; entra de cima para baixo e remove-se após o tempo de vida.
 */
export function ExpandActionCapsule({
  schemaId,
  kind,
  lifetimeSeconds = 5,
  onDismiss,
}: ExpandActionCapsuleProps) {
  const [exiting, setExiting] = useState(false)
  const dismissedRef = useRef(false)
  const lifetimeMs = lifetimeSeconds * 1000

  const label = kind === 'expanded' ? '(expandiu)' : '(retraiu)'

  useEffect(() => {
    console.log(
      '[ExpandActionCapsule]',
      schemaId,
      kind === 'expanded' ? 'expandiu' : 'retraiu',
      `lifetime: ${lifetimeSeconds}s`,
    )
  }, [schemaId, kind, lifetimeSeconds])

  useEffect(() => {
    dismissedRef.current = false

    const startExit = window.setTimeout(() => {
      setExiting(true)
    }, lifetimeMs)

    const remove = window.setTimeout(() => {
      if (dismissedRef.current) {
        return
      }

      dismissedRef.current = true
      onDismiss()
    }, lifetimeMs + EXIT_MS)

    return () => {
      window.clearTimeout(startExit)
      window.clearTimeout(remove)
    }
  }, [lifetimeMs, onDismiss])

  return createPortal(
    <div
      aria-live="polite"
      className={[
        styles.root,
        kind === 'expanded' ? styles.expanded : styles.collapsed,
        exiting ? styles.exiting : '',
      ]
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <span className={styles.id}>{schemaId}</span>
      <span className={styles.action}>{label}</span>
      <span className={styles.lifetime} aria-hidden="true">
        {lifetimeSeconds}s
      </span>
    </div>,
    document.body,
  )
}
