import { useEffect, useMemo, useState } from 'react'
import type { MouseEventHandler, PointerEvent, PointerEventHandler } from 'react'

import { resolveAddonManifestInfo } from '@/core/addonManifestInfo'
import { fetchInputAddonLanguagePack, resolveInputAddonI18nText } from '@/core/inputAddonLanguage'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './PaletteAddAddonOption.module.css'

type PaletteAddInputAddonOptionProps = {
  manifest: InputAddonManifest
  expanded?: boolean
  highlighted?: boolean
  onPointerEnter?: PointerEventHandler<HTMLButtonElement>
  onPointerLeave?: PointerEventHandler<HTMLButtonElement>
}

export function PaletteAddInputAddonOption({
  manifest,
  expanded = false,
  highlighted = false,
  onPointerEnter,
  onPointerLeave,
}: PaletteAddInputAddonOptionProps) {
  const { locale } = useLanguage()
  const [languagePack, setLanguagePack] = useState<Record<number, string>>({})

  useEffect(() => {
    void fetchInputAddonLanguagePack(manifest.id, locale).then(setLanguagePack)
  }, [locale, manifest.id])

  const displayName = useMemo(
    () => resolveInputAddonI18nText(manifest.name, languagePack),
    [languagePack, manifest.name],
  )

  const info = useMemo(
    () => resolveAddonManifestInfo(manifest.info, languagePack),
    [languagePack, manifest.info],
  )

  const iconFallback = useMemo(() => {
    const trimmed = displayName.trim()
    return trimmed ? trimmed.charAt(0).toUpperCase() : manifest.id.charAt(0).toUpperCase()
  }, [displayName, manifest.id])

  const bindingLabel = `${manifest.input.block}.${manifest.input.parameter} (${manifest.input.type})`

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

  return (
    <button
      type="button"
      className={[styles.option, highlighted ? styles.keyboardSelected : ''].filter(Boolean).join(' ')}
      data-expanded={expanded ? 'true' : 'false'}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        event.stopPropagation()
      }}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <span aria-hidden className={styles.accentBar} style={{ backgroundColor: '#f59e0b' }} />
      <span className={styles.iconWrap} style={{ boxShadow: 'inset 0 0 0 1px #f59e0b33' }}>
        <span className={styles.iconFallback}>{iconFallback}</span>
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
          <span className={styles.infoTag}>{bindingLabel}</span>
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
