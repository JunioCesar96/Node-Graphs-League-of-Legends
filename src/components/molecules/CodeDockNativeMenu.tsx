import { useCallback, useEffect, useState } from 'react'

import { LangId } from '@/core/language/languageIds'
import {
  getNativeEditorResolveStatus,
  isNativeRitualBinDevMode,
  resolveLocalInvokeBase,
} from '@/core/ritualBin'
import { useLanguage } from '@/language/LanguageProvider'

type CodeDockNativeMenuProps = {
  onCloseMenu: () => void
}

/** Menu Nativo do editor — motor Rust integrado (sem Ritobin.exe). */
export function CodeDockNativeMenu({ onCloseMenu }: CodeDockNativeMenuProps) {
  const { t } = useLanguage()
  const [provider, setProvider] = useState<string>('—')
  const [hashCount, setHashCount] = useState<string>('—')

  const refresh = useCallback(async () => {
    const status = await getNativeEditorResolveStatus()
    setProvider(status.provider ?? t(LangId.CodeBridgeStatusOffline))
    setHashCount(status.hashCount !== null ? String(status.hashCount) : '—')
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const baseLabel = resolveLocalInvokeBase() ?? '—'

  return (
    <>
      <div className="menu-option menu-option--static" role="presentation">
        <span>{t(LangId.CodeBridgeStatus)}</span>
        <span className="menu-option-meta">{provider}</span>
      </div>
      <div className="menu-option menu-option--static" role="presentation" title={baseLabel}>
        <span>{t(LangId.CodeBridgeEndpoint)}</span>
        <span className="menu-option-meta">{baseLabel}</span>
      </div>
      <div className="menu-option menu-option--static" role="presentation">
        <span>{t(LangId.CodeNativeCachedHashes)}</span>
        <span className="menu-option-meta">{hashCount}</span>
      </div>
      <div className="menu-separator" role="separator" />
      <div className="menu-option menu-option--static" role="presentation">
        <span>{t(LangId.CodeBridgeConvertToBin)}</span>
        <span className="menu-option-meta">POST /convert-to-bin</span>
      </div>
      <div className="menu-option menu-option--static" role="presentation">
        <span>{t(LangId.CodeNativeDecodeBin)}</span>
        <span className="menu-option-meta">POST /convert</span>
      </div>
      <div className="menu-option menu-option--static" role="presentation">
        <span>{t(LangId.CodeBridgeUnhashText)}</span>
        <span className="menu-option-meta">POST /unhash-text</span>
      </div>
      <div className="menu-separator" role="separator" />
      <button className="menu-option" onClick={() => void refresh().then(onCloseMenu)} type="button">
        <span>{t(LangId.CodeBridgeRefresh)}</span>
      </button>
      <p className="codeDockNodeGraphLabel" style={{ padding: '6px 12px', margin: 0, textTransform: 'none' }}>
        {t(LangId.CodeNativeModeHint)}
      </p>
    </>
  )
}

export function codeDockConverterMenuLabel(t: (id: number, fb?: string) => string): string {
  return isNativeRitualBinDevMode() ? t(LangId.CodeMenuNative, 'Native') : t(LangId.CodeMenuBridge)
}
