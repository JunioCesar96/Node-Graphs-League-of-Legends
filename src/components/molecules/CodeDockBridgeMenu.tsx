import { useCallback, useEffect, useState } from 'react'

import { showAppAlert } from '@/messenger_popup/appMessenger'
import { getPreference, setPreference } from '@jade/lib/preferenceStore'

import { LangId } from '@/core/language/languageIds'
import { fetchJadeBridgeCapabilities, getJadeBridgeBaseForHost } from '@/core/jadeBridgeApi'
import { useJadeBridgeCapabilities } from '@/hooks/useJadeBridgeCapabilities'
import { useLanguage } from '@/language/LanguageProvider'

type CodeDockBridgeMenuProps = {
  onCloseMenu: () => void
}

export function CodeDockBridgeMenu({ onCloseMenu }: CodeDockBridgeMenuProps) {
  const { t } = useLanguage()
  const bridge = useJadeBridgeCapabilities()
  const [engine, setEngine] = useState<'jade' | 'ltk'>('jade')
  const [busy, setBusy] = useState(false)

  const loadEngine = useCallback(async () => {
    const value = (await getPreference('ConverterEngine', 'jade')).toLowerCase()
    setEngine(value === 'ltk' ? 'ltk' : 'jade')
  }, [])

  useEffect(() => {
    void loadEngine()
  }, [loadEngine])

  const runBridgePost = async (path: string) => {
    const base = getJadeBridgeBaseForHost()
    if (!base) {
      showAppAlert(t(LangId.CodeBridgeNotConfigured))
      return false
    }
    setBusy(true)
    try {
      const res = await fetch(`${base}${path}`, { method: 'POST' })
      const body = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null
      if (!res.ok || body?.ok === false) {
        showAppAlert(body?.message ?? `HTTP ${res.status}`)
        return false
      }
      return true
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Falha de rede'
      showAppAlert(message)
      return false
    } finally {
      setBusy(false)
      onCloseMenu()
    }
  }

  const setConverterEngine = async (next: 'jade' | 'ltk') => {
    setEngine(next)
    await setPreference('ConverterEngine', next)
    onCloseMenu()
  }

  const refreshCapabilities = async () => {
    setBusy(true)
    try {
      const caps = await fetchJadeBridgeCapabilities()
      if (!caps) {
        showAppAlert(t(LangId.CodeBridgeNotConfigured))
      }
    } finally {
      setBusy(false)
      onCloseMenu()
    }
  }

  const providerLabel =
    bridge.loading
      ? t(LangId.CodeBridgeStatusLoading)
      : bridge.capabilities?.provider ?? t(LangId.CodeBridgeStatusOffline)

  const baseLabel = bridge.base ?? '—'

  return (
    <>
      <div className="menu-option menu-option--static" role="presentation">
        <span>{t(LangId.CodeBridgeStatus)}</span>
        <span className="menu-option-meta">{providerLabel}</span>
      </div>
      <div className="menu-option menu-option--static" role="presentation" title={baseLabel}>
        <span>{t(LangId.CodeBridgeEndpoint)}</span>
        <span className="menu-option-meta">{baseLabel}</span>
      </div>
      <div className="menu-separator" role="separator" />
      <span className="codeDockNodeGraphLabel">{t(LangId.CodeBridgeSectionEngine)}</span>
      <button
        className={`menu-option${engine === 'jade' ? ' menu-option--checked' : ''}`}
        disabled={busy}
        onClick={() => void setConverterEngine('jade')}
        type="button"
      >
        <span>{t(LangId.CodeBridgeEngineJade)}</span>
      </button>
      <button
        className={`menu-option${engine === 'ltk' ? ' menu-option--checked' : ''}`}
        disabled={busy}
        onClick={() => void setConverterEngine('ltk')}
        type="button"
      >
        <span>{t(LangId.CodeBridgeEngineLtk)}</span>
      </button>
      <div className="menu-separator" role="separator" />
      <button
        className="menu-option"
        disabled={busy || !bridge.base}
        onClick={() => void refreshCapabilities()}
        type="button"
      >
        <span>{t(LangId.CodeBridgeRefresh)}</span>
      </button>
      {bridge.hashBridgeEnabled ? (
        <button
          className="menu-option"
          disabled={busy}
          onClick={() => void runBridgePost('/hash/preload')}
          type="button"
        >
          <span>{t(LangId.CodeBridgePreloadHashes)}</span>
        </button>
      ) : null}
      {bridge.convertToBinEnabled ? (
        <div className="menu-option menu-option--static" role="presentation">
          <span>{t(LangId.CodeBridgeConvertToBin)}</span>
          <span className="menu-option-meta">✓</span>
        </div>
      ) : null}
      {bridge.unhashTextEnabled ? (
        <div className="menu-option menu-option--static" role="presentation">
          <span>{t(LangId.CodeBridgeUnhashText)}</span>
          <span className="menu-option-meta">✓</span>
        </div>
      ) : null}
    </>
  )
}
