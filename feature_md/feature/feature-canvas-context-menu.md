# Documentação de Implementação — Menu de contexto no canvas

Arquivo salvo em: `feature_md/feature/feature-canvas-context-menu.md`

## 1. Cabeçalho

| Campo | Valor |
| --- | --- |
| Nome da Branch | `feature/canvas-context-menu` |
| Nome das Features | Menu de contexto unificado (grade, nó, ligação, elementos internos); modo «Mover na grade» |
| Versão actual | `1.5.0` |

## 2. Definição e Resumo de Tags

| Tag | Definição |
| --- | --- |
| `[NOVO]` | Novo componente, arquivo, função ou tipo criado nesta branch. |
| `[ATUALIZADO]` | Componente ou fluxo existente alterado para suportar a feature. |

Tags presentes nesta implementação:

- `[NOVO]`
- `[ATUALIZADO]`

## 3. Fluxograma de Funcionamento

```mermaid
flowchart TD
  RMB[Botao direito] --> Resolve[resolveContextTarget]
  Resolve --> Build[buildContextMenuItems]
  Build --> Menu[CanvasContextMenu portal]
  Menu --> Act[runContextMenuAction]
  Act --> GC[GraphCanvas / useSceneHistory]
```

## 4. Fluxograma de Acionamento

```mermaid
sequenceDiagram
  actor U as Utilizador
  participant VP as viewportBody
  participant Res as canvasContextMenuResolve
  participant Items as canvasContextMenuItems
  participant UI as CanvasContextMenu
  participant GC as GraphCanvas

  U->>VP: contextmenu
  VP->>Res: closest data-canvas-context
  Res->>Items: target + buildContext
  Items->>UI: itens + anchor
  U->>UI: escolhe accao
  UI->>GC: runContextMenuAction
```

## 5. Tabela de Funções e Componentes

| Status | Nome | Descrição |
| --- | --- | --- |
| `[NOVO]` | `canvasContextMenuTypes.ts` | `CanvasContextTarget`, `ContextMenuItem`, ids de acção |
| `[NOVO]` | `canvasContextMenuAttributes.ts` | `data-canvas-context-*`, `canvasContextElementProps` |
| `[NOVO]` | `canvasContextMenuResolve.ts` | Resolve alvo a partir do DOM (elemento > fio > nó > grade) |
| `[NOVO]` | `canvasContextMenuItems.ts` | Lista de itens por alvo |
| `[NOVO]` | `CanvasContextMenu.tsx` | Portal fixo, fechar fora / Escape |
| `[ATUALIZADO]` | `GraphCanvas.tsx` | Estado do menu, modo navegar, handlers, ligação SVG |
| `[ATUALIZADO]` | `App.tsx` | `onDeleteNodeIds`, `onViewNodeCode` |
| `[NOVO]` | `canvasNodeSubtreeToRitual` | Export ritual da subárvore de um nó (preview no CodeDock) |
| `[ATUALIZADO]` | `useSceneHistory.ts` | `createRootNode(schema, position?)` |
| `[ATUALIZADO]` | `ParameterItem`, `InternalStructureItem`, blocos EMBED/POINTER/LIST_* | Atributos de contexto |
| `[ATUALIZADO]` | `ElementMenu.tsx` | `data-element-menu-trigger` para «Gerir elementos…» |

## 6. Menus por alvo

### Grade

Adicionar nó (com posição no clique), zoom +/−, repor vista, desfazer/refazer, focar seleção, seleccionar todos / limpar, alternar **Mover na grade**.

### Modo «Mover na grade»

- Activado pelo menu da grade.
- Arrastar com botão esquerdo no fundo **só faz pan** (não limpa seleção, não inicia marquee).
- Sair: `Escape`, ou clique no vazio sem arrastar (&lt; 4px).
- Indicador na toolbar do canvas.

### Nó

Focar na vista, seleccionar, glue, apagar, adicionar nó raiz, **retrair/expandir corpo** (`bodyCollapsed` no `CanvasNode`; corpo com `display: none`; persistido em `layout.json`). Ao **retrair**, todas as ligações que tocam o nó (entrada e saída) passam a `routing: wireless` com backup em `compactRoutingBackups`; ao **expandir**, restaura o estilo anterior (excepto se o outro nó ainda estiver retraído ou um bloco interno ainda em modo compacto).

#### View code (EN)

Right-click the **node header** (title area, not the input port) → **Code** → **View code**. The app exports via `emitNodeRitualViewCodeText` (`canvasNodeSubtreeToRitual` + graph fidelity) and opens or refreshes a CodeDock tab `preview_{schema.title}.bin`. Main nodes use full `#PROP_text`; others use `finalizeNodePreviewRitual` (map entry key from `particlePath` / `particleName` when set). See [feature-node-ritual-sync-view-code.md](feature-node-ritual-sync-view-code.md).

#### Ver código (PT)

Clique com o botão direito no **cabeçalho do nó** (área do título, não no porto de entrada) → **Código** → **Ver código**. A aplicação exporta o nó e todos os filhos ligados para texto ritual (`emitNodeRitualViewCodeText` → `canvasNodeSubtreeToRitual`) e abre ou actualiza a aba `preview_{schema.title}.bin` no editor de código. Repetir no mesmo nó actualiza a mesma aba. Nós Main usam exportação `#PROP_text` completa; os restantes passam por `finalizeNodePreviewRitual` (chave mapa a partir de `particlePath` / `particleName` quando existirem).

Documentação completa: [feature-node-ritual-sync-view-code.md](feature-node-ritual-sync-view-code.md).

#### Sync values to code (EN)

Right-click the node header → **Code** → **Sync values to code** (requires an active binding on the **ritual** CodeDock tab). The bound editor range is **deleted** and replaced with the **same text** as **View code** (`emitNodeRitualViewCodeText`). Export fidelity comes from the **graph only** (not from reordering to match the old bound snippet). Link first: **Shift-drag** from the node header to the ritual editor.

#### Sincronizar valores para o código (PT)

Botão direito no cabeçalho → **Código** → **Sincronizar valores para o código** (requer vinculação na aba **ritual** activa do CodeDock). A área vinculada no editor é **apagada** e substituída pelo **mesmo texto** que «Ver código» (`emitNodeRitualViewCodeText`). A fidelidade do export vem só do **grafo** (não reordena pelo trecho antigo). Vincular antes: **Shift + arrasto** do cabeçalho do nó até ao editor ritual.

### Ligação (fio SVG)

Alternar estilo do fio, remover ligação (`data-canvas-connection-id` no hit path).

### Elementos internos

Atributos `data-canvas-context` nos cards. Itens típicos: vista compacta/lista, religar IS, remover ligações do slot, remover elemento (via `listRemovableNodeElements`), remover instância LIST2, **Gerir elementos…** (abre `ElementMenu`).

## 7. Regras e guardas

- Ignorado quando `isParameterPickerOpen()` ou alvo é `data-canvas-control` (toolbar).
- `preventDefault` no `contextmenu` para não mostrar menu nativo do SO.
- Menu fecha ao iniciar pan, marquee ou drag de nó.
- Acções de grafo passam por callbacks existentes (`useSceneHistory`); undo automático via `updateScene`.

## 8. Ficheiros principais

- `src/core/canvasContextMenu*.ts`
- `src/components/molecules/CanvasContextMenu.tsx`
- `src/components/organisms/GraphCanvas.tsx`
