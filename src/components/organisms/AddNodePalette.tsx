import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, PointerEvent } from 'react'

import { ExpandActionCapsule, type ExpandActionCapsuleKind } from '@/components/molecules/ExpandActionCapsule'
import { PaletteAddAddonOption } from '@/components/molecules/PaletteAddAddonOption'
import { PaletteAddonInstallZone } from '@/components/molecules/PaletteAddonInstallZone'
import { PaletteAddBlockOption } from '@/components/molecules/PaletteAddBlockOption'
import { PaletteAddNodeOption } from '@/components/molecules/PaletteAddNodeOption'
import { PaletteSlashCommandOption } from '@/components/molecules/PaletteSlashCommandOption'
import {
  fetchAddonsFromDisk,
  listAddonManifests,
  matchesAddonQuery,
} from '@/blockStructures/addonRegistry'
import {
  blockDefinitionsList,
  matchesBlockDefinitionQuery,
} from '@/core/blockDefinitionRegistry'
import {
  blockDefinitionMatchesExactOutputType,
  sortBlockDefinitionsForLinkDrop,
  type BlockDropLinkPaletteContext,
} from '@/core/blockDefinitionLinkPalette'
import { fetchBlockDefinitionsFromDisk } from '@/core/blockDefinitionDiskLoader'
import {
  matchesSlashCommandQuery,
  slashCommandsList,
} from '@/core/slashCommandRegistry'
import { fetchSlashCommandsFromDisk } from '@/core/slashCommandStorage'
import type { SlashCommandDocument } from '@/core/slashCommandTypes'
import type { BlockDefinitionJsonDocument } from '@/core/blockDefinitionJson'
import {
  fetchNodeStructurePackFoldersFromDisk,
  schemaBelongsToPalettePack,
} from '@/core/nodeStructurePackFolders'
import {
  listPalettePackFolders,
  matchesSchemaQuery,
  type PaletteOrganizationMode,
  sortSchemasByOrganization,
} from '@/core/paletteSchemaUtils'
import { LangId } from '@/core/language/languageIds'
import type { NodeSchemaDefinition } from '@/core/nodeSchema'
import { useLanguage } from '@/language/LanguageProvider'
import {
  SHORTCUT_SCOPE_ATTR,
  SHORTCUT_SCOPE_NODE_PALETTE,
} from '@/core/shortcuts/shortcutScopes'
import { useAddNodePaletteShortcutHandlers } from '@/shortcuts/useAddNodePaletteShortcutHandlers'

import styles from './AddNodePalette.module.css'

const SCROLL_CONTROL_DEAD_ZONE = 8
const MAX_SCROLL_SPEED = 28
const EXPAND_CAPSULE_LIFETIME_SECONDS = 5

type PaletteScrollDirection = 'down' | 'idle' | 'up'
export type PaletteCatalogMode = 'nodes' | 'blocks' | 'addons'

/** Teste: m/n controlam expandir/retrair (m = expandir, n = retrair), com hover na linha ou atalho global quando o foco não está no campo de pesquisa. */
type PaletteExpandOverride = 'compact' | 'default' | 'expanded'

function packFolderTagLabel(folderName: string) {
  return `📂 [${folderName}]`
}

function structureSubfolderTagLabel(subPath: string) {
  return subPath === '' ? '🗂️ Raiz' : `🗂️ ${subPath}`
}

function readAnchorTopGap(): number {
  return (
    Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--node-palette-anchor-top-gap'),
    ) || 10
  )
}

function clampPaletteViewportPosition(
  left: number,
  top: number,
  width: number,
  height: number,
  margin = 8,
): { left: number; top: number } {
  let x = left
  let y = top

  if (x < margin) {
    x = margin
  }
  if (y < margin) {
    y = margin
  }
  if (x + width > window.innerWidth - margin) {
    x = Math.max(margin, window.innerWidth - width - margin)
  }
  if (y + height > window.innerHeight - margin) {
    y = Math.max(margin, window.innerHeight - height - margin)
  }

  return { left: x, top: y }
}

type AddNodePaletteProps = {
  /** Quando false, esconde o catálogo Blocks (ex.: paleta de ligação). */
  blocksCatalogEnabled?: boolean
  heading?: string
  onClose: () => void
  onPickAddon?: (addonId: string) => void
  onPickBlock?: (definition: BlockDefinitionJsonDocument) => void
  onPickSlashCommand?: (command: string) => void
  onPickSchema: (schema: NodeSchemaDefinition) => void
  onRefreshSlashCommands?: () => void
  addonsCatalogEnabled?: boolean
  onSyncBlockParameterCatalog?: (
    definitions: readonly BlockDefinitionJsonDocument[],
  ) => Promise<{ ok: boolean; error?: string }>
  blockDefinitionFilter?: (definition: BlockDefinitionJsonDocument) => boolean
  /** Ordena e realça o primeiro item quando a paleta abre por ligação de slot de bloco. */
  blockDropLinkContext?: BlockDropLinkPaletteContext
  initialCatalogMode?: PaletteCatalogMode
  /** Por schema id: nome da pasta imediata sob `src/nodeStructures/`. Ativa filtros 📂 [...]. */
  packFolderBySchemaId?: Record<string, string>
  /** Caminho relativo do JSON no pack (`default/neeko.json`). Fallback do filtro por pasta. */
  jsonRelativePathBySchemaId?: Record<string, string>
  /** Por schema id: primeira subpasta sob o pack (`''` = raiz). `temp` não gera etiqueta. */
  structureSubfolderBySchemaId?: Record<string, string>
  /** Packs convertidos só em memória/localStorage (não existem como pasta no disco). */
  memoryPackFolders?: readonly string[]
  schemas: NodeSchemaDefinition[]
  /** Abre o painel junto ao botão da toolbar (coordenadas de viewport). */
  screenAnchor?: { left: number; top: number } | null
}

export function AddNodePalette({
  addonsCatalogEnabled = true,
  blocksCatalogEnabled = true,
  blockDefinitionFilter,
  blockDropLinkContext,
  heading,
  initialCatalogMode = 'nodes',
  onClose,
  onPickAddon,
  onPickBlock,
  onPickSlashCommand,
  onPickSchema,
  onRefreshSlashCommands,
  onSyncBlockParameterCatalog,
  packFolderBySchemaId,
  jsonRelativePathBySchemaId,
  structureSubfolderBySchemaId,
  memoryPackFolders = [],
  schemas,
  screenAnchor = null,
}: AddNodePaletteProps) {
  const { t } = useLanguage()
  const [paletteCatalogMode, setPaletteCatalogMode] = useState<PaletteCatalogMode>(initialCatalogMode)
  const [palettePackFolder, setPalettePackFolder] = useState<string | null>(null)
  const [paletteStructureSubfolder, setPaletteStructureSubfolder] = useState<string | null>(null)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteOrganization, setPaletteOrganization] = useState<PaletteOrganizationMode>('az')
  const [highlightedSchemaIndex, setHighlightedSchemaIndex] = useState(0)
  const [paletteHoveredOptionIndex, setPaletteHoveredOptionIndex] = useState<number | null>(null)
  const [paletteExpandOverride, setPaletteExpandOverride] = useState<PaletteExpandOverride>('default')
  const [paletteScrollDirection, setPaletteScrollDirection] = useState<PaletteScrollDirection>('idle')
  const [paletteScrollIntensity, setPaletteScrollIntensity] = useState(0)
  const [isPaletteScrollActive, setIsPaletteScrollActive] = useState(false)
  const [diskPackFolders, setDiskPackFolders] = useState<string[]>([])
  const [diskPackFoldersLoading, setDiskPackFoldersLoading] = useState(true)
  const [diskPackFoldersError, setDiskPackFoldersError] = useState<string | null>(null)
  const [diskBlockDefinitions, setDiskBlockDefinitions] = useState<BlockDefinitionJsonDocument[]>(() =>
    blockDefinitionsList(),
  )
  const [diskBlockDefinitionsLoading, setDiskBlockDefinitionsLoading] = useState(false)
  const [diskBlockDefinitionsError, setDiskBlockDefinitionsError] = useState<string | null>(null)
  const [diskSlashCommands, setDiskSlashCommands] = useState<SlashCommandDocument[]>(() =>
    slashCommandsList('blocks'),
  )
  const [diskSlashCommandsLoading, setDiskSlashCommandsLoading] = useState(false)
  const [diskAddonManifests, setDiskAddonManifests] = useState(() => [...listAddonManifests()])
  const [diskAddonsLoading, setDiskAddonsLoading] = useState(false)
  const [diskAddonsError, setDiskAddonsError] = useState<string | null>(null)

  const [structureSubfolderMenuOpen, setStructureSubfolderMenuOpen] = useState(false)
  const [structureSubfolderMenuQuery, setStructureSubfolderMenuQuery] = useState('')
  const [subfolderScrollDirection, setSubfolderScrollDirection] = useState<PaletteScrollDirection>('idle')
  const [subfolderScrollIntensity, setSubfolderScrollIntensity] = useState(0)
  const [isSubfolderScrollActive, setIsSubfolderScrollActive] = useState(false)

  const paletteRootRef = useRef<HTMLDivElement | null>(null)
  const paletteInputRef = useRef<HTMLInputElement | null>(null)
  const structureSubfolderMenuRef = useRef<HTMLDivElement | null>(null)
  const structureSubfolderInputRef = useRef<HTMLInputElement | null>(null)
  const structureSubfolderListRef = useRef<HTMLDivElement | null>(null)
  const paletteResultsRef = useRef<HTMLDivElement | null>(null)
  const paletteHoveredOptionIndexRef = useRef<number | null>(null)
  const paletteScrollFrameRef = useRef<number | null>(null)
  const paletteScrollVelocityRef = useRef(0)
  const subfolderScrollFrameRef = useRef<number | null>(null)
  const subfolderScrollVelocityRef = useRef(0)

  const [expandCapsule, setExpandCapsule] = useState<{
    id: string
    kind: ExpandActionCapsuleKind
    stamp: number
  } | null>(null)
  const [palettePosition, setPalettePosition] = useState<{ left: number; top: number } | null>(null)
  const [isHeaderDragging, setIsHeaderDragging] = useState(false)
  const paletteDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    originLeft: number
    originTop: number
  } | null>(null)

  useEffect(() => {
    setPalettePosition(null)
  }, [screenAnchor])

  useEffect(() => {
    let cancelled = false
    setDiskPackFoldersLoading(true)
    setDiskPackFoldersError(null)

    void fetchNodeStructurePackFoldersFromDisk().then((result) => {
      if (cancelled) {
        return
      }

      setDiskPackFoldersLoading(false)

      if (result.ok) {
        setDiskPackFolders(result.folders)
        return
      }

      setDiskPackFolders([])
      setDiskPackFoldersError(result.error)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const refreshAddonsCatalog = useCallback(() => {
    setDiskAddonsLoading(true)
    setDiskAddonsError(null)

    void fetchAddonsFromDisk().then((result) => {
      setDiskAddonsLoading(false)
      if (result.ok) {
        setDiskAddonManifests([...result.manifests])
        return
      }
      setDiskAddonsError(result.error)
    })
  }, [])

  const refreshBlocksCatalog = useCallback(() => {
    setDiskBlockDefinitionsLoading(true)
    setDiskBlockDefinitionsError(null)

    void fetchBlockDefinitionsFromDisk().then((result) => {
      setDiskBlockDefinitionsLoading(false)

      if (result.ok) {
        setDiskBlockDefinitions(result.definitions)
        if (onSyncBlockParameterCatalog) {
          void onSyncBlockParameterCatalog(result.definitions).then((syncResult) => {
            if (!syncResult.ok && syncResult.error) {
              console.warn('[AddNodePalette] Sincronização de parâmetros de bloco:', syncResult.error)
            }
          })
        }
        return
      }

      setDiskBlockDefinitionsError(result.error)
    })
  }, [onSyncBlockParameterCatalog])

  const refreshSlashCommandsCatalog = useCallback(() => {
    setDiskSlashCommandsLoading(true)
    onRefreshSlashCommands?.()

    void fetchSlashCommandsFromDisk('blocks').then((result) => {
      setDiskSlashCommandsLoading(false)
      if (result.ok) {
        setDiskSlashCommands(result.commands)
        return
      }
      setDiskSlashCommands(slashCommandsList('blocks'))
    })
  }, [onRefreshSlashCommands])

  const palettePackFolders = useMemo(
    () =>
      listPalettePackFolders(diskPackFolders, {
        memoryPackFolders,
        packFolderBySchemaId,
        schemas,
      }),
    [diskPackFolders, memoryPackFolders, packFolderBySchemaId, schemas],
  )

  const packFilterOptions = useMemo(
    () => ({
      packFolderBySchemaId,
      jsonRelativePathBySchemaId,
      diskPackFolders,
      memoryPackFolders,
    }),
    [diskPackFolders, jsonRelativePathBySchemaId, memoryPackFolders, packFolderBySchemaId],
  )

  const schemaMatchesPackFilter = useCallback(
    (schemaId: string) => schemaBelongsToPalettePack(schemaId, palettePackFolder, packFilterOptions),
    [packFilterOptions, palettePackFolder],
  )

  useEffect(() => {
    if (
      palettePackFolder !== null &&
      palettePackFolders.length > 0 &&
      !palettePackFolders.includes(palettePackFolder)
    ) {
      setPalettePackFolder(null)
      setHighlightedSchemaIndex(0)
      setPaletteHoveredOptionIndex(null)
    }
  }, [palettePackFolder, palettePackFolders])

  const schemasInSelectedPack = useMemo(
    () => schemas.filter((s) => schemaMatchesPackFilter(s.id)),
    [schemaMatchesPackFilter, schemas],
  )

  const paletteStructureSubfolderTags = useMemo(() => {
    if (!structureSubfolderBySchemaId) {
      return []
    }
    const next = new Set<string>()
    for (const s of schemasInSelectedPack) {
      const sub = structureSubfolderBySchemaId[s.id] ?? ''
      if (sub === 'temp') {
        continue
      }
      next.add(sub)
    }
    return Array.from(next).sort((a, b) => {
      if (a === '') {
        return -1
      }
      if (b === '') {
        return 1
      }
      return a.localeCompare(b)
    })
  }, [schemasInSelectedPack, structureSubfolderBySchemaId])

  const showStructureSubfolderTagsRow =
    Boolean(structureSubfolderBySchemaId) &&
    (paletteStructureSubfolderTags.length > 1 ||
      (paletteStructureSubfolderTags.length === 1 && paletteStructureSubfolderTags[0] !== ''))

  useEffect(() => {
    setPaletteStructureSubfolder(null)
    setStructureSubfolderMenuOpen(false)
    setStructureSubfolderMenuQuery('')
  }, [palettePackFolder])

  useEffect(() => {
    if (!showStructureSubfolderTagsRow) {
      setPaletteStructureSubfolder(null)
      setStructureSubfolderMenuOpen(false)
      setStructureSubfolderMenuQuery('')
    }
  }, [showStructureSubfolderTagsRow])

  useEffect(() => {
    if (!structureSubfolderMenuOpen) {
      return
    }

    const onPointerDownCapture = (event: PointerEvent) => {
      const el = structureSubfolderMenuRef.current
      const target = event.target
      if (el && target instanceof Node && !el.contains(target)) {
        setStructureSubfolderMenuOpen(false)
        setStructureSubfolderMenuQuery('')
      }
    }

    document.addEventListener('pointerdown', onPointerDownCapture, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDownCapture, true)
    }
  }, [structureSubfolderMenuOpen])

  useEffect(() => {
    if (!structureSubfolderMenuOpen) {
      if (subfolderScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(subfolderScrollFrameRef.current)
        subfolderScrollFrameRef.current = null
      }
      subfolderScrollVelocityRef.current = 0
      return
    }

    structureSubfolderInputRef.current?.focus()

    const scrollSubfolderList = () => {
      if (structureSubfolderListRef.current && subfolderScrollVelocityRef.current !== 0) {
        structureSubfolderListRef.current.scrollTop += subfolderScrollVelocityRef.current
      }
      subfolderScrollFrameRef.current = window.requestAnimationFrame(scrollSubfolderList)
    }

    subfolderScrollFrameRef.current = window.requestAnimationFrame(scrollSubfolderList)

    return () => {
      if (subfolderScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(subfolderScrollFrameRef.current)
      }
      subfolderScrollFrameRef.current = null
      subfolderScrollVelocityRef.current = 0
    }
  }, [structureSubfolderMenuOpen])

  const menuFilteredSubfolderTags = useMemo(() => {
    const q = structureSubfolderMenuQuery.trim().toLowerCase()
    if (!q) {
      return paletteStructureSubfolderTags
    }
    return paletteStructureSubfolderTags.filter((sub) => {
      const label = structureSubfolderTagLabel(sub).toLowerCase()
      return label.includes(q) || sub.toLowerCase().includes(q)
    })
  }, [paletteStructureSubfolderTags, structureSubfolderMenuQuery])

  const filteredSchemas = sortSchemasByOrganization(
    schemas
      .filter((schema) => schemaMatchesPackFilter(schema.id))
      .filter((schema) => {
        if (!structureSubfolderBySchemaId || paletteStructureSubfolder === null) {
          return true
        }
        const sub = structureSubfolderBySchemaId[schema.id] ?? ''
        return sub === paletteStructureSubfolder
      })
      .filter((schema) => matchesSchemaQuery(schema, paletteQuery)),
    paletteOrganization,
  )

  const blockDefinitions = diskBlockDefinitions
  const filteredAddons = useMemo(() => {
    const q = paletteQuery.trim()
    return diskAddonManifests.filter((manifest) => matchesAddonQuery(manifest, q))
  }, [diskAddonManifests, paletteQuery])

  const filteredBlocks = useMemo(() => {
    const matched = blockDefinitions
      .filter((definition) => (blockDefinitionFilter ? blockDefinitionFilter(definition) : true))
      .filter((definition) => matchesBlockDefinitionQuery(definition, paletteQuery))

    if (!blockDropLinkContext) {
      return matched
    }

    return sortBlockDefinitionsForLinkDrop(matched, blockDropLinkContext)
  }, [blockDefinitionFilter, blockDefinitions, blockDropLinkContext, paletteQuery])

  const isSlashCommandsMode =
    blocksCatalogEnabled &&
    paletteCatalogMode === 'blocks' &&
    paletteQuery.trim().startsWith('/') &&
    !blockDropLinkContext

  const slashCommandQuery = useMemo(() => {
    const trimmed = paletteQuery.trim()
    return trimmed.startsWith('/') ? trimmed.slice(1) : trimmed
  }, [paletteQuery])

  const filteredSlashCommands = useMemo(() => {
    return diskSlashCommands.filter((entry) => matchesSlashCommandQuery(entry, slashCommandQuery))
  }, [diskSlashCommands, slashCommandQuery])

  const isAddonsMode = addonsCatalogEnabled && paletteCatalogMode === 'addons'
  const isBlocksMode = blocksCatalogEnabled && paletteCatalogMode === 'blocks'
  const paletteResultCount = isAddonsMode
    ? filteredAddons.length
    : isBlocksMode
      ? isSlashCommandsMode
        ? filteredSlashCommands.length
        : filteredBlocks.length
      : filteredSchemas.length

  useEffect(() => {
    if (!blocksCatalogEnabled && paletteCatalogMode === 'blocks') {
      setPaletteCatalogMode('nodes')
      setHighlightedSchemaIndex(0)
      setPaletteHoveredOptionIndex(null)
    }
  }, [blocksCatalogEnabled, paletteCatalogMode])

  useEffect(() => {
    setPaletteCatalogMode(initialCatalogMode)
    setHighlightedSchemaIndex(0)
    setPaletteHoveredOptionIndex(null)
    setPaletteExpandOverride('default')
  }, [initialCatalogMode])

  useEffect(() => {
    if (!blockDropLinkContext) {
      return
    }
    setHighlightedSchemaIndex(0)
    setPaletteHoveredOptionIndex(null)
    setPaletteExpandOverride('default')
  }, [blockDropLinkContext, filteredBlocks.length, paletteQuery])

  const activeSchemaIndex = Math.max(0, Math.min(highlightedSchemaIndex, Math.max(paletteResultCount - 1, 0)))
  const isPaletteFloating = palettePosition !== null || screenAnchor !== null

  const applyPalettePosition = useCallback(() => {
    const root = paletteRootRef.current
    if (!root || !isPaletteFloating) {
      return
    }

    const width = root.offsetWidth
    const height = root.offsetHeight

    if (palettePosition) {
      const clamped = clampPaletteViewportPosition(
        palettePosition.left,
        palettePosition.top,
        width,
        height,
      )
      root.style.left = `${clamped.left}px`
      root.style.top = `${clamped.top}px`
      return
    }

    if (!screenAnchor) {
      return
    }

    const gap = readAnchorTopGap()
    const clamped = clampPaletteViewportPosition(
      screenAnchor.left,
      screenAnchor.top + gap,
      width,
      height,
    )
    root.style.left = `${clamped.left}px`
    root.style.top = `${clamped.top}px`
  }, [isPaletteFloating, palettePosition, screenAnchor])

  useLayoutEffect(() => {
    applyPalettePosition()
  }, [applyPalettePosition, filteredSchemas.length, filteredBlocks.length, isBlocksMode, paletteQuery, paletteOrganization])

  useEffect(() => {
    if (!isPaletteFloating) {
      return
    }

    const handleResize = () => applyPalettePosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [applyPalettePosition, isPaletteFloating])

  const endHeaderDrag = useCallback(() => {
    paletteDragRef.current = null
    setIsHeaderDragging(false)
  }, [])

  const beginHeaderDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return
      }

      const root = paletteRootRef.current
      if (!root) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const rect = root.getBoundingClientRect()
      const originLeft = palettePosition?.left ?? rect.left
      const originTop = palettePosition?.top ?? rect.top

      if (!palettePosition) {
        setPalettePosition({ left: originLeft, top: originTop })
      }

      paletteDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originLeft,
        originTop,
      }
      setIsHeaderDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [palettePosition],
  )

  const handleHeaderDragMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = paletteDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) {
        return
      }

      const root = paletteRootRef.current
      if (!root) {
        return
      }

      event.preventDefault()
      const width = root.offsetWidth
      const height = root.offsetHeight
      const next = clampPaletteViewportPosition(
        drag.originLeft + (event.clientX - drag.startX),
        drag.originTop + (event.clientY - drag.startY),
        width,
        height,
      )
      setPalettePosition(next)
    },
    [],
  )

  const handleHeaderDragEnd = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const drag = paletteDragRef.current
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
    return () => {
      paletteDragRef.current = null
    }
  }, [])

  const filteredSchemasRef = useRef(filteredSchemas)
  const activeSchemaIndexRef = useRef(activeSchemaIndex)

  useEffect(() => {
    filteredSchemasRef.current = filteredSchemas
  }, [filteredSchemas])

  useEffect(() => {
    activeSchemaIndexRef.current = activeSchemaIndex
  }, [activeSchemaIndex])

  useEffect(() => {
    paletteHoveredOptionIndexRef.current = paletteHoveredOptionIndex
  }, [paletteHoveredOptionIndex])

  useAddNodePaletteShortcutHandlers({
    paletteInputRef,
    filteredSchemasRef,
    activeSchemaIndexRef,
    paletteHoveredOptionIndexRef,
    setPaletteExpandOverride,
    setExpandCapsule,
  })

  const dismissExpandCapsule = useCallback(() => {
    setExpandCapsule(null)
  }, [])

  useEffect(() => {
    paletteInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const scrollPaletteResults = () => {
      if (paletteResultsRef.current && paletteScrollVelocityRef.current !== 0) {
        paletteResultsRef.current.scrollTop += paletteScrollVelocityRef.current
      }

      paletteScrollFrameRef.current = window.requestAnimationFrame(scrollPaletteResults)
    }

    paletteScrollFrameRef.current = window.requestAnimationFrame(scrollPaletteResults)

    return () => {
      if (paletteScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(paletteScrollFrameRef.current)
      }

      paletteScrollFrameRef.current = null
      paletteScrollVelocityRef.current = 0
    }
  }, [])

  const handlePaletteKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    const activeListLength = isAddonsMode
      ? filteredAddons.length
      : isBlocksMode
        ? isSlashCommandsMode
          ? filteredSlashCommands.length
          : filteredBlocks.length
        : filteredSchemas.length

    if (event.key === 'Escape') {
      if (structureSubfolderMenuOpen) {
        event.preventDefault()
        setStructureSubfolderMenuOpen(false)
        setStructureSubfolderMenuQuery('')
        return
      }
      event.preventDefault()
      onClose()
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setPaletteHoveredOptionIndex(null)
      setPaletteExpandOverride('default')
      setHighlightedSchemaIndex((currentIndex) =>
        activeListLength === 0 ? 0 : (currentIndex + 1) % activeListLength,
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setPaletteHoveredOptionIndex(null)
      setPaletteExpandOverride('default')
      setHighlightedSchemaIndex((currentIndex) =>
        activeListLength === 0 ? 0 : (currentIndex - 1 + activeListLength) % activeListLength,
      )
      return
    }

    if (event.key === 'Enter') {
      if (isAddonsMode) {
        const activeAddon = filteredAddons[activeSchemaIndex]
        if (activeAddon && onPickAddon) {
          event.preventDefault()
          onPickAddon(activeAddon.id)
        }
        return
      }

      if (isBlocksMode) {
        if (isSlashCommandsMode) {
          const activeCommand = filteredSlashCommands[activeSchemaIndex]
          if (activeCommand && onPickSlashCommand) {
            event.preventDefault()
            onPickSlashCommand(activeCommand.command)
          }
          return
        }

        const activeBlock = filteredBlocks[activeSchemaIndex]
        if (activeBlock && onPickBlock) {
          event.preventDefault()
          onPickBlock(activeBlock)
        }
        return
      }

      const activeSchema = filteredSchemas[activeSchemaIndex]

      if (activeSchema) {
        event.preventDefault()
        onPickSchema(activeSchema)
      }
    }
  }

  const updatePaletteScrollIntent = (event: PointerEvent<HTMLButtonElement>) => {
    const controlBounds = event.currentTarget.getBoundingClientRect()
    const centerY = controlBounds.top + controlBounds.height / 2
    const distanceFromCenter = event.clientY - centerY
    const absoluteDistance = Math.abs(distanceFromCenter)

    if (absoluteDistance < SCROLL_CONTROL_DEAD_ZONE) {
      paletteScrollVelocityRef.current = 0
      setPaletteScrollDirection('idle')
      setPaletteScrollIntensity(0)
      return
    }

    const direction = distanceFromCenter > 0 ? 'down' : 'up'
    const intensity = Math.min(1, (absoluteDistance - SCROLL_CONTROL_DEAD_ZONE) / 90)

    paletteScrollVelocityRef.current = (direction === 'down' ? 1 : -1) * Math.max(2, intensity * MAX_SCROLL_SPEED)
    setPaletteScrollDirection(direction)
    setPaletteScrollIntensity(intensity)
  }

  const startPaletteScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

    setIsPaletteScrollActive(true)
    updatePaletteScrollIntent(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const movePaletteScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isPaletteScrollActive) {
      return
    }

    updatePaletteScrollIntent(event)
    event.stopPropagation()
  }

  const stopPaletteScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    paletteScrollVelocityRef.current = 0
    setIsPaletteScrollActive(false)
    setPaletteScrollDirection('idle')
    setPaletteScrollIntensity(0)
    event.stopPropagation()
  }

  const updateSubfolderScrollIntent = (event: PointerEvent<HTMLButtonElement>) => {
    const controlBounds = event.currentTarget.getBoundingClientRect()
    const centerY = controlBounds.top + controlBounds.height / 2
    const distanceFromCenter = event.clientY - centerY
    const absoluteDistance = Math.abs(distanceFromCenter)

    if (absoluteDistance < SCROLL_CONTROL_DEAD_ZONE) {
      subfolderScrollVelocityRef.current = 0
      setSubfolderScrollDirection('idle')
      setSubfolderScrollIntensity(0)
      return
    }

    const direction = distanceFromCenter > 0 ? 'down' : 'up'
    const intensity = Math.min(1, (absoluteDistance - SCROLL_CONTROL_DEAD_ZONE) / 90)

    subfolderScrollVelocityRef.current = (direction === 'down' ? 1 : -1) * Math.max(2, intensity * MAX_SCROLL_SPEED)
    setSubfolderScrollDirection(direction)
    setSubfolderScrollIntensity(intensity)
  }

  const startSubfolderScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return
    }

    setIsSubfolderScrollActive(true)
    updateSubfolderScrollIntent(event)
    event.currentTarget.setPointerCapture(event.pointerId)
    event.stopPropagation()
  }

  const moveSubfolderScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (!isSubfolderScrollActive) {
      return
    }

    updateSubfolderScrollIntent(event)
    event.stopPropagation()
  }

  const stopSubfolderScroll = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    subfolderScrollVelocityRef.current = 0
    setIsSubfolderScrollActive(false)
    setSubfolderScrollDirection('idle')
    setSubfolderScrollIntensity(0)
    event.stopPropagation()
  }

  const handlePaletteResultsPointerLeave = (event: PointerEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && paletteResultsRef.current?.contains(nextTarget)) {
      return
    }

    setPaletteHoveredOptionIndex(null)
    setPaletteExpandOverride('default')
  }

  const paletteOptionExpanded = (index: number) => {
    const targetIndex =
      paletteHoveredOptionIndex !== null ? paletteHoveredOptionIndex : activeSchemaIndex

    if (paletteExpandOverride !== 'default') {
      if (index === targetIndex) {
        return paletteExpandOverride === 'expanded'
      }
    } else {
      return paletteHoveredOptionIndex !== null
        ? index === paletteHoveredOptionIndex
        : index === activeSchemaIndex
    }

    return false
  }

  const paletteBlockOptionExpanded = (
    index: number,
    definition: BlockDefinitionJsonDocument,
  ): boolean => {
    if (blockDropLinkContext) {
      return blockDefinitionMatchesExactOutputType(definition, blockDropLinkContext)
    }

    return paletteOptionExpanded(index)
  }

  return (
    <div
      className={[styles.overlay, isPaletteFloating ? styles.overlayAnchored : ''].filter(Boolean).join(' ')}
      onPointerDown={onClose}
      role="presentation"
    >
      {expandCapsule ? (
        <ExpandActionCapsule
          key={expandCapsule.stamp}
          kind={expandCapsule.kind}
          lifetimeSeconds={EXPAND_CAPSULE_LIFETIME_SECONDS}
          onDismiss={dismissExpandCapsule}
          schemaId={expandCapsule.id}
        />
      ) : null}
      <div
        className={[styles.root, isPaletteFloating ? styles.rootAnchored : ''].filter(Boolean).join(' ')}
        onPointerDown={(event) => event.stopPropagation()}
        ref={paletteRootRef}
        {...{ [SHORTCUT_SCOPE_ATTR]: SHORTCUT_SCOPE_NODE_PALETTE }}
      >
        <section aria-label="Add node search palette" className={styles.panel}>
          <div
            className={styles.header}
            data-dragging={isHeaderDragging ? 'true' : undefined}
            onPointerDown={beginHeaderDrag}
            onPointerMove={handleHeaderDragMove}
            onPointerUp={handleHeaderDragEnd}
            onPointerCancel={handleHeaderDragEnd}
            role="toolbar"
            aria-label={t(LangId.NodePaletteHeading)}
          >
            <span>{heading ?? t(LangId.NodePaletteHeading)}</span>
            <kbd>Ctrl K</kbd>
          </div>
          {blocksCatalogEnabled || addonsCatalogEnabled ? (
            <div
              aria-label={t(LangId.NodePaletteCatalogNodes)}
              className={styles.catalogToggle}
              role="group"
            >
              <button
                aria-pressed={paletteCatalogMode === 'nodes'}
                type="button"
                onClick={() => {
                  setPaletteCatalogMode('nodes')
                  setHighlightedSchemaIndex(0)
                  setPaletteHoveredOptionIndex(null)
                  setPaletteExpandOverride('default')
                }}
              >
                {t(LangId.NodePaletteCatalogNodes)}
              </button>
              {blocksCatalogEnabled ? (
                <button
                  aria-pressed={paletteCatalogMode === 'blocks'}
                  type="button"
                  onClick={() => {
                    setPaletteCatalogMode('blocks')
                    setHighlightedSchemaIndex(0)
                    setPaletteHoveredOptionIndex(null)
                    setPaletteExpandOverride('default')
                    refreshBlocksCatalog()
                    refreshSlashCommandsCatalog()
                  }}
                >
                  {t(LangId.NodePaletteCatalogBlocks)}
                </button>
              ) : null}
              {addonsCatalogEnabled ? (
                <button
                  aria-pressed={paletteCatalogMode === 'addons'}
                  type="button"
                  onClick={() => {
                    setPaletteCatalogMode('addons')
                    setHighlightedSchemaIndex(0)
                    setPaletteHoveredOptionIndex(null)
                    setPaletteExpandOverride('default')
                    refreshAddonsCatalog()
                  }}
                >
                  {t(LangId.NodePaletteCatalogAddons)}
                </button>
              ) : null}
            </div>
          ) : null}
          <input
            aria-activedescendant={
              isAddonsMode
                ? filteredAddons[activeSchemaIndex]?.id
                : isBlocksMode
                  ? isSlashCommandsMode
                    ? filteredSlashCommands[activeSchemaIndex]?.command
                    : filteredBlocks[activeSchemaIndex]?.id
                  : filteredSchemas[activeSchemaIndex]?.id
            }
            aria-controls="node-schema-results"
            aria-label={t(LangId.NodePaletteSearchAria)}
            autoComplete="off"
            className={styles.input}
            onChange={(event) => {
              setPaletteQuery(event.target.value)
              setHighlightedSchemaIndex(0)
              setPaletteHoveredOptionIndex(null)
              setPaletteExpandOverride('default')
            }}
            onKeyDown={handlePaletteKeyDown}
            placeholder={
              isAddonsMode
                ? t(LangId.NodePaletteSearchAddonsPlaceholder)
                : isBlocksMode
                  ? t(LangId.NodePaletteSearchBlocksPlaceholder)
                  : t(LangId.NodePaletteSearchPlaceholder)
            }
            ref={paletteInputRef}
            role="combobox"
            type="search"
            value={paletteQuery}
          />
          {isBlocksMode && diskBlockDefinitionsLoading ? (
            <p className={styles.packFoldersStatus}>A ler blocos em blockStructures/blocks…</p>
          ) : null}
          {isBlocksMode && !diskBlockDefinitionsLoading && diskBlockDefinitionsError ? (
            <p className={styles.packFoldersStatus} role="status">
              Blocos pelo registo estático ({diskBlockDefinitionsError})
            </p>
          ) : null}
          {!isBlocksMode && !isAddonsMode ? (
          <div className={styles.filterRows}>
            <div className={styles.tags} aria-label="Organization modes">
              <button
                aria-pressed={paletteOrganization === 'az'}
                type="button"
                onClick={() => {
                  setPaletteOrganization('az')
                  setPaletteHoveredOptionIndex(null)
                  setPaletteExpandOverride('default')
                }}
              >
                {t(LangId.NodePaletteOrgAz)}
              </button>
              <button
                aria-pressed={paletteOrganization === 'structure'}
                type="button"
                onClick={() => {
                  setPaletteOrganization('structure')
                  setPaletteHoveredOptionIndex(null)
                  setPaletteExpandOverride('default')
                }}
              >
                {t(LangId.NodePaletteOrgStructure)}
              </button>
              <button
                aria-pressed={paletteOrganization === 'value-type'}
                type="button"
                onClick={() => {
                  setPaletteOrganization('value-type')
                  setPaletteHoveredOptionIndex(null)
                  setPaletteExpandOverride('default')
                }}
              >
                {t(LangId.NodePaletteOrgValueType)}
              </button>
            </div>
            {diskPackFoldersLoading ? (
              <p className={styles.packFoldersStatus}>A ler pastas em nodeStructures…</p>
            ) : null}
            {!diskPackFoldersLoading && diskPackFoldersError ? (
              <p className={styles.packFoldersStatus} role="status">
                Pastas pelo registo ({diskPackFoldersError})
              </p>
            ) : null}
            {palettePackFolders.length > 0 ? (
              <div className={styles.tags} aria-label="Filtrar por pasta de estruturas">
                <button
                  aria-pressed={palettePackFolder === null}
                  type="button"
                  onClick={() => {
                    setPalettePackFolder(null)
                    setHighlightedSchemaIndex(0)
                    setPaletteHoveredOptionIndex(null)
                    setPaletteExpandOverride('default')
                  }}
                >
                  {t(LangId.NodePalettePackAll)}
                </button>
                {palettePackFolders.map((folder) => (
                  <button
                    aria-pressed={palettePackFolder === folder}
                    key={folder}
                    type="button"
                    onClick={() => {
                      setPalettePackFolder(folder)
                      setHighlightedSchemaIndex(0)
                      setPaletteHoveredOptionIndex(null)
                      setPaletteExpandOverride('default')
                    }}
                  >
                    {packFolderTagLabel(folder)}
                  </button>
                ))}
              </div>
            ) : null}
            {showStructureSubfolderTagsRow ? (
              <div className={styles.subfolderMenuWrap} ref={structureSubfolderMenuRef}>
                <button
                  aria-expanded={structureSubfolderMenuOpen}
                  aria-haspopup="dialog"
                  className={styles.subfolderMenuTrigger}
                  type="button"
                  onClick={() => {
                    setStructureSubfolderMenuOpen((open) => {
                      const next = !open
                      if (next) {
                        setStructureSubfolderMenuQuery('')
                      }
                      return next
                    })
                  }}
                >
                  <span className={styles.subfolderMenuTriggerLabel}>Subpasta</span>
                  <span className={styles.subfolderMenuTriggerValue}>
                    {paletteStructureSubfolder === null
                      ? 'Todas'
                      : structureSubfolderTagLabel(paletteStructureSubfolder)}
                  </span>
                  <span aria-hidden className={styles.subfolderMenuTriggerChevron}>
                    ▾
                  </span>
                </button>
                {structureSubfolderMenuOpen ? (
                  <div
                    aria-label="Filtrar por subpasta do pack"
                    className={styles.subfolderPopover}
                    role="dialog"
                    onPointerDown={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        event.stopPropagation()
                        setStructureSubfolderMenuOpen(false)
                        setStructureSubfolderMenuQuery('')
                        paletteInputRef.current?.focus()
                      }
                    }}
                  >
                    <input
                      ref={structureSubfolderInputRef}
                      aria-label="Pesquisar subpasta"
                      autoComplete="off"
                      className={styles.subfolderPopoverSearch}
                      onChange={(event) => {
                        setStructureSubfolderMenuQuery(event.target.value)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          event.stopPropagation()
                          setStructureSubfolderMenuOpen(false)
                          setStructureSubfolderMenuQuery('')
                          paletteInputRef.current?.focus()
                        }
                      }}
                      placeholder="Pesquisar subpasta…"
                      type="search"
                      value={structureSubfolderMenuQuery}
                    />
                    <div className={styles.subfolderPopoverBody}>
                      <div
                        ref={structureSubfolderListRef}
                        className={styles.subfolderPopoverList}
                        role="listbox"
                      >
                        <button
                          aria-selected={paletteStructureSubfolder === null}
                          className={styles.subfolderPopoverOption}
                          role="option"
                          type="button"
                          onClick={() => {
                            setPaletteStructureSubfolder(null)
                            setHighlightedSchemaIndex(0)
                            setPaletteHoveredOptionIndex(null)
                            setPaletteExpandOverride('default')
                            setStructureSubfolderMenuOpen(false)
                            setStructureSubfolderMenuQuery('')
                          }}
                        >
                          Todas as subpastas
                        </button>
                        {menuFilteredSubfolderTags.map((sub) => (
                          <button
                            aria-selected={paletteStructureSubfolder === sub}
                            className={styles.subfolderPopoverOption}
                            key={sub === '' ? '__root__' : sub}
                            role="option"
                            type="button"
                            onClick={() => {
                              setPaletteStructureSubfolder(sub)
                              setHighlightedSchemaIndex(0)
                              setPaletteHoveredOptionIndex(null)
                              setPaletteExpandOverride('default')
                              setStructureSubfolderMenuOpen(false)
                              setStructureSubfolderMenuQuery('')
                            }}
                          >
                            {structureSubfolderTagLabel(sub)}
                          </button>
                        ))}
                        {menuFilteredSubfolderTags.length === 0 ? (
                          <div className={styles.subfolderPopoverEmpty}>Nenhuma subpasta corresponde ao filtro.</div>
                        ) : null}
                      </div>
                      <button
                        aria-label="Rolar lista de subpastas"
                        className={[
                          styles.subfolderScrollControl,
                          isSubfolderScrollActive ? styles.scrollControlActive : '',
                          subfolderScrollDirection === 'up' ? styles.scrollControlUp : '',
                          subfolderScrollDirection === 'down' ? styles.scrollControlDown : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onPointerCancel={stopSubfolderScroll}
                        onPointerDown={startSubfolderScroll}
                        onPointerMove={moveSubfolderScroll}
                        onPointerUp={stopSubfolderScroll}
                        style={
                          {
                            '--scroll-duration': `${Math.max(180, 720 - subfolderScrollIntensity * 520)}ms`,
                            '--scroll-glow': `${8 + subfolderScrollIntensity * 18}px`,
                            '--scroll-intensity': subfolderScrollIntensity.toString(),
                            '--scroll-shift': `${2 + subfolderScrollIntensity * 5}px`,
                            '--scroll-shift-negative': `${-(2 + subfolderScrollIntensity * 5)}px`,
                          } as CSSProperties & Record<`--${string}`, string>
                        }
                        type="button"
                      >
                        <span aria-hidden className={styles.scrollArrowUp} />
                        <span aria-hidden className={styles.scrollCenter} />
                        <span aria-hidden className={styles.scrollArrowDown} />
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          ) : null}
          {isAddonsMode ? <PaletteAddonInstallZone onInstalled={refreshAddonsCatalog} /> : null}
          <div
            className={styles.results}
            id="node-schema-results"
            ref={paletteResultsRef}
            role="listbox"
            style={{
              '--palette-expand-slots': String(
                Math.min(
                  Math.max(
                    (isAddonsMode
                      ? filteredAddons.length
                      : isBlocksMode
                        ? isSlashCommandsMode
                          ? filteredSlashCommands.length
                          : filteredBlocks.length
                        : filteredSchemas.length) - 4,
                    0,
                  ),
                  10,
                ),
              ),
              '--palette-rows': String(
                Math.min(
                  Math.max(
                    isAddonsMode
                      ? filteredAddons.length
                      : isBlocksMode
                        ? isSlashCommandsMode
                          ? filteredSlashCommands.length
                          : filteredBlocks.length
                        : filteredSchemas.length,
                    1,
                  ),
                  14,
                ),
              ),
            } as CSSProperties & Record<'--palette-rows' | '--palette-expand-slots', string>}
            onPointerLeave={handlePaletteResultsPointerLeave}
          >
            {isAddonsMode ? (
              diskAddonsLoading ? (
                <div className={styles.empty}>{t(LangId.NodePaletteAddonsLoading)}</div>
              ) : diskAddonsError ? (
                <div className={styles.empty}>{diskAddonsError}</div>
              ) : filteredAddons.length > 0 ? (
                filteredAddons.map((manifest, index) => (
                  <PaletteAddAddonOption
                    key={manifest.id}
                    manifest={manifest}
                    expanded={paletteOptionExpanded(index)}
                    highlighted={index === activeSchemaIndex}
                    onPick={(id) => onPickAddon?.(id)}
                    onPointerEnter={() => {
                      setHighlightedSchemaIndex(index)
                      setPaletteHoveredOptionIndex(index)
                    }}
                    onPointerLeave={() => {
                      setPaletteHoveredOptionIndex(null)
                    }}
                  />
                ))
              ) : (
                <div className={styles.empty}>{t(LangId.NodePaletteAddonsEmpty)}</div>
              )
            ) : isBlocksMode ? (
              isSlashCommandsMode ? (
                diskSlashCommandsLoading ? (
                  <div className={styles.empty}>{t(LangId.SlashCommandPickerEmpty, 'A carregar…')}</div>
                ) : filteredSlashCommands.length > 0 ? (
                  filteredSlashCommands.map((command, index) => (
                    <PaletteSlashCommandOption
                      key={`${command.feature}::${command.command}`}
                      command={command}
                      expanded={paletteOptionExpanded(index)}
                      highlighted={index === activeSchemaIndex}
                      onClick={() => onPickSlashCommand?.(command.command)}
                      onPointerEnter={() => {
                        setHighlightedSchemaIndex(index)
                        setPaletteHoveredOptionIndex(index)
                      }}
                      onPointerLeave={() => {
                        setPaletteHoveredOptionIndex(null)
                      }}
                    />
                  ))
                ) : (
                  <div className={styles.empty}>{t(LangId.SlashCommandPickerEmpty, 'Nenhum slash command encontrado.')}</div>
                )
              ) : filteredBlocks.length > 0 ? (
                filteredBlocks.map((definition, index) => (
                  <PaletteAddBlockOption
                    definition={definition}
                    expanded={paletteBlockOptionExpanded(index, definition)}
                    highlighted={index === activeSchemaIndex}
                    key={definition.id}
                    onClick={() => onPickBlock?.(definition)}
                    onPointerEnter={() => {
                      setHighlightedSchemaIndex(index)
                      setPaletteHoveredOptionIndex(index)
                    }}
                    onPointerLeave={() => {
                      setPaletteHoveredOptionIndex(null)
                    }}
                  />
                ))
              ) : (
                <div className={styles.empty}>{t(LangId.NodePaletteBlocksEmpty)}</div>
              )
            ) : filteredSchemas.length > 0 ? (
              filteredSchemas.map((schema, index) => (
                <PaletteAddNodeOption
                  expanded={paletteOptionExpanded(index)}
                  highlighted={index === activeSchemaIndex}
                  key={schema.id}
                  onClick={() => onPickSchema(schema)}
                  onPointerEnter={() => {
                    setHighlightedSchemaIndex(index)
                    setPaletteHoveredOptionIndex(index)
                    setPaletteExpandOverride('default')
                  }}
                  schema={schema}
                />
              ))
            ) : (
              <div className={styles.empty}>{t(LangId.NodePaletteEmpty)}</div>
            )}
          </div>
        </section>
        <button
          aria-label="Custom add node list scroll control"
          className={[
            styles.scrollControl,
            isPaletteScrollActive ? styles.scrollControlActive : '',
            paletteScrollDirection === 'up' ? styles.scrollControlUp : '',
            paletteScrollDirection === 'down' ? styles.scrollControlDown : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onPointerCancel={stopPaletteScroll}
          onPointerDown={startPaletteScroll}
          onPointerMove={movePaletteScroll}
          onPointerUp={stopPaletteScroll}
          style={
            {
              '--scroll-duration': `${Math.max(180, 720 - paletteScrollIntensity * 520)}ms`,
              '--scroll-glow': `${8 + paletteScrollIntensity * 18}px`,
              '--scroll-intensity': paletteScrollIntensity.toString(),
              '--scroll-shift': `${2 + paletteScrollIntensity * 5}px`,
              '--scroll-shift-negative': `${-(2 + paletteScrollIntensity * 5)}px`,
            } as CSSProperties & Record<`--${string}`, string>
          }
          type="button"
        >
          <span className={styles.scrollArrowUp} aria-hidden="true" />
          <span className={styles.scrollCenter} aria-hidden="true" />
          <span className={styles.scrollArrowDown} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
