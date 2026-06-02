# Transform Semantic Engine (Fase 5)

Pipeline de transformação em 6 espaços (emitter → spawn → orientation → primitive → simulation → render), substituindo T+R+S monolítico em `computeEmitterFrameState`.

## Módulos

| Módulo | Função |
|--------|--------|
| `semantic/vfxTransformTypes.ts` | `TransformPipelineDefinition`, modos de orientação/escala |
| `semantic/vfxTransformFeatures.ts` | Flags e pipeline default por primitivo |
| `semantic/transformPipelineResolver.ts` | Resolve pipeline a partir de traits + features |
| `vfxPrimitiveBasis.ts` | Basis matrix, rotação ground/billboard, velocidade orientada |
| `vfxTransformEngine.ts` | `computeParticleTransform()` |
| `vfxGroundScale.ts` | `remapLoLQuadScaleForPlane` (sem ciclo com animation) |

## Parse (Brand_Base_Dance)

- `rotation0` — rotação integrada na vida da partícula (ex. `FireCards2`)
- `isRotationEnabled` — activa trait `ContinuousSpin`

## Golden / auditoria

```bash
npm test -- src/core/vfx/semantic/brandBaseDance.transform.test.ts
npm run vfx:audit-transforms
```

## Debug viewport

`VfxTransformDebug` mostra `orientationMode·transformOrder` e eixos locais.

## Critérios visuais (manual)

- `cracks2`: decal horizontal ~600×600
- `FireCards2`: partículas sobem (Y LoL), flipbook com rotação contínua
- Meshes/sparks alinhados ao centro do efeito
