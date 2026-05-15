import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import {
  applyMessengerMessageReplacements,
  getMessengerCatalogEntry,
  messengerEntryKind,
} from '@/messenger_popup/messengerCatalog'

import styles from './MessengerPopup.module.css'

type ConfirmState = {
  durationMs?: number
  message: string
  onConfirm: () => void
  onCancel: () => void
}

type ToastState = {
  message: string
  durationMs: number
}

type MessengerPopupContextValue = {
  showConfirmByCatalogId: (
    id: string,
    options: {
      replacements?: Record<string, string>
      onConfirm: () => void
      onCancel?: () => void
    },
  ) => void
  /** Fecho automático após `durationMs` do catálogo. */
  showToastByCatalogId: (id: string, replacements?: Record<string, string>) => void
}

const MessengerPopupContext = createContext<MessengerPopupContextValue | null>(null)

export function useMessengerPopup(): MessengerPopupContextValue {
  const ctx = useContext(MessengerPopupContext)
  if (!ctx) {
    throw new Error('useMessengerPopup deve ser usado dentro de MessengerPopupProvider')
  }
  return ctx
}

export function MessengerPopupProvider({ children }: { children: ReactNode }) {
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const confirmPrimaryButtonRef = useRef<HTMLButtonElement | null>(null)
  const confirmTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const clearConfirmTimer = useCallback(() => {
    if (confirmTimer.current !== null) {
      window.clearTimeout(confirmTimer.current)
      confirmTimer.current = null
    }
  }, [])

  const clearToastTimer = useCallback(() => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current)
      toastTimer.current = null
    }
  }, [])

  const showConfirmByCatalogId = useCallback<
    MessengerPopupContextValue['showConfirmByCatalogId']
  >((id, options) => {
    const entry = getMessengerCatalogEntry(id)
    if (!entry) {
      console.warn(`[MessengerPopup] id desconhecido: ${id}`)
      return
    }
    if (messengerEntryKind(entry) !== 'confirm') {
      console.warn(`[MessengerPopup] entrada "${id}" não é confirm`)
      return
    }
    const message = applyMessengerMessageReplacements(entry.message, options.replacements ?? {})
    const durationMs = entry.durationMs != null && entry.durationMs > 0 ? entry.durationMs : undefined
    const close = () => {
      clearConfirmTimer()
      setConfirm(null)
    }
    clearConfirmTimer()
    setConfirm({
      ...(durationMs ? { durationMs } : {}),
      message,
      onConfirm: () => {
        close()
        options.onConfirm()
      },
      onCancel: () => {
        close()
        options.onCancel?.()
      },
    })
    if (durationMs) {
      confirmTimer.current = window.setTimeout(() => {
        confirmTimer.current = null
        setConfirm(null)
        options.onCancel?.()
      }, durationMs)
    }
  }, [clearConfirmTimer])

  const showToastByCatalogId = useCallback<MessengerPopupContextValue['showToastByCatalogId']>(
    (id, replacements) => {
      const entry = getMessengerCatalogEntry(id)
      if (!entry) {
        console.warn(`[MessengerPopup] id desconhecido: ${id}`)
        return
      }
      if (messengerEntryKind(entry) !== 'toast') {
        console.warn(`[MessengerPopup] entrada "${id}" não é toast`)
        return
      }
      if (entry.durationMs == null || entry.durationMs <= 0) {
        console.warn(`[MessengerPopup] toast "${id}" sem durationMs válido`)
        return
      }
      clearToastTimer()
      const message = applyMessengerMessageReplacements(entry.message, replacements ?? {})
      setToast({ message, durationMs: entry.durationMs })
      toastTimer.current = window.setTimeout(() => {
        setToast(null)
        toastTimer.current = null
      }, entry.durationMs)
    },
    [clearToastTimer],
  )

  useEffect(
    () => () => {
      clearConfirmTimer()
      clearToastTimer()
    },
    [clearConfirmTimer, clearToastTimer],
  )

  useEffect(() => {
    if (!confirm) {
      return
    }

    const raf = requestAnimationFrame(() => {
      confirmPrimaryButtonRef.current?.focus()
    })

    return () => cancelAnimationFrame(raf)
  }, [confirm])

  const contextValue = useMemo(
    () => ({ showConfirmByCatalogId, showToastByCatalogId }),
    [showConfirmByCatalogId, showToastByCatalogId],
  )

  const portal =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            {confirm ? (
              <div
                aria-modal="true"
                className={styles.backdrop}
                role="dialog"
                onClick={(event) => {
                  if (event.target === event.currentTarget) {
                    confirm.onCancel()
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    confirm.onCancel()
                  }
                }}
              >
                <div className={styles.dialog}>
                  <p className={styles.message}>{confirm.message}</p>
                  {confirm.durationMs ? (
                    <div className={styles.toastMeta}>{Math.round(confirm.durationMs / 1000)}s</div>
                  ) : null}
                  <div className={styles.actions}>
                    <button className={styles.button} onClick={confirm.onCancel} type="button">
                      Cancelar
                    </button>
                    <button
                      className={styles.buttonPrimary}
                      onClick={confirm.onConfirm}
                      ref={confirmPrimaryButtonRef}
                      type="button"
                    >
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            {toast ? (
              <div aria-live="polite" className={styles.toast} role="status">
                {toast.message}
                <div className={styles.toastMeta}>{Math.round(toast.durationMs / 1000)}s</div>
              </div>
            ) : null}
          </>,
          document.body,
        )
      : null

  return (
    <MessengerPopupContext.Provider value={contextValue}>
      {children}
      {portal}
    </MessengerPopupContext.Provider>
  )
}
