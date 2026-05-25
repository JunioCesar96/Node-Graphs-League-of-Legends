import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshStandardMaterial,
  NormalBlending,
  Quaternion,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
  Vector4,
} from 'three'

import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'
import { useVfxCubemap, applyCubemapMapping } from '@/hooks/useVfxCubemap'
import { useVfxTextureMaps } from '@/hooks/useVfxTextureMaps'
import { VFX_IMAGE_FRAGMENT_SHADER, VFX_IMAGE_VERTEX_SHADER } from '@/core/vfx/vfxImageShader'
import { composePlaneMeshQuaternion } from '@/core/vfx/vfxMeshTransform'
import type { VfxMaterialParams } from '@/core/vfx/vfxWebMaterials'
import { isAdditiveBlendMode } from '@/core/vfx/vfxWebMaterials'
import type { VfxEmitterFrameState } from '@/core/vfx/vfxWebAnimation'
import { applyAnmPoseToBones } from '@/core/vfx/lolSkinnedMesh'

function resolvePrimitiveGeometry(
  material: VfxMaterialParams,
  emitterName: string,
  meshPath: string | null,
) {
  if (material.primitiveKind === 'beam') return 'beam' as const
  if (material.primitiveKind === 'trail') return 'trail' as const
  if (material.primitiveKind === 'ray') return 'ray' as const
  if (material.primitiveKind === 'planar_projection') return 'plane' as const
  if (material.isBillboard) return 'plane' as const
  const name = emitterName.toLowerCase()
  const mesh = (meshPath ?? '').toLowerCase()
  if (mesh.includes('sphere') || name.includes('juice')) return 'sphere' as const
  if (mesh.includes('cyl') || name.includes('ring')) return 'cylinder' as const
  return 'plane' as const
}

function EmitterPrimitiveGeometry({
  kind,
}: {
  kind: ReturnType<typeof resolvePrimitiveGeometry>
}) {
  if (kind === 'beam') return <boxGeometry args={[0.2, 4, 0.2]} />
  if (kind === 'trail') return <boxGeometry args={[0.08, 6, 0.08]} />
  if (kind === 'ray') return <boxGeometry args={[0.12, 2.5, 0.12]} />
  if (kind === 'sphere') return <sphereGeometry args={[0.5, 24, 24]} />
  if (kind === 'cylinder') return <cylinderGeometry args={[0.5, 0.5, 0.12, 32, 1, true]} />
  return <planeGeometry args={[1, 1]} />
}

function applyEmitterMeshTransform(
  mesh: Mesh,
  material: VfxMaterialParams,
  frame: VfxEmitterFrameState,
  cameraQuaternion: Quaternion,
  vfxCamLockEnabled: boolean,
  planeQuatRef: MutableRefObject<Quaternion>,
): void {
  const planeQuat = composePlaneMeshQuaternion(material.planeBaseRotation, frame.rotation)
  planeQuatRef.current.copy(planeQuat)

  const useCamLock =
    material.isBillboard && vfxCamLockEnabled && !material.isGroundLayer

  if (useCamLock) {
    mesh.quaternion.copy(cameraQuaternion).multiply(planeQuatRef.current)
  } else {
    mesh.quaternion.copy(planeQuatRef.current)
  }
}

function spriteUvParams(material: VfxMaterialParams): { offset: [number, number]; repeat: [number, number] } {
  const cols = Math.max(1, material.spriteCols)
  const rows = Math.max(1, material.spriteRows)
  const col = (((material.spriteOffset[0] % cols) + cols) % cols) / cols
  const row = (((material.spriteOffset[1] % rows) + rows) % rows) / rows
  return {
    offset: [col + material.uvScroll[0], row + material.uvScroll[1]],
    repeat: [1 / cols, 1 / rows],
  }
}

type TexturedEmitterProps = Omit<EmitterSurfaceProps, 'meshOnly'>

function VfxTexturedEmitterInner({ entry, wireframe, vfxCamLockEnabled }: TexturedEmitterProps) {
  const meshRef = useRef<Mesh>(null)
  const planeQuatRef = useRef(new Quaternion())
  const { frame, material } = entry
  const primitiveKind = useMemo(
    () => resolvePrimitiveGeometry(material, entry.name, entry.meshPath),
    [entry.meshPath, entry.name, material],
  )
  const meshGeometry = entry.meshGeometry

  const urlEntries = useMemo(() => {
    const entries: Array<{ url: string; isDds: boolean }> = []
    if (material.textureUrl) entries.push({ url: material.textureUrl, isDds: material.textureIsDds })
    if (material.colorTextureUrl) {
      entries.push({ url: material.colorTextureUrl, isDds: material.colorTextureIsDds })
    }
    if (material.textureMultUrl) {
      entries.push({ url: material.textureMultUrl, isDds: material.textureMultIsDds })
    }
    if (material.paletteTextureUrl) {
      entries.push({ url: material.paletteTextureUrl, isDds: material.paletteTextureIsDds })
    }
    if (material.erosionTextureUrl) {
      entries.push({ url: material.erosionTextureUrl, isDds: material.erosionTextureIsDds })
    }
    return entries
  }, [
    material.colorTextureIsDds,
    material.colorTextureUrl,
    material.paletteTextureIsDds,
    material.paletteTextureUrl,
    material.textureIsDds,
    material.textureMultIsDds,
    material.textureMultUrl,
    material.textureUrl,
  ])

  const textures = useVfxTextureMaps(urlEntries)
  const cubemap = useVfxCubemap(material.reflectionCubeUrl, material.reflectionCubeIsDds)

  useEffect(() => {
    if (cubemap) applyCubemapMapping(cubemap, material.isAdditive)
  }, [cubemap, material.isAdditive])

  const maps = useMemo(() => {
    if (!textures?.length) return null

    let textureIndex = 0
    const mainMap = textures[textureIndex]!
    textureIndex += 1
    const colorMap = material.colorTextureUrl ? textures[textureIndex++] : null
    const multMap = material.textureMultUrl ? textures[textureIndex++] : null
    const paletteMap = material.paletteTextureUrl ? textures[textureIndex++] : null
    const erosionMap = material.erosionTextureUrl ? textures[textureIndex++] : null

    const sprite = spriteUvParams(material)
    mainMap.wrapS = RepeatWrapping
    mainMap.wrapT = RepeatWrapping
    mainMap.repeat.set(sprite.repeat[0], sprite.repeat[1])
    mainMap.offset.set(sprite.offset[0], sprite.offset[1])
    if (colorMap) {
      colorMap.wrapS = RepeatWrapping
      colorMap.wrapT = RepeatWrapping
      colorMap.repeat.set(sprite.repeat[0], sprite.repeat[1])
      colorMap.offset.set(sprite.offset[0], sprite.offset[1])
    }
    if (multMap) {
      multMap.wrapS = RepeatWrapping
      multMap.wrapT = RepeatWrapping
      multMap.offset.set(material.uvMultOffset[0], material.uvMultOffset[1])
      multMap.repeat.set(material.uvScale[0], material.uvScale[1])
      multMap.needsUpdate = true
    }
    if (paletteMap) {
      paletteMap.wrapS = RepeatWrapping
      paletteMap.wrapT = RepeatWrapping
      paletteMap.needsUpdate = true
    }

    return { mainMap, colorMap, multMap, paletteMap, erosionMap }
  }, [material, textures])

  const shaderMaterial = useMemo(() => {
    if (!maps) return null

    const { mainMap, colorMap, multMap, paletteMap, erosionMap } = maps
    const useColorLookUp = Boolean(material.colorLookUpScales)
    const cols = Math.max(1, material.spriteCols)
    const rows = Math.max(1, material.spriteRows)

    return new ShaderMaterial({
      uniforms: {
        uMap: { value: mainMap },
        uColorMap: { value: colorMap ?? mainMap },
        uMultMap: { value: multMap ?? mainMap },
        uPaletteMap: { value: paletteMap ?? mainMap },
        uHasColor: { value: Boolean(colorMap) },
        uHasMult: { value: Boolean(multMap) },
        uHasPalette: { value: Boolean(paletteMap) },
        uPaletteCount: { value: material.paletteCount },
        uPaletteSelector: { value: material.paletteSelector },
        uPaletteMixMask: {
          value: new Vector4(
            material.paletteMixMask[0],
            material.paletteMixMask[1],
            material.paletteMixMask[2],
            material.paletteMixMask[3],
          ),
        },
        uSpriteOffset: {
          value: new Vector2(
            (((material.spriteOffset[0] % cols) + cols) % cols) / cols,
            (((material.spriteOffset[1] % rows) + rows) % rows) / rows,
          ),
        },
        uUvScroll: { value: new Vector2(material.uvScroll[0], material.uvScroll[1]) },
        uUvMultOffset: { value: new Vector2(material.uvMultOffset[0], material.uvMultOffset[1]) },
        uSpriteRepeat: { value: new Vector2(1 / cols, 1 / rows) },
        uMultRepeat: { value: new Vector2(material.uvScale[0], material.uvScale[1]) },
        uTint: { value: new Color(material.baseColor[0], material.baseColor[1], material.baseColor[2]) },
        uOpacity: { value: material.opacity },
        uAdditive: { value: material.isAdditive },
        uEmissiveStrength: { value: material.emissiveStrength },
        uFresnel: { value: material.fresnel },
        uFresnelColor: {
          value: new Color(material.fresnelColor[0], material.fresnelColor[1], material.fresnelColor[2]),
        },
        uEnvMap: { value: cubemap ?? mainMap },
        uHasEnvMap: { value: Boolean(cubemap) },
        uReflectMix: { value: material.reflectionMix },
        uUvRotation: { value: material.uvRotation },
        uFlipNormal: { value: material.flipNormals ? 1 : 0 },
        uAlphaCutoff: { value: material.alphaCutoff },
        uAlphaTest: { value: material.alphaTest },
        uUseColorLookUp: { value: useColorLookUp },
        uColorLookUpScales: {
          value: new Vector2(
            material.colorLookUpScales?.[0] ?? 1,
            material.colorLookUpScales?.[1] ?? 1,
          ),
        },
        uColorLookUpTypeX: { value: material.colorLookUpTypeX },
        uColorLookUpTypeY: { value: material.colorLookUpTypeY },
        uErosionMap: { value: erosionMap ?? mainMap },
        uHasErosion: { value: Boolean(erosionMap) },
        uErosionDrive: { value: material.erosionDrive },
        uErosionChannelMixer: {
          value: new Vector4(
            material.erosionChannelMixer[0],
            material.erosionChannelMixer[1],
            material.erosionChannelMixer[2],
            material.erosionChannelMixer[3],
          ),
        },
      },
      depthWrite: material.depthWrite,
      vertexShader: VFX_IMAGE_VERTEX_SHADER,
      fragmentShader: VFX_IMAGE_FRAGMENT_SHADER,
      transparent: true,
      side: DoubleSide,
      blending: material.isAdditive ? AdditiveBlending : NormalBlending,
      wireframe,
    })
  }, [cubemap, maps, material, wireframe])

  useFrame(({ camera }) => {
    if (!shaderMaterial || !meshRef.current) return
    applyEmitterMeshTransform(
      meshRef.current,
      material,
      frame,
      camera.quaternion,
      vfxCamLockEnabled,
      planeQuatRef,
    )

    const cols = Math.max(1, material.spriteCols)
    const rows = Math.max(1, material.spriteRows)
    shaderMaterial.uniforms.uSpriteOffset.value.set(
      (((material.spriteOffset[0] % cols) + cols) % cols) / cols,
      (((material.spriteOffset[1] % rows) + rows) % rows) / rows,
    )
    shaderMaterial.uniforms.uUvScroll.value.set(material.uvScroll[0], material.uvScroll[1])
    shaderMaterial.uniforms.uUvMultOffset.value.set(material.uvMultOffset[0], material.uvMultOffset[1])
    shaderMaterial.uniforms.uOpacity.value = material.opacity
    shaderMaterial.uniforms.uTint.value.set(material.baseColor[0], material.baseColor[1], material.baseColor[2])
    shaderMaterial.uniforms.uEmissiveStrength.value = material.emissiveStrength
    shaderMaterial.uniforms.uFresnel.value = material.fresnel
    shaderMaterial.uniforms.uFresnelColor.value.set(
      material.fresnelColor[0],
      material.fresnelColor[1],
      material.fresnelColor[2],
    )
    if (cubemap) shaderMaterial.uniforms.uEnvMap.value = cubemap
    shaderMaterial.uniforms.uHasEnvMap.value = Boolean(cubemap)
    shaderMaterial.uniforms.uReflectMix.value = material.reflectionMix
    shaderMaterial.uniforms.uUvRotation.value = material.uvRotation
    shaderMaterial.uniforms.uFlipNormal.value = material.flipNormals ? 1 : 0
    shaderMaterial.uniforms.uAlphaCutoff.value = material.alphaCutoff
    shaderMaterial.uniforms.uAlphaTest.value = material.alphaTest
    shaderMaterial.uniforms.uHasPalette.value = Boolean(material.paletteTextureUrl)
    shaderMaterial.uniforms.uPaletteCount.value = material.paletteCount
    shaderMaterial.uniforms.uPaletteSelector.value = material.paletteSelector
    shaderMaterial.uniforms.uPaletteMixMask.value.set(
      material.paletteMixMask[0],
      material.paletteMixMask[1],
      material.paletteMixMask[2],
      material.paletteMixMask[3],
    )
    shaderMaterial.uniforms.uErosionDrive.value = material.erosionDrive
    shaderMaterial.uniforms.uUseColorLookUp.value = Boolean(material.colorLookUpScales)
    shaderMaterial.depthWrite = material.depthWrite
  })

  if (!shaderMaterial) {
    return <VfxSolidEmitter entry={entry} vfxCamLockEnabled={vfxCamLockEnabled} wireframe={wireframe} />
  }

  return (
    <group position={frame.position}>
      <mesh
        ref={meshRef}
        geometry={meshGeometry ?? undefined}
        renderOrder={material.renderOrder}
        scale={frame.scale}
        material={shaderMaterial}
      >
        {!meshGeometry ? <EmitterPrimitiveGeometry kind={primitiveKind} /> : null}
      </mesh>
    </group>
  )
}

const MESH_ONLY_COLOR = '#5ec8be'
const MESH_ONLY_EMISSIVE = '#1a4a44'

type EmitterSurfaceProps = {
  entry: VfxEmitterPreviewEntry
  meshOnly: boolean
  wireframe: boolean
  vfxCamLockEnabled: boolean
}

function VfxMeshOnlyEmitter({ entry, wireframe, vfxCamLockEnabled }: EmitterSurfaceProps) {
  const meshRef = useRef<Mesh>(null)
  const planeQuatRef = useRef(new Quaternion())
  const { frame, material } = entry
  const primitiveKind = useMemo(
    () => resolvePrimitiveGeometry(material, entry.name, entry.meshPath),
    [entry.meshPath, entry.name, material],
  )
  const meshGeometry = entry.meshGeometry

  useFrame(({ camera }) => {
    if (!meshRef.current) return
    applyEmitterMeshTransform(
      meshRef.current,
      material,
      frame,
      camera.quaternion,
      vfxCamLockEnabled,
      planeQuatRef,
    )
  })

  return (
    <group position={frame.position}>
      <mesh
        ref={meshRef}
        geometry={meshGeometry ?? undefined}
        renderOrder={material.renderOrder}
        scale={frame.scale}
      >
        {!meshGeometry ? <EmitterPrimitiveGeometry kind={primitiveKind} /> : null}
        <meshStandardMaterial
          color={MESH_ONLY_COLOR}
          depthWrite
          emissive={MESH_ONLY_EMISSIVE}
          emissiveIntensity={0.35}
          metalness={0.15}
          roughness={0.55}
          side={DoubleSide}
          wireframe={wireframe}
        />
      </mesh>
    </group>
  )
}

function VfxMeshOnlySkinnedEmitter({ entry, wireframe }: Omit<EmitterSurfaceProps, 'vfxCamLockEnabled'>) {
  const { frame, material } = entry

  const skinnedMesh = useMemo(() => {
    if (!entry.skinnedBundle) return null
    const cloned = entry.skinnedBundle.mesh.clone()
    cloned.bind(cloned.skeleton)
    return cloned
  }, [entry.skinnedBundle])

  const surfaceMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: MESH_ONLY_COLOR,
        depthWrite: true,
        emissive: MESH_ONLY_EMISSIVE,
        emissiveIntensity: 0.35,
        metalness: 0.15,
        roughness: 0.55,
        side: DoubleSide,
        wireframe,
      }),
    [wireframe],
  )

  useFrame(() => {
    if (!skinnedMesh || !entry.anm || !entry.skl) return
    applyAnmPoseToBones(skinnedMesh.skeleton.bones, entry.skl, entry.anm, entry.skinnedAnimFrame)
    skinnedMesh.skeleton.update()
  })

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose()
    }
  }, [surfaceMaterial])

  if (!skinnedMesh) return null

  return (
    <skinnedMesh
      geometry={skinnedMesh.geometry}
      material={surfaceMaterial}
      position={frame.position}
      renderOrder={material.renderOrder}
      rotation={frame.rotation}
      scale={frame.scale}
      skeleton={skinnedMesh.skeleton}
    />
  )
}

function VfxSolidEmitter({ entry, wireframe, vfxCamLockEnabled }: TexturedEmitterProps) {
  const meshRef = useRef<Mesh>(null)
  const planeQuatRef = useRef(new Quaternion())
  const { frame, material } = entry
  const primitiveKind = useMemo(
    () => resolvePrimitiveGeometry(material, entry.name, entry.meshPath),
    [entry.meshPath, entry.name, material],
  )
  const meshGeometry = entry.meshGeometry
  const color = material.baseColor
  const additive = isAdditiveBlendMode(material.blendMode)

  useFrame(({ camera }) => {
    if (!meshRef.current) return
    applyEmitterMeshTransform(
      meshRef.current,
      material,
      frame,
      camera.quaternion,
      vfxCamLockEnabled,
      planeQuatRef,
    )
  })

  return (
    <group position={frame.position}>
      <mesh
        ref={meshRef}
        geometry={meshGeometry ?? undefined}
        renderOrder={material.renderOrder}
        scale={frame.scale}
      >
        {!meshGeometry ? <EmitterPrimitiveGeometry kind={primitiveKind} /> : null}
        <meshBasicMaterial
        color={new Color(
          color[0] * material.emissiveStrength,
          color[1] * material.emissiveStrength,
          color[2] * material.emissiveStrength,
        )}
        opacity={material.opacity}
        transparent
        depthWrite={material.depthWrite}
        side={DoubleSide}
        wireframe={wireframe}
        blending={additive ? AdditiveBlending : NormalBlending}
        />
      </mesh>
    </group>
  )
}

function VfxSkinnedEmitter({ entry, wireframe }: Omit<TexturedEmitterProps, 'vfxCamLockEnabled'>) {
  const { frame, material } = entry

  const skinnedMesh = useMemo(() => {
    if (!entry.skinnedBundle) return null
    const cloned = entry.skinnedBundle.mesh.clone()
    cloned.bind(cloned.skeleton)
    return cloned
  }, [entry.skinnedBundle])

  const surfaceMaterial = useMemo(() => {
    const color = material.baseColor
    const additive = isAdditiveBlendMode(material.blendMode)
    return new MeshStandardMaterial({
      color: new Color(color[0], color[1], color[2]),
      emissive: new Color(color[0] * 0.25, color[1] * 0.25, color[2] * 0.25),
      metalness: 0.1,
      roughness: 0.55,
      transparent: true,
      opacity: material.opacity,
      depthWrite: false,
      side: DoubleSide,
      wireframe,
      blending: additive ? AdditiveBlending : NormalBlending,
    })
  }, [material, wireframe])

  useFrame(() => {
    if (!skinnedMesh || !entry.anm || !entry.skl) return
    applyAnmPoseToBones(skinnedMesh.skeleton.bones, entry.skl, entry.anm, entry.skinnedAnimFrame)
    skinnedMesh.skeleton.update()
  })

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose()
    }
  }, [surfaceMaterial])

  if (!skinnedMesh) return null

  return (
    <skinnedMesh
      geometry={skinnedMesh.geometry}
      material={surfaceMaterial}
      position={frame.position}
      renderOrder={material.renderOrder}
      rotation={frame.rotation}
      scale={frame.scale}
      skeleton={skinnedMesh.skeleton}
    />
  )
}

export function VfxEmitterSurface({ entry, meshOnly, wireframe, vfxCamLockEnabled }: EmitterSurfaceProps) {
  if (meshOnly) {
    if (entry.skinnedBundle) {
      return <VfxMeshOnlySkinnedEmitter entry={entry} meshOnly wireframe={wireframe} vfxCamLockEnabled={false} />
    }
    return (
      <VfxMeshOnlyEmitter
        entry={entry}
        meshOnly
        vfxCamLockEnabled={vfxCamLockEnabled}
        wireframe={wireframe}
      />
    )
  }

  if (entry.skinnedBundle) {
    return <VfxSkinnedEmitter entry={entry} meshOnly={false} wireframe={wireframe} vfxCamLockEnabled={vfxCamLockEnabled} />
  }

  const hasTexture =
    Boolean(entry.material.textureUrl) ||
    Boolean(entry.material.colorTextureUrl) ||
    Boolean(entry.material.textureMultUrl) ||
    Boolean(entry.material.paletteTextureUrl)

  if (hasTexture) {
    return (
      <VfxTexturedEmitterInner entry={entry} vfxCamLockEnabled={vfxCamLockEnabled} wireframe={wireframe} />
    )
  }
  return <VfxSolidEmitter entry={entry} vfxCamLockEnabled={vfxCamLockEnabled} wireframe={wireframe} />
}
