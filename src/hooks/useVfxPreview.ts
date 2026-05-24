import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { BufferGeometry } from 'three'

import type { VfxAssetFileIndex } from '@/core/vfx/vfxAssetIndex'
import { lookupTextureForRitual } from '@/core/vfx/vfxAssetIndex'
import {
  lookupAnm,
  lookupMeshGeometry,
  lookupSkinnedBundle,
  lookupSkl,
  type VfxLolAssetCaches,
} from '@/core/vfx/vfxMeshCache'
import type { ParsedLolAnm } from '@/core/vfx/lolAnmParse'
import type { LolSkinnedMeshBundle } from '@/core/vfx/lolSkinnedMesh'
import type { ParsedLolSkl } from '@/core/vfx/lolSklParse'
import { summarizeTextureResolution } from '@/core/vfx/vfxAssetResolve'
import {
  buildVfxWebCatalogFromRitual,
  type VfxWebCatalogBuilt,
  type VfxWebScene,
} from '@/core/vfx/vfxWebBuilder'
import { applyVfxPositionOffset } from '@/core/vfx/vfxViewportPreferences'
import { computeEmitterFrameState } from '@/core/vfx/vfxWebAnimation'
import { computeParticleInstances } from '@/core/vfx/vfxParticleInstances'
import type { VfxEmitterFrameState } from '@/core/vfx/vfxWebAnimation'
import { applyErosionMaterialParams, buildMaterialParams } from '@/core/vfx/vfxWebMaterials'
import type { VfxMaterialParams } from '@/core/vfx/vfxWebMaterials'
import type { VfxCatalogEntry } from '@/core/vfx/vfxModel'
import { ritualContainsVfxSystem } from '@/core/vfx/ritualParseVfx'

export type VfxEffectListItem = {
  id: string
  label: string
  emitterCount: number
  mapKey: string | null
}

export type VfxEmitterPreviewEntry = {
  id: string
  name: string
  particleIndex: number
  visible: boolean
  frame: VfxEmitterFrameState
  material: VfxMaterialParams
  meshGeometry: BufferGeometry | null
  meshPath: string | null
  skeletonPath: string | null
  animationPath: string | null
  skinnedBundle: LolSkinnedMeshBundle | null
  skl: ParsedLolSkl | null
  anm: ParsedLolAnm | null
  skinnedAnimFrame: number
}

export type UseVfxPreviewOptions = {
  ritualText: string
  vfxScale: number
  assetIndex?: VfxAssetFileIndex | null
  lolCaches?: VfxLolAssetCaches | null
  autoRebuild?: boolean
  dockOpen?: boolean
  vfxPositionEnabled?: boolean
  vfxPositionOffset?: [number, number, number]
}

export function useVfxPreview({
  ritualText,
  vfxScale,
  assetIndex = null,
  lolCaches = null,
  autoRebuild = true,
  dockOpen = false,
  vfxPositionEnabled = false,
  vfxPositionOffset = [0, 0, 0],
}: UseVfxPreviewOptions) {
  const [catalogBuilt, setCatalogBuilt] = useState<VfxWebCatalogBuilt | null>(null)
  const [activeEffectId, setActiveEffectId] = useState<string | null>(null)
  const [emitterVisibility, setEmitterVisibility] = useState<Record<string, boolean>>({})
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [timelineResetPoint, setTimelineResetPoint] = useState<number | null>(null)
  const timelineResetPointRef = useRef<number | null>(null)
  timelineResetPointRef.current = timelineResetPoint
  const [loop, setLoop] = useState(true)
  const [buildWarnings, setBuildWarnings] = useState<string[]>([])
  const [focusedEmitterId, setFocusedEmitterId] = useState<string | null>(null)
  const lastRitualRef = useRef('')
  const dockOpenRef = useRef(dockOpen)
  const prevDockOpenRef = useRef(false)
  dockOpenRef.current = dockOpen

  const effectList = useMemo((): VfxEffectListItem[] => {
    if (!catalogBuilt) return []
    return catalogBuilt.entries.map((entry) => ({
      id: entry.id,
      label: entry.label,
      emitterCount: entry.scene.emitters.length,
      mapKey: entry.mapKey,
    }))
  }, [catalogBuilt])

  const activeEntry = useMemo(() => {
    if (!catalogBuilt?.entries.length) return null
    if (activeEffectId) {
      const found = catalogBuilt.entries.find((entry) => entry.id === activeEffectId)
      if (found) return found
    }
    return catalogBuilt.entries[0]
  }, [activeEffectId, catalogBuilt])

  const scene: VfxWebScene | null = activeEntry?.scene ?? null

  const rebuild = useCallback(() => {
    const built = buildVfxWebCatalogFromRitual(ritualText)
    setCatalogBuilt(built)

    const keepId =
      activeEffectId && built.entries.some((entry) => entry.id === activeEffectId)
        ? activeEffectId
        : (built.entries[0]?.id ?? null)

    setActiveEffectId(keepId)

    const activeScene =
      built.entries.find((entry) => entry.id === keepId)?.scene ?? built.entries[0]?.scene

    setEmitterVisibility(
      Object.fromEntries((activeScene?.emitters ?? []).map((emitter) => [emitter.id, true])),
    )
    setCurrentTime(0)
    setFocusedEmitterId(null)
    const shouldPlay = dockOpenRef.current && (activeScene?.emitters.length ?? 0) > 0
    setPlaying(shouldPlay)
    lastRitualRef.current = ritualText
  }, [activeEffectId, ritualText])

  useEffect(() => {
    if (!scene) {
      setBuildWarnings(catalogBuilt?.warnings ?? [])
      return
    }
    setBuildWarnings([
      ...(catalogBuilt?.warnings ?? []),
      ...summarizeTextureResolution(scene.emitters, assetIndex),
    ])
  }, [assetIndex, catalogBuilt?.warnings, scene])

  const selectEffect = useCallback(
    (effectId: string) => {
      if (!catalogBuilt) return
      const entry = catalogBuilt.entries.find((item) => item.id === effectId)
      if (!entry) return

      setActiveEffectId(effectId)
      setEmitterVisibility(
        Object.fromEntries(entry.scene.emitters.map((emitter) => [emitter.id, true])),
      )
      setFocusedEmitterId(null)
      setCurrentTime(0)
      setPlaying(false)
    },
    [catalogBuilt],
  )

  const focusEmitter = useCallback((emitterId: string | null) => {
    setFocusedEmitterId(emitterId)
    setCurrentTime(0)
    setPlaying(false)
  }, [])

  useEffect(() => {
    const justOpened = dockOpen && !prevDockOpenRef.current
    prevDockOpenRef.current = dockOpen
    if (!justOpened) return
    if (!ritualContainsVfxSystem(ritualText)) return
    rebuild()
  }, [dockOpen, rebuild, ritualText])

  useEffect(() => {
    if (!dockOpen) return
    if (!ritualContainsVfxSystem(ritualText)) return
    if (!autoRebuild) return
    if (!catalogBuilt) return
    if (ritualText === lastRitualRef.current) return

    const handle = window.setTimeout(() => {
      rebuild()
    }, 500)

    return () => window.clearTimeout(handle)
  }, [autoRebuild, catalogBuilt, dockOpen, rebuild, ritualText])

  useEffect(() => {
    if (!playing || !scene) return

    let frameId = 0
    let lastStamp = performance.now()

    const tick = (stamp: number) => {
      const delta = (stamp - lastStamp) / 1000
      lastStamp = stamp
      setCurrentTime((previous) => {
        let next = previous + delta
        const resetAt = timelineResetPointRef.current
        if (resetAt !== null && resetAt > 0 && previous < resetAt && next >= resetAt) {
          next = 0
        }
        if (next >= scene.lifetime) {
          if (loop) return 0
          setPlaying(false)
          return scene.lifetime
        }
        return next
      })
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [loop, playing, scene])

  const play = useCallback(() => {
    if (!scene) return
    setPlaying(true)
  }, [scene])

  const pause = useCallback(() => setPlaying(false), [])

  const restart = useCallback(() => {
    setCurrentTime(0)
    setPlaying(true)
  }, [])

  const setTimelineResetPointAt = useCallback(
    (time: number) => {
      if (!scene) return
      const clamped = Math.min(Math.max(time, 0), scene.lifetime)
      setTimelineResetPoint(clamped > 0 ? clamped : null)
    },
    [scene],
  )

  const clearTimelineResetPoint = useCallback(() => {
    setTimelineResetPoint(null)
  }, [])

  useEffect(() => {
    if (!scene) {
      setTimelineResetPoint(null)
      return
    }
    setTimelineResetPoint((previous) => {
      if (previous === null) return null
      if (previous > scene.lifetime) return null
      return previous
    })
  }, [scene])

  const scrubTo = useCallback(
    (time: number) => {
      if (!scene) return
      setCurrentTime(Math.min(Math.max(time, 0), scene.lifetime))
      setPlaying(false)
    },
    [scene],
  )

  const toggleEmitter = useCallback((emitterId: string) => {
    setEmitterVisibility((previous) => ({
      ...previous,
      [emitterId]: !(previous[emitterId] ?? true),
    }))
  }, [])

  const effectEmitters = useMemo(() => {
    if (!scene) return []
    return scene.emitters
  }, [scene])

  const emitterEntries = useMemo((): VfxEmitterPreviewEntry[] => {
    if (!scene) return []

    const visibleEmitters = scene.emitters.filter((emitter) => emitterVisibility[emitter.id] !== false)

    return visibleEmitters.flatMap((emitter, emitterIndex) => {
      const instances = computeParticleInstances(emitter.parsed, currentTime, 42 + emitterIndex * 100)

      const mainHit =
        assetIndex && emitter.texturePath
          ? lookupTextureForRitual(assetIndex, emitter.texturePath)
          : null
      const colorHit =
        assetIndex && emitter.colorTexturePath
          ? lookupTextureForRitual(assetIndex, emitter.colorTexturePath)
          : null
      const multHit =
        assetIndex && emitter.textureMultPath
          ? lookupTextureForRitual(assetIndex, emitter.textureMultPath)
          : null
      const reflectionPath = emitter.parsed.reflection?.reflectionMapTexture?.trim() ?? ''
      const reflectionHit =
        assetIndex && reflectionPath
          ? lookupTextureForRitual(assetIndex, reflectionPath)
          : null
      const palettePath = emitter.parsed.paletteDefinition?.paletteTexture.trim() ?? ''
      const paletteHit =
        assetIndex && palettePath ? lookupTextureForRitual(assetIndex, palettePath) : null
      const erosionPath = emitter.parsed.alphaErosion?.erosionMapName.trim() ?? ''
      const erosionHit =
        assetIndex && erosionPath ? lookupTextureForRitual(assetIndex, erosionPath) : null

      const meshPath = emitter.meshPath?.trim() || null
      const skeletonPath = emitter.skeletonPath?.trim() || null
      const animationPath = emitter.animationPath?.trim() || null
      const meshGeometry =
        lolCaches && meshPath ? lookupMeshGeometry(lolCaches.meshes, meshPath) : null
      const skinnedBundle =
        lolCaches && meshPath ? lookupSkinnedBundle(lolCaches, meshPath) : null
      const skl =
        lolCaches && skeletonPath
          ? lookupSkl(lolCaches, skeletonPath)
          : lolCaches && meshPath
            ? lookupSkl(lolCaches, meshPath.replace(/\.skn$/i, '.skl'))
            : null
      const anm =
        lolCaches && animationPath
          ? lookupAnm(lolCaches, animationPath)
          : lolCaches && meshPath
            ? lookupAnm(lolCaches, meshPath.replace(/\.skn$/i, '.anm'))
            : null

      const skinnedAnimFrame =
        anm && anm.frameCount > 0
          ? Math.max(0, Math.min(anm.frameCount - 1, Math.floor(currentTime * anm.fps)))
          : 0

      return instances
        .map((instance) => {
          const rawFrame = computeEmitterFrameState(
            emitter.parsed,
            vfxScale,
            currentTime,
            instance.seed,
            {
              particleTime: instance.particleTime,
            },
          )
          const frame = {
            ...rawFrame,
            position: applyVfxPositionOffset(
              rawFrame.position,
              vfxPositionEnabled,
              vfxPositionOffset,
            ),
          }

          const particleNormalized = Math.min(
            Math.max(instance.particleTime / Math.max(emitter.parsed.particleLifetime, 0.001), 0),
            1,
          )

          const material = applyErosionMaterialParams(
            buildMaterialParams(
              emitter.parsed,
              frame,
              mainHit?.url ?? null,
              mainHit?.isDds ?? false,
              colorHit?.url ?? null,
              colorHit?.isDds ?? false,
              multHit?.url ?? null,
              multHit?.isDds ?? false,
              reflectionHit?.url ?? null,
              reflectionHit?.isDds ?? false,
              paletteHit?.url ?? null,
              paletteHit?.isDds ?? false,
              { particleIndex: instance.index, particleNormalized },
            ),
            erosionHit?.url ?? null,
            erosionHit?.isDds ?? false,
            frame.erosionDrive,
          )

          return {
            id: `${emitter.id}-p${instance.index}`,
            name: emitter.name,
            particleIndex: instance.index,
            visible: emitterVisibility[emitter.id] !== false && frame.visible,
            frame,
            material,
            meshGeometry,
            meshPath,
            skeletonPath,
            animationPath,
            skinnedBundle,
            skl,
            anm,
            skinnedAnimFrame,
          }
        })
        .filter((entry) => entry.visible)
        .sort((left, right) => left.material.renderOrder - right.material.renderOrder)
    })
  }, [
    assetIndex,
    currentTime,
    emitterVisibility,
    lolCaches,
    scene,
    vfxPositionEnabled,
    vfxPositionOffset,
    vfxScale,
  ])

  return {
    scene,
    catalogBuilt,
    effectList,
    activeEffectId: activeEntry?.id ?? null,
    activeEffect: activeEntry as (VfxCatalogEntry & { scene: VfxWebScene }) | null,
    effectEmitters,
    buildWarnings,
    currentTime,
    playing,
    emitterEntries,
    emitterVisibility,
    focusedEmitterId,
    rebuild,
    selectEffect,
    focusEmitter,
    play,
    pause,
    restart,
    scrubTo,
    toggleEmitter,
    loop,
    setLoop,
    timelineResetPoint,
    setTimelineResetPointAt,
    clearTimelineResetPoint,
  }
}
