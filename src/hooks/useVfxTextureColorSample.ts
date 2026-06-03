import { useEffect, useState } from 'react'

import type { RgbaColor } from '@/core/rgbaColor'
import {
  normalizeVec4Tuple,
  resolveEmitterEmbedRgba,
  VFX_RGBA_IDENTITY,
  type VfxRgbaTuple,
} from '@/core/vfx/vfxColor'
import { sampleDynamicsVec4 } from '@/core/vfx/vfxEmbedSample'
import {
  estimateEmitterDisplayColor,
  estimateTextureColorsFromUrls,
} from '@/core/vfx/vfxTextureColorSample'
import type { ParsedVfxEmitterFull } from '@/core/vfx/vfxModel'
import { isAdditiveBlendMode } from '@/core/vfx/vfxWebMaterials'

export type VfxTextureColorSampleResult = {
  embedRgba: VfxRgbaTuple
  birthRgba: VfxRgbaTuple
  colorRgba: VfxRgbaTuple
  combinedEmbedRgba: VfxRgbaTuple
  mainTexRgba: VfxRgbaTuple | null
  colorTexRgba: VfxRgbaTuple | null
  paletteRgba: VfxRgbaTuple | null
  multRgba: VfxRgbaTuple | null
  estimatedFinal: RgbaColor | null
  loading: boolean
}

export function useVfxTextureColorSample(input: {
  emitter: ParsedVfxEmitterFull | null
  particleNormalized: number
  textureUrl: string | null
  colorTextureUrl: string | null
  paletteTextureUrl: string | null
  multTextureUrl: string | null
}): VfxTextureColorSampleResult {
  const { emitter, particleNormalized, textureUrl, colorTextureUrl, paletteTextureUrl, multTextureUrl } =
    input

  const [textureSamples, setTextureSamples] = useState<{
    mainTexRgba: VfxRgbaTuple | null
    colorTexRgba: VfxRgbaTuple | null
    paletteRgba: VfxRgbaTuple | null
    multRgba: VfxRgbaTuple | null
  }>({
    mainTexRgba: null,
    colorTexRgba: null,
    paletteRgba: null,
    multRgba: null,
  })
  const [loading, setLoading] = useState(false)

  const birthRgba = normalizeVec4Tuple(
    sampleDynamicsVec4(emitter?.birthColor ?? null, particleNormalized, VFX_RGBA_IDENTITY),
  )
  const colorRgba = normalizeVec4Tuple(
    sampleDynamicsVec4(emitter?.color ?? null, particleNormalized, VFX_RGBA_IDENTITY),
  )
  const combinedEmbedRgba = emitter
    ? resolveEmitterEmbedRgba(emitter.color, emitter.birthColor, particleNormalized)
    : ([1, 1, 1, 1] as VfxRgbaTuple)

  useEffect(() => {
    if (!emitter) {
      setTextureSamples({
        mainTexRgba: null,
        colorTexRgba: null,
        paletteRgba: null,
        multRgba: null,
      })
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    void estimateTextureColorsFromUrls({
      textureUrl,
      colorTextureUrl,
      paletteTextureUrl,
      multTextureUrl,
    })
      .then((samples) => {
        if (!cancelled) {
          setTextureSamples(samples)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTextureSamples({
            mainTexRgba: null,
            colorTexRgba: null,
            paletteRgba: null,
            multRgba: null,
          })
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [emitter, textureUrl, colorTextureUrl, paletteTextureUrl, multTextureUrl])

  const estimatedFinal = emitter
    ? estimateEmitterDisplayColor({
        embedRgba: combinedEmbedRgba,
        mainTexRgba: textureSamples.mainTexRgba,
        colorTexRgba: textureSamples.colorTexRgba,
        paletteRgba: textureSamples.paletteRgba,
        multRgba: textureSamples.multRgba,
        isAdditive: isAdditiveBlendMode(emitter.blendMode),
      })
    : null

  return {
    embedRgba: combinedEmbedRgba,
    birthRgba,
    colorRgba,
    combinedEmbedRgba,
    ...textureSamples,
    estimatedFinal,
    loading,
  }
}
