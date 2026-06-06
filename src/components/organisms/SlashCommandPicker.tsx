import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { createPortal } from 'react-dom'

import { PaletteSlashCommandOption } from '@/components/molecules/PaletteSlashCommandOption'
import { clampFloatingPanelViewportPosition } from '@/core/floatingPanelLayout'
import { LangId } from '@/core/language/languageIds'
import {
  matchesSlashCommandQuery,
  slashCommandsList,
} from '@/core/slashCommandRegistry'
import type { SlashCommandDocument } from '@/core/slashCommandTypes'
import {
  SHORTCUT_SCOPE_ATTR,
  SHORTCUT_SCOPE_NODE_PALETTE,
} from '@/core/shortcuts/shortcutScopes'
import { useLanguage } from '@/language/LanguageProvider'

import paletteStyles from './AddNodePalette.module.css'

const SLASH_COMMAND_PICKER_POSITION_KEY = 'slash-command-picker-position'

type PanelDragState = {
  pointerId: number
  startX: number
  startY: number
  originLeft: number
  originTop: number
}

function readStoredPanelPosition(): { left: number; top: number } | null {
  try {
    const raw = sessionStorage.getItem(SLASH_COMMAND_PICKER_POSITION_KEY)
    if (!raw) {
      return null
    }
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as { left?: unknown }).left === 'number' &&
      typeof (parsed as { top?: unknown }).top === 'number'
    ) {
      return {
        left: (parsed as { left: number }).left,
        top: (parsed as { top: number }).top,
      }
    }
  } catch {
    return null
  }
  return null
}

function writeStoredPanelPosition(position: { left: number; top: number }): void {
  try {
    sessionStorage.setItem(SLASH_COMMAND_PICKER_POSITION_KEY, JSON.stringify(position))
  } catch {
    // ignore quota / private mode
  }
}

export type SlashCommandPickerProps = {
  isOpen: boolean
  onClose: () => void
  onPick: (command: SlashCommandDocument) => void
  title?: string
  featureFilter?: SlashCommandDocument['feature']
}

export function SlashCommandPicker({
  isOpen,
  onClose,
  onPick,
  title,
  featureFilter,
}: SlashCommandPickerProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRootRef = useRef<HTMLDivElement>(null)
  const panelDragRef = useRef<PanelDragState | null>(null)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number } | null>(null)
  const [isHeaderDragging, setIsHeaderDragging] = useState(false)

  const filteredCommands = useMemo(() => {
    const effectiveQuery = query.trim().startsWith('/') ? query.trim().slice(1) : query.trim()
    return slashCommandsList(featureFilter).filter((entry) =>
      matchesSlashCommandQuery(entry, effectiveQuery),
    )
  }, [featureFilter, query])

  const activeIndex = Math.max(0, Math.min(highlightedIndex, Math.max(filteredCommands.length - 1, 0)))
  const isPanelFloating = panelPosition !== null

  const applyPanelPosition = useCallback(() => {
    const root = panelRootRef.current
    if (!root || !isPanelFloating || !panelPosition) {
      return
    }

    const width = root.offsetWidth
    const height = root.offsetHeight
    const clamped = clampFloatingPanelViewportPosition(
      panelPosition.left,
      panelPosition.top,
      width,
      height,
    )
    root.style.left = `${clamped.left}px`
    root.style.top = `${clamped.top}px`
  }, [isPanelFloating, panelPosition])

  useLayoutEffect(() => {
    applyPanelPosition()
  }, [applyPanelPosition, filteredCommands.length, query])

  useEffect(() => {
    if (!isPanelFloating) {
      return
    }

    const handleResize = () => applyPanelPosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyPanelPosition, isPanelFloating])

  const endHeaderDrag = useCallback(() => {
    panelDragRef.current = null
    setIsHeaderDragging(false)
  }, [])

  const beginHeaderDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return
      }

      const root = panelRootRef.current
      if (!root) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const rect = root.getBoundingClientRect()
      const originLeft = panelPosition?.left ?? rect.left
      const originTop = panelPosition?.top ?? rect.top

      if (!panelPosition) {
        setPanelPosition({ left: originLeft, top: originTop })
      }

      panelDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft,
        originTop,
      }
      setIsHeaderDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [panelPosition],
  )

  const handleHeaderDragMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const drag = panelDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const root = panelRootRef.current
    if (!root) {
      return
    }

    event.preventDefault()
    const width = root.offsetWidth
    const height = root.offsetHeight
    const next = clampFloatingPanelViewportPosition(
      drag.originLeft + (event.clientX - drag.startX),
      drag.originTop + (event.clientY - drag.startY),
      width,
      height,
    )
    setPanelPosition(next)
    writeStoredPanelPosition(next)
  }, [])

  const handleHeaderDragEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = panelDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      endHeaderDrag()
    },
    [endHeaderDrag],
  )

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setHighlightedIndex(0)
      endHeaderDrag()
      return
    }

    const stored = readStoredPanelPosition()
    if (stored) {
      setPanelPosition(stored)
    }

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [endHeaderDrag, isOpen])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [query, filteredCommands.length])

  useEffect(() => {
    return () => {
      panelDragRef.current = null
    }
  }, [])

  if (!isOpen) {
    return null
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.min(current + 1, Math.max(filteredCommands.length - 1, 0)))
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setHighlightedIndex((current) => Math.max(current - 1, 0))
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const picked = filteredCommands[activeIndex]
      if (picked) {
        onPick(picked)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }

  return createPortal(
    <div
      className={[paletteStyles.overlay, isPanelFloating ? paletteStyles.overlayAnchored : '']
        .filter(Boolean)
        .join(' ')}
      role="presentation"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div
        className={[paletteStyles.root, isPanelFloating ? paletteStyles.rootAnchored : '']
          .filter(Boolean)
          .join(' ')}
        ref={panelRootRef}
        onPointerDown={(event) => event.stopPropagation()}
        {...{ [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_NODE_PALETTE }}
      >
        <div className={paletteStyles.panel}>
          <header
            className={paletteStyles.header}
            data-dragging={isHeaderDragging ? 'true' : undefined}
            onPointerDown={beginHeaderDrag}
            onPointerMove={handleHeaderDragMove}
            onPointerUp={handleHeaderDragEnd}
            onPointerCancel={handleHeaderDragEnd}
            role="toolbar"
            aria-label={t(LangId.SlashCommandPickerDragHandle, 'Mover painel de slash commands')}
          >
            <span>{title ?? t(LangId.SlashCommandPickerTitle, 'Slash Commands')}</span>
            <kbd>Ctrl /</kbd>
          </header>

          <input
            ref={inputRef}
            className={paletteStyles.input}
            placeholder={t(LangId.SlashCommandPickerSearch, 'Pesquisar comando…')}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          <div className={paletteStyles.results} role="listbox">
            {filteredCommands.length === 0 ? (
              <p className={paletteStyles.empty}>
                {t(LangId.SlashCommandPickerEmpty, 'Nenhum slash command encontrado.')}
              </p>
            ) : (
              filteredCommands.map((command, index) => (
                <PaletteSlashCommandOption
                  key={`${command.feature}::${command.command}`}
                  command={command}
                  expanded
                  highlighted={index === activeIndex}
                  onClick={() => onPick(command)}
                  onPointerEnter={() => setHighlightedIndex(index)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
