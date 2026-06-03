import { useEffect, useMemo, useState } from 'react'
import type { DragEvent, MouseEventHandler, PointerEvent, PointerEventHandler } from 'react'

import { fetchAddonLanguagePack, resolveAddonI18nText } from '@/core/addonLanguage'
import { resolveAddonManifestInfo } from '@/core/addonManifestInfo'
import {
  resolveAddonHeaderIconUrl,
  resolveAddonPaletteAccent,
} from '@/core/addonManifestAppearance'
import type { AddonManifest } from '@/services/addonLoader.service'
import { useLanguage } from '@/language/LanguageProvider'
import { setAddonDragData } from '@/ritualDrag/addonDropHandler'

import styles from './PaletteAddAddonOption.module.css'

type PaletteAddAddonOptionProps = {
  manifest: AddonManifest
  expanded?: boolean
  highlighted?: boolean
  onPick: (addonId: string) => void
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>
}

export function PaletteAddAddonOption({
  manifest,
  expanded = false,
  highlighted = false,
  onPick,
  onPointerEnter,
  onPointerLeave,
}: PaletteAddAddonOptionProps) {
  const { locale } = useLanguage()
  const [languagePack, setLanguagePack] = useState<Record<number, string>>({})

  useEffect(() => {
    void fetchAddonLanguagePack(manifest.id, locale).then(setLanguagePack)
  }, [locale, manifest.id])

  const displayName = useMemo(
    () => resolveAddonI18nText(manifest.name, languagePack),
    [languagePack, manifest.name],
  )

  const info = useMemo(
    () => resolveAddonManifestInfo(manifest.info, languagePack),
    [languagePack, manifest.info],
  )

  const iconUrl = useMemo(
    () => resolveAddonHeaderIconUrl(manifest.id, manifest.icon),
    [manifest.id, manifest.icon],
  )

  const accentColor = useMemo(() => resolveAddonPaletteAccent(manifest), [manifest])

  const iconFallback = useMemo(() => {
    const trimmed = displayName.trim()
    return trimmed ? trimmed.charAt(0).toUpperCase() : manifest.id.charAt(0).toUpperCase()
  }, [displayName, manifest.id])

  const infoMetaLine = useMemo(() => {
    if (!info) {
      return ''
    }
    return [info.author, info.version ? `v${info.version}` : '', info.license]
      .filter(Boolean)
      .join(' · ')
  }, [info])

  const stopLinkPropagation: MouseEventHandler<HTMLAnchorElement> = (event) => {
    event.stopPropagation()
  }

  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    setAddonDragData(event.dataTransfer, manifest.id)
  }

  return (
    <button
      type="button"
      className={[styles.option, highlighted ? styles.keyboardSelected : ''].filter(Boolean).join(' ')}
      data-expanded={expanded ? 'true' : 'false'}
      draggable
      onClick={() => onPick(manifest.id)}
      onDragStart={handleDragStart}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation()
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span aria-hidden className={styles.accentBar} style={{ backgroundColor: accentColor }} />
      <span className={styles.iconWrap} style={{ boxShadow: `inset 0 0 0 1px ${accentColor}33` }}>
        {iconUrl ? (
          <img className={styles.iconImg} src={iconUrl} alt="" draggable={false} />
        ) : (
          <span className={styles.iconFallback}>{iconFallback}</span>
        )}
      </span>
      <span className={styles.body}>
        <span className={styles.titleRow}>
          <span className={styles.title} title={displayName}>
            {displayName}
          </span>
          <span className={styles.addonId} title={manifest.id}>
            {manifest.id}
          </span>
        </span>
        <span className={styles.meta}>
          <span className={styles.categoryTag}>{manifest.category}</span>
          {info?.tags.map((tag) => (
            <span className={styles.infoTag} key={tag}>
              {tag}
            </span>
          )) ?? null}
        </span>
        {info ? (
          <span className={styles.details}>
            {info.description ? (
              <span className={styles.description}>{info.description}</span>
            ) : null}
            {infoMetaLine ? <span className={styles.infoMeta}>{infoMetaLine}</span> : null}
            {info.link || info.docs ? (
              <span className={styles.links}>
                {info.link ? (
                  <a
                    className={styles.infoLink}
                    href={info.link}
                    rel="noreferrer"
                    target="_blank"
                    onClick={stopLinkPropagation}
                  >
                    Repo
                  </a>
                ) : null}
                {info.docs ? (
                  <a
                    className={styles.infoLink}
                    href={info.docs}
                    rel="noreferrer"
                    target="_blank"
                    onClick={stopLinkPropagation}
                  >
                    Docs
                  </a>
                ) : null}
              </span>
            ) : null}
          </span>
        ) : null}
      </span>
    </button>
  )
}
