# League BIN Node Editor

**Version:** 1.5.0 · **Status:** Work in progress

![Tool Screenshot](./src/assets/preview.png)

## About the project

An interactive web editor for League of Legends `.bin` / **Class Group** ritual files. You can turn structured text (ritual) into a **visual node graph**, edit properties and links on a canvas, and export back to ritual text—similar in spirit to [Jade-League-Bin-Editor](https://github.com/RitoShark/Jade-League-Bin-Editor), which powers parsing and Jade integration in this app.

Built with **Vite** + **React** + **Monaco** (CodeDock).

---

## Quick start

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) (recommended; see `packageManager` in `package.json`)

### Install and run

```bash
git clone https://github.com/JunioCesar96/Node-Graphs-League-of-Legends.git
cd Node-Graphs-League-of-Legends
pnpm install
pnpm dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

### Optional (development)

| Script | Purpose |
| --- | --- |
| `pnpm jade-bridge:dev` | Mock Jade bridge for opening `.bin` in dev |
| `pnpm jade:http-bridge` | HTTP bridge from Jade-League-Bin-Editor (Rust) |
| `pnpm jade:http-bridge:build` | Compile `jade-http-bridge` (release) for real `.bin` + hash resolution |
| `pnpm test` | Run Vitest unit tests |

---

## Step-by-step guide

### 1. First look at the workspace

- **Center:** graph canvas (nodes, connections, pan/zoom).
- **Right:** CodeDock (Monaco editor) — toggle with the **Code** menu button.
- **Right (optional):** VFX Preview (Three.js viewport) — toggle with the **VFX** menu button.
- **Left / panels:** scene tabs, nodes list, inspector, scene states (depending on layout).

### 1b. VFX 3D preview (web)

| Step | Action |
| --- | --- |
| 1 | Open ritual with `VfxSystemDefinitionData` in CodeDock (e.g. `_preview.md`) or select a VfxSystem node on the canvas |
| 2 | Menu **VFX** → opens the dock with a 3D viewport |
| 3 | Click **Rebuild** to parse emitters (Ring / Splat / Juice for Zac golden sample) |
| 4 | **Play** / **Pause** / scrub timeline; toggle emitters in the footer |
| 5 | Optional: **Pasta assets…** to index a local `ASSETS/` tree for texture paths |
| 6 | Left panel lists **all PROP map effects** (e.g. `Lux_Base_Q_cas`, `Lux_Base_R_cas`); click an **emitter** to solo-preview it |
| 7 | Node context menu → **Código** → **Pré-visualizar VFX** on `VfxSystemDefinitionData` |

**PT:** O painel VFX lê o ritual da aba de código (ou do nó VfxSystem seleccionado), reconstrói emitters com geometria placeholder e animação por keyframes. Rituais `entries: map` com várias partículas mostram **todos os efeitos** na coluna esquerda; ficheiros com um único sistema (ex. `_treicho.md`) listam os **9 emitters** desse efeito. Sem Game Root, usa cores por emitter; com **Pasta assets…**, indexa `ASSETS/` e decodifica `.tex` (DXT1/DXT5/BGRA8) para texturas no viewport; `.png`/`.dds` são usados directamente quando existirem.

### 2. Scenes (work files)

Use the **Graph** menu:

| Action | What it does |
| --- | --- |
| **New work scene** | Empty tab with a fresh canvas |
| **Load recent scenes** | Re-open a recently used scene JSON (up to 10) |
| **Save work scene** | Export the full scene to a `.json` file on disk |

**Note:** Continuous auto-save of large scenes to `localStorage` was removed to avoid quota errors. Save explicitly when you need a backup. Tab snapshots are kept lightly on lifecycle events (small scenes only).

### 3. Import ritual text → node graph

Typical flow (Code → graph):

1. Open **Code** panel and paste or load ritual text (e.g. from a `.bin` PROP file).
2. In CodeDock **Tools**, run **Converter [Class Group]** (choose a pack folder, e.g. `default` under `src/nodeStructures/`).
3. Run **Code To Node Graph** (bulk or step-by-step wizard) to build the canvas from the ritual.
4. You should see a **Main** node and child nodes connected from `entries` and internal structures.

Enable **Nodes → Configure** if you want a fixed Class Group folder and catalog-driven extraction (see step 6).

### 4. Edit the graph

| Task | How |
| --- | --- |
| Add a node | **Nodes → Add…** or drag from palette when linking |
| Start a link | **Drag** from an **output** slot (right side of a structure row) |
| Finish a link | Drop on another node’s **input** port (top of card) or pick a type from the palette on empty canvas |
| Change link style | **Short click** on a connected output slot: cycles **flex → rigid → wireless** (chain icon when linked) |
| Relink / pick existing node | Short click on a **free** output slot → collection-type menu |
| Context actions | Right-click canvas, node header, slots, or wires (hide children, routing, focus peer, etc.) |
| Delete | Select nodes → **Nodes → Remove selected** |

**Wireless** links hide the SVG wire and show a chain icon; hover highlights the peer node.

### 5. Export node graph → ritual text

1. Ensure the scene has **exactly one** Main node (`schema id: main`) with the subtree you want exported.
2. **Graph → Node Graphs to Code**.
3. Enter the tab name (e.g. `Zac.bin`).
4. Wait for the progress dialog; ritual text opens in CodeDock (full file, no 500k preview cut).

Export uses PascalCase field names and Main `entries` order from the catalog, aligned with production `.bin` style.

### 6. Nodes → Configure (schemas & packs)

1. **Nodes → Configure** (confirm if prompted).
2. **Pasta Converter Class Group…** — set the default folder for Class Group conversion (can be `default`).
3. In CodeDock: **Extrair Node Base** to pull base schemas from the catalog into the pack.
4. **Converter [Class Group]** uses that folder when Configure is on.

New scenes in Configure mode start **empty** (no forced placeholder root).

### 7. Scene states (presets)

In the **States** area of the nodes panel:

- **Save** a named preset (node visibility, locks, labels, card layout, link filter, **camera** pan/zoom).
- **Load** a preset to restore that view.
- Import/export presets as JSON from the context menu when needed.

### 8. Nodes in scene

The **Nodes in scene** list helps you:

- Select and focus nodes without hunting on the canvas
- Hide or show nodes (scene overlay)
- Lock nodes (blocks dragging and new output links)
- Use **peer toolbar** on output slots (focus/lock/hide the connected child)

### 9. Jade integration

In CodeDock **Tools**:

- Jade path / engine settings
- Open `.bin` via bridge (dev workflow with `pnpm jade-bridge:dev` or Rust HTTP bridge)

---

## What’s new since the previous `main` (plain language)

Features landed after the old English-only README on `main`, grouped newest first:

- **Node Graphs to Code** — export Main + subtree to `#PROP_text` ritual; menu + context menu; progress UI; full CodeDock load.
- **Export & port fixes** — PascalCase fields, correct `entries` order, `bool`/`flag` from schema; output slots drag + route cycling with chain icon on all link types; `graphPointFromElementCenter` for wire draft.
- **Scene states, routing, light tab save** — named presets with camera; flex/rigid/wireless links; submenu “link shape”; hide all linked children; no heavy auto-save.
- **Nodes Configure + `default` pack** — configuration mode, Class Group folder, empty new scenes, Extract Node Base.
- **Jade bridge (dev) + CodeDock Jade menu** — open `.bin` from the editor in development.
- **Scene tabs + Graph menu** — multiple scenes, recent JSON, save work scene, unified tab bar + canvas chrome.
- **Scene persistence & notifications** — save/load UX (auto-save to disk later simplified).
- **Retract element in card** — collapse embed/list rows; wireless pulse on retracted slots.
- **Nodes in scene panel** — overlay list, lock/hide/focus, selection rules.
- **Main / inspector / map hash UX** — Main Class Group entry, canvas legend, inspector, `mapHashEmbed` entry linking.
- **Compact structure view** — dense internal structure rows; auto wireless in compact mode.
- **Wireless connection** — third routing mode; chain icon; peer hover highlight.
- **Class Group building blocks** — map hash/embed/u64, LIST2 embed/pointer, POINTER, list embed, primitive list pickers, element menus + search, dynamic collection-type linking, parameter suffixes, canvas context menu, hash/string inspector, workspace disk hooks, and related schema/UI work.

---

## Technical documentation

Implementation notes (Mermaid diagrams, commit hashes, API tables) live under [`feature_md/feature/`](feature_md/feature/):

| Topic | Document |
| --- | --- |
| Node Graphs to Code | [feature-node-graphs-to-code.md](feature_md/feature/feature-node-graphs-to-code.md) |
| Code To Node Graph | [feature-code-to-node-graph.md](feature_md/feature/feature-code-to-node-graph.md) |
| Scene tabs & Graph menu | [feature-abas-cena-json-menu-grafo.md](feature_md/feature/feature-abas-cena-json-menu-grafo.md) |
| Scene save / Graph menu (earlier) | [feature-cena-persistencia-menu-grafo.md](feature_md/feature/feature-cena-persistencia-menu-grafo.md) |
| States, routing, tab persistence | [feature-cena-estados-routing-persistencia.md](feature_md/feature/feature-cena-estados-routing-persistencia.md) |
| Nodes Configure & default pack | [feature-nodes-configurar-pack-default.md](feature_md/feature/feature-nodes-configurar-pack-default.md) |
| Nodes in scene | [feature-nodes-em-cena.md](feature_md/feature/feature-nodes-em-cena.md) |
| Jade CodeDock menu | [feature-menu-jade-codedock.md](feature_md/feature/feature-menu-jade-codedock.md) |
| Jade auto bridge (dev) | [feature-jade-bridge-auto-dev.md](feature_md/feature/feature-jade-bridge-auto-dev.md) |
| Wireless links | [feature-wireless-connection.md](feature_md/feature/feature-wireless-connection.md) |
| Compact structures | [feature-compact-structure-view.md](feature_md/feature/feature-compact-structure-view.md) |
| Retract element | [feature-retrair-elemento-card.md](feature_md/feature/feature-retrair-elemento-card.md) |
| Main / inspector UX | [feature-canvas-inspector-main-ux.md](feature_md/feature/feature-canvas-inspector-main-ux.md) |
| Canvas context menu | [feature-canvas-context-menu.md](feature_md/feature/feature-canvas-context-menu.md) |
| Dynamic collection linking | [feature-dynamic-collection-type-linking.md](feature_md/feature/feature-dynamic-collection-type-linking.md) |
| Map hash / u64 primitives | [feature-class-group-map-hash-u64-primitives.md](feature_md/feature/feature-class-group-map-hash-u64-primitives.md) |
| LIST2 embed / pointer | [feature-list2-embed-pointer-class-group.md](feature_md/feature/feature-list2-embed-pointer-class-group.md) |
| LIST embed | [feature-list-embed-class-group.md](feature_md/feature/feature-list-embed-class-group.md) |
| POINTER | [feature-pointer-class-group.md](feature_md/feature/feature-pointer-class-group.md) |
| EMBED | [feature-embed-class-group.md](feature_md/feature/feature-embed-class-group.md) |
| Parameter pickers | [feature-parameter-pickers-class-group.md](feature_md/feature/feature-parameter-pickers-class-group.md) |
| Element menu | [feature-element-menu.md](feature_md/feature/feature-element-menu.md) |
| Element menu search | [feature-element-menu-search.md](feature_md/feature/feature-element-menu-search.md) |
| Workspace disk | [feature-workspace-disk-persistence.md](feature_md/feature/feature-workspace-disk-persistence.md) |
| Node instance | [feature-node-instance-feature.md](feature_md/feature/feature-node-instance-feature.md) |
| Main Class Group | [feature-main-class-group.md](feature_md/feature/feature-main-class-group.md) |

---

---

# Português — Guia do utilizador

## O que é esta aplicação?

É um **editor visual de grafos de nós** para ficheiros de dados do League of Legends (ritual Class Group / `.bin`). Em vez de editar só texto enorme, vês **cartões ligados por fios**: cada nó é um tipo de dados (VFX, skin, animação, etc.) e cada **slot de saída** liga ao nó filho correcto.

Serve para **ir e voltar** entre código ritual e grafo: importar texto → editar na cena → exportar de novo.

## Como executar

```bash
pnpm install
pnpm dev
```

Requisitos: Node 18+ e pnpm. Abre o endereço que o terminal mostrar.

## Passo a passo (uso diário)

### 1. Primeira abertura

- **Meio:** cena gráfica (nós e ligações).
- **Code:** painel de código à direita (botão **Código** no menu).
- **Abas** no topo da zona do grafo: cada aba é uma cena de trabalho.

### 2. Cenas de trabalho

Menu **Grafo**:

- **Nova Cena de trabalho** — começar do zero.
- **Carregar cenas recentes** — reabrir um JSON guardado antes.
- **Salvar Cena de trabalho** — gravar a cena completa num ficheiro `.json`.

Grava explicitamente quando quiseres backup; o auto-save pesado em `localStorage` foi removido para não encher a quota do browser.

### 3. Do código para o grafo (importar)

1. Cola ou abre o ritual no **CodeDock**.
2. **Converter [Class Group]** — escolhe a pasta do pack (ex.: `default`).
3. **Code To Node Graph** — gera os nós na cena (inclui o nó **Main** e os filhos ligados).
4. Explora o grafo: zoom com a roda, arrasta o fundo para mover a vista.

### 4. Editar ligações e nós

- **Adicionar nó:** menu **Nodes → Adicionar…**
- **Ligar:** arrasta do **slot de saída** (bolinha/ícone à direita da estrutura) até ao nó filho ou solta no canvas vazio para escolher o tipo na paleta.
- **Completar ligação:** com um fio a meio, clica na **entrada** do nó destino (topo do cartão).
- **Forma da ligação:** clique **curto** num slot já ligado (ícone de corrente) alterna **flexível → rígida → sem fio**.
- **Religar:** clique curto num slot **livre** abre o menu de tipos compatíveis.
- **Menu de contexto:** botão direito no canvas, nó, slot ou fio.

### 5. Do grafo para o código (exportar) — funcionalidade mais recente

1. A cena deve ter **um único** nó **Main** com a subárvore que queres exportar.
2. **Grafo → Node Graphs to Code**.
3. Indica o nome da aba (ex.: `Zac.bin`).
4. O ritual completo aparece no CodeDock (sem cortar ficheiros grandes).

O texto gerado segue o estilo do `.bin` de referência (campos em PascalCase, ordem das `entries` do catálogo Main).

### 6. Modo Configurar (schemas)

1. **Nodes → Configurar** (activar).
2. **Pasta Converter Class Group…** — pasta predefinida do pack.
3. No CodeDock: **Extrair Node Base** e **Converter [Class Group]** usam essa pasta.

### 7. Estados de cena

Guarda **presets** com nome: quais nós estão ocultos, travados, cores, secções do cartão, filtro de ligações e **posição da câmera** (zoom/pan). Útil para comparar layouts ou voltar a uma vista de trabalho.

### 8. Nodes em cena

Lista lateral para seleccionar, focar, ocultar ou travar nós. Nos slots ligados, a barra de **peer** foca/oculta/trava o filho ligado.

### 9. Jade

Ferramentas no CodeDock para caminhos do Jade e abrir `.bin` em desenvolvimento (`pnpm jade-bridge:dev`).

#### 9a. Native hash resolution (CodeDock)

| Step | Action |
| --- | --- |
| 1 | `npm run jade:http-bridge:build` (once) — or ensure `jade-http-bridge.exe` exists under `Jade-League-Bin-Editor/src-tauri/target/release/` |
| 2 | In **Jade desktop**: Settings → **Hashes** — download/preload FrogTools tables |
| 3 | `npm run dev` — Vite starts the Rust bridge when available (not the Node mock) |
| 4 | **File → Open…** `_jade.bin` / `_editor.bin` — ritual text with field **names**, not only `0x…` hashes |
| 5 | Yellow CodeDock banner **Mock bridge** → run build script above and restart `dev` |
| 6 | Menu **Resolver hashes PROP (Jade)** re-applies Jade parser on the active tab |

**PT:** O motor Jade (`resolve_ritobin_text` via `jade-http-bridge`) faz `text_reader → unhash → text_writer`. Fallback FNV (~80 campos VFX) só aparece com mock bridge, com aviso visível.

Technical doc: [`feature_md/feature/feature-jade-hashes-vfx-timeline-reset.md`](feature_md/feature/feature-jade-hashes-vfx-timeline-reset.md).

#### 9b. VFX timeline reset point

| Step | Action |
| --- | --- |
| 1 | Open **VFX** dock, **Rebuild**, then **Play** |
| 2 | **Right-click** the time slider or the track/ruler area |
| 3 | **Reset point @ X.XXs** — amber marker; when playback reaches it, time jumps to **0s** (segment review) |
| 4 | **Remove reset point** clears the marker |

**PT:** Útil para repetir um trecho da animação sem activar loop global no fim do efeito.

---

## Acknowledgements

Special thanks to **Bud**, creator of the Jade tool that powers the BIN conversion system used in this project.  
GitHub: https://github.com/budlibu500

Key contributions include:

* BIN code conversion
* BIN League syntax analysis
* Particle editing systems
* General-purpose editing tools

Their work and support were essential to the development and functionality of this project.

---

## Funcionalidades desde a última `main` (resumo simples)

Tudo o que a branch `main` antiga ainda **não** tinha, explicado por tema:

| Tema | O que ganhaste |
| --- | --- |
| **Código ↔ Grafo** | **Code To Node Graph** (texto → cena) e **Node Graphs to Code** (cena → texto), inversos um do outro. |
| **Cena** | Várias abas; menu Grafo; guardar/abrir JSON; estados nomeados com câmera; persistência leve de abas. |
| **Nós** | Painel “em cena”; modo Configurar + pack `default`; elementos retraídos no cartão. |
| **Ligações** | Tipos flex/rigid/wireless; ícone de corrente; ocultar filhos ligados; foco no par; arrasto e clique nos slots corrigidos. |
| **Class Group** | Map hash/embed, listas, pointers, pickers, menus de elemento, ligação por collection type, inspector. |
| **Jade** | Menu e ponte em dev; resolução nativa de hashes no CodeDock (`jadeEditorTextResolve`). |
| **VFX** | Reset point na timeline (clique direito → repetir trecho desde 0s). |

A **última** grande entrega é **Node Graphs to Code**: exportar a árvore do Main para ritual `#PROP_text` como no `estrutura_bin.py`, com correcções de formato e portos de saída a funcionar de novo.

Documentação técnica detalhada (diagramas, commits): pasta [`feature_md/feature/`](feature_md/feature/).

---

*League BIN Node Editor — community tool, not affiliated with Riot Games.*
