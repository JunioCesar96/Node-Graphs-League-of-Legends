import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent, PointerEventHandler } from 'react'
import { createPortal } from 'react-dom'

import { SlotPin } from '@/components/atoms/SlotPin'
import {
  hasButtonClickDriveInList,
  hasGlobalInputReactiveDrive,
  hasTargetedInputChangeDrive,
  matchesAnyButtonClickDrive,
  resolveAddonDrives,
  shouldRunInputDriveForTarget,
} from '@/core/addonDrive'
import {
  ReactiveDriveEngine,
  applyAddonInputFieldInteraction,
  isAddonInputFieldWired,
  syncWiredAddonInputsToDom,
} from '@/core/engine/reactiveDrive'
import {
  fetchAddonLanguagePack,
  resolveAddonI18nInHtml,
  resolveAddonI18nText,
  type AddonLanguagePack,
} from '@/core/addonLanguage'
import {
  buildAddonCardAppearanceStyles,
  resolveAddonHeaderIconUrl,
} from '@/core/addonManifestAppearance'
import {
  findAddonContextMenuDef,
  preprocessAddonContextMenuRegions,
  resolveAddonContextMenuItems,
} from '@/core/addonContextMenu'
import {
  applyAddonBodyGridLayout,
  applyAddonUiStyles,
  bindAddonHiddenInputSlotAnchors,
  collectAddonInlinePinHosts,
  listAddonDockSlots,
  measureAddonCardSize,
  preprocessAddonUiHtml,
  resolveAddonSlotPinBorderColor,
  resolveAddonSlotTip,
  type AddonInlinePinHost,
} from '@/core/addonUiTemplate'
import {
  AddonContextMenu,
  type AddonContextMenuAnchor,
} from '@/components/molecules/AddonContextMenu'
import type { AddonPackage, AddonSlot } from '@/services/addonLoader.service'
import { useLanguage } from '@/language/LanguageProvider'

import styles from './AddonCard.module.css'

export type AddonCardProps = {
  instanceId: string
  addonPackage: AddonPackage
  resolvedInputs: Record<string, unknown>
  wiredInputSlotNames: ReadonlySet<string>
  wiredInputsFeedKey: string
  selected?: boolean
  interactionLocked?: boolean
  activeAddonSlotId?: string
  onGraphStateMutation: (nodeId: string, outputPayload: Record<string, unknown>) => void
  onAddonOutputPointerDown?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonOutputPointerUp?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonOutputPointerCancel?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonOutputPointerMove?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonInputPointerUp?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
}

function isAddonInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }
  return Boolean(
    target.closest(
      'input, textarea, select, button, output, [data-addon-slot-id], [data-addon-input-slot], [contenteditable="true"]',
    ),
  )
}

function renderAddonSlotPin(
  slot: AddonSlot,
  instanceId: string,
  activeAddonSlotId: string | undefined,
  interactionLocked: boolean,
  wiredInputSlotNames: ReadonlySet<string>,
  locale: string,
  languagePack: AddonLanguagePack,
  handlers: {
    onAddonOutputPointerDown?: AddonCardProps['onAddonOutputPointerDown']
    onAddonOutputPointerUp?: AddonCardProps['onAddonOutputPointerUp']
    onAddonOutputPointerCancel?: AddonCardProps['onAddonOutputPointerCancel']
    onAddonOutputPointerMove?: AddonCardProps['onAddonOutputPointerMove']
    onAddonInputPointerUp?: AddonCardProps['onAddonInputPointerUp']
  },
) {
  const slotId = `addon:${slot.name}:${slot.direction}`
  const isOutput = slot.direction === 'output'
  const slotWired = slot.direction === 'input' && wiredInputSlotNames.has(slot.name)
  const borderColor = resolveAddonSlotPinBorderColor(slot, slotWired)
  const tip = resolveAddonSlotTip(slot, locale, languagePack)

  return (
    <SlotPin
      direction={slot.direction}
      type={slot.type}
      slotId={slotId}
      nodeId={instanceId}
      active={activeAddonSlotId === slotId}
      disabled={interactionLocked}
      ariaLabel={`${slot.name} (${slot.direction})${slotWired ? ' — ligado' : ''}`}
      borderColor={borderColor}
      title={tip}
      onPointerDown={(event) => {
        event.stopPropagation()
        if (isOutput && handlers.onAddonOutputPointerDown) {
          handlers.onAddonOutputPointerDown(slotId, event)
        }
      }}
      onPointerUp={
        isOutput
          ? (event) => {
              event.stopPropagation()
              handlers.onAddonOutputPointerUp?.(slotId, event)
            }
          : (event) => {
              event.stopPropagation()
              handlers.onAddonInputPointerUp?.(slotId, event)
            }
      }
      onPointerCancel={
        isOutput
          ? (event) => {
              event.stopPropagation()
              handlers.onAddonOutputPointerCancel?.(slotId, event)
            }
          : undefined
      }
      onPointerMove={isOutput ? (event) => handlers.onAddonOutputPointerMove?.(slotId, event) : undefined}
    />
  )
}

export function AddonCard({
  instanceId,
  addonPackage,
  resolvedInputs,
  wiredInputSlotNames,
  wiredInputsFeedKey,
  selected = false,
  interactionLocked = false,
  activeAddonSlotId,
  onGraphStateMutation,
  onAddonOutputPointerDown,
  onAddonOutputPointerUp,
  onAddonOutputPointerCancel,
  onAddonOutputPointerMove,
  onAddonInputPointerUp,
  onSelect,
  onStartDrag,
}: AddonCardProps) {
  const { locale } = useLanguage()
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLElement>(null)
  const { manifest, uiHtml, uiCss, cardWidthPx, cardHeightPx } = addonPackage
  const [languagePack, setLanguagePack] = useState<AddonLanguagePack>(
    () => addonPackage.languagePack ?? {},
  )
  const uiHtmlBody = uiHtml
  const addonUiCss = uiCss ?? ''
  const processedUiHtml = useMemo(
    () => preprocessAddonContextMenuRegions(preprocessAddonUiHtml(uiHtmlBody, manifest), manifest),
    [manifest, uiHtmlBody],
  )
  const localizedUiHtml = useMemo(
    () => resolveAddonI18nInHtml(processedUiHtml, languagePack),
    [languagePack, processedUiHtml],
  )
  const displayName = useMemo(
    () => resolveAddonI18nText(manifest.name, languagePack),
    [languagePack, manifest.name],
  )
  const hasCustomSize = Boolean(cardWidthPx || cardHeightPx)
  const dockSlots = useMemo(() => listAddonDockSlots(manifest, uiHtml), [manifest, uiHtml])
  const headerIconUrl = resolveAddonHeaderIconUrl(manifest.id, manifest.icon)
  const [inlinePinHosts, setInlinePinHosts] = useState<AddonInlinePinHost[]>([])
  const [uiLayoutKey, setUiLayoutKey] = useState(0)
  const [measuredCardWidthPx, setMeasuredCardWidthPx] = useState<number | undefined>(undefined)
  const [contextMenu, setContextMenu] = useState<{
    anchor: AddonContextMenuAnchor
    menuName: string
  } | null>(null)
  const onGraphStateMutationRef = useRef(onGraphStateMutation)
  const lastEmittedOutputsRef = useRef<string>('')
  const lastWiredFeedRef = useRef<string>('')
  const lastLocalInputsRef = useRef<string>('')
  const driveContextRef = useRef({ wiredInputs: resolvedInputs, wiredSlotNames: wiredInputSlotNames })

  const manifestDrives = useMemo(() => resolveAddonDrives(manifest.drive), [manifest.drive])
  const wiredSlotNamesKey = [...wiredInputSlotNames].sort().join('|')
  const slotHandlers = {
    onAddonOutputPointerDown,
    onAddonOutputPointerUp,
    onAddonOutputPointerCancel,
    onAddonOutputPointerMove,
    onAddonInputPointerUp,
  }

  onGraphStateMutationRef.current = onGraphStateMutation
  driveContextRef.current = { wiredInputs: resolvedInputs, wiredSlotNames: wiredInputSlotNames }

  useEffect(() => {
    setLanguagePack(addonPackage.languagePack ?? {})
    void fetchAddonLanguagePack(manifest.id, locale).then((pack) => {
      if (Object.keys(pack).length > 0) {
        setLanguagePack(pack)
      }
    })
  }, [addonPackage.languagePack, locale, manifest.id])

  useLayoutEffect(() => {
    const domElement = containerRef.current
    if (!domElement) {
      return
    }

    domElement.innerHTML = localizedUiHtml
    applyAddonUiStyles(domElement, addonUiCss)
    applyAddonBodyGridLayout(domElement, manifest)
    bindAddonHiddenInputSlotAnchors(domElement, instanceId, manifest, locale, languagePack)
    setInlinePinHosts(collectAddonInlinePinHosts(domElement, manifest))
    setUiLayoutKey((key) => key + 1)

    const card = cardRef.current
    if (card) {
      setMeasuredCardWidthPx(measureAddonCardSize(card).widthPx)
    }
  }, [addonUiCss, instanceId, languagePack, locale, localizedUiHtml, manifest])

  useEffect(() => {
    const card = cardRef.current
    const body = containerRef.current
    if (!card || !body) {
      return
    }

    const syncCardWidth = () => {
      setMeasuredCardWidthPx(measureAddonCardSize(card).widthPx)
    }

    syncCardWidth()
    const observer = new ResizeObserver(syncCardWidth)
    observer.observe(card)
    observer.observe(body)
    return () => observer.disconnect()
  }, [localizedUiHtml, uiLayoutKey])

  useEffect(() => {
    const domElement = containerRef.current
    if (!domElement) {
      return
    }
    applyAddonInputFieldInteraction(manifest, wiredInputSlotNames, domElement)
    syncWiredAddonInputsToDom(manifest, resolvedInputs, wiredInputSlotNames, domElement)
  }, [manifest, resolvedInputs, wiredInputSlotNames, wiredSlotNamesKey, wiredInputsFeedKey, processedUiHtml])

  useEffect(() => {
    const domElement = containerRef.current
    if (!domElement) {
      return
    }

    const runOnWiredFeedOnly =
      hasTargetedInputChangeDrive(manifestDrives) && !hasGlobalInputReactiveDrive(manifestDrives)
    if (!hasGlobalInputReactiveDrive(manifestDrives) && !runOnWiredFeedOnly) {
      return
    }

    const emitOutputs = (outputs: Record<string, unknown>) => {
      const serialized = JSON.stringify(outputs)
      if (serialized === lastEmittedOutputsRef.current) {
        return
      }
      lastEmittedOutputsRef.current = serialized
      onGraphStateMutationRef.current(instanceId, outputs)
    }

    const wiredFeedChanged = wiredInputsFeedKey !== lastWiredFeedRef.current
    if (wiredFeedChanged) {
      lastWiredFeedRef.current = wiredInputsFeedKey
    }

    let localInputsChanged = false
    if (!runOnWiredFeedOnly) {
      const localInputsKey = [...manifest.data]
        .filter((slot) => slot.direction === 'input' && !wiredInputSlotNames.has(slot.name))
        .map((slot) => {
          const el = domElement.querySelector(
            `input[name="${slot.name}"], textarea[name="${slot.name}"]`,
          )
          return `${slot.name}:${el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement ? el.value : ''}`
        })
        .join('|')
      localInputsChanged = localInputsKey !== lastLocalInputsRef.current
      if (localInputsChanged) {
        lastLocalInputsRef.current = localInputsKey
      }
    }

    if (!wiredFeedChanged && !localInputsChanged && lastEmittedOutputsRef.current !== '') {
      return
    }

    ReactiveDriveEngine.evaluateInputChange(addonPackage, domElement, driveContextRef.current, emitOutputs)
  }, [
    wiredInputsFeedKey,
    wiredSlotNamesKey,
    addonPackage,
    instanceId,
    manifest.data,
    manifestDrives,
    wiredInputSlotNames,
  ])

  useEffect(() => {
    const domElement = containerRef.current
    if (!domElement) {
      return
    }

    const hasInputDrives =
      hasGlobalInputReactiveDrive(manifestDrives) || hasTargetedInputChangeDrive(manifestDrives)
    if (!hasInputDrives) {
      return
    }

    const emitOutputs = (outputs: Record<string, unknown>) => {
      const serialized = JSON.stringify(outputs)
      if (serialized === lastEmittedOutputsRef.current) {
        return
      }
      lastEmittedOutputsRef.current = serialized
      onGraphStateMutationRef.current(instanceId, outputs)
    }

    const onDomInputOrChange = (event: Event) => {
      if (
        !shouldRunInputDriveForTarget(
          manifestDrives,
          event.target,
          driveContextRef.current.wiredSlotNames,
        )
      ) {
        return
      }
      lastLocalInputsRef.current = ''
      ReactiveDriveEngine.evaluateInputChange(
        addonPackage,
        domElement,
        driveContextRef.current,
        emitOutputs,
      )
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement)) {
        return
      }
      if (isAddonInputFieldWired(driveContextRef.current.wiredSlotNames, target.name)) {
        event.preventDefault()
      }
    }

    domElement.addEventListener('input', onDomInputOrChange)
    domElement.addEventListener('change', onDomInputOrChange)
    domElement.addEventListener('keydown', onKeyDown)
    return () => {
      domElement.removeEventListener('input', onDomInputOrChange)
      domElement.removeEventListener('change', onDomInputOrChange)
      domElement.removeEventListener('keydown', onKeyDown)
    }
  }, [addonPackage, instanceId, manifestDrives])

  useEffect(() => {
    const domElement = containerRef.current
    if (!domElement || !hasButtonClickDriveInList(manifestDrives)) {
      return
    }

    const emitOutputs = (outputs: Record<string, unknown>) => {
      const serialized = JSON.stringify(outputs)
      if (serialized === lastEmittedOutputsRef.current) {
        return
      }
      lastEmittedOutputsRef.current = serialized
      onGraphStateMutationRef.current(instanceId, outputs)
    }

    const onClick = (event: Event) => {
      const target = event.target
      if (!(target instanceof HTMLButtonElement)) {
        return
      }
      const elementId = target.id?.trim()
      if (!elementId || !matchesAnyButtonClickDrive(manifestDrives, elementId)) {
        return
      }
      event.preventDefault()
      lastLocalInputsRef.current = ''
      ReactiveDriveEngine.evaluateButtonClick(
        addonPackage,
        domElement,
        driveContextRef.current,
        emitOutputs,
      )
    }

    domElement.addEventListener('click', onClick)
    return () => {
      domElement.removeEventListener('click', onClick)
    }
  }, [addonPackage, instanceId, manifestDrives])

  const contextMenuItems = useMemo(() => {
    if (!contextMenu) {
      return []
    }
    const menuDef = findAddonContextMenuDef(manifest, contextMenu.menuName)
    if (!menuDef) {
      return []
    }
    return resolveAddonContextMenuItems(menuDef, languagePack)
  }, [contextMenu, languagePack, manifest])

  useEffect(() => {
    const domElement = containerRef.current
    const hasContextMenus = Boolean(manifest.cotexMenu?.length && addonPackage.onContextMenuAction)
    if (!domElement || !hasContextMenus) {
      return
    }

    const onContextMenuEvent = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }
      const region = target.closest('[data-addon-context-menu]')
      if (!region || !domElement.contains(region)) {
        return
      }
      const menuName = region.getAttribute('data-addon-context-menu')?.trim()
      if (!menuName || !findAddonContextMenuDef(manifest, menuName)) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      setContextMenu({
        anchor: { left: event.clientX, top: event.clientY },
        menuName,
      })
    }

    domElement.addEventListener('contextmenu', onContextMenuEvent)
    return () => {
      domElement.removeEventListener('contextmenu', onContextMenuEvent)
    }
  }, [addonPackage.onContextMenuAction, localizedUiHtml, manifest, uiLayoutKey])

  const categoryClass =
    manifest.category.toLowerCase() === 'utility' ? styles.catUtility : ''

  const { cardStyle: appearanceCardStyle, headerStyle: appearanceHeaderStyle } = useMemo(
    () => buildAddonCardAppearanceStyles(manifest.id, manifest),
    [manifest],
  )

  const cardStyle = useMemo(() => {
    const style: Record<string, string | number> = { ...appearanceCardStyle }
    if (cardWidthPx) {
      style['--addon-card-width'] = `${cardWidthPx}px`
      style['--addon-ui-width'] = `${cardWidthPx}px`
    }
    if (cardHeightPx) {
      style['--addon-card-min-height'] = `${cardHeightPx}px`
    }
    return style
  }, [appearanceCardStyle, cardHeightPx, cardWidthPx])

  const resolvedCardWidthPx = measuredCardWidthPx ?? cardWidthPx

  const contextMenuOpen = Boolean(contextMenu && contextMenuItems.length > 0)

  return (
    <article
      ref={cardRef}
      className={[
        styles.card,
        hasCustomSize ? styles.cardCustomSize : '',
        categoryClass,
        selected ? styles.cardSelected : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-addon-card="true"
      data-addon-context-menu-open={contextMenuOpen ? '1' : undefined}
      data-instance-id={instanceId}
      data-addon-card-width={resolvedCardWidthPx ?? undefined}
      style={{
        ...cardStyle,
        ...(contextMenuOpen ? { position: 'relative' as const } : {}),
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (isAddonInteractiveTarget(event.target)) {
          return
        }
        onSelect?.(event)
      }}
    >
      <header
        className={[
          styles.header,
          onStartDrag && !interactionLocked ? styles.headerDraggable : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={appearanceHeaderStyle}
        onPointerDown={(event) => {
          if (contextMenuOpen || interactionLocked || !onStartDrag) {
            return
          }
          onStartDrag(event)
        }}
      >
        {headerIconUrl ? (
          <img className={styles.headerIconImg} src={headerIconUrl} alt="" draggable={false} />
        ) : null}
        <span className={styles.title}>{displayName}</span>
      </header>

      {dockSlots.length > 0 ? (
        <div
          className={styles.slotsDock}
          onPointerDown={(event) => {
            event.stopPropagation()
          }}
        >
          {dockSlots.map((slot, index) => {
            const slotWired = slot.direction === 'input' && wiredInputSlotNames.has(slot.name)
            return (
              <div
                key={`${slot.name}-${index}`}
                className={[
                  styles.slotRow,
                  slot.direction === 'output' ? styles.slotRowOutput : styles.slotRowInput,
                ].join(' ')}
                data-addon-slot-wired={slotWired ? '1' : '0'}
              >
                {renderAddonSlotPin(
                  slot,
                  instanceId,
                  activeAddonSlotId,
                  interactionLocked,
                  wiredInputSlotNames,
                  locale,
                  languagePack,
                  slotHandlers,
                )}
                <span className={styles.slotLabel}>{slot.name}</span>
              </div>
            )
          })}
        </div>
      ) : null}

      <div
        className={styles.body}
        ref={containerRef}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.stopPropagation()
        }}
      />

      {contextMenuOpen ? (
        <div
          aria-hidden="true"
          className={styles.contextMenuBlocker}
          onPointerDown={(event) => event.stopPropagation()}
        />
      ) : null}

      {contextMenuOpen && addonPackage.onContextMenuAction ? (
        <AddonContextMenu
          anchor={contextMenu!.anchor}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
          onSelect={(action) => {
            const domElement = containerRef.current
            const menuName = contextMenu!.menuName
            if (!domElement || !addonPackage.onContextMenuAction) {
              setContextMenu(null)
              return
            }
            void Promise.resolve(
              addonPackage.onContextMenuAction(action, domElement, { menuName }),
            )
              .catch((error) => {
                console.error(`Add-on [${manifest.id}] context menu "${action}":`, error)
              })
              .finally(() => setContextMenu(null))
          }}
        />
      ) : null}

      {inlinePinHosts.map((host) => {
        if (!host.element.isConnected) {
          return null
        }
        const slotDef = manifest.data.find((slot) => slot.name === host.name)
        if (!slotDef) {
          return null
        }
        return createPortal(
          renderAddonSlotPin(
            slotDef,
            instanceId,
            activeAddonSlotId,
            interactionLocked,
            wiredInputSlotNames,
            locale,
            languagePack,
            slotHandlers,
          ),
          host.element,
          `${instanceId}-${host.name}-${uiLayoutKey}`,
        )
      })}
    </article>
  )
}
