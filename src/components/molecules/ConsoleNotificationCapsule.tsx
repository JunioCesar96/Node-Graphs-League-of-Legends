import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import styles from './ExpandActionCapsule.module.css'

const EXIT_MS = 320
const COUNTDOWN_TICK_MS = 100

function formatCountdownSeconds(remaining: number, totalSeconds: number): string {
  if (remaining <= 0) {
    return '0s'
  }

  if (totalSeconds < 5) {
    return `${remaining.toFixed(1)}s`
  }

  return `${Math.ceil(remaining)}s`
}

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
  const [secondsLeft, setSecondsLeft] = useState(lifetimeSeconds)
  const dismissedRef = useRef(false)
  const lifetimeMs = lifetimeSeconds * 1000

  useEffect(() => {
    setSecondsLeft(lifetimeSeconds)
  }, [lifetimeSeconds, message])

  useEffect(() => {
    console.log('[ConsoleNotificationCapsule]', message, `lifetime: ${lifetimeSeconds}s`)
  }, [message, lifetimeSeconds])

  useEffect(() => {
    dismissedRef.current = false
    setExiting(false)

    const startedAt = Date.now()

    const tick = window.setInterval(() => {
      const elapsed = (Date.now() - startedAt) / 1000
      setSecondsLeft(Math.max(0, lifetimeSeconds - elapsed))
    }, COUNTDOWN_TICK_MS)

    const startExit = window.setTimeout(() => {
      setExiting(true)
      setSecondsLeft(0)
    }, lifetimeMs)

    const remove = window.setTimeout(() => {
      if (dismissedRef.current) {
        return
      }

      dismissedRef.current = true
      onDismiss()
    }, lifetimeMs + EXIT_MS)

    return () => {
      window.clearInterval(tick)
      window.clearTimeout(startExit)
      window.clearTimeout(remove)
    }
  }, [lifetimeMs, lifetimeSeconds, onDismiss])

  const countdownLabel = formatCountdownSeconds(secondsLeft, lifetimeSeconds)

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
        {countdownLabel}
      </span>
    </div>,
    document.body,
  )
}
