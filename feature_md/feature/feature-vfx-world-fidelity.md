# VFX World Fidelity (Fase 4)

## Objetivo

Elevar fidelidade no preview 3D: campos BIN de mundo/render, primitivas dedicadas, soft particle com fade contra o chão, depth bias real nos decals, e snap ao plano do chão configurável.

## Parse BIN

| Campo | Modelo |
|-------|--------|
| `depthBiasFactors` | `vec2` — slope + constant |
| `meshRenderFlags` | `u8` |
| `particleUVScrollRate` | `VfxEmbedValue` |
| `particleIsLocalOrientation` | `boolean` |

## Semântica

- Trait `DepthBiasedDecal` — `groundLayer && depthBiasFactors`
- Estratégia `depthBiasPolygonOffset` no material executor

## Ground hit (preview)

- [`vfxGroundHit.ts`](../src/core/vfx/vfxGroundHit.ts) — `groundPlaneHitResolver(groundY)` injectado via `useVfxPreview` quando `showGround`
- `executeMotionStrategies` usa resolver em vez de Y fixo quando presente

## Shader

- `depthBiasFactors` → `polygonOffsetFactor` / `polygonOffsetUnits`
- Soft particle: `uSoftDepthFade`, `uGroundY`, `uSoftDepthRange` — fade por altura acima do chão
- `distortionDrive` no frame → `uDistortionStrength`

## Geometria

- `planar` — `planar_projection` primitive
- `trail` — ribbon MVP (box along axis)

## Fora de âmbito

- Navmesh mesh real do mapa LoL
- Depth buffer scene-wide completo (Fase 5+)

## Testes

```bash
npm test -- src/core/vfx/semantic src/core/vfx/vfxWebAnimation.ground.test.ts src/core/vfx/luxQHoop.fixture.test.ts
```
