# Render Traits e pipeline composto VFX (Fase 2)

## Relação com Fase 1

A [Fase 1](feature-vfx-semantic-classifier.md) introduziu `classifyEmitter` e scoring por eixo (geometry/material/motion). A Fase 2 adiciona **traits multi-label** e **estratégias modulares** composáveis.

## Fluxo

```
RawEmitterDefinition
  → extractEmitterFeatures → EmitterFeatures (+ isDecalLike, isBeamLike, …)
  → scoreEmitterFeatures → traits scores + profile
  → resolveEmitterTraits → active[] (score >= 5)
  → resolveComposablePipeline → geometry/material/motion strategies
  → vfxWebBuilder / computeEmitterFrameState / buildMaterialParams
```

## Traits (exemplos)

| Trait | Sinais |
|-------|--------|
| `GroundProjected` | `isDecalLike` / ground + flipbook ring |
| `FlipbookAnimated` | `flipbook` / texDiv |
| `BeamExtruded` | `primitiveRay` / `isBeamLike` |
| `TrailRibbon` | `primitiveTrail` |
| `AdditiveBlended` | blendMode 2/4 |

## Pipeline composto

`ComposableRenderPipeline` em `VfxWebEmitterBuilt`:

- `traits: RenderTraitId[]`
- `geometry: GeometryStrategyId[]` — ex. `groundQuadRemapDecal`, `billboardZeroAxis`
- `material: MaterialStrategyId[]` — ex. `flipbookUv`, `erosionMap`, `additiveEmissive`
- `motion: MotionStrategyId[]` — ex. `velocityAlignedRotation`, `staticGround`

## Material intent (estrutural)

| Intent | Heurística |
|--------|------------|
| Energy | additive + flipbook/uvScroll |
| SoftAlpha | alpha + isHuge |
| Dissolve | alphaErosion |
| GradientTint | paletteDefinition |
| Layered | textureMult |

Cores placeholder vêm de `placeholderColorForMaterialIntent` — **sem** `emitter.name`.

## API

```ts
resolveEmitterSemanticAnalysis(raw) // traits + profile + intents
getComposablePipeline(raw)          // cache WeakMap
```

## Testes

```bash
npm test -- src/core/vfx/semantic
npm run vfx:audit-semantics
```

## Debug

`VfxTransformDebug` mostra top 3 traits + geometry/material intent + ground scale kind.
