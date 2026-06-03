import { useEffect, useState } from 'react'
import {
  CubeReflectionMapping,
  CubeRefractionMapping,
  SRGBColorSpace,
  type CubeTexture,
} from 'three'
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js'

const ddsLoader = new DDSLoader()

function loadCubemapFromUrl(url: string, isDds: boolean): Promise<CubeTexture> {
  return new Promise((resolve, reject) => {
    if (isDds) {
      ddsLoader.load(
        url,
        (texture) => {
          texture.mapping = CubeReflectionMapping
          texture.colorSpace = SRGBColorSpace
          texture.needsUpdate = true
          resolve(texture as CubeTexture)
        },
        undefined,
        reject,
      )
      return
    }

    reject(new Error('Cubemap requer .dds'))
  })
}

export function useVfxCubemap(url: string | null, isDds: boolean): CubeTexture | null {
  const [cubemap, setCubemap] = useState<CubeTexture | null>(null)

  useEffect(() => {
    if (!url || !isDds) {
      setCubemap(null)
      return
    }

    let cancelled = false
    setCubemap(null)

    void loadCubemapFromUrl(url, isDds)
      .then((loaded) => {
        if (!cancelled) setCubemap(loaded)
      })
      .catch(() => {
        if (!cancelled) setCubemap(null)
      })

    return () => {
      cancelled = true
    }
  }, [isDds, url])

  return cubemap
}

/** Fallback se o DDS não for cubemap válido — evita crash no loader. */
export function applyCubemapMapping(texture: CubeTexture, additive: boolean): void {
  texture.mapping = additive ? CubeReflectionMapping : CubeRefractionMapping
}
