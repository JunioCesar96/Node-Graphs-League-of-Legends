import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'

import type { Object3D } from 'three'

import type { VfxAssetFileIndex } from '@/core/vfx/vfxAssetIndex'
import { summarizeTextureResolution } from '@/core/vfx/vfxAssetResolve'
import {
  buildCompositorTimelineLayers,
  clampClipOffset,
  compositorEmitterKey,
  computeCompositorLifetime,
  localTimeForClip,
  type VfxCompositorClip,
  type VfxCompositorTimelineLayer,
} from '@/core/vfx/vfxCompositor'
import {
  buildEmitterPreviewEntries,
  type VfxEmitterPreviewEntry,
} from '@/core/vfx/vfxPreviewEmitterEntries'
import { createDynamicMeshGroundHitResolver } from '@/core/vfx/vfxMeshGroundHit'
import {
  buildVfxWebCatalogFromRitual,
  type VfxWebCatalogBuilt,
  type VfxWebScene,
} from '@/core/vfx/vfxWebBuilder'
import type { VfxCatalogEntry } from '@/core/vfx/vfxModel'
import { ritualContainsVfxSystem } from '@/core/vfx/ritualParseVfx'
import type { VfxLolAssetCaches } from '@/core/vfx/vfxMeshCache'
import type { VfxCharacterBoneResolver } from '@/core/vfx/vfxWebAnimation'
import {
  advanceTimelineTime,
  advanceTimelineStep,
  clampPlaybackRange,
  clampPlaybackSpeed,
  clampStepPlaybackIntervalSeconds,
  clampStepPlaybackTimelineSeconds,
  clampTimeToPlaybackRange,
  defaultPlaybackRange,
  isPlaybackRangeActive,
  snapTimeToTimelineStep,
  type VfxPlaybackRange,
  VFX_PLAYBACK_SPEED_DEFAULT,
  VFX_STEP_PLAYBACK_INTERVAL_DEFAULT,
  VFX_STEP_PLAYBACK_TIMELINE_DEFAULT,
} from '@/core/vfx/vfxPlayback'

export type { VfxEmitterPreviewEntry }

export type VfxEffectListItem = {
  id: string
  label: string
  emitterCount: number
  mapKey: string | null
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
  vfxGlobalRotationEnabled?: boolean
  vfxGlobalRotationOffsetDegrees?: [number, number, number]
  vfxLockMotionEnabled?: boolean
  vfxBirthRotationLoLEnabled?: boolean
  showGround?: boolean
  groundPosition?: [number, number, number]
  /** Malhas do viewport (chão + personagem) para raycast de snap — Fase 7. */
  sceneRaycastRootsRef?: MutableRefObject<Object3D[]>
  /** Resolve posição mundial do osso (personagem na cena — Fase 6). */
  resolveBoneWorld?: VfxCharacterBoneResolver | null
  referenceBoneName?: string | null
  /** Bound AABB do personagem na cena (FlexShape — Fase 8). */
  boundObjectSizeLol?: [number, number, number] | null
}

export function useVfxPreview({
  ritualText,
  vfxScale,
  assetIndex = null,
  lolCaches = null,
  autoRebuild = false,
  dockOpen = false,
  vfxPositionEnabled = false,
  vfxPositionOffset = [0, 0, 0],
  vfxGlobalRotationEnabled = false,
  vfxGlobalRotationOffsetDegrees = [0, 0, 0],
  vfxLockMotionEnabled = false,
  vfxBirthRotationLoLEnabled = true,
  showGround = false,
  groundPosition = [0, 0, 0],
  sceneRaycastRootsRef,
  resolveBoneWorld = null,
  referenceBoneName = null,
  boundObjectSizeLol = null,
}: UseVfxPreviewOptions) {
  const [catalogBuilt, setCatalogBuilt] = useState<VfxWebCatalogBuilt | null>(null)
  const [activeEffectId, setActiveEffectId] = useState<string | null>(null)
  const [selectedEffectIds, setSelectedEffectIds] = useState<string[]>([])
  const [effectClipOffsets, setEffectClipOffsets] = useState<Record<string, number>>({})
  const [emitterVisibility, setEmitterVisibility] = useState<Record<string, boolean>>({})
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [timelineResetPoint, setTimelineResetPoint] = useState<number | null>(null)
  const timelineResetPointRef = useRef<number | null>(null)
  timelineResetPointRef.current = timelineResetPoint
  const [loop, setLoop] = useState(true)
  const [playbackSpeed, setPlaybackSpeed] = useState(VFX_PLAYBACK_SPEED_DEFAULT)
  const [stepPlaybackEnabled, setStepPlaybackEnabled] = useState(false)
  const [stepPlaybackTimelineSeconds, setStepPlaybackTimelineSeconds] = useState(
    VFX_STEP_PLAYBACK_TIMELINE_DEFAULT,
  )
  const [stepPlaybackIntervalSeconds, setStepPlaybackIntervalSeconds] = useState(
    VFX_STEP_PLAYBACK_INTERVAL_DEFAULT,
  )
  const [playbackReverse, setPlaybackReverse] = useState(false)
  const [playbackRange, setPlaybackRange] = useState<VfxPlaybackRange>({ start: 0, end: 0 })
  const playbackSpeedRef = useRef(playbackSpeed)
  const playbackReverseRef = useRef(playbackReverse)
  const playbackRangeRef = useRef(playbackRange)
  const stepPlaybackEnabledRef = useRef(stepPlaybackEnabled)
  const stepPlaybackTimelineSecondsRef = useRef(stepPlaybackTimelineSeconds)
  const stepPlaybackIntervalSecondsRef = useRef(stepPlaybackIntervalSeconds)
  const stepAccumulatorRef = useRef(0)
  playbackSpeedRef.current = playbackSpeed
  playbackReverseRef.current = playbackReverse
  playbackRangeRef.current = playbackRange
  stepPlaybackEnabledRef.current = stepPlaybackEnabled
  stepPlaybackTimelineSecondsRef.current = stepPlaybackTimelineSeconds
  stepPlaybackIntervalSecondsRef.current = stepPlaybackIntervalSeconds
  const [buildWarnings, setBuildWarnings] = useState<string[]>([])
  const [focusedEmitterId, setFocusedEmitterId] = useState<string | null>(null)
  const [focusedCompositorEffectId, setFocusedCompositorEffectId] = useState<string | null>(null)
  const lastRitualRef = useRef('')
  const dockOpenRef = useRef(dockOpen)
  const prevDockOpenRef = useRef(false)
  dockOpenRef.current = dockOpen

  const compositorMode = selectedEffectIds.length >= 2

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

  const compositorClips = useMemo((): VfxCompositorClip[] => {
    if (!catalogBuilt || !compositorMode) return []
    return selectedEffectIds
      .map((effectId) => {
        const entry = catalogBuilt.entries.find((item) => item.id === effectId)
        if (!entry) return null
        return {
          effectId,
          label: entry.label,
          lifetime: entry.scene.lifetime,
          offset: effectClipOffsets[effectId] ?? 0,
        }
      })
      .filter((clip): clip is VfxCompositorClip => clip !== null)
  }, [catalogBuilt, compositorMode, effectClipOffsets, selectedEffectIds])

  const compositorLifetime = useMemo(
    () => computeCompositorLifetime(compositorClips),
    [compositorClips],
  )

  const previewLifetime = compositorMode ? compositorLifetime : (scene?.lifetime ?? 1)

  const compositorTimelineLayers = useMemo((): VfxCompositorTimelineLayer[] => {
    if (!compositorMode) return []
    return buildCompositorTimelineLayers(
      compositorClips,
      currentTime,
      focusedCompositorEffectId,
      Object.fromEntries(
        compositorClips.map((clip) => [clip.effectId, emitterVisibility[clip.effectId] !== false]),
      ),
    )
  }, [compositorClips, compositorMode, currentTime, emitterVisibility, focusedCompositorEffectId])

  const rebuild = useCallback(() => {
    const built = buildVfxWebCatalogFromRitual(ritualText)
    setCatalogBuilt(built)

    const keepId =
      activeEffectId && built.entries.some((entry) => entry.id === activeEffectId)
        ? activeEffectId
        : (built.entries[0]?.id ?? null)

    setActiveEffectId(keepId)
    setSelectedEffectIds([])
    setEffectClipOffsets({})

    const activeScene =
      built.entries.find((entry) => entry.id === keepId)?.scene ?? built.entries[0]?.scene

    setEmitterVisibility(
      Object.fromEntries((activeScene?.emitters ?? []).map((emitter) => [emitter.id, true])),
    )
    setCurrentTime(0)
    setFocusedEmitterId(null)
    setFocusedCompositorEffectId(null)
    const shouldPlay = dockOpenRef.current && (activeScene?.emitters.length ?? 0) > 0
    setPlaying(shouldPlay)
    lastRitualRef.current = ritualText
  }, [activeEffectId, ritualText])

  useEffect(() => {
    if (!catalogBuilt) {
      setBuildWarnings([])
      return
    }

    const scenesForWarnings = compositorMode
      ? compositorClips
          .map((clip) => catalogBuilt.entries.find((entry) => entry.id === clip.effectId)?.scene)
          .filter((item): item is VfxWebScene => item !== undefined)
      : scene
        ? [scene]
        : []

    const textureWarnings = scenesForWarnings.flatMap((item) =>
      summarizeTextureResolution(item.emitters, assetIndex),
    )

    setBuildWarnings([...catalogBuilt.warnings, ...textureWarnings])
  }, [assetIndex, catalogBuilt, compositorClips, compositorMode, scene])

  const selectEffect = useCallback(
    (effectId: string) => {
      if (!catalogBuilt) return
      const entry = catalogBuilt.entries.find((item) => item.id === effectId)
      if (!entry) return

      setActiveEffectId(effectId)
      setSelectedEffectIds([])
      setFocusedCompositorEffectId(null)
      setEmitterVisibility(
        Object.fromEntries(entry.scene.emitters.map((emitter) => [emitter.id, true])),
      )
      setFocusedEmitterId(null)
      setCurrentTime(0)
      setPlaying(false)
    },
    [catalogBuilt],
  )

  const toggleEffectSelection = useCallback(
    (effectId: string) => {
      if (!catalogBuilt) return
      const exists = catalogBuilt.entries.some((entry) => entry.id === effectId)
      if (!exists) return

      setSelectedEffectIds((previous) => {
        const next = previous.includes(effectId)
          ? previous.filter((id) => id !== effectId)
          : [...previous, effectId]

        if (next.length >= 2) {
          setEffectClipOffsets((offsets) => {
            const merged = { ...offsets }
            for (const id of next) {
              if (merged[id] === undefined) merged[id] = 0
            }
            return merged
          })

          setEmitterVisibility((visibility) => {
            const merged = { ...visibility }
            for (const id of next) {
              const entry = catalogBuilt.entries.find((item) => item.id === id)
              if (!entry) continue
              if (merged[id] === undefined) merged[id] = true
              for (const emitter of entry.scene.emitters) {
                const key = compositorEmitterKey(id, emitter.id)
                if (merged[key] === undefined) merged[key] = true
              }
            }
            return merged
          })
        }

        return next
      })
    },
    [catalogBuilt],
  )

  const addEffectToCompositor = useCallback(
    (effectId: string) => {
      if (!catalogBuilt) return
      const exists = catalogBuilt.entries.some((entry) => entry.id === effectId)
      if (!exists) return

      setSelectedEffectIds((previous) => {
        if (previous.includes(effectId)) return previous
        const next = [...previous, effectId]

        if (next.length >= 2) {
          setEffectClipOffsets((offsets) => {
            const merged = { ...offsets }
            for (const id of next) {
              if (merged[id] === undefined) merged[id] = 0
            }
            return merged
          })

          setEmitterVisibility((visibility) => {
            const merged = { ...visibility }
            for (const id of next) {
              const entry = catalogBuilt.entries.find((item) => item.id === id)
              if (!entry) continue
              if (merged[id] === undefined) merged[id] = true
              for (const emitter of entry.scene.emitters) {
                const key = compositorEmitterKey(id, emitter.id)
                if (merged[key] === undefined) merged[key] = true
              }
            }
            return merged
          })
        }

        return next
      })
    },
    [catalogBuilt],
  )

  const removeEffectFromCompositor = useCallback((effectId: string) => {
    setSelectedEffectIds((previous) => {
      if (!previous.includes(effectId)) return previous
      return previous.filter((id) => id !== effectId)
    })
  }, [])

  const setEffectClipOffset = useCallback(
    (effectId: string, offset: number) => {
      const entry = catalogBuilt?.entries.find((item) => item.id === effectId)
      if (!entry) return
      const clamped = clampClipOffset(offset, entry.scene.lifetime, compositorLifetime)
      setEffectClipOffsets((previous) => ({ ...previous, [effectId]: clamped }))
    },
    [catalogBuilt, compositorLifetime],
  )

  const focusEmitter = useCallback((emitterId: string | null) => {
    setFocusedEmitterId(emitterId)
    setCurrentTime(0)
    setPlaying(false)
  }, [])

  const focusCompositorEffect = useCallback((effectId: string | null) => {
    setFocusedCompositorEffectId(effectId)
    if (effectId) {
      const offset = effectClipOffsets[effectId] ?? 0
      setCurrentTime(offset)
    }
    setPlaying(false)
  }, [effectClipOffsets])

  const toggleCompositorEffectVisibility = useCallback((effectId: string) => {
    setEmitterVisibility((previous) => ({
      ...previous,
      [effectId]: !(previous[effectId] ?? true),
    }))
  }, [])

  useEffect(() => {
    const justOpened = dockOpen && !prevDockOpenRef.current
    prevDockOpenRef.current = dockOpen
    if (!justOpened) return
    if (!ritualContainsVfxSystem(ritualText)) return
    if (!autoRebuild) return
    rebuild()
  }, [autoRebuild, dockOpen, rebuild, ritualText])

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
    if (!playing) return
    const lifetime = previewLifetime
    if (lifetime <= 0) return

    let frameId = 0
    let lastStamp = performance.now()

    const tick = (stamp: number) => {
      const delta = (stamp - lastStamp) / 1000
      lastStamp = stamp
      const speed = playbackSpeedRef.current
      const stepMode = stepPlaybackEnabledRef.current

      if (stepMode) {
        const timelineStep = clampStepPlaybackTimelineSeconds(
          stepPlaybackTimelineSecondsRef.current,
          lifetime,
        )
        const intervalSeconds = clampStepPlaybackIntervalSeconds(
          stepPlaybackIntervalSecondsRef.current,
        )
        stepAccumulatorRef.current += delta * speed

        if (stepAccumulatorRef.current >= intervalSeconds) {
          const ticks = Math.floor(stepAccumulatorRef.current / intervalSeconds)
          stepAccumulatorRef.current -= ticks * intervalSeconds

          setCurrentTime((previous) => {
            let time = snapTimeToTimelineStep(previous, timelineStep, lifetime)
            let stop = false
            for (let i = 0; i < ticks; i += 1) {
              const advanced = advanceTimelineStep(time, timelineStep, lifetime, {
                loop,
                resetAt: timelineResetPointRef.current,
                playbackRange: playbackRangeRef.current,
              })
              time = snapTimeToTimelineStep(advanced.time, timelineStep, lifetime)
              if (advanced.stop) {
                stop = true
                break
              }
            }
            if (stop) {
              queueMicrotask(() => setPlaying(false))
            }
            return time
          })
        }
      } else {
        const step = delta * speed * (playbackReverseRef.current ? -1 : 1)

        setCurrentTime((previous) => {
          const advanced = advanceTimelineTime(previous, step, lifetime, {
            reverse: playbackReverseRef.current,
            loop,
            resetAt: timelineResetPointRef.current,
            playbackRange: playbackRangeRef.current,
          })
          if (advanced.stop) {
            queueMicrotask(() => setPlaying(false))
          }
          return advanced.time
        })
      }
      frameId = requestAnimationFrame(tick)
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [loop, playing, previewLifetime])

  const play = useCallback(() => {
    if (!scene && !compositorMode) return
    stepAccumulatorRef.current = 0
    setCurrentTime((previous) =>
      clampTimeToPlaybackRange(previous, playbackRangeRef.current, previewLifetime),
    )
    setPlaying(true)
  }, [compositorMode, previewLifetime, scene])

  const pause = useCallback(() => setPlaying(false), [])

  const restart = useCallback(() => {
    stepAccumulatorRef.current = 0
    const resetAt = timelineResetPointRef.current
    const range = playbackRangeRef.current
    const rangeActive = isPlaybackRangeActive(range, previewLifetime)

    if (playbackReverseRef.current) {
      if (rangeActive) {
        setCurrentTime(range.end)
      } else {
        setCurrentTime(resetAt !== null && resetAt > 0 ? resetAt : previewLifetime)
      }
    } else if (rangeActive) {
      setCurrentTime(range.start)
    } else {
      setCurrentTime(0)
    }
    setPlaying(true)
  }, [previewLifetime])

  const setPlaybackSpeedClamped = useCallback((speed: number) => {
    setPlaybackSpeed(clampPlaybackSpeed(speed))
  }, [])

  const togglePlaybackReverse = useCallback(() => {
    setPlaybackReverse((previous) => !previous)
  }, [])

  const toggleStepPlayback = useCallback(() => {
    setStepPlaybackEnabled((previous) => !previous)
    stepAccumulatorRef.current = 0
  }, [])

  const setStepPlaybackTimelineSecondsClamped = useCallback(
    (seconds: number) => {
      setStepPlaybackTimelineSeconds(clampStepPlaybackTimelineSeconds(seconds, previewLifetime))
    },
    [previewLifetime],
  )

  const setStepPlaybackIntervalSecondsClamped = useCallback((seconds: number) => {
    setStepPlaybackIntervalSeconds(clampStepPlaybackIntervalSeconds(seconds))
  }, [])

  const setTimelineResetPointAt = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), previewLifetime)
      setTimelineResetPoint(clamped > 0 ? clamped : null)
    },
    [previewLifetime],
  )

  const clearTimelineResetPoint = useCallback(() => {
    setTimelineResetPoint(null)
  }, [])

  const setPlaybackRangeStart = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), previewLifetime)
      setPlaybackRange((previous) =>
        clampPlaybackRange({ start: clamped, end: previous.end }, previewLifetime),
      )
    },
    [previewLifetime],
  )

  const setPlaybackRangeEnd = useCallback(
    (time: number) => {
      const clamped = Math.min(Math.max(time, 0), previewLifetime)
      setPlaybackRange((previous) =>
        clampPlaybackRange({ start: previous.start, end: clamped }, previewLifetime),
      )
    },
    [previewLifetime],
  )

  const clearPlaybackRange = useCallback(() => {
    setPlaybackRange(defaultPlaybackRange(previewLifetime))
  }, [previewLifetime])

  const movePlaybackRangeTo = useCallback(
    (anchorTime: number) => {
      setPlaybackRange((previous) => {
        const width = Math.max(previous.end - previous.start, 0.01)
        let start = Math.min(Math.max(anchorTime, 0), previewLifetime)
        let end = start + width
        if (end > previewLifetime) {
          end = previewLifetime
          start = Math.max(0, end - width)
        }
        return clampPlaybackRange({ start, end }, previewLifetime)
      })
    },
    [previewLifetime],
  )

  useEffect(() => {
    setPlaybackRange((previous) => {
      const next = clampPlaybackRange(
        {
          start: previous.start,
          end: previous.end <= 0 ? previewLifetime : previous.end,
        },
        previewLifetime,
      )
      if (isPlaybackRangeActive(previous, previewLifetime) && !isPlaybackRangeActive(next, previewLifetime)) {
        return defaultPlaybackRange(previewLifetime)
      }
      return next
    })
  }, [previewLifetime])

  useEffect(() => {
    if (!scene && !compositorMode) {
      setTimelineResetPoint(null)
      setPlaybackRange({ start: 0, end: 0 })
      return
    }
    setTimelineResetPoint((previous) => {
      if (previous === null) return null
      if (previous > previewLifetime) return null
      return previous
    })
  }, [compositorMode, previewLifetime, scene])

  const scrubTo = useCallback(
    (time: number) => {
      let clamped = Math.min(Math.max(time, 0), previewLifetime)
      if (stepPlaybackEnabledRef.current) {
        clamped = snapTimeToTimelineStep(
          clamped,
          stepPlaybackTimelineSecondsRef.current,
          previewLifetime,
        )
      }
      clamped = clampTimeToPlaybackRange(clamped, playbackRangeRef.current, previewLifetime)
      setCurrentTime(clamped)
      setPlaying(false)
    },
    [previewLifetime],
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

  const groundHitResolver = useMemo(() => {
    if (!showGround) return null
    const planeZ = groundPosition[2]
    const rootsRef = sceneRaycastRootsRef ?? { current: [] as Object3D[] }
    return createDynamicMeshGroundHitResolver(rootsRef, planeZ)
  }, [groundPosition, showGround, sceneRaycastRootsRef])

  const emitterEntries = useMemo((): VfxEmitterPreviewEntry[] => {
    const buildOptions = {
      vfxScale,
      assetIndex,
      lolCaches,
      vfxPositionEnabled,
      vfxPositionOffset,
      vfxGlobalRotationEnabled,
      vfxGlobalRotationOffsetDegrees,
      vfxLockMotionEnabled,
      vfxBirthRotationLoLEnabled,
      emitterVisibility,
      groundHitResolver,
      resolveBoneWorld: resolveBoneWorld ?? undefined,
      referenceBoneName,
      boundObjectSizeLol: boundObjectSizeLol ?? undefined,
    }

    if (compositorMode && catalogBuilt) {
      return compositorClips.flatMap((clip, clipIndex) => {
        const entry = catalogBuilt.entries.find((item) => item.id === clip.effectId)
        if (!entry) return []
        if (emitterVisibility[clip.effectId] === false) return []

        const localTime = localTimeForClip(currentTime, clip.offset)
        if (localTime >= entry.scene.lifetime) return []

        return buildEmitterPreviewEntries({
          ...buildOptions,
          emitters: entry.scene.emitters,
          sampleTime: localTime,
          visibilityKey: (emitterId) => compositorEmitterKey(clip.effectId, emitterId),
          entryIdPrefix: (emitterId) => `${compositorEmitterKey(clip.effectId, emitterId)}`,
          seedBase: 42 + clipIndex * 1000,
        })
      })
    }

    if (!scene) return []

    return buildEmitterPreviewEntries({
      ...buildOptions,
      emitters: scene.emitters,
      sampleTime: currentTime,
      visibilityKey: (emitterId) => emitterId,
      entryIdPrefix: (emitterId) => emitterId,
    })
  }, [
    assetIndex,
    catalogBuilt,
    compositorClips,
    compositorMode,
    currentTime,
    emitterVisibility,
    lolCaches,
    scene,
    vfxGlobalRotationEnabled,
    vfxGlobalRotationOffsetDegrees,
    vfxLockMotionEnabled,
    vfxPositionEnabled,
    vfxPositionOffset,
    vfxScale,
    showGround,
    groundPosition,
    groundHitResolver,
    resolveBoneWorld,
    referenceBoneName,
    boundObjectSizeLol,
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
    playbackSpeed,
    setPlaybackSpeed: setPlaybackSpeedClamped,
    playbackReverse,
    togglePlaybackReverse,
    stepPlaybackEnabled,
    stepPlaybackTimelineSeconds,
    stepPlaybackIntervalSeconds,
    toggleStepPlayback,
    setStepPlaybackTimelineSeconds: setStepPlaybackTimelineSecondsClamped,
    setStepPlaybackIntervalSeconds: setStepPlaybackIntervalSecondsClamped,
    timelineResetPoint,
    setTimelineResetPointAt,
    clearTimelineResetPoint,
    playbackRange,
    setPlaybackRangeStart,
    setPlaybackRangeEnd,
    movePlaybackRangeTo,
    clearPlaybackRange,
    selectedEffectIds,
    compositorMode,
    compositorLifetime,
    previewLifetime,
    compositorTimelineLayers,
    compositorClips,
    effectClipOffsets,
    toggleEffectSelection,
    addEffectToCompositor,
    removeEffectFromCompositor,
    setEffectClipOffset,
    focusCompositorEffect,
    toggleCompositorEffectVisibility,
  }
}
