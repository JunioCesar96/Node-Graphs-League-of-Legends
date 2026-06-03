# Matrix World + Bone Attach (Fase 6)

TRS completo no preview via matriz P e attach a ossos do personagem instanciado no VFX Dock.

## Módulos

| Módulo | Função |
|--------|--------|
| `vfxWorldMatrix.ts` | `composeParticleWorldMatrix`, `applyParticleWorldTransform` |
| `vfxTransformEngine.ts` | `positionLol`, `worldMatrix`, spawn em espaço do osso |
| `transformPipelineResolver.ts` | `bindWeight` → `EmitterAttached` + `useLeagueMatrixP` |
| `VfxDock` + `useVfxPreview` | `resolveBoneWorld` do `VfxCharacterInScene` |
| `VfxViewport` | Personagem + VFX no mesmo Canvas |

## Uso

1. Indexar pasta Game no VFX Dock
2. Painel **Personagem** → instanciar Brand (ou outro)
3. Reproduzir `Brand_Base_Dance` — `FireCards2` deve seguir o osso com bindWeight

## Testes

```bash
npm test -- src/core/vfx/vfxWorldMatrix.test.ts src/core/vfx/semantic/brandBaseDance.matrixBone.test.ts
```

## Critérios visuais

- `FireCards2`: colado ao personagem, movimento vertical
- Meshes `.scb`: centrados no efeito
- `cracks2`: sem regressão no chão
