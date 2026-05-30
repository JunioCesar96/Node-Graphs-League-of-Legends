import { AnimationClip } from 'three'

const ANIMATION_NAME_HINT =
  /idle|dance|attack|run|walk|taunt|death|recall|channel|spell|crit|laugh|joke|cast|emote|homeguard/i

function clipNameLooksLikeBone(name: string, boneNames: Set<string>): boolean {
  const stem = name.split('.')[0]?.toLowerCase() ?? ''
  return boneNames.has(stem) || boneNames.has(name.toLowerCase())
}

function collectBoneNamesFromClips(clips: readonly AnimationClip[]): Set<string> {
  const names = new Set<string>()
  for (const clip of clips) {
    for (const track of clip.tracks) {
      const bone = track.name.split('.')[0]
      if (bone) names.add(bone.toLowerCase())
    }
  }
  return names
}

/** Normaliza clips GLTF — corrige exports antigos "1 clip por osso". */
export function normalizeGltfClips(clips: AnimationClip[], modelBaseName: string): AnimationClip[] {
  if (!clips?.length) return []

  const defaultName = (index: number) => {
    const raw = String(modelBaseName || '').replace(/^gltf_/i, '')
    if (raw && index === 0) return raw.split('_')[0] || raw
    return `anim_${index}`
  }

  const ensureClipNames = (list: AnimationClip[]) => {
    const used = new Set<string>()
    return list.map((clip, index) => {
      let name = clip.name != null ? String(clip.name).trim() : ''
      const boneFromTrack = clip.tracks[0]?.name?.split('.')[0]
      if (!name || name === boneFromTrack) name = defaultName(index)
      let unique = name
      let suffix = 2
      while (used.has(unique)) {
        unique = `${name}_${suffix}`
        suffix += 1
      }
      used.add(unique)
      if (clip.name !== unique) clip.name = unique
      return clip
    })
  }

  if (clips.length === 1) return ensureClipNames(clips.slice())

  const boneNames = collectBoneNamesFromClips(clips)

  const anyNamedLikeAnimation = clips.some((clip) => {
    const name = String(clip.name || '').trim()
    if (!name) return false
    if (ANIMATION_NAME_HINT.test(name)) return true
    return !clipNameLooksLikeBone(name, boneNames)
  })

  const looksLikePerBone =
    !anyNamedLikeAnimation &&
    clips.length > 2 &&
    clips.every((c) => {
      const n = c.tracks?.length || 0
      if (n === 0 || n > 2) return false
      return c.tracks.every((t) => t.name && /\.(position|quaternion|scale)$/.test(t.name))
    }) &&
    clips.every((c) => {
      const bone = c.tracks[0]?.name?.split('.')[0]
      return !c.name || c.name === bone
    })

  if (looksLikePerBone) {
    const tracks = clips.flatMap((c) => c.tracks)
    const duration = Math.max(...clips.map((c) => c.duration || 0), 0.001)
    return [new AnimationClip(defaultName(0), duration, tracks)]
  }

  return ensureClipNames(clips.slice())
}

export function animationNamesFromClips(clips: readonly AnimationClip[]): string[] {
  return clips
    .map((clip, index) => {
      const name = clip?.name ? String(clip.name).trim() : ''
      return name || `anim_${index}`
    })
    .filter((name) => name.length > 0)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
}

export function pickDefaultGltfAnimationName(names: readonly string[]): string | null {
  if (!names.length) return null
  const dance = names.find((name) => /dance/i.test(name))
  if (dance) return dance
  const idle = names.find((name) => /idle/i.test(name))
  if (idle) return idle
  return names[0] ?? null
}

export type GltfModelStats = {
  vertexCount: number
  triangleCount: number
  jointCount: number
}

export function countGltfModelStats(root: import('three').Object3D): GltfModelStats {
  let vertexCount = 0
  let triangleCount = 0
  let jointCount = 0

  root.traverse((obj) => {
    const mesh = obj as import('three').SkinnedMesh
    if (mesh.isSkinnedMesh && mesh.skeleton) {
      jointCount = Math.max(jointCount, mesh.skeleton.bones.length)
    }
    if ((obj as import('three').Mesh).isMesh && mesh.geometry?.attributes?.position) {
      const positions = mesh.geometry.attributes.position
      vertexCount += positions.count
      const index = mesh.geometry.index
      if (index) {
        triangleCount += Math.floor(index.count / 3)
      } else {
        triangleCount += Math.floor(positions.count / 3)
      }
    }
  })

  return { vertexCount, triangleCount, jointCount }
}

export function listGltfBoneNames(root: import('three').Object3D): string[] {
  const names: string[] = []
  root.traverse((obj) => {
    const mesh = obj as import('three').SkinnedMesh
    if (mesh.isSkinnedMesh && mesh.skeleton) {
      for (const bone of mesh.skeleton.bones) {
        if (bone.name) names.push(bone.name)
      }
    }
  })
  return [...new Set(names)]
}
