# Jade-League-Bin-Editor · spike técnico (integração `.bin`)

Este documento alinha **`node-graphs-lol`** com o editor upstream e o **contrato local** de pontes (mock Node, CLI e servidor HTTP Rust).

## Referência upstream

- Repositório analisado: [RitoShark/Jade-League-Bin-Editor](https://github.com/RitoShark/Jade-League-Bin-Editor)
- Também há histórico/relacionado sob [LeagueToolkit](https://github.com/LeagueToolkit/Jade-League-Bin-Editor).

## Arquitetura do Jade (o que importa para nós)

| Camada | Tecnologia | Papel |
|--------|------------|------|
| UI | React 19 + Vite + Monaco (`@monaco-editor/react`) | Editores, painéis |
| Desktop | **Tauri 2** (`@tauri-apps/api`) | Ficheiros, diálogo, preferências |
| Parser / motor | **Rust** em `src-tauri/src/core/` | Leitura/escrita `.bin`, motores Jade custom vs LTK |

## Ferramentas Rust no `src-tauri` (mesmo `Cargo.toml`)

| Binário | Função |
|---------|--------|
| **`jade-http-bridge`** | Servidor HTTP **127.0.0.1** (porta `PORT`, default `8788`): `POST /convert` (octet-stream → `{ ok, text }` ritobin) e `POST /convert-tree` (→ `{ ok, jsonText }` BinTree). Body limit 512 MiB. **`JADE_BINTREE_JSON_COMPACT=1`** força JSON numa linha. |
| **`jade-export-bintree-json`** | CLI: ficheiro `.bin` ou `-` (stdin) → stdout JSON BinTree. `--compact` opcional. |

Build (desde `node-graphs-lol/`):

```bash
npm run jade:tools:check
npm run jade-export:bintree:build
```

Arranque da ponte HTTP (contrato idêntico ao mock Node):

```bash
npm run jade:http-bridge
```

Executáveis em `Jade-League-Bin-Editor/src-tauri/target/release/` (`jade-http-bridge.exe` / `jade-export-bintree-json.exe` no Windows).

API pública da lib reutilizada pelos bins: `export_bin_slice_to_bin_tree_json`, `export_bin_slice_to_ritobin_or_ltk_text` (ver `lib.rs`).

## Estado em `node-graphs-lol`

- **`src/core/jadeBinBridge.ts`**: `POST` octet-stream em **`{base}/convert`** e **`{base}/convert-tree`**. Base = `VITE_JADE_BIN_BRIDGE` ou **`/api/jade`** quando `VITE_JADE_USE_PROXY=true` (**`vite.config.ts`** proxia para **`JADE_BRIDGE_TARGET`**).
- **BinTree → canvas** (imports JSON / futura reutilização): `binTreeJsonToCanvasScene` (`ltkBinTreeScene.ts`) — não é mais acionado por **File → Open…** `.bin` (só texto ritual no painel Código).
- **Mock Node** [`scripts/jade/mock-bridge-server.mjs`](../scripts/jade/mock-bridge-server.mjs): se **`JADE_CONVERT_TREE_BINARY`** apontar para `jade-export-bintree-json`, usa conversão real em `/convert-tree`; falha CLI com env definido ⇒ **502** + `{ ok: false, message }`.
- **Painel Código (`CodeDock`)**: Monaco (`@monaco-editor/react`) — linguagem Monarch, tema `ritobin-dark`, color provider e markers do `syntaxChecker` do Jade (`@jade/lib/*` → `../Jade-League-Bin-Editor/src`), ver `src/monaco/ritobinEditorSetup.ts`.

## Configuração típica (dev)

Copiar [.env.example](../.env.example) para `.env.development.local` e ajustar.

1. **Ponte recomendada (Rust)**  
   Terminal A: `npm run jade:http-bridge`  
   Terminal B: `npm run dev` com proxy (`VITE_JADE_USE_PROXY=true`, `JADE_BRIDGE_TARGET=http://127.0.0.1:8788`).
2. **Mock Node + CLI opcional**  
   `JADE_CONVERT_TREE_BINARY=...\jade-export-bintree-json.exe npm run jade-bridge:dev`
3. **Ponte Ritobin (exe guardado no menu Ritobin)** — `npm run ritobin-bridge:dev`; destino opcional **`RITOBIN_BRIDGE_TARGET`**. **`VITE_RITOBIN_USE_PROXY`** pode omitir-se: se ausente no `.env`, o `vite.config.ts` usa o mesmo valor que **`VITE_JADE_USE_PROXY`**. Alternativa: **`VITE_RITOBIN_INVOKE_BRIDGE`**. Ao abrir `.bin`, `POST /convert` envia **`X-Ritobin-Exe`**. Opções servidor: `RITOBIN_ARGS_BEFORE` / `RITOBIN_ARGS_AFTER` (JSON), `RITOBIN_INPUT_MODE=file|stdin`.
4. **File → Open…** `.bin`: **só texto ritual** — tenta **ponte Ritobin + exe** (menu Ritobin); se falhar ou não houver exe → **`POST /convert`** (Jade); abre o painel **Código** (Monaco); **não** altera o grafo canvas nem grava JSON automaticamente.

`/api/jade/*` só existe em `vite dev`; builds de produção precisam de URL explícita (`VITE_JADE_BIN_BRIDGE`) ou reverse-proxy.

Ver também: [**`JADE_BIN_TREE_INTEGRATION.md`**](JADE_BIN_TREE_INTEGRATION.md).

## Próximo trabalho (fora deste spike)

Ritobin texto → modelo **`LeagueBinGraphDocumentV1`** campo-a-campo (paralelo ao caminho BinTree JSON já suportado).
