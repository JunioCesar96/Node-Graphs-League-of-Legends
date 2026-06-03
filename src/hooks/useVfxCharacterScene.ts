import { useCallback, useEffect, useMemo, useState } from 'react'

import { getCharacterNames } from '@/core/characterList'
import { LangId, type LangIdValue } from '@/core/language/languageIds'
import {
  buildConvertedBaseNameSet,
  fetchConvertedModels,
  getGltfUrl,
  isChampionInConvertedSet,
} from '@/core/vfx/characterGltfCatalog'
import { convertCharacterToGltf } from '@/core/vfx/characterGltfConvert'
import {
  pickDefaultGltfAnimationName,
  type GltfModelStats,
} from '@/core/vfx/characterGltfClips'
import { fetchGltfAnimationNames } from '@/core/vfx/characterGltfAnimations'
import { championToGltfBaseName } from '@/core/vfx/characterGltfNaming'
import { defaultChampionSknRelativePath } from '@/core/vfx/vfxCharacterAssets'
import type { VfxCharacterBoneResolver } from '@/core/vfx/vfxWebAnimation'

export type VfxCharacterGltfReadyPayload = {
  clipNames: string[]
  stats: GltfModelStats
  boneNames: string[]
  boundObjectSizeLol: [number, number, number]
}

export type VfxCharacterLogMessage = {
  langId: LangIdValue
  vars?: Record<string, string | number>
}

export type VfxCharacterBoneApi = {
  resolveBoneWorld: VfxCharacterBoneResolver
}

/** Malha: pose animada vs bind (estilo Blender Rest Position). */
export type VfxCharacterMeshPoseMode = 'pose' | 'rest'

export type VfxCharacterGltfState = {
  champion: string
  url: string
  baseName: string
}

export type UseVfxCharacterSceneOptions = {
  /** Indexa SKN/SKL/ANM/texturas do campeão na pasta assets; devolve caches actualizados. */
  onIndexCharacter?: (champion: string) => Promise<unknown | null>
  /** Coleta ficheiros brutos do campeão na pasta assets (para conversão lol2gltf). */
  onCollectCharacterFiles?: (champion: string) => Promise<File[] | null>
}

export function useVfxCharacterScene({
  onIndexCharacter,
  onCollectCharacterFiles,
}: UseVfxCharacterSceneOptions) {
  const [characterNames, setCharacterNames] = useState<string[]>([])
  const [selectedChampion, setSelectedChampion] = useState('Aatrox')
  const [instantiated, setInstantiated] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [showWireframe, setShowWireframe] = useState(false)
  const [flatLighting, setFlatLighting] = useState(true)
  const [meshPoseMode, setMeshPoseMode] = useState<VfxCharacterMeshPoseMode>('pose')
  const [referenceBoneName, setReferenceBoneName] = useState<string | null>(null)
  const [animationName, setAnimationName] = useState<string | null>(null)
  const [animationNames, setAnimationNames] = useState<string[]>([])
  const [instantiateError, setInstantiateError] = useState<VfxCharacterLogMessage | null>(null)
  const [conversionStatus, setConversionStatus] = useState<VfxCharacterLogMessage | null>(null)
  const [boneApi, setBoneApi] = useState<VfxCharacterBoneApi | null>(null)
  const [pendingInstantiate, setPendingInstantiate] = useState(false)
  const [conversionPending, setConversionPending] = useState(false)
  const [cameraFitKey, setCameraFitKey] = useState(0)
  const [convertedModels, setConvertedModels] = useState<Set<string>>(() => new Set())
  const [gltfModel, setGltfModel] = useState<VfxCharacterGltfState | null>(null)
  const [modelStats, setModelStats] = useState<GltfModelStats | null>(null)
  const [boneNames, setBoneNames] = useState<string[]>([])

  const [animSyncVfx, setAnimSyncVfx] = useState(false)
  const [animPlaying, setAnimPlaying] = useState(false)
  const [animTime, setAnimTime] = useState(0)
  const [animPlayRate, setAnimPlayRate] = useState(1)
  const [animDurationSeconds, setAnimDurationSeconds] = useState(0)
  const [characterEngineResizeEnabled, setCharacterEngineResizeEnabled] = useState(true)
  const [characterEngineRotationEnabled, setCharacterEngineRotationEnabled] = useState(true)
  const [boundObjectSizeLol, setBoundObjectSizeLol] = useState<[number, number, number] | null>(
    null,
  )

  const refreshConvertedModels = useCallback(async () => {
    const models = await fetchConvertedModels()
    setConvertedModels(buildConvertedBaseNameSet(models))
    return models
  }, [])

  useEffect(() => {
    void getCharacterNames().then((names) => {
      if (names.length) setCharacterNames([...names])
    })
    void refreshConvertedModels()
  }, [refreshConvertedModels])

  const isSelectedConverted = useMemo(
    () => isChampionInConvertedSet(selectedChampion, convertedModels),
    [convertedModels, selectedChampion],
  )

  useEffect(() => {
    if (!isSelectedConverted) {
      if (!gltfModel) setAnimationNames([])
      return
    }

    let cancelled = false
    void fetchGltfAnimationNames(selectedChampion)
      .then((names) => {
        if (cancelled || names.length === 0) return
        setAnimationNames(names)
        setAnimationName((current) => {
          if (current && names.includes(current)) return current
          return pickDefaultGltfAnimationName(names)
        })
      })
      .catch((error) => {
        console.warn('[VFX Character] Falha ao listar animações GLTF:', error)
      })

    return () => {
      cancelled = true
    }
  }, [gltfModel, isSelectedConverted, selectedChampion])

  useEffect(() => {
    if (!animationNames.length) {
      setAnimationName(null)
      return
    }
    if (animationName && animationNames.includes(animationName)) return
    setAnimationName(pickDefaultGltfAnimationName(animationNames))
  }, [animationName, animationNames])

  useEffect(() => {
    if (!boneNames.length) return
    if (referenceBoneName && boneNames.includes(referenceBoneName)) return
    setReferenceBoneName(boneNames[0] ?? null)
  }, [boneNames, referenceBoneName])

  useEffect(() => {
    if (animSyncVfx || !animPlaying || animDurationSeconds <= 0) return

    let raf = 0
    let last = performance.now()

    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      setAnimTime((previous) => {
        const next = previous + dt * animPlayRate
        return animDurationSeconds > 0 ? next % animDurationSeconds : next
      })
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [animDurationSeconds, animPlayRate, animPlaying, animSyncVfx])

  const resolveAnimTimeSeconds = useCallback(
    (vfxTimelineTime: number): number => {
      return animSyncVfx ? vfxTimelineTime : animTime
    },
    [animSyncVfx, animTime],
  )

  const resolveAnimFrameIndex = useCallback(
    (vfxTimelineTime: number): number => {
      if (animDurationSeconds <= 0) return 0
      const fps = 30
      const timeSeconds = resolveAnimTimeSeconds(vfxTimelineTime)
      return Math.max(0, Math.floor(timeSeconds * fps))
    },
    [animDurationSeconds, resolveAnimTimeSeconds],
  )

  const registerBoneApi = useCallback((api: VfxCharacterBoneApi | null) => {
    setBoneApi(api)
  }, [])

  const handleGltfReady = useCallback((payload: VfxCharacterGltfReadyPayload) => {
    setAnimationNames(payload.clipNames)
    setModelStats(payload.stats)
    setBoneNames(payload.boneNames)
    setBoundObjectSizeLol(payload.boundObjectSizeLol)
    setAnimationName((current) => {
      if (current && payload.clipNames.includes(current)) return current
      return pickDefaultGltfAnimationName(payload.clipNames)
    })
  }, [])

  const handleEngineBoundSize = useCallback((size: [number, number, number] | null) => {
    setBoundObjectSizeLol(size)
  }, [])

  const setActiveClipDuration = useCallback((duration: number) => {
    setAnimDurationSeconds(duration > 0 ? duration : 0)
  }, [])

  const loadGltfForChampion = useCallback((champion: string) => {
    const baseName = championToGltfBaseName(champion)
    setGltfModel({
      champion,
      url: getGltfUrl(champion),
      baseName,
    })
    setInstantiated(true)
    setInstantiateError(null)
    setConversionStatus(null)
    setCameraFitKey((key) => key + 1)
  }, [])

  const collectFilesForConversion = useCallback(
    async (champion: string): Promise<File[]> => {
      let files = (await onCollectCharacterFiles?.(champion)) ?? []
      if (files.length > 0) return files

      await onIndexCharacter?.(champion)
      files = (await onCollectCharacterFiles?.(champion)) ?? []
      return files
    },
    [onCollectCharacterFiles, onIndexCharacter],
  )

  const runGltfConversion = useCallback(
    async (champion: string) => {
      setPendingInstantiate(true)
      setConversionPending(true)
      setConversionStatus({ langId: LangId.VfxCharacterLogConverting })

      try {
        const files = await collectFilesForConversion(champion)
        if (!files.length) {
          setInstantiateError({
            langId: LangId.VfxCharacterLogMeshNotFound,
            vars: {
              champion,
              path: defaultChampionSknRelativePath(champion),
            },
          })
          setInstantiated(false)
          return false
        }

        await convertCharacterToGltf(champion, files)
        await refreshConvertedModels()
        setConversionStatus({ langId: LangId.VfxCharacterLogGltfLoaded })
        return true
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        if (/LOL2GLTF_NOT_FOUND|lol2gltf/i.test(message)) {
          setInstantiateError({ langId: LangId.VfxCharacterLogLol2gltfMissing })
        } else {
          setInstantiateError({
            langId: LangId.VfxCharacterLogConvertFailed,
            vars: { champion, message },
          })
        }
        setInstantiated(false)
        console.error('[VFX Character] GLTF conversion failed:', error)
        return false
      } finally {
        setPendingInstantiate(false)
        setConversionPending(false)
      }
    },
    [collectFilesForConversion, refreshConvertedModels],
  )

  const instantiateExistingGltf = useCallback(() => {
    setInstantiateError(null)
    setConversionStatus(null)
    loadGltfForChampion(selectedChampion)
  }, [loadGltfForChampion, selectedChampion])

  const reconvertAndInstantiateGltf = useCallback(async () => {
    setInstantiateError(null)
    setConversionStatus(null)
    const ok = await runGltfConversion(selectedChampion)
    if (ok) loadGltfForChampion(selectedChampion)
  }, [loadGltfForChampion, runGltfConversion, selectedChampion])

  const instantiateInScene = useCallback(async () => {
    setInstantiateError(null)
    setConversionStatus(null)

    if (isChampionInConvertedSet(selectedChampion, convertedModels)) {
      return
    }

    if (!onCollectCharacterFiles && !onIndexCharacter) {
      setInstantiateError({
        langId: LangId.VfxCharacterLogMeshNotFound,
        vars: {
          champion: selectedChampion,
          path: defaultChampionSknRelativePath(selectedChampion),
        },
      })
      setInstantiated(false)
      return
    }

    const ok = await runGltfConversion(selectedChampion)
    if (ok) loadGltfForChampion(selectedChampion)
  }, [
    convertedModels,
    loadGltfForChampion,
    onCollectCharacterFiles,
    onIndexCharacter,
    runGltfConversion,
    selectedChampion,
  ])

  const removeFromScene = useCallback(() => {
    setInstantiated(false)
    setGltfModel(null)
    setBoneApi(null)
    setInstantiateError(null)
    setConversionStatus(null)
    setAnimPlaying(false)
    setAnimTime(0)
    setAnimationNames([])
    setAnimationName(null)
    setModelStats(null)
    setBoneNames([])
    setBoundObjectSizeLol(null)
    setAnimDurationSeconds(0)
  }, [])

  const resetAnimation = useCallback(() => {
    setAnimPlaying(false)
    setAnimTime(0)
  }, [])

  const requestCameraFit = useCallback(() => {
    setCameraFitKey((key) => key + 1)
  }, [])

  return {
    characterNames,
    selectedChampion,
    setSelectedChampion,
    instantiated,
    showSkeleton,
    setShowSkeleton,
    showWireframe,
    setShowWireframe,
    flatLighting,
    setFlatLighting,
    meshPoseMode,
    setMeshPoseMode,
    referenceBoneName,
    setReferenceBoneName,
    animationName,
    setAnimationName,
    animationNames,
    animSyncVfx,
    setAnimSyncVfx,
    animPlaying,
    setAnimPlaying,
    animTime,
    setAnimTime,
    animPlayRate,
    setAnimPlayRate,
    animDurationSeconds,
    setActiveClipDuration,
    resolveAnimTimeSeconds,
    resolveAnimFrameIndex,
    resetAnimation,
    modelStats,
    gltfModel,
    convertedModels,
    isSelectedConverted,
    baseTexture: null,
    loadscreenTexture: null,
    boneNames,
    instantiateError,
    conversionStatus,
    pendingInstantiate,
    conversionPending,
    boneApi,
    boundObjectSizeLol,
    characterEngineResizeEnabled,
    setCharacterEngineResizeEnabled,
    characterEngineRotationEnabled,
    setCharacterEngineRotationEnabled,
    registerBoneApi,
    handleGltfReady,
    handleEngineBoundSize,
    instantiateInScene,
    instantiateExistingGltf,
    reconvertAndInstantiateGltf,
    removeFromScene,
    cameraFitKey,
    requestCameraFit,
    refreshConvertedModels,
  }
}
