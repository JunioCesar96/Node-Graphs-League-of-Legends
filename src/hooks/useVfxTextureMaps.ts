import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { DDSLoader } from 'three/examples/jsm/loaders/DDSLoader.js'

const ddsLoader = new DDSLoader()

export type VfxLoadedTexture = {
  texture: THREE.Texture
  isDds: boolean
}

function loadTextureFromUrl(url: string, isDds: boolean): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    if (isDds) {
      ddsLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace
          texture.needsUpdate = true
          resolve(texture)
        },
        undefined,
        reject,
      )
      return
    }

    const loader = new THREE.TextureLoader()
    loader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace
        texture.needsUpdate = true
        resolve(texture)
      },
      undefined,
      reject,
    )
  })
}

export function useVfxTextureMaps(
  urls: Array<{ url: string; isDds: boolean }>,
): THREE.Texture[] | null {
  const [textures, setTextures] = useState<THREE.Texture[] | null>(null)

  useEffect(() => {
    if (!urls.length) {
      setTextures(null)
      return
    }

    let cancelled = false
    setTextures(null)

    void Promise.all(urls.map((entry) => loadTextureFromUrl(entry.url, entry.isDds)))
      .then((loaded) => {
        if (!cancelled) setTextures(loaded)
      })
      .catch(() => {
        if (!cancelled) setTextures(null)
      })

    return () => {
      cancelled = true
    }
  }, [urls])

  return textures
}
