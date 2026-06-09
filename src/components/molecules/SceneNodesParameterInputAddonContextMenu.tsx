import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { fetchInputAddonLanguagePack, resolveInputAddonI18nText } from '@/core/inputAddonLanguage'
import { LangId } from '@/core/language/languageIds'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './SceneNodesParameterInputAddonContextMenu.module.css'

export type SceneNodesParameterInputAddonContextMenuAnchor = {
  left: number
  top: number
}

type SceneNodesParameterInputAddonContextMenuProps = {
  anchor: SceneNodesParameterInputAddonContextMenuAnchor
  manifests: InputAddonManifest[]
  activeInputAddonId?: string
  onClose: () => void
  onSelect: (inputAddonId: string) => void
}

export function SceneNodesParameterInputAddonContextMenu({
  anchor,
  manifests,
  activeInputAddonId,
  onClose,
  onSelect,
}: SceneNodesParameterInputAddonContextMenuProps) {
  const { t } = useLanguage()
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return
      }
      onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  return createPortal(
    <div
      className={styles.menu}
      ref={menuRef}
      role="menu"
      style={{ left: anchor.left, top: anchor.top }}
    >
      <div className={styles.title}>{t(LangId.SceneNodesParametersInputAddonMenu)}</div>
      {manifests.map((manifest) => (
        <InputAddonMenuItem
          active={manifest.id === activeInputAddonId}
          key={manifest.id}
          manifest={manifest}
          onSelect={() => {
            onSelect(manifest.id)
            onClose()
          }}
        />
      ))}
    </div>,
    document.body,
  )
}

function InputAddonMenuItem({
  manifest,
  active,
  onSelect,
}: {
  manifest: InputAddonManifest
  active: boolean
  onSelect: () => void
}) {
  const { locale } = useLanguage()
  const [label, setLabel] = useState(manifest.id)

  useEffect(() => {
    let cancelled = false
    void fetchInputAddonLanguagePack(manifest.id, locale).then((pack) => {
      if (!cancelled) {
        setLabel(resolveInputAddonI18nText(manifest.name, pack) || manifest.id)
      }
    })
    return () => {
      cancelled = true
    }
  }, [locale, manifest.id, manifest.name])

  return (
    <button
      aria-checked={active}
      className={[styles.item, active ? styles.itemActive : ''].filter(Boolean).join(' ')}
      onClick={onSelect}
      role="menuitemradio"
      type="button"
    >
      {label}
    </button>
  )
}
