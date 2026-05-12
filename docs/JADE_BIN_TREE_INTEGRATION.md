# Jade → node-graphs-lol: modelo de dados real e caminho para nós no canvas

Este documento sintetiza como o [Jade-League-Bin-Editor](https://github.com/RitoShark/Jade-League-Bin-Editor) interpreta `.bin`, o que **não** é esse fluxo hoje no `node-graphs-lol`, e uma abordagem alinhada ao que pediste: **usar a estrutura que o Jade já materializa** para derivar nós do grafo.

## O que o Jade trata como “verdade” do ficheiro

O pipeline principal em Rust repousa em crates **LeagueToolkit** (`ltk_meta`, `ltk_ritobin`):

| Artefacto | Papel |
|-----------|--------|
| **`BinTree`** (`ltk_meta`) | Estrutura em memória após ler bytes PROP/PTCH: objectos indexados por **`path_hash`**, propriedades tipadas, **`dependencies`** entre bins, etc. |
| **`read_bin` / `BinTree::from_reader`** (`core/bin/ltk_bridge.rs`) | Entrada: bytes do `.bin`. Saída: `BinTree`. |
| **`tree_to_text_cached` / `tree_to_text`** | `BinTree` → **texto ritobin** (formato que o Monaco edita). |
| **`text_to_tree`** | Ritobin texto → `BinTree`. |
| Motor **Jade custom** (`core/bin/jade/`) | Alternativa ao LTK para algumas conversões; o editor escolhe motor nas preferências. |

Há funções de apoio em `core/bin/converter.rs` que serializam **`BinTree` para JSON** (`serde_json::to_string_pretty(tree)`) — hoje são **legado / não expostas ao React** como comando Tauri principal; o caminho exposto à UI é sobretudo **`convert_bin_to_text` → `string`**.

Ou seja: a “estrutura inteira” que o Jade **já interpretou** é **`BinTree`** (e, por equivalência round-trip, o ritobin texto). O teu `json_structure_*.json` stub **`node-graphs-lol`** não é isso — é só um envelope de grafo da nossa app.

## Como a UI do Jade obtém o bin hoje

Em `src/lib/binOperations.ts`:

- `invoke('convert_bin_to_text', { inputPath })` → recebe **`BinInfo` com `data: string`** (conteúdo **texto ritobin**, não JSON de `BinTree`).
- Simétrico: `convert_text_to_bin` grava bin a partir dessa string.

Não havia comando Tauri documentado até à extensão local; usar **`convert_bin_to_json`** (este workspace).

## Implicação para o `node-graphs-lol`

- **No browser puro (Vite/React)** não tens `ltk_meta` nem leitura PROP/PTCH: precisas de **processo nativo** (Tauri, servidor local, ou ferramenta CLI) que faça `bytes → BinTree` (ou `bytes → texto → text_to_tree`).
- **Substituir “JSON de extração” próprio** por “estrutura Jade” significa na prática **definir um contrato de transporte**, por exemplo:
  1. **`jadeBinTree.json`** — `BinTree` serializado com `serde` (o mesmo tipo que `converter.rs` já sabe produzir numa `String`), **ou**
  2. Ritobin texto (já tens no bridge como `text`), mas aí o mapeamento para nós obriga a **parser ritobin em TS** ou a **parse no servidor** (`text_to_tree` + depois `bin_to_json`) — **duplicar parsing no TS é o pior dos mundos**.

Recomendação: **canal A — JSON de `BinTree` vindo do Rust** (novo comando Tauri no Jade *ou* um sidecar mínimo que use as mesmas crates), e no `node-graphs-lol` um módulo **`jadeBinTreeToScene.ts`** que:
- percorre `objects` / propriedades relevantes para *particle* (ou outro domínio que escolhas),
- cria **`NodeSchemaDefinition`** dinâmicos ou um **nó “bin-object” genérico** por `path_hash` com campos como lista genérica até refinarmos tipos League,
- preenche **`CanvasConnection`** a partir de referências/embeds que identifiques nos dados (isto é **design por tipo de `.bin`** — não automático só com `BinTree` genérico).

## Referência implementada neste workspace

Clone local (extensão aplicada sobre `main`): **`../Jade-League-Bin-Editor/`**

- Novo comando Tauri: **`convert_bin_to_json`** (`input_path`, opcional **`pretty`**).
- Documentação rápida no próprio Jade: **`Jade-League-Bin-Editor/docs/NODE_GRAPHS_BRIDGE.md`**
- Frontend: **`readBinAsJsonDirect`** em `Jade-League-Bin-Editor/src/lib/binOperations.ts`.

O próximo passo no `node-graphs-lol` é consumir este JSON (`POST` no bridge sidecar ou ficheiro exportado desde Jade) num módulo **`binTreeJsonToCanvasScene`** (ainda não implementado).

## Passos pragmáticos (ordem sugerida)

1. **Validação:** exportar JSON com `convert_bin_to_json` / **`readBinAsJsonDirect`** a partir de 1–2 `.bin` reais (confirmar `objects`/`dependencies`).
2. **Bridge no `node-graphs-lol`:** além do mock `POST /convert` (texto), **`POST /convert-tree`** ou extensão do sidecar Jade que exponha JSON (Rust partilhando o mesmo `parse_bin_slice_to_bin_tree`).
3. **Mapper incremental:** `binTreeJsonToCanvasScene` — começar com um nó por objecto ou subárvore, depois heurísticas de partículas.

## Riscos e limitações

- **Tamanho:** alguns bins são grandes — JSON pode ser pesado para `replaceScene`; pode ser preciso streaming, resumo ou “só subtree” por hash.
- **Nomes:** labels legíveis dependem dos **hash files** (Jade já carrega caches em `tree_to_text_cached`); para o grafo convém incluir **metadados de resolução** ou duplicar lógica de hash no sidecar.
- **Sem semântica de grafo nos bins:** `BinTree` não “é” um graph editor; o **mapa para nós+fios** é uma **política de produto** que vocês definem (ex.: raiz = `ParticleSystemDefinition`, filhos = emitters, etc.).

---

**Conclusão:** A abordagem que descreveste é correta alinhada ao Jade: a fonte deveria ser **`BinTree` (ou ritobin round-trip)**, não um JSON de grafo inventado no stub. O trabalho seguinte é **expôr `BinTree` como JSON a partir do mesmo stack Rust** e **escrever o mapper** no `node-graphs-lol` para o vosso `CanvasScene`.
