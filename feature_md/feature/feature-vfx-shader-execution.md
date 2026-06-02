# VFX Shader Execution (Fase 3)

## Objetivo

Executar o `ComposableRenderPipeline` no runtime Three.js: traits e estratégias de material/geometria/movimento tornam-se `ShaderMaterialDescriptor`, uniforms e geometria data-driven — sem heurísticas por nome de emitter ou textura.

## Pipeline

```
traits + features → ComposableRenderPipeline
  → materialStrategyExecutor → ShaderMaterialDescriptor
  → motionStrategyExecutor → snap Y ground
  → VfxTexturedEmitter (geometryKind + shaderFeatures)
```

## Módulos novos

| Módulo | Função |
|--------|--------|
| `semantic/executors/materialStrategyExecutor.ts` | `executeMaterialStrategies` → descriptor + `shaderFeatures` |
| `semantic/executors/geometryStrategyExecutor.ts` | `geometryKind` estrutural (incl. `ring` torus) |
| `semantic/executors/motionStrategyExecutor.ts` | `groundNavmeshSnap` → Y = `VFX_GROUND_PLANE_Y` |
| `semantic/executors/shaderFeatureFlags.ts` | Liga estratégias/traits a flags de shader |

## Parse BIN (Fase 3)

- `useNavmeshMask` → `ParsedVfxEmitterFull.useNavmeshMask`
- `distortionDefinition` → `VfxDistortionDefinition` (`vfxDistortion.ts`)

## Traits

- `NavmeshGroundClip` — `groundLayer && navmeshMask`
- `DistortionWarp` — `hasDistortion`

## Shader (`vfxImageShader.ts`)

- `uSoftAlpha` — fade suave de alpha (trait `SoftParticle`)
- `uDistortionMap` / `uDistortionStrength` — warp UV leve (MVP)

## Ground preview

- Snap Y em `0.02` via `executeMotionStrategies` + `applyMotionAdjustments` em `vfxPreviewEmitterEntries`
- `polygonOffset` quando `groundNavmeshClip`
- Navmesh real do mapa LoL: **fora de âmbito** (Fase 4+)

## API

- `buildShaderMaterialDescriptor(input)` — entrada principal
- `buildMaterialParams(...)` — wrapper compatível; delega ao executor quando há pipeline

## Critérios de aceite

- Zero `entry.name.includes` / `texture.includes` em `VfxTexturedEmitter` e executors
- Brand `cracks2`: `useNavmeshMask` parseado; Y no chão no preview
- Coverage matrix: `useNavmeshMask`, `distortionDefinition` → `full`/`partial`
