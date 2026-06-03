# Classificador semântico de emitters VFX

## Objetivo

Inferir **qual pipeline de renderização aplicar** a partir da assinatura estrutural do emitter no BIN/ritual LoL — sem usar nome do champion, nome do emitter ou caminho de textura.

## Arquitectura (3 camadas)

1. **Parsing** — `ritualParseVfx` → `RawEmitterDefinition` (= `ParsedVfxEmitterFull`)
2. **Análise semântica** — `extractEmitterFeatures` → `EmitterSemanticClassifier` → `SemanticEmitterProfile`
3. **Render** — `resolveRenderStrategies` → geometria Three, remap de escala, facing

```
BIN → ritual → RawEmitterDefinition
  → features → scoring → SemanticEmitterProfile
  → RenderStrategyBundle → vfxWebBuilder / vfxWebAnimation
```

## Módulos

| Ficheiro | Função |
|----------|--------|
| `src/core/vfx/semantic/vfxEmitterFeatures.ts` | Extração de features (escala, blend, UV, primitiva, movimento) |
| `src/core/vfx/semantic/vfxSemanticRules.ts` | Regras com pesos (`SEMANTIC_RULES`) |
| `src/core/vfx/semantic/emitterSemanticClassifier.ts` | `classifyEmitter(raw)` |
| `src/core/vfx/semantic/vfxRenderStrategy.ts` | `resolveRenderStrategies(raw)` |

## Taxonomia de saída

- **Geometria:** `GroundDecal`, `GroundRing`, `Billboard`, `DirectionBillboard`, `Beam`, `Trail`, `Mesh`, …
- **Material:** `Flipbook`, `Erosion`, `Gradient`, `Flow`, …
- **Movimento:** `Static`, `VelocityAligned`, `Orbiting`, `Scrolling`, …
- **Escala ground (legado):** `decal` \| `flipbookSquare` \| `strip` \| `neutral`

## Exemplos

| Assinatura | Perfil |
|------------|--------|
| `isGroundLayer` + `arbitrary_quad` + `{55,600,600}` | `GroundDecal`, `groundScaleKind=decal` |
| `isGroundLayer` + flipbook + `{300,1,1}` + `texDiv` | `GroundRing`, `Flipbook`, `flipbookSquare` |
| `primitiveKind=ray` | `Beam` |

## Debug

Com `showTransformDebug` no VFX Dock, o label mostra `geometry · score · material · motion · groundScale`.

## Testes

```bash
npm test -- src/core/vfx/semantic
npm test -- src/core/vfx/vfxWebAnimation.ground.test.ts
```

## Auditoria offline

```bash
npm run vfx:audit-semantics
```

## Cobertura

`vfxCoverageMatrix.ts` inclui coluna `semantic` para campos usados no classificador (`birthScale0`, `isGroundLayer`, `primitive`, `blendMode`, `texDiv`, …).

## Fase 2 — Render Traits

Ver [feature-vfx-render-traits.md](feature-vfx-render-traits.md): traits multi-label, `ComposableRenderPipeline`, estratégias modulares de geometry/material/motion.
