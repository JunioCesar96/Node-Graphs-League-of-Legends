# Scene Depth + Mesh Ground (Fase 7)

Projeção ao terreno por raycast na malha do preview e soft particle com depth buffer da cena.

## Módulos

| Módulo | Função |
|--------|--------|
| `vfxMeshGroundHit.ts` | Raycast vertical; `createDynamicMeshGroundHitResolver` |
| `vfxSceneRaycast.tsx` | Registo de malhas chão + personagem no Canvas |
| `vfxSceneDepth.tsx` | Prepass depth (layer 0); VFX na layer 1 |
| `vfxImageShader.ts` | `uSceneDepthMap` quando «Scene depth fade» activo |
| `useVfxPreview` | Snap `NavmeshGroundClip` via malhas da cena |

## Uso

1. Chão visível na cena 3D
2. (Opcional) Instanciar personagem — raycast inclui malha skinned
3. Activar **Scene depth fade** para soft particle contra obstáculos

## Testes

```bash
npm test -- src/core/vfx/vfxMeshGroundHit.test.ts src/core/vfx/semantic
```

## Critérios

- `cracks2` / decals: Y do snap segue o chão decorativo
- Partículas com soft alpha: fade ao passar atrás do chão/personagem (com toggle)
