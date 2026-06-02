import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { buildCodeDockFileName, CODE_DOCK_QUICK_NEW_EXTENSIONS } from '@/core/codeDockFileTypes'
import { LangId } from '@/core/language/languageIds'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './NewCodeFileDialog.module.css'

export type NewCodeFileDialogProps = {
  isOpen: boolean
  onCancel: () => void
  onCreate: (fileName: string) => void
}

export function NewCodeFileDialog({ isOpen, onCancel, onCreate }: NewCodeFileDialogProps) {
  const { t } = useLanguage()
  const titleId = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const [baseName, setBaseName] = useState('Untitled')
  const [extension, setExtension] = useState('txt')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setBaseName('Untitled')
    setExtension('txt')

    const frame = window.requestAnimationFrame(() => {
      nameRef.current?.focus()
      nameRef.current?.select()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [isOpen])

  if (!isOpen) {
    return null
  }

  const finalName = buildCodeDockFileName(baseName, extension)

  const submit = () => {
    onCreate(finalName)
  }

  return createPortal(
    <div
      aria-labelledby={titleId}
      aria-modal
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
      role="dialog"
    >
      <div
        className={styles.panel}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onCancel()
          } else if (event.key === 'Enter') {
            event.preventDefault()
            submit()
          }
        }}
      >
        <p className={styles.title} id={titleId}>
          {t(LangId.CodeNewFileTitle)}
        </p>

        <label className={styles.field}>
          Nome
          <input
            className={styles.input}
            onChange={(event) => setBaseName(event.target.value)}
            placeholder="Untitled"
            ref={nameRef}
            type="text"
            value={baseName}
          />
        </label>

        <label className={styles.field}>
          Extensão
          <div className={styles.extRow}>
            <span className={styles.extDot}>.</span>
            <input
              className={styles.input}
              onChange={(event) => setExtension(event.target.value)}
              placeholder="txt"
              spellCheck={false}
              type="text"
              value={extension}
            />
          </div>
        </label>

        <div className={styles.quickRow}>
          {CODE_DOCK_QUICK_NEW_EXTENSIONS.map((option) => (
            <button
              className={[
                styles.quickBtn,
                extension.toLowerCase() === option.ext ? styles.quickBtnActive : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={option.ext}
              onClick={() => setExtension(option.ext)}
              title={option.label}
              type="button"
            >
              .{option.ext}
            </button>
          ))}
        </div>

        <p className={styles.preview}>
          Será criado: <span className={styles.previewName}>{finalName}</span>
        </p>

        <div className={styles.actions}>
          <button className={styles.ghostButton} onClick={onCancel} type="button">
            {t(LangId.CodeBtnCancel)}
          </button>
          <button className={styles.primaryButton} onClick={submit} type="button">
            {t(LangId.CodeNewFileCreate)}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
