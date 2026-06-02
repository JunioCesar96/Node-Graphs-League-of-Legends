import { useCallback, useEffect, useRef } from 'react'

import { collectRitualAssetPaths } from '@/core/vfx/collectRitualAssetPaths'
import { setStoredVfxGameRoot } from '@/core/vfx/gameRootPreference'
import type { VfxAssetFileIndex } from '@/core/vfx/vfxAssetIndex'
import { assetIndexSize, revokeAssetIndex } from '@/core/vfx/vfxAssetIndex'
import {
  buildAssetsFromDirectoryHandle,
  ensureDirectoryReadPermission,
  getStoredAssetsDirectoryHandle,
  mergeAssetIndex,
  pickAndStoreAssetsDirectory,
  supportsVfxDirectoryPicker,
} from '@/core/vfx/vfxAssetsDirectory'
import { mergeLolAssetCaches, type VfxLolAssetCaches } from '@/core/vfx/vfxMeshCache'

export type UseVfxAutoAssetsOptions = {
  dockOpen: boolean
  ritualText: string
  assetIndex: VfxAssetFileIndex | null
  lolCaches: VfxLolAssetCaches | null
  setAssetIndex: (index: VfxAssetFileIndex | null) => void
  setLolCaches: (cache: VfxLolAssetCaches | null) => void
  setAssetLoading: (loading: boolean) => void
  setAssetWarnings: (warnings: string[] | ((previous: string[]) => string[])) => void
  setGameRoot: (label: string) => void
  /** Sincroniza catálogo VFX após indexar assets (respeita Auto rebuild no dock). */
  autoRebuild?: boolean
  onIndexed?: () => void
}

export function useVfxAutoAssets({
  dockOpen,
  ritualText,
  assetIndex,
  lolCaches,
  setAssetIndex,
  setLolCaches,
  setAssetLoading,
  setAssetWarnings,
  setGameRoot,
  autoRebuild = false,
  onIndexed,
}: UseVfxAutoAssetsOptions) {
  const assetIndexRef = useRef(assetIndex)
  assetIndexRef.current = assetIndex
  const lolCachesRef = useRef(lolCaches)
  lolCachesRef.current = lolCaches
  const lastRitualRef = useRef('')
  const indexingRef = useRef(false)

  const indexFromHandle = useCallback(
    async (
      handle: FileSystemDirectoryHandle,
      ritual: string,
      options?: { rebuildCatalog?: boolean },
    ) => {
      if (indexingRef.current) return
      indexingRef.current = true
      setAssetLoading(true)

      try {
        const { texturePaths, meshPaths, skeletonPaths, animationPaths } = collectRitualAssetPaths(ritual)
        const allMeshLike = [...new Set([...meshPaths, ...skeletonPaths, ...animationPaths])]
        if (!texturePaths.length && !allMeshLike.length) {
          setAssetWarnings((previous) => [
            ...previous,
            'Ritual sem caminhos de assets (textura/mesh/skl/anm) para carregar.',
          ])
          return
        }

        const built = await buildAssetsFromDirectoryHandle(handle, texturePaths, allMeshLike)
        const merged = mergeAssetIndex(assetIndexRef.current, built.index)
        setAssetIndex(merged)
        setLolCaches(mergeLolAssetCaches(lolCachesRef.current, built.lolCaches))
        setGameRoot(built.rootLabel)
        setStoredVfxGameRoot(built.rootLabel)

        const count = assetIndexSize(merged)
        const meshNote = built.meshesLoaded > 0 ? `, ${built.meshesLoaded} mesh` : ''
        const skinnedNote = built.skinnedLoaded > 0 ? `, ${built.skinnedLoaded} skinned` : ''
        const anmNote = built.anmLoaded > 0 ? `, ${built.anmLoaded} anm` : ''
        setAssetWarnings((previous) => [
          ...previous.filter((line) => !line.startsWith('Auto:')),
          `Auto: ${count} textura(s)${meshNote}${skinnedNote}${anmNote} de «${built.rootLabel}».`,
          ...built.warnings,
        ])
        const rebuildCatalog = options?.rebuildCatalog ?? autoRebuild
        if (rebuildCatalog) {
          onIndexed?.()
        }
      } finally {
        indexingRef.current = false
        setAssetLoading(false)
      }
    },
    [autoRebuild, onIndexed, setAssetIndex, setAssetLoading, setAssetWarnings, setGameRoot, setLolCaches],
  )

  const syncFromStoredDirectory = useCallback(
    async (ritual: string, force = false) => {
      if (!dockOpen || !ritual.trim()) return
      if (!force && ritual === lastRitualRef.current) return

      const handle = await getStoredAssetsDirectoryHandle()
      if (!handle) return

      const allowed = await ensureDirectoryReadPermission(handle)
      if (!allowed) {
        setAssetWarnings((previous) => [
          ...previous,
          'Permissão da pasta de assets negada — use «Pasta assets…» de novo.',
        ])
        return
      }

      lastRitualRef.current = ritual
      await indexFromHandle(handle, ritual)
    },
    [dockOpen, indexFromHandle, setAssetWarnings],
  )

  const pickAssetsDirectory = useCallback(async () => {
    if (supportsVfxDirectoryPicker()) {
      const handle = await pickAndStoreAssetsDirectory()
      if (handle) {
        lastRitualRef.current = ''
        await indexFromHandle(handle, ritualText, { rebuildCatalog: true })
        return true
      }
    }
    return false
  }, [indexFromHandle, ritualText])

  useEffect(() => {
    if (!dockOpen) return

    const timer = window.setTimeout(() => {
      void (async () => {
        const handle = await getStoredAssetsDirectoryHandle()
        if (handle) {
          await syncFromStoredDirectory(ritualText)
          return
        }

        if (!supportsVfxDirectoryPicker()) return
        if (sessionStorage.getItem('vfx-assets-picker-declined') === '1') return

        const picked = await pickAndStoreAssetsDirectory()
        if (picked) {
          lastRitualRef.current = ''
          await indexFromHandle(picked, ritualText, { rebuildCatalog: autoRebuild })
        }
      })()
    }, 400)

    return () => window.clearTimeout(timer)
  }, [dockOpen, indexFromHandle, ritualText, syncFromStoredDirectory])

  useEffect(() => {
    return () => {
      if (assetIndexRef.current) revokeAssetIndex(assetIndexRef.current)
    }
  }, [])

  return {
    pickAssetsDirectory,
    syncFromStoredDirectory,
    supportsDirectoryPicker: supportsVfxDirectoryPicker(),
  }
}
