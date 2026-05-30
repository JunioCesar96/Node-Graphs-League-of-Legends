import { AnimationClip } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

import { getGltfUrl } from './characterGltfCatalog'

const loader = new GLTFLoader()

/** Nomes dos clips tal como vêm do GLTF (sem merge/normalize). */
export function listGltfAnimationNames(clips: readonly AnimationClip[]): string[] {
  return clips
    .map((clip, index) => {
      const name = clip.name != null ? String(clip.name).trim() : ''
      return name || `anim_${index}`
    })
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}

/** Carrega só os metadados de animação do GLB (via GLTFLoader). */
export async function fetchGltfAnimationNames(champion: string): Promise<string[]> {
  const url = getGltfUrl(champion)
  const gltf = await loader.loadAsync(url)
  return listGltfAnimationNames(gltf.animations)
}
