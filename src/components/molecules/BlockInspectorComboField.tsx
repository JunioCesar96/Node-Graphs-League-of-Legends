import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { filterComboOptions } from '@/core/blockInspectorUi'

import styles from './BlockInspectorComboField.module.css'

type BlockInspectorComboFieldProps = {
  ariaLabel: string
  value: string
  options: readonly string[]
  placeholder?: string
  /** Enter sem item da lista: confirma texto (ícone) ou dispara onPick (slot). */
  mode?: 'commit' | 'pick'
  onChange?: (next: string) => void
  onPick?: (picked: string) => void
}

export function BlockInspectorComboField({
  ariaLabel,
  value,
  options,
  placeholder,
  mode = 'commit',
  onChange,
  onPick,
}: BlockInspectorComboFieldProps) {
  const listId = useId()
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  const filtered = useMemo(() => filterComboOptions(query, options), [options, query])

  useEffect(() => {
    if (activeIndex >= filtered.length) {
      setActiveIndex(Math.max(0, filtered.length - 1))
    }
  }, [activeIndex, filtered.length])

  useEffect(() => {
    if (!open) {
      return
    }
    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const commitValue = (next: string) => {
    const trimmed = next.trim()
    setQuery(trimmed)
    onChange?.(trimmed)
    setOpen(false)
  }

  const pickValue = (picked: string) => {
    if (mode === 'pick') {
      onPick?.(picked)
      setQuery('')
      setOpen(false)
      return
    }
    commitValue(picked)
  }

  const submitDraft = () => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }
    if (mode === 'pick') {
      onPick?.(trimmed)
      setQuery('')
      setOpen(false)
      return
    }
    commitValue(trimmed)
  }

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(0, filtered.length - 1)))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActiveIndex((prev) => Math.max(prev - 1, 0))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (open && filtered[activeIndex]) {
        pickValue(filtered[activeIndex]!)
        return
      }
      submitDraft()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setQuery(value)
      setOpen(false)
    }
  }

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <div className={styles.inputRow}>
        <input
          aria-autocomplete="list"
          aria-controls={open ? listId : undefined}
          aria-expanded={open}
          aria-label={ariaLabel}
          autoComplete="off"
          className={styles.input}
          placeholder={placeholder}
          role="combobox"
          spellCheck={false}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(0)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
          onPointerDown={(event) => event.stopPropagation()}
        />
        <button
          type="button"
          className={styles.toggle}
          aria-label={`Abrir lista ${ariaLabel}`}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? '▴' : '▾'}
        </button>
      </div>
      {open ? (
        <div className={styles.panel}>
          <input
            aria-label={`Pesquisar ${ariaLabel}`}
            className={styles.search}
            placeholder="pesquisa"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onInputKeyDown}
            onPointerDown={(event) => event.stopPropagation()}
          />
          {filtered.length > 0 ? (
            <ul className={styles.list} id={listId} role="listbox">
              {filtered.slice(0, 40).map((option, index) => (
                <li key={option} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === activeIndex}
                    className={[styles.option, index === activeIndex ? styles.optionActive : '']
                      .filter(Boolean)
                      .join(' ')}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => pickValue(option)}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>Sem sugestões</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
