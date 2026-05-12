import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './ExpandActionCapsule.module.css'

const EXIT_MS = 320

type ConsoleNotificationCapsuleProps = {
  /** Texto mostrado na cápsula (estilo consola, canto superior direito). */
  message: string
  /** Duração em segundos antes da animação de saída. */
  lifetimeSeconds?: number
  onDismiss: () => void
}

/**
 * Notificação genérica: mesma cápsula que expand/collapse, com mensagem livre.
 */
export function ConsoleNotificationCapsule({
  message,
  lifetimeSeconds = 3,
  onDismiss,
}: ConsoleNotificationCapsuleProps) {
  const [exiting, setExiting] = useState(false)
  const dismissedRef = useRef(false)
  const lifetimeMs = lifetimeSeconds * 1000

  useEffect(() => {
    console.log('[ConsoleNotificationCapsule]', message, `lifetime: ${lifetimeSeconds}s`)
  }, [message, lifetimeSeconds])

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
      className={[styles.root, styles.plainVariant, exiting ? styles.exiting : '']
        .filter(Boolean)
        .join(' ')}
      role="status"
    >
      <span className={styles.plainMessage}>{message}</span>
      <span className={styles.lifetime} aria-hidden="true">
        {lifetimeSeconds}s
      </span>
    </div>,
    document.body,
  )
}
