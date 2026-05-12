# node-graphs-lol

Editor SPA de grafos tipo nós+fios para prototipagem de cenários ligados ao ecossistema League (partículas, etc.). Estado da implementação, diagrama de módulos e lacunas — ver **[AUDITORIA.md](./AUDITORIA.md)**.

## Stack (alinhada ao `AUDITORIA.md`)

| Área | Implementação actual |
|------|-------------------------|
| Build | **Vite** + `@vitejs/plugin-react`; alias `@` → `src` |
| Testes | **Vitest** / jsdom (`vite.config.ts` via `vitest/config`) |
| UI | **React 19**, **CSS Modules** + `src/styles/global.css` e `tokens.css` (sem Tailwind neste repo) |

## Requisitos e comandos

- **Gestor:** [pnpm](https://pnpm.io) (versão sugerida: `pnpm@10.26.0` como em `packageManager`).

```bash
pnpm install
pnpm dev          # servidor de desenvolvimento
pnpm run build    # tsc + build de produção
pnpm run test     # Vitest (ver src/core/leagueBinScene.test.ts)
pnpm run lint
pnpm run jade-bridge:dev   # mock POST /convert para testar bridge (ver JADE_SPIKE)
pnpm preview      # pré-visualizar dist/
```

### Ponte opcional Jade (`VITE_JADE_*` ou proxy)

Contrato técnico: [docs/JADE_SPIKE.md](./docs/JADE_SPIKE.md).

- **Opção direta:** `VITE_JADE_BIN_BRIDGE=http://127.0.0.1:8788` (CORS já aberto no mock).
- **Opção proxy (sem CORS nem URL absoluta no cliente):** em desenvolvimento, `VITE_JADE_USE_PROXY=true` faz `POST /api/jade/convert`; o `vite.config.ts` reenvia para `JADE_BRIDGE_TARGET` (por defeito `http://127.0.0.1:8788`). Ver [`.env.example`](./.env.example).

Fluxo típico:

1. `pnpm run jade-bridge:dev` (mock em 8788).
2. `.env.development.local` segundo `.env.example` (proxy OU URL explícito).
3. `pnpm dev` → **File → Open…** num `.bin`.

## Estrutura útil

| Pasta / ficheiro | Papel |
|------------------|--------|
| `src/App.tsx` | Shell: menu, canvas, inspector, dock de código |
| `src/hooks/useSceneHistory.ts` | Cena, undo/redo, seleção multi, persistência |
| `src/core/leagueBinScene.ts` | Formato JSON v1 (`node-graphs-lol`): `serializeScene` / `parseSceneDocument` |
| `src/core/canvasScene.ts` | Tipos da cena, schemas registados, `hydrateScene` |
| `src/core/binImportStub.ts` | Stub até haver parser `.bin` ou mapeamento ritobin→grafo |
| `src/core/jadeBinBridge.ts` | Opcional: `POST` octet-stream ao bridge local quando `VITE_JADE_BIN_BRIDGE` está definido |
| `scripts/jade/mock-bridge-server.mjs` | Mock de desenvolvimento (`pnpm jade-bridge:dev`) |
| `public/tooltips.json` | Dicas exibidas no grafo quando há chaves correspondentes |
| `docs/JADE_SPIKE.md` | Notas sobre integração futura com [Jade-League-Bin-Editor](https://github.com/RitoShark/Jade-League-Bin-Editor) |

## Funcionalidades de alto nível (resumo)

- Menu **File / Json / Código / Nodes**: abrir/exportar JSON (e fluxo `.bin` com stub), painel de código redimensionável, paleta de nós.
- Canvas com pan, zoom (incl. roda), marquee, multi-seleção, ímanes/snaps conforme UX documentada na app; conexões com traço flexível/rígido.
- Persistência da cena em `localStorage`; import substitui a cena válida através de `replaceScene`.

**Limitação:** não há conversão binária real nem motor de execução do grafo — ver lacunas em [AUDITORIA.md](./AUDITORIA.md).

## Documentação relacionada

- [AUDITORIA.md](./AUDITORIA.md) — inventário técnico, diagrama em Mermaid e lacunas vs. roadmap.
- [docs/JADE_SPIKE.md](./docs/JADE_SPIKE.md) — spike Jade / `.bin`.

## Licença

Ver `license` na raíz do projeto.
