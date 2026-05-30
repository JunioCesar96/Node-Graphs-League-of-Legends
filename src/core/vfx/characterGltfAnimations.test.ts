import { describe, expect, it } from 'vitest'
import { AnimationClip, NumberKeyframeTrack } from 'three'

import { listGltfAnimationNames } from './characterGltfAnimations'
import { normalizeGltfClips } from './characterGltfClips'

describe('characterGltfAnimations', () => {
  it('lists clip names from GLTF animations', () => {
    const clips = [
      new AnimationClip('aatrox_idle', 1, []),
      new AnimationClip('aatrox_dance', 2, []),
    ]
    expect(listGltfAnimationNames(clips)).toEqual(['aatrox_dance', 'aatrox_idle'])
  })

  it('does not merge multiple named lol2gltf clips', () => {
    const clips = [
      new AnimationClip('brand_idle', 1, [new NumberKeyframeTrack('Root.quaternion', [0], [0])]),
      new AnimationClip('brand_dance', 2, [new NumberKeyframeTrack('Root.quaternion', [0], [0])]),
    ]
    const normalized = normalizeGltfClips(clips, 'brand')
    expect(normalized).toHaveLength(2)
    expect(listGltfAnimationNames(clips)).toEqual(['brand_dance', 'brand_idle'])
  })
})
