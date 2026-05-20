import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'

import { filterCharacterNames, getCharacterNames } from '@/core/characterList'

import styles from '@/components/molecules/LinkCharacterCombobox.module.css'

type LinkCharacterComboboxProps = {
  ariaLabel: string
  value: string
  onChange: (next: string) => void
}

export function LinkCharacterCombobox({ ariaLabel, value, onChange }: LinkCharacterComboboxProps) {
  const [query, setQuery] = useState(value)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [characterNames, setCharacterNames] = useState<readonly string[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(value)
  }, [value])

  useEffect(() => {
    let cancelled = false
    void getCharacterNames().then((names) => {
      if (!cancelled) {
        setCharacterNames(names)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(
    () => filterCharacterNames(query, characterNames),
    [characterNames, query],
  )

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
      const wrap = wrapRef.current
      if (wrap && !wrap.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  const commitValue = (next: string) => {
    const trimmed = next.trim()
    setQuery(trimmed)
    onChange(trimmed)
    setOpen(false)
  }

  const pickAt = (index: number) => {
    const picked = filtered[index]
    if (picked) {
      commitValue(picked)
    }
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
        pickAt(activeIndex)
        return
      }
      commitValue(query)
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
      <input
        aria-autocomplete="list"
        aria-controls={open ? `${ariaLabel}-listbox` : undefined}
        aria-expanded={open}
        aria-label={ariaLabel}
        autoComplete="off"
        className={styles.input}
        onBlur={() => {
          window.setTimeout(() => {
            if (!wrapRef.current?.contains(document.activeElement)) {
              commitValue(query)
            }
          }, 0)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          setActiveIndex(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
        onPointerDown={(event) => event.stopPropagation()}
        role="combobox"
        type="search"
        value={query}
      />
      {open && filtered.length > 0 ? (
        <ul
          className={styles.list}
          id={`${ariaLabel}-listbox`}
          role="listbox"
        >
          {filtered.slice(0, 80).map((name, index) => (
            <li key={name} role="presentation">
              <button
                aria-selected={index === activeIndex}
                className={[
                  styles.option,
                  index === activeIndex ? styles.optionActive : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pickAt(index)}
                role="option"
                type="button"
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
