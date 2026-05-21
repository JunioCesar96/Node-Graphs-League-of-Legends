# node-graphs-lol

Editor de grafos de nós para League of Legends / ritobin, com painel de código ritual integrado ao **Jade-League-Bin-Editor**.

Documentação da feature mais recente: [`feature_md/feature/feature-menu-jade-codedock.md`](feature_md/feature/feature-menu-jade-codedock.md)

## Documentação de implementação por feature

| Branch / tema | Documento |
| --- | --- |
| Menu Jade no CodeDock | [`feature-menu-jade-codedock.md`](feature_md/feature/feature-menu-jade-codedock.md) |
| Abas de cena e menu Grafo | [`feature-abas-cena-json-menu-grafo.md`](feature_md/feature/feature-abas-cena-json-menu-grafo.md) |
| Persistência cena / menu Grafo | [`feature-cena-persistencia-menu-grafo.md`](feature_md/feature/feature-cena-persistencia-menu-grafo.md) |
| Workspace em disco | [`feature-workspace-disk-persistence.md`](feature_md/feature/feature-workspace-disk-persistence.md) |

Índice completo em [`feature_md/feature/`](feature_md/feature/).

## Menu e configurações Jade no editor de código (v1.5.0)

### Resumo

O painel **Código** (`CodeDock`) inclui a barra de menus, atalhos, context menu, diálogos e painéis do Jade (Find/Replace, Particle Editor, General Edit, Settings, Themes, Preferences, About). As preferências usam `localStorage` no browser e podem sincronizar com `jade-http-bridge` (`GET/POST /preference`).

### Arranque rápido

```bash
pnpm install
pnpm run dev
```

Opcional — bridge Jade para abrir `.bin`:

```bash
pnpm run jade:http-bridge   # ou jade-bridge:dev (mock)
```

Em `.env` (dev): `VITE_JADE_USE_PROXY=true` e reiniciar `npm run dev`.

### Atalhos no painel Código (com foco no editor)

| Atalho | Acção |
| --- | --- |
| Ctrl+F | Find |
| Ctrl+H | Replace |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+O | General Editing |
| Ctrl+P | Particle Editing |

### Tags da implementação

- `[NOVO]` — `useCodeDockJadeEditor`, backends de preferências, `CodeDockJadeDialogs`, endpoints `/preference`
- `[ATUALIZADO]` — `CodeDock`, `App.tsx`, componentes Jade (`MenuBar`, `SettingsDialog`, …)
- `[REMOVIDO]` — dropdown «Converter ▾» no header (movido para **Tools → Node Graph**)

Ver fluxogramas, tabela de componentes e regras de erro no documento linked acima.

## Scripts úteis

| Script | Descrição |
| --- | --- |
| `pnpm run dev` | Vite dev server |
| `pnpm run test` | Vitest |
| `pnpm run jade:http-bridge` | Bridge Rust (convert + preferences) |
| `pnpm run jade-bridge:dev` | Mock bridge Node |

## Estrutura relevante

```
src/
  components/organisms/CodeDock.tsx      # Painel código + MenuBar Jade
  components/organisms/CodeDockJadeDialogs.tsx
  hooks/useCodeDockJadeEditor.ts
  hooks/buildMonacoOptions.ts
  jade/webPreferenceBackend.ts
  jade/compositePreferenceBackend.ts
```

Alias Vite: `@jade` → `../Jade-League-Bin-Editor/src`
