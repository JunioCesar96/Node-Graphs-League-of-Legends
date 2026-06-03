import { useCallback, useEffect, useState } from 'react'
import type { DragEvent } from 'react'

import {
  installAddonFromDataTransfer,
  isAddonInstallAvailable,
  type AddonInstallProgress,
} from '@/core/addonInstallFromDrop'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './PaletteAddonInstallZone.module.css'

type InstallStatus = 'idle' | 'dragging' | 'installing' | 'success' | 'error'

type PaletteAddonInstallZoneProps = {
  onInstalled?: () => void
}

export function PaletteAddonInstallZone({ onInstalled }: PaletteAddonInstallZoneProps) {
  const { t } = useLanguage()
  const [available, setAvailable] = useState<boolean | null>(null)
  const [status, setStatus] = useState<InstallStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [addonName, setAddonName] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    void isAddonInstallAvailable().then((value) => {
      if (!cancelled) {
        setAvailable(value)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleProgress = useCallback((value: AddonInstallProgress) => {
    setProgress(value.progress)
    if (value.addonName) {
      setAddonName(value.addonName)
    }
    if (value.message) {
      setStatusMessage(value.message)
    }
  }, [])

  const runInstall = useCallback(
    async (dataTransfer: DataTransfer) => {
      setStatus('installing')
      setProgress(0)
      setAddonName('')
      setStatusMessage(t(LangId.NodePaletteAddonInstallSearching))

      const result = await installAddonFromDataTransfer(dataTransfer, handleProgress)

      if (result.ok) {
        setStatus('success')
        setProgress(100)
        setStatusMessage(t(LangId.NodePaletteAddonInstallSuccess))
        onInstalled?.()
        window.setTimeout(() => {
          setStatus('idle')
          setProgress(0)
          setAddonName('')
          setStatusMessage('')
        }, 3200)
        return
      }

      setStatus('error')
      setStatusMessage(result.error)
      window.setTimeout(() => {
        setStatus('idle')
        setProgress(0)
        setAddonName('')
        setStatusMessage('')
      }, 4200)
    },
    [handleProgress, onInstalled, t],
  )

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setStatus((current) => (current === 'installing' ? current : 'dragging'))
  }, [])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return
    }
    setStatus((current) => (current === 'installing' ? current : 'idle'))
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      if (available === false || status === 'installing') {
        return
      }
      void runInstall(event.dataTransfer)
    },
    [available, runInstall, status],
  )

  const disabled = available === false
  const showProgress = status === 'installing' || status === 'success' || status === 'error'

  return (
    <div
      aria-disabled={disabled}
      className={[
        styles.zone,
        status === 'dragging' ? styles.zoneDragging : '',
        status === 'installing' ? styles.zoneInstalling : '',
        status === 'success' ? styles.zoneSuccess : '',
        status === 'error' ? styles.zoneError : '',
        disabled ? styles.zoneDisabled : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className={styles.title}>{t(LangId.NodePaletteAddonInstallTitle)}</div>
      <div className={styles.hint}>
        {disabled ? t(LangId.NodePaletteAddonInstallDevOnly) : t(LangId.NodePaletteAddonInstallHint)}
      </div>

      {showProgress ? (
        <div className={styles.progressBlock}>
          {addonName ? <div className={styles.addonName}>{addonName}</div> : null}
          <div
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={progress}
            className={styles.progressTrack}
            role="progressbar"
          >
            <span className={styles.progressFill} style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }} />
          </div>
          <div className={styles.statusMessage} role="status">
            {statusMessage}
          </div>
        </div>
      ) : null}
    </div>
  )
}
