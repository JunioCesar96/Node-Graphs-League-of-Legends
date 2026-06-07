import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import faviconBlue from '@/assets/SVG/favicon blue.svg'
import faviconGreen from '@/assets/SVG/favicon green.svg'
import faviconRed from '@/assets/SVG/favicon red.svg'

import styles from './EditorDockFavicon.module.css'

export type EditorDockFaviconKind = 'node' | 'vfx' | 'code'

const FAVICON_SRC_BY_KIND: Record<EditorDockFaviconKind, string> = {
  node: faviconBlue,
  vfx: faviconGreen,
  code: faviconRed,
}

const TITLE_LANG_ID_BY_KIND: Record<EditorDockFaviconKind, (typeof LangId)[keyof typeof LangId]> = {
  node: LangId.GraphDockTitle,
  vfx: LangId.VfxDockTitle,
  code: LangId.CodeDockTitle,
}

type EditorDockFaviconProps = {
  kind: EditorDockFaviconKind
  className?: string
}

export function EditorDockFavicon({ kind, className = '' }: EditorDockFaviconProps) {
  const { t } = useLanguage()
  const label = t(TITLE_LANG_ID_BY_KIND[kind])

  return (
    <img
      alt={label}
      className={[styles.favicon, className].filter(Boolean).join(' ')}
      draggable={false}
      src={FAVICON_SRC_BY_KIND[kind]}
      title={label}
    />
  )
}
