import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'

import { fetchBlockParametersFromDisk } from '@/core/blockParameterDiskLoader'
import { isParameterAlreadyOnBlock } from '@/core/blockParameterFromJson'
import type { BlockParameterJsonDocument } from '@/core/blockParameterJson'
import type { BlockParameterDef } from '@/core/blockSchema'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import menuStyles from './BlockCardParameterMenu.module.css'

type BlockParameterPickerPopoverProps = {
  blockType: string
  existingParameters: readonly BlockParameterDef[]
  onPick: (doc: BlockParameterJsonDocument) => void
  onClose: () => void
}

function stopPickerPointerPropagation(event: ReactPointerEvent) {
  event.stopPropagation()
}

export function BlockParameterPickerPopover({
  blockType,
  existingParameters,
  onPick,
  onClose,
}: BlockParameterPickerPopoverProps) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<BlockParameterJsonDocument[]>([])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    void fetchBlockParametersFromDisk(blockType).then((result) => {
      if (cancelled) {
        return
      }
      if (!result.ok) {
        setError(result.error)
        setCatalog([])
      } else {
        setCatalog(result.parameters)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [blockType])

  const available = useMemo(() => {
    const q = query.trim().toLowerCase()
    return catalog.filter((doc) => {
      if (isParameterAlreadyOnBlock(existingParameters, doc)) {
        return false
      }
      if (!q) {
        return true
      }
      return (
        doc.parameterName.toLowerCase().includes(q) ||
        doc.name.toLowerCase().includes(q) ||
        doc.type.toLowerCase().includes(q)
      )
    })
  }, [catalog, existingParameters, query])

  return (
    <div className={menuStyles.listPanel} role="dialog" aria-label={t(LangId.BlockParameterPickerTitle)}>
      <input
        className={menuStyles.searchInput}
        type="search"
        autoFocus
        placeholder={t(LangId.BlockParameterPickerSearch)}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            onClose()
          }
        }}
      />
      {loading ? (
        <p className={menuStyles.listHint}>{t(LangId.BlockParameterPickerLoading)}</p>
      ) : error ? (
        <p className={menuStyles.listHint}>
          {t(LangId.BlockParameterPickerError, undefined, { error })}
        </p>
      ) : available.length === 0 ? (
        <p className={menuStyles.listHint}>{t(LangId.BlockParameterPickerEmpty)}</p>
      ) : (
        available.map((doc) => (
          <button
            key={doc.id}
            type="button"
            className={menuStyles.listItem}
            onPointerDown={stopPickerPointerPropagation}
            onClick={(event) => {
              event.stopPropagation()
            }}
            onPointerUp={(event) => {
              event.stopPropagation()
              onPick(doc)
              onClose()
            }}
          >
            {doc.parameterName}
            <span style={{ opacity: 0.6 }}> · {doc.type}</span>
          </button>
        ))
      )}
    </div>
  )
}
