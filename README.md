# node-graphs-lol

Editor de grafos de nós para League of Legends / ritobin, com painel de código ritual integrado ao **Jade-League-Bin-Editor**.

## Documentação de implementação

| Branch / tema | Documento |
| --- | --- |
| Menu Jade no CodeDock | [`feature-menu-jade-codedock.md`](feature_md/feature/feature-menu-jade-codedock.md) |
| Ponte Jade automática (abrir `.bin` em dev) | [`feature-jade-bridge-auto-dev.md`](feature_md/feature/feature-jade-bridge-auto-dev.md) |
| Abas de cena e menu Grafo | [`feature-abas-cena-json-menu-grafo.md`](feature_md/feature/feature-abas-cena-json-menu-grafo.md) |
| Nodes Configurar, Class Group e pack `default` | [`feature-nodes-configurar-pack-default.md`](feature_md/feature/feature-nodes-configurar-pack-default.md) |

Índice completo em [`feature_md/feature/`](feature_md/feature/).

---

## Documentação de Implementação — Nodes Configurar e pack default (v1.5.0)

Arquivo salvo em: `feature_md/feature/feature-nodes-configurar-pack-default.md`.

| Campo | Valor |
| --- | --- |
| Branch | `feature/nodes-configurar-pack-default` |
| Versão | `1.5.0` |

Com **Nodes → Configurar** activo: **Converter [Class Group]** pede a pasta (inclui `default`), **Extrair Node Base** lista `default`, cena nova fica **vazia** (sem `particle-root` obrigatório). Detalhes, fluxogramas Mermaid e tabela de componentes no documento linkado acima.

---

## Documentação de Implementação — Ponte Jade automática e menu CodeDock (v1.5.0)

Arquivo salvo em: `feature_md/feature/feature-jade-bridge-auto-dev.md` (ponte) e `feature_md/feature/feature-menu-jade-codedock.md` (menu Jade).

### 1. Cabeçalho

| Campo | Valor |
| --- | --- |
| Nome da Branch (ponte) | `feature/jade-bridge-auto-dev` |
| Nome da Branch (menu) | `feature/menu-jade-codedock` |
| Nome das Features | Menu Jade no CodeDock; ponte Jade automática em dev; abertura de `.bin` |
| Versão atual | `1.5.0` |

### 2. Definição e Resumo de Tags

| Tag | Definição |
| --- | --- |
| `[NOVO]` | Novo componente, plugin, backend ou endpoint. |
| `[ATUALIZADO]` | Fluxo ou configuração existente alterada. |
| `[REMOVIDO]` | Comportamento ou UI substituída. |

Tags presentes: `[NOVO]`, `[ATUALIZADO]`, `[REMOVIDO]` (menu CodeDock).

### 3. Arranque rápido

```bash
pnpm install
npm run dev
```

Com `npm run dev`:

- Activado `VITE_JADE_USE_PROXY` (`.env.development` + `vite.config.ts`)
- Arranca automaticamente a ponte em `http://127.0.0.1:8788` (Rust se compilado, senão mock)
- **File → Open…** `.bin` → texto no painel **Código**

Conversão real de `.bin` (uma vez):

```bash
npm run jade:http-bridge
npm run dev
```

### 4. Scripts úteis

| Script | Descrição |
| --- | --- |
| `npm run dev` | Vite + ponte Jade automática |
| `npm run jade:http-bridge` | Compila/executa Rust `jade-http-bridge` |
| `npm run jade-bridge:dev` | Mock Node (placeholder em `/convert`) |
| `npm run test` | Vitest |

### 5. Estrutura relevante

```
vite.plugin.jadeBridgeDev.ts   # Arranque automático da ponte
.env.development               # VITE_JADE_USE_PROXY=true
src/core/jadeBinBridge.ts      # POST /convert via /api/jade
src/components/organisms/CodeDock.tsx
src/hooks/useCodeDockJadeEditor.ts
```

Fluxogramas, tabelas de componentes e regras de erro: ver os ficheiros em `feature_md/feature/` linkados acima.
