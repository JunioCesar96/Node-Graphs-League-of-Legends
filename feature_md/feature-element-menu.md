# Documentação de Implementação — Element Menu

Arquivo salvo em: `feature_md/feature-element-menu.md`

## 1. Cabeçalho

| Campo | Valor |
| --- | --- |
| Nome da Branch | `feature/element-menu` |
| Nome das Features | Element Menu, Remoção Dinâmica de Elementos |
| Versão atual | `1.4.0` |
| Hash do Commit | `7a7ecb60d8c23660128290c3c85f47086a22f638` |

## 2. Definição e Resumo de Tags

| Tag | Definição |
| --- | --- |
| `[NOVO]` | Novo componente, arquivo, endpoint, função ou estrutura de dados criado nesta branch. |
| `[ATUALIZADO]` | Componente, função, schema ou fluxo existente alterado para suportar a feature. |
| `[REMOVIDO]` | Código, comportamento ou componente removido da aplicação. |

Tags presentes nesta implementação:

- `[NOVO]`
- `[ATUALIZADO]`
- `[REMOVIDO]`

## 3. Fluxograma de Funcionamento

```mermaid
graph TD
  subgraph card [NodeCard]
    EM[Botao Element]
    Plus["+ Element painel de adicao"]
    Minus["- Element abre picker"]
    ERP[ElementRemovalPicker]
  end
  subgraph filtros [Regras de lista]
    RP[listRemovableNodeElements]
    REQ[Exclui parametros obrigatorios]
    RP --> REQ
  end
  subgraph app [App.tsx]
    Confirm[Messenger confirm_remove_node_element]
    Remove[removeCanvasParameter / removeCanvasInternalStructure]
  end
  subgraph hook [useSceneHistory]
    Scene[scene atualizado]
    Sync[syncSceneToDisk em DEV]
  end
  EM --> Plus
  EM --> Minus
  Minus --> RP
  RP --> ERP
  ERP -->|selecionar item + Confirmar| Confirm
  Confirm --> Remove
  Remove --> Scene
  Scene --> Sync
  Sync --> Disk[logic.json layout.json graph.json]
```

## 4. Fluxograma de Acionamento de Funções

```mermaid
sequenceDiagram
  actor U as Usuario
  participant EM as ElementMenu
  participant ERP as ElementRemovalPicker
  participant NC as NodeCard
  participant GC as GraphCanvas
  participant App as App.tsx
  participant Core as listRemovableNodeElements
  participant Msg as MessengerPopup
  participant Hook as useSceneHistory
  participant WS as workspaceService

  U->>EM: Clica Element
  U->>EM: Clica - Element
  EM->>NC: onRemoveElement
  NC->>Core: listRemovableNodeElements
  NC->>ERP: open picker
  U->>ERP: pointerdown em item
  ERP->>NC: onSelectKey
  U->>ERP: Clica Confirmar
  ERP->>NC: onConfirm item
  NC->>GC: onRequestRemoveElement
  GC->>App: handleRequestRemoveNodeElement
  App->>App: fx_required_parameter_isMarked guard
  App->>App: countElementDependencies
  App->>Msg: showConfirmByCatalogId
  U->>Msg: Confirma exclusao
  Msg->>Hook: removeCanvasParameter ou removeCanvasInternalStructure
  Hook->>WS: syncSceneToDisk
```

## 5. Tabela de Funções e Componentes

| Status | Nome | Feature | Descrição Técnica | Parâmetros / Retorno |
| --- | --- | --- | --- | --- |
| `[NOVO]` | `listNodeElements.ts` | Element Menu | `listNodeElements` lista parâmetros e internal structures; `listRemovableNodeElements` exclui obrigatórios; `countElementDependencies` e `formatElementDependencyWarning` para aviso na confirmação. | `(node, stubCatalog?) => NodeElementListItem[]` |
| `[NOVO]` | `ElementMenu.tsx` | Element Menu | Dropdown **Element** com **+ Element** (adição) e **- Element** (remoção). Ignora cliques no picker via `data-element-removal-picker`. | Props de catálogo, `onRemoveElement`, `parameterStubCatalog` |
| `[NOVO]` | `ElementRemovalPicker.tsx` | Remoção | Modal com seleção em dois passos: clique seleciona item, **Confirmar** dispara `onConfirm`. Estado `selectedKey` controlado pelo `NodeCard`. | `elements`, `selectedKey`, `onSelectKey`, `onConfirm`, `onClose` |
| `[NOVO]` | `ElementRemovalPicker.module.css` | Remoção | Estilos de item selecionado, botão Confirmar e z-index do backdrop. | — |
| `[NOVO]` | `confirm_remove_node_element` | Remoção | Entrada Messenger com `{elementName}` e `{connectionWarning}`. | Catálogo JSON + constante `MESSENGER_CONFIRM_REMOVE_NODE_ELEMENT` |
| `[ATUALIZADO]` | `NodeCard.tsx` | Element Menu | Substitui `+ Elemento` por `ElementMenu` + `ElementRemovalPicker`; estado `removalSelectedKey`. | `parameterStubCatalog`, `onRequestRemoveElement` |
| `[ATUALIZADO]` | `GraphCanvas.tsx` | Element Menu | Repassa `onRequestRemoveElement` e `parameterStubCatalog` do schema base. | `(canvasNodeId, item) => void` |
| `[ATUALIZADO]` | `App.tsx` | Remoção | `handleRequestRemoveNodeElement` com guard de parâmetro obrigatório, confirmação Messenger e remoção via hook. | Usa `removeCanvasParameter` / `removeCanvasInternalStructure` |
| `[ATUALIZADO]` | `useSceneHistory.ts` | Remoção | Export e uso de `removeCanvasParameter` e `removeCanvasInternalStructure` (limpeza de schema, values, links e conexões de IS). | `(nodeId, elementId) => void` |
| `[REMOVIDO]` | Botão `+ Elemento` | Element Menu | Label e menu flat único substituídos pelo menu em dois níveis **Element**. | — |

## 6. Descrição Detalhada de Funcionamento

A gestão de elementos internos do nó deixou de usar o botão estático **+ Elemento** (lista única de adição) e passou ao componente **ElementMenu**, com menu em dois níveis: **+ Element** mantém o fluxo anterior (criar filho a partir de internal structure existente, acrescentar IS ou parâmetro do catálogo) e **- Element** abre o **ElementRemovalPicker**.

O picker lista apenas elementos removíveis via `listRemovableNodeElements`, que omite parâmetros marcados como obrigatórios em `required_parameter` / `schema.required_parameter`, resolvendo ids dinâmicos (`dyn-param-*`) com o catálogo base do schema (`fx_required_parameter_isMarked`). Internal structures continuam sempre listáveis. O utilizador seleciona um item (destaque visual), activa **Confirmar** no rodapé do modal (ao lado de **Fechar**) e só então o **App** valida novamente se o parâmetro não é obrigatório, calcula dependências (`countElementDependencies`: conexões de grafo para IS, `parameter_value_links` para parâmetros) e mostra confirmação **Messenger**. Após confirmar, `removeCanvasInternalStructure` remove o slot e filtra conexões órfãs em `graph.json`; `removeCanvasParameter` remove parâmetro, valores e vínculos. Em desenvolvimento, `workspaceService.syncSceneToDisk` persiste `logic.json`, `layout.json` e `graph.json` automaticamente quando a cena muda.

**Regras de negócio:** nós `module` mantêm **Element** desabilitado; **- Element** desabilitado se não houver itens removíveis; parâmetros obrigatórios nunca aparecem na lista nem podem ser removidos pelo handler; confirmação Messenger obrigatória antes de excluir; aviso textual quando existem conexões ou vínculos activos.

**Tratamento de erros:** tentativa de remover parâmetro obrigatório no `App` é ignorada (defesa em profundidade); picker com `z-index` elevado e `stopPropagation` em `pointerdown` para não conflitar com o `mousedown` do `ElementMenu`.

**Tecnologias:** React 19, TypeScript, Vitest, Messenger Popup, `useSceneHistory`, persistência workspace em DEV.
