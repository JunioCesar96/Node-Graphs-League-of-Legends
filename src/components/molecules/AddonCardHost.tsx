import { useEffect, useMemo, useState } from 'react'
import type { MouseEvent as ReactMouseEvent, PointerEvent, PointerEventHandler } from 'react'

import { AddonCard } from '@/components/molecules/AddonCard'
import { getAddonPackage, preloadAddonPackage } from '@/blockStructures/addonRegistry'
import { useLanguage } from '@/language/LanguageProvider'
import type { AddonSystemFunctionContext } from '@/core/addonSystemFunctions'
import type { CanvasNode, CanvasScene } from '@/core/canvasScene'
import { resolveWiredAddonInputSlotNames } from '@/core/addonSlotConnections'
import { buildAddonWiredInputsFeedKey } from '@/core/addonInputFeed'
import { resolveAddonInputs } from '@/nodeStructures/instanceEvaluator'
import type { AddonPackage } from '@/services/addonLoader.service'

import styles from './AddonCardHost.module.css'

export type AddonCardHostProps = {
  canvasNode: CanvasNode
  scene: CanvasScene
  selected?: boolean
  interactionLocked?: boolean
  wirelessHighlighted?: boolean
  activeAddonSlotId?: string
  onGraphStateMutation: (nodeId: string, outputPayload: Record<string, unknown>) => void
  onInvokeAddonSystemFunction?: (
    functionName: string,
    context: AddonSystemFunctionContext,
  ) => void | Promise<void>
  onAddonOutputPointerDown?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonOutputPointerUp?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonOutputPointerCancel?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonOutputPointerMove?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onAddonInputPointerUp?: (slotId: string, event: PointerEvent<HTMLButtonElement>) => void
  onSelect?: (event?: ReactMouseEvent<HTMLElement>) => void
  onStartDrag?: PointerEventHandler<HTMLElement>
}

export function AddonCardHost({
  canvasNode,
  scene,
  selected = false,
  interactionLocked = false,
  wirelessHighlighted = false,
  activeAddonSlotId,
  onGraphStateMutation,
  onInvokeAddonSystemFunction,
  onAddonOutputPointerDown,
  onAddonOutputPointerUp,
  onAddonOutputPointerCancel,
  onAddonOutputPointerMove,
  onAddonInputPointerUp,
  onSelect,
  onStartDrag,
}: AddonCardHostProps) {
  const { locale } = useLanguage()
  const addonId = canvasNode.addonInstance?.addonId ?? ''
  const [addonPackage, setAddonPackage] = useState<AddonPackage | null>(
    () => getAddonPackage(addonId) ?? null,
  )
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!addonId) {
      setAddonPackage(null)
      setLoadError('Add-on sem identificador.')
      return
    }

    let cancelled = false
    setLoadError(null)

    void preloadAddonPackage(addonId, locale)
      .then((pkg) => {
        if (!cancelled) {
          setAddonPackage(pkg)
          setLoadError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAddonPackage(null)
          setLoadError(err instanceof Error ? err.message : String(err))
        }
      })

    return () => {
      cancelled = true
    }
  }, [addonId, locale])

  const manifest = addonPackage?.manifest
  const resolvedInputs = useMemo(() => {
    if (!manifest) {
      return {}
    }
    const node = scene.nodes.find((entry) => entry.id === canvasNode.id) ?? canvasNode
    return resolveAddonInputs(scene, node, manifest)
  }, [scene.connections, scene.nodes, canvasNode.id, manifest?.id])

  const wiredInputSlotNames = useMemo(() => {
    if (!manifest) {
      return new Set<string>()
    }
    const node = scene.nodes.find((entry) => entry.id === canvasNode.id) ?? canvasNode
    return resolveWiredAddonInputSlotNames(scene, node, manifest)
  }, [scene.connections, canvasNode.id, manifest?.id, scene.nodes])

  const wiredInputsFeedKey = useMemo(() => {
    if (!manifest) {
      return ''
    }
    const node = scene.nodes.find((entry) => entry.id === canvasNode.id) ?? canvasNode
    return buildAddonWiredInputsFeedKey(scene, node, manifest)
  }, [scene.connections, scene.nodes, canvasNode.id, manifest?.id])

  if (loadError) {
    return (
      <div className={styles.placeholder} data-addon-load-error="true">
        <span className={styles.errorTitle}>Erro ao carregar add-on</span>
        <span className={styles.errorDetail}>{loadError}</span>
      </div>
    )
  }

  if (!addonPackage) {
    return (
      <div className={styles.placeholder} aria-busy="true">
        A carregar add-on…
      </div>
    )
  }

  return (
    <AddonCard
      instanceId={canvasNode.id}
      addonPackage={addonPackage}
      resolvedInputs={resolvedInputs}
      wiredInputSlotNames={wiredInputSlotNames}
      wiredInputsFeedKey={wiredInputsFeedKey}
      selected={selected}
      interactionLocked={interactionLocked}
      wirelessHighlighted={wirelessHighlighted}
      activeAddonSlotId={activeAddonSlotId}
      onGraphStateMutation={onGraphStateMutation}
      onInvokeAddonSystemFunction={onInvokeAddonSystemFunction}
      onAddonOutputPointerDown={onAddonOutputPointerDown}
      onAddonOutputPointerUp={onAddonOutputPointerUp}
      onAddonOutputPointerCancel={onAddonOutputPointerCancel}
      onAddonOutputPointerMove={onAddonOutputPointerMove}
      onAddonInputPointerUp={onAddonInputPointerUp}
      onSelect={onSelect}
      onStartDrag={onStartDrag}
    />
  )
}
