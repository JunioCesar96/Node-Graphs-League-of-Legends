# Feature: Malha de borda segura para rotação UV (planos)

## Problema

Partículas com `uvRotation` / `birthOrbitalVelocity` rotacionam UV no fragment shader (`rotateUv` em `vfxImageShader.ts`). Em quads planos, a UV rotacionada excede o quad 1×1 → cantos transparentes / textura cortada.

## Objetivo

- Expandir geometria do plano por fator `g = √2` (quadrado) ou `g = √(w²+h²)/min(w,h)` (retângulo via `texDiv`).
- Centro visual 1×1 mantém UV **0–1**; bordas da malha recebem UV **nova** (padding fora de [0, 1]) derivada da posição local, sem esticar a textura em toda a malha.
- Compensar escala mundial da partícula por `1/g` para manter tamanho visual idêntico ao LoL.
- Ativar **somente** quando `uvRotation ≠ 0` **ou** `birthOrbitalVelocity` tem magnitude > ε.
- Escopo: `plane`, `planar` (não `ring` / `cylinder` / `sphere`).

## Matemática

- `h(θ) = (s/2)(|cos θ| + |sin θ|)`; máximo em 45° → malha `g = √2`.
- UV vértice: `uv = posLocal + 0.5` (região [-0.5, 0.5] → [0, 1]; bordas → UV fora de [0, 1] + `ClampToEdge`).
- Escala partícula: `scaleVisual = scaleLol / g` (eixos X/Y).

## Implementação (node-graphs-lol)

| Módulo | Função |
|--------|--------|
| `vfxUvRotationSafeMargin.ts` | `emitterNeedsUvRotationSafeMargin`, `bakeUvRotationSafeMargin`, `applyUvRotationSafeScaleCompensation` |
| `vfxPrimitiveMeshPool.ts` | `createUvRotationSafePlaneGeometry`, `cloneVfxPrimitiveGeometry(kind, { uvRotationSafe })` |
| `materialStrategyExecutor.ts` | `uvRotationSafeMargin`, `uvRotationSafeMarginG` no descriptor |
| `vfxTransformEngine.ts` | divide `scale` XY quando margem activa |
| `useVfxEmitterPrimitiveGeometry.ts` | passa flag do material |
| `VfxTexturedEmitter.tsx` | liga material + `texDiv` ao hook |

## Não fazer

- Não alterar `rotateUv` no shader sem necessidade.
- Não aplicar em malhas circulares.
- Não mudar tamanho visual percebido (obrigatório dividir escala mundo).
- Malha importada (`meshGeometry` custom): ignorar bake automático.

## Critérios de aceite

- Partícula com `birthOrbitalVelocity` em órbita 360° sem buracos nos cantos.
- Partícula sem rotação UV usa `PlaneGeometry(1,1)` (sem overdraw extra).
- Footprint visual igual ao emitter sem rotação (escala compensada).
