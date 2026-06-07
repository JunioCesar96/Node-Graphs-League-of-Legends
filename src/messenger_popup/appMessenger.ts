export type AppAlertOptions = {
  title?: string
}

export type AppToastOptions = {
  durationMs?: number
}

type AlertHandler = (message: string, options?: AppAlertOptions) => void
type ToastHandler = (message: string, options?: AppToastOptions) => void

let alertHandler: AlertHandler = (message) => {
  if (typeof globalThis.alert === 'function') {
    globalThis.alert(message)
  }
}

let toastHandler: ToastHandler | null = null

export function bindAppMessenger(handlers: {
  showAlert: AlertHandler
  showToast: ToastHandler
}): () => void {
  const previousAlert = alertHandler
  const previousToast = toastHandler
  alertHandler = handlers.showAlert
  toastHandler = handlers.showToast

  return () => {
    alertHandler = previousAlert
    toastHandler = previousToast
  }
}

/** Substitui `window.alert` — modal com OK (MessengerPopup). */
export function showAppAlert(message: string, options?: AppAlertOptions): void {
  alertHandler(message.trim(), options)
}

/** Toast genérico com mensagem livre. */
export function showAppToast(message: string, options?: AppToastOptions): void {
  if (toastHandler) {
    toastHandler(message.trim(), options)
    return
  }

  alertHandler(message.trim())
}
