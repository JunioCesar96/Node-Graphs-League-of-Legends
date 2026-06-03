# FlexShape + Bound Object (Fase 8)

Escala e offset de spawn proporcionais ao tamanho do personagem instanciado no VFX Dock.

## Módulos

| Módulo | Função |
|--------|--------|
| `vfxFlexShape.ts` | Multiplicadores `scaleBirthScaleByBoundObjectSize` / `scaleEmitOffsetByBoundObjectSize` |
| `vfxCharacterBounds.ts` | AABB da malha `.skn` em unidades LoL |
| `ritualParseVfx.ts` | Parse completo de `VfxFlexShapeDefinitionData` |
| `vfxTransformEngine.ts` | Aplica flex em birthScale |
| `vfxSpawnShape.ts` | Aplica flex em emit offset |
| `useVfxCharacterScene` | `boundObjectSizeLol` + ANM por defeito (Dance/Idle) |
| `vfxGroundNormalAlign.ts` | Inclinação de decals ao normal do raycast (navmesh) |
| `motionStrategyExecutor.ts` | Snap Y + tilt quando `fromMesh` e trait ground |

## Fórmula (preview)

```
flexScaleMul = 1 + scaleBirthScaleByBoundObjectSize × max(bound.x, bound.y, bound.z)
birthScale *= flexScaleMul
```

## Uso

1. Indexar pasta Game e instanciar campeão (ex. Brand)
2. Reproduzir ritual com `FlexShapeDefinition` (ex. `ShockwaveSecondary2`)
3. Malhas com flex devem crescer com o bound do modelo

## Testes

```bash
npm test -- src/core/vfx/vfxFlexShape.test.ts src/core/vfx/vfxGroundNormalAlign.test.ts src/core/vfx/semantic/brandBaseDance.flexShape.test.ts src/core/vfx/semantic/executors/motionStrategyExecutor.test.ts
```

## Relação Fase 7

- Raycast de chão/personagem (`vfxMeshGroundHit`) alimenta snap e normal
- «Scene depth fade» no viewport para soft particles
