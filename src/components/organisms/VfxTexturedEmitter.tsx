import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import type { BufferGeometry, Group, Mesh } from 'three'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  NormalBlending,
  Quaternion,
  ClampToEdgeWrapping,
  RepeatWrapping,
  ShaderMaterial,
  Vector2,
  Vector4,
} from 'three'

import type { VfxEmitterPreviewEntry } from '@/hooks/useVfxPreview'
import { useVfxCubemap, applyCubemapMapping } from '@/hooks/useVfxCubemap'
import { useVfxTextureMaps } from '@/hooks/useVfxTextureMaps'
import { VFX_IMAGE_FRAGMENT_SHADER, VFX_IMAGE_VERTEX_SHADER } from '@/core/vfx/vfxImageShader'
import { applyParticleWorldTransform } from '@/core/vfx/vfxMeshTransform'
import type { ShaderMaterialDescriptor } from '@/core/vfx/vfxWebMaterials'
import { isAdditiveBlendMode } from '@/core/vfx/vfxWebMaterials'
import { getVfxPrimitivePlaceholderMaterial } from '@/core/vfx/vfxPrimitiveMeshPool'
import { useVfxEmitterPrimitiveGeometry } from '@/hooks/useVfxEmitterPrimitiveGeometry'
import { applyAnmPoseToBones } from '@/core/vfx/lolSkinnedMesh'

import { VFX_RENDER_LAYER } from './vfxSceneDepth'
import { useVfxSceneDepthTexture } from './vfxSceneDepth'

function spriteUvParams(material: ShaderMaterialDescriptor): { offset: [number, number]; repeat: [number, number] } {
  const cols = material.shaderFeatures.flipbook ? Math.max(1, material.spriteCols) : 1
  const rows = material.shaderFeatures.flipbook ? Math.max(1, material.spriteRows) : 1
  const col = (((material.spriteOffset[0] % cols) + cols) % cols) / cols
  const row = (((material.spriteOffset[1] % rows) + rows) % rows) / rows
  return {
    offset: [col + material.uvScroll[0], row + material.uvScroll[1]],
    repeat: [1 / cols, 1 / rows],
  }
}

type TexturedEmitterProps = Omit<EmitterSurfaceProps, 'meshOnly'>

function VfxTexturedEmitterInner({
  entry,
  wireframe,
  vfxCamLockEnabled,
  sceneDepthFade,
}: TexturedEmitterProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const sceneDepthTexture = useVfxSceneDepthTexture()
  const { size } = useThree()
  const { frame, material } = entry
  const primitiveKind = material.geometryKind
  const meshGeometry = entry.meshGeometry
  const surfaceGeometry = useVfxEmitterPrimitiveGeometry(primitiveKind, meshGeometry, {
    uvRotationSafeMargin: material.uvRotationSafeMargin,
    texDiv: entry.parsed.texDiv,
  })
  const shaderFeatures = material.shaderFeatures

  useLayoutEffect(() => {
    groupRef.current?.layers.set(VFX_RENDER_LAYER)
    meshRef.current?.layers.set(VFX_RENDER_LAYER)
  }, [])

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
    if (material.distortionTextureUrl) {
      entries.push({ url: material.distortionTextureUrl, isDds: material.distortionTextureIsDds })
    }
    return entries
  }, [
    material.colorTextureIsDds,
    material.colorTextureUrl,
    material.distortionTextureIsDds,
    material.distortionTextureUrl,
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
    const distortionMap = material.distortionTextureUrl ? textures[textureIndex++] : null

    const sprite = spriteUvParams(material)
    const uvWrap = material.uvRotationSafeMargin ? ClampToEdgeWrapping : RepeatWrapping
    mainMap.wrapS = uvWrap
    mainMap.wrapT = uvWrap
    mainMap.repeat.set(sprite.repeat[0], sprite.repeat[1])
    mainMap.offset.set(sprite.offset[0], sprite.offset[1])
    if (colorMap) {
      colorMap.wrapS = uvWrap
      colorMap.wrapT = uvWrap
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

    return { mainMap, colorMap, multMap, paletteMap, erosionMap, distortionMap }
  }, [material, textures])

  const shaderMaterial = useMemo(() => {
    if (!maps) return null

    const { mainMap, colorMap, multMap, paletteMap, erosionMap, distortionMap } = maps
    const useColorLookUp = Boolean(material.colorLookUpScales)
    const cols = shaderFeatures.flipbook ? Math.max(1, material.spriteCols) : 1
    const rows = shaderFeatures.flipbook ? Math.max(1, material.spriteRows) : 1

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
        uTintRgba: {
          value: new Vector4(
            material.tintRgba[0],
            material.tintRgba[1],
            material.tintRgba[2],
            material.tintRgba[3],
          ),
        },
        uColorMultiply: { value: material.colorMultiply },
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
        uUvRotationSafeMargin: { value: material.uvRotationSafeMargin },
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
        uHasErosion: { value: shaderFeatures.erosion && Boolean(erosionMap) },
        uErosionDrive: { value: material.erosionDrive },
        uErosionChannelMixer: {
          value: new Vector4(
            material.erosionChannelMixer[0],
            material.erosionChannelMixer[1],
            material.erosionChannelMixer[2],
            material.erosionChannelMixer[3],
          ),
        },
        uSoftAlpha: { value: shaderFeatures.softAlpha },
        uDistortionMap: { value: distortionMap ?? mainMap },
        uHasDistortion: { value: shaderFeatures.distortion && Boolean(distortionMap) },
        uDistortionStrength: { value: material.distortionStrength },
        uSoftDepthFade: { value: material.softDepthFade },
        uGroundZ: { value: material.groundClipZ ?? 0.02 },
        uSoftDepthRange: { value: 0.2 },
        uUseSceneDepth: { value: false },
        uSceneDepthMap: { value: sceneDepthTexture },
        uSceneDepthResolution: { value: new Vector2(size.width, size.height) },
        uSceneDepthFadeRange: { value: 0.012 },
      },
      depthWrite: material.depthWrite,
      polygonOffset: material.polygonOffset,
      polygonOffsetFactor: material.polygonOffsetFactor,
      polygonOffsetUnits: material.polygonOffsetUnits,
      vertexShader: VFX_IMAGE_VERTEX_SHADER,
      fragmentShader: VFX_IMAGE_FRAGMENT_SHADER,
      transparent: true,
      side: DoubleSide,
      blending: material.isAdditive ? AdditiveBlending : NormalBlending,
      toneMapped: false,
      wireframe,
    })
  }, [cubemap, maps, material, sceneDepthTexture, shaderFeatures, size.height, size.width, wireframe])

  useFrame(({ camera }) => {
    if (!shaderMaterial || !meshRef.current || !groupRef.current) return
    applyParticleWorldTransform({
      group: groupRef.current,
      mesh: meshRef.current,
      position: frame.position,
      scale: frame.scale,
      rotationEulerRad: frame.rotation,
      geometryKind: primitiveKind,
      planeFacing: material.planeFacing,
      planeBaseRotation: material.planeBaseRotation,
      isGroundLayer: material.isGroundLayer,
      isBillboard: material.isBillboard,
      cameraQuaternion: camera.quaternion,
      vfxCamLockEnabled,
      worldMatrix: frame.worldMatrix,
      useLeagueMatrixP: frame.transformPipeline?.useLeagueMatrixP,
    })

    const cols = shaderFeatures.flipbook ? Math.max(1, material.spriteCols) : 1
    const rows = shaderFeatures.flipbook ? Math.max(1, material.spriteRows) : 1
    shaderMaterial.uniforms.uSpriteOffset.value.set(
      (((material.spriteOffset[0] % cols) + cols) % cols) / cols,
      (((material.spriteOffset[1] % rows) + rows) % rows) / rows,
    )
    shaderMaterial.uniforms.uUvScroll.value.set(material.uvScroll[0], material.uvScroll[1])
    shaderMaterial.uniforms.uUvMultOffset.value.set(material.uvMultOffset[0], material.uvMultOffset[1])
    shaderMaterial.uniforms.uOpacity.value = material.opacity
    shaderMaterial.uniforms.uTintRgba.value.set(
      material.tintRgba[0],
      material.tintRgba[1],
      material.tintRgba[2],
      material.tintRgba[3],
    )
    shaderMaterial.uniforms.uColorMultiply.value = material.colorMultiply
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
    shaderMaterial.uniforms.uUvRotationSafeMargin.value = material.uvRotationSafeMargin
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
    shaderMaterial.uniforms.uHasErosion.value = shaderFeatures.erosion && Boolean(material.erosionTextureUrl)
    shaderMaterial.uniforms.uSoftAlpha.value = shaderFeatures.softAlpha
    shaderMaterial.uniforms.uDistortionStrength.value = material.distortionStrength
    shaderMaterial.uniforms.uHasDistortion.value =
      shaderFeatures.distortion && Boolean(material.distortionTextureUrl)
    shaderMaterial.uniforms.uSoftDepthFade.value = material.softDepthFade
    shaderMaterial.uniforms.uGroundZ.value = material.groundClipZ ?? 0.02
    const useSceneDepth = sceneDepthFade && material.softDepthFade && Boolean(sceneDepthTexture)
    shaderMaterial.uniforms.uUseSceneDepth.value = useSceneDepth
    if (sceneDepthTexture) shaderMaterial.uniforms.uSceneDepthMap.value = sceneDepthTexture
    shaderMaterial.uniforms.uSceneDepthResolution.value.set(size.width, size.height)
    shaderMaterial.uniforms.uUseColorLookUp.value = Boolean(material.colorLookUpScales)
    shaderMaterial.depthWrite = material.depthWrite
    shaderMaterial.polygonOffset = material.polygonOffset
    shaderMaterial.polygonOffsetFactor = material.polygonOffsetFactor
    shaderMaterial.polygonOffsetUnits = material.polygonOffsetUnits
  })

  if (!shaderMaterial) {
    return (
      <VfxPrimitivePlaceholderEmitter
        entry={entry}
        geometry={surfaceGeometry}
        vfxCamLockEnabled={vfxCamLockEnabled}
      />
    )
  }

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={surfaceGeometry}
        renderOrder={material.renderOrder}
        material={shaderMaterial}
      />
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
  sceneDepthFade?: boolean
}

function VfxMeshOnlyEmitter({ entry, wireframe, vfxCamLockEnabled }: EmitterSurfaceProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const { frame, material } = entry
  const primitiveKind = material.geometryKind
  const meshGeometry = entry.meshGeometry
  const surfaceGeometry = useVfxEmitterPrimitiveGeometry(primitiveKind, meshGeometry, {
    uvRotationSafeMargin: material.uvRotationSafeMargin,
    texDiv: entry.parsed.texDiv,
  })
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

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose()
    }
  }, [surfaceMaterial])

  useFrame(({ camera }) => {
    if (!meshRef.current || !groupRef.current) return
    applyParticleWorldTransform({
      group: groupRef.current,
      mesh: meshRef.current,
      position: frame.position,
      scale: frame.scale,
      rotationEulerRad: frame.rotation,
      geometryKind: primitiveKind,
      planeFacing: material.planeFacing,
      planeBaseRotation: material.planeBaseRotation,
      isGroundLayer: material.isGroundLayer,
      isBillboard: material.isBillboard,
      cameraQuaternion: camera.quaternion,
      vfxCamLockEnabled,
      worldMatrix: frame.worldMatrix,
      useLeagueMatrixP: frame.transformPipeline?.useLeagueMatrixP,
    })
  })

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={surfaceGeometry}
        material={surfaceMaterial}
        renderOrder={material.renderOrder}
      />
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

function VfxPrimitivePlaceholderEmitter({
  entry,
  geometry,
  vfxCamLockEnabled,
}: {
  entry: VfxEmitterPreviewEntry
  geometry: BufferGeometry | undefined
  vfxCamLockEnabled: boolean
}) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const { frame, material } = entry
  const primitiveKind = material.geometryKind
  const placeholderMaterial = useMemo(() => getVfxPrimitivePlaceholderMaterial(), [])

  useFrame(({ camera }) => {
    if (!meshRef.current || !groupRef.current) return
    applyParticleWorldTransform({
      group: groupRef.current,
      mesh: meshRef.current,
      position: frame.position,
      scale: frame.scale,
      rotationEulerRad: frame.rotation,
      geometryKind: primitiveKind,
      planeFacing: material.planeFacing,
      planeBaseRotation: material.planeBaseRotation,
      isGroundLayer: material.isGroundLayer,
      isBillboard: material.isBillboard,
      cameraQuaternion: camera.quaternion,
      vfxCamLockEnabled,
      worldMatrix: frame.worldMatrix,
      useLeagueMatrixP: frame.transformPipeline?.useLeagueMatrixP,
    })
  })

  if (!geometry) return null

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={placeholderMaterial}
        renderOrder={material.renderOrder}
      />
    </group>
  )
}

function VfxSolidEmitter({ entry, wireframe, vfxCamLockEnabled }: TexturedEmitterProps) {
  const groupRef = useRef<Group>(null)
  const meshRef = useRef<Mesh>(null)
  const { frame, material } = entry
  const primitiveKind = material.geometryKind
  const meshGeometry = entry.meshGeometry
  const surfaceGeometry = useVfxEmitterPrimitiveGeometry(primitiveKind, meshGeometry, {
    uvRotationSafeMargin: material.uvRotationSafeMargin,
    texDiv: entry.parsed.texDiv,
  })
  const color = material.baseColor
  const additive = isAdditiveBlendMode(material.blendMode)
  const surfaceMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(
          color[0] * material.emissiveStrength,
          color[1] * material.emissiveStrength,
          color[2] * material.emissiveStrength,
        ),
        opacity: material.opacity,
        transparent: true,
        depthWrite: material.depthWrite,
        side: DoubleSide,
        wireframe,
        blending: additive ? AdditiveBlending : NormalBlending,
      }),
    [
      additive,
      color,
      material.depthWrite,
      material.emissiveStrength,
      material.opacity,
      wireframe,
    ],
  )

  useEffect(() => {
    return () => {
      surfaceMaterial.dispose()
    }
  }, [surfaceMaterial])

  useFrame(({ camera }) => {
    if (!meshRef.current || !groupRef.current) return
    applyParticleWorldTransform({
      group: groupRef.current,
      mesh: meshRef.current,
      position: frame.position,
      scale: frame.scale,
      rotationEulerRad: frame.rotation,
      geometryKind: primitiveKind,
      planeFacing: material.planeFacing,
      planeBaseRotation: material.planeBaseRotation,
      isGroundLayer: material.isGroundLayer,
      isBillboard: material.isBillboard,
      cameraQuaternion: camera.quaternion,
      vfxCamLockEnabled,
      worldMatrix: frame.worldMatrix,
      useLeagueMatrixP: frame.transformPipeline?.useLeagueMatrixP,
    })
    surfaceMaterial.opacity = material.opacity
    surfaceMaterial.color.set(
      color[0] * material.emissiveStrength,
      color[1] * material.emissiveStrength,
      color[2] * material.emissiveStrength,
    )
  })

  return (
    <group ref={groupRef}>
      <mesh
        ref={meshRef}
        geometry={surfaceGeometry}
        material={surfaceMaterial}
        renderOrder={material.renderOrder}
      />
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

export function VfxEmitterSurface({
  entry,
  meshOnly,
  wireframe,
  vfxCamLockEnabled,
  sceneDepthFade = false,
}: EmitterSurfaceProps) {
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
      <VfxTexturedEmitterInner
        entry={entry}
        sceneDepthFade={sceneDepthFade}
        vfxCamLockEnabled={vfxCamLockEnabled}
        wireframe={wireframe}
      />
    )
  }
  return <VfxSolidEmitter entry={entry} vfxCamLockEnabled={vfxCamLockEnabled} wireframe={wireframe} />
}
