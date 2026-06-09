import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { createPortal } from 'react-dom'

import { preloadInputAddonPackage } from '@/blockStructures/inputAddonRegistry'
import { AddonColorVec4Picker } from '@/components/molecules/AddonColorVec4Picker'
import type { ParameterPickerAnchor } from '@/components/molecules/ParameterPickerModal'
import {
  ensureAddonColorVec4InputWired,
  syncAddonColorVec4FromLiteral,
} from '@/core/addonColorVec4Input'
import { resolveInputAddonI18nInHtml } from '@/core/inputAddonLanguage'
import {
  cloneChangeElementForDisplay,
  findChangeElement,
  resolveChangeElementId,
} from '@/core/inputAddonChangeElement'
import { applyAddonUiStyles } from '@/core/addonUiTemplate'
import type { InputAddonManifest } from '@/services/inputAddonLoader.service'

import styles from './InputAddonChangeCell.module.css'

type InputAddonChangeCellProps = {
  inputAddonId: string
  manifest: InputAddonManifest
  value: string
  onCommit: (nextValue: string) => void
  onContextMenu?: (event: ReactMouseEvent<HTMLDivElement>) => void
  className?: string
  layout?: 'compact' | 'field'
}

export function InputAddonChangeCell({
  inputAddonId,
  manifest,
  value,
  onCommit,
  onContextMenu,
  className,
  layout = 'compact',
}: InputAddonChangeCellProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mountRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [useFallbackTrigger, setUseFallbackTrigger] = useState(false)
  const [pickerAnchor, setPickerAnchor] = useState<ParameterPickerAnchor | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const valueRef = useRef(value)

  useEffect(() => {
    valueRef.current = value
  }, [value])

  const syncHostValue = useCallback((host: HTMLElement, nextValue: string) => {
    const panel = host.querySelector('[data-addon-color-vec4-panel]')
    if (panel instanceof HTMLElement) {
      syncAddonColorVec4FromLiteral(host, nextValue)
      return
    }
    const hidden = host.querySelector('input[name="literal"]')
    if (hidden instanceof HTMLInputElement) {
      hidden.value = nextValue
    }
  }, [])

  useLayoutEffect(() => {
    let cancelled = false
    setReady(false)
    setUseFallbackTrigger(false)

    void preloadInputAddonPackage(inputAddonId).then((pkg) => {
      if (cancelled || !hostRef.current || !mountRef.current) {
        return
      }

      const host = hostRef.current
      host.innerHTML = resolveInputAddonI18nInHtml(pkg.uiHtml, pkg.languagePack)
      applyAddonUiStyles(host, pkg.uiCss)
      ensureAddonColorVec4InputWired(host)

      void Promise.resolve(pkg.execute({ value: valueRef.current }, host)).then(() => {
        if (cancelled || !mountRef.current) {
          return
        }

        const changeId = resolveChangeElementId(manifest.input.change)
        const changeEl = findChangeElement(host, changeId)
        mountRef.current.innerHTML = ''

        if (changeEl) {
          const clone = cloneChangeElementForDisplay(changeEl)
          clone.addEventListener('click', (event) => {
            event.preventDefault()
            event.stopPropagation()
            const rect = clone.getBoundingClientRect()
            setPickerAnchor({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            })
            setPickerOpen(true)
          })
          mountRef.current.appendChild(clone)
          setUseFallbackTrigger(false)
        } else {
          setUseFallbackTrigger(true)
        }

        host.dataset.inputAddonExecuteReady = '1'
        setReady(true)
      })
    })

    return () => {
      cancelled = true
    }
  }, [inputAddonId, manifest.input.change])

  useEffect(() => {
    if (!ready || !hostRef.current) {
      return
    }
    syncHostValue(hostRef.current, value)
    if (!mountRef.current || useFallbackTrigger) {
      return
    }
    const changeId = resolveChangeElementId(manifest.input.change)
    const changeEl = findChangeElement(hostRef.current, changeId)
    if (!changeEl) {
      return
    }
    const clone = mountRef.current.querySelector('[data-inputaddon-change-clone="1"]')
    if (clone instanceof HTMLElement && changeEl instanceof HTMLElement) {
      if (changeEl.classList.contains('input-addon-color-vec4-swatch') || changeEl.hasAttribute('data-color-vec4-swatch')) {
        clone.style.background = changeEl.style.background
      }
    }
  }, [manifest.input.change, ready, syncHostValue, useFallbackTrigger, value])

  useEffect(() => {
    if (!ready || !hostRef.current) {
      return
    }

    const host = hostRef.current
    const handleChange = () => {
      const panel = host.querySelector('[data-addon-color-vec4-panel]')
      const hidden = host.querySelector('input[name="literal"]')
      if (hidden instanceof HTMLInputElement) {
        onCommit(hidden.value)
        return
      }
      if (panel instanceof HTMLElement) {
        const panelHidden = panel.querySelector('input[name="literal"]')
        if (panelHidden instanceof HTMLInputElement) {
          onCommit(panelHidden.value)
        }
      }
    }

    host.addEventListener('change', handleChange)
    host.addEventListener('input', handleChange)
    return () => {
      host.removeEventListener('change', handleChange)
      host.removeEventListener('input', handleChange)
    }
  }, [onCommit, ready])

  const openPickerFromFallback = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    setPickerAnchor({
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    })
    setPickerOpen(true)
  }

  const colorPanel =
    hostRef.current?.querySelector('[data-addon-color-vec4-panel]') instanceof HTMLElement
      ? (hostRef.current.querySelector('[data-addon-color-vec4-panel]') as HTMLElement)
      : null

  return (
    <>
      <div
        className={[
          styles.cell,
          layout === 'field' ? styles.cellField : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
        onContextMenu={onContextMenu}
        ref={mountRef}
        role={layout === 'field' ? 'group' : 'cell'}
      >
        {useFallbackTrigger ? (
          <button
            aria-label="Input add-on"
            className={styles.fallbackButton}
            disabled={!ready}
            onClick={openPickerFromFallback}
            type="button"
          >
            ⚙
          </button>
        ) : null}
      </div>
      <div aria-hidden className={styles.hiddenHost} ref={hostRef} />
      {pickerOpen && pickerAnchor && colorPanel
        ? createPortal(
            <AddonColorVec4Picker
              anchor={pickerAnchor}
              onClose={() => setPickerOpen(false)}
              panel={colorPanel}
              popoverUp={pickerAnchor.top > window.innerHeight * 0.55}
            />,
            document.body,
          )
        : null}
    </>
  )
}
