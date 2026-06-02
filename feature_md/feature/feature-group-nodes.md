---

## Especificação da Feature: Editor de Grupos (GroupNodes)

**Descrição:** Sistema paralelo e isomórfico ao BlockNodes. Um nó ritual expõe **exactamente uma** vista activa: `NodeCard`, `BlockCard` ou `GroupCard`. Os grupos usam tokens `_groupType&`, metadados em `groupStructure` / `groupViewActive`, registo em `src/groupStructures/`, persistência lean em `groups.json` + `groups[]` na cena v2.

### 1. Namespace e convenções

| Blocos | Grupos |
|--------|--------|
| `_blockType&` | `_groupType&` |
| `blockStructure` / `blockViewActive` | `groupStructure` / `groupViewActive` |
| `block-param:{id}:{in\|out}` | `group-param:{id}:{in\|out}` |
| `block-header:{type}:{i}` | `group-header:{type}:{i}` |
| `src/blockStructures/` | `src/groupStructures/` |
| `blocks.json` / `blocks[]` | `groups.json` / `groups[]` |

**Exclusividade:** activar bloco desactiva grupo (e vice-versa); ligações de slot da vista anterior são removidas no «Gerar».

### 2. Core (`src/core/group*.ts`)

Espelho de `block*.ts`: schema, parser, codegen, slot connections, inspector UI, scene persistence, ritual export, sync to code.

Helpers em `canvasNodeViewMode.ts`:

- `resolveCanvasNodeViewMode(node)` → `'node' | 'block' | 'group'`

### 3. Inspetor de Grupo

- **Tipo do grupo:** inferido automaticamente do schema do nó (`groupType`); **não aparece** como campo editável.
- **Slots:** pré-preenchidos com o `typeParameter` (ex.: `u8`); o utilizador marca IN / OUT / ambos via tags activáveis.
- **Pointers:** aparecem no inspetor; nome = estrutura interna (readonly); slot IN obrigatório.

### 4. UI

Componentes: `GroupInspector`, `GroupCard`, `GroupSlot`, `GroupParameterRow`, tokens `--group-*` em `tokens.css`.

### 5. Persistência

**Workspace:** `groups.json` lean (`nodeId`, `type`, `name`, `parameters[]` com refs — sem `identification_codes`). `logic.json` guarda apenas tokens em `values`.

**Cena v2:** array opcional `groups[]` no root, espelhando `blocks[]`.

### 6. Fluxo

1. Seleccionar nó → Inspetor de Grupo
2. Expor parâmetros + configurar slots → **Gerar Grupo**
3. Tokens `_groupType&` injectados em `node.values`; `groupViewActive=true`
4. Canvas renderiza `GroupCard`; ligações via `group-param:` / `group-header:`

### 7. Testes

Suites Vitest: `groupTokenParser`, `groupTokenCodegen`, `groupSlotConnections`, `groupInspectorUi`, `groupRitualExport`, `codeToGroupStructure`, round-trip `groups[]` em `leagueBinScene.test.ts` e `groups.json` em `workspacePersistence.test.ts`.
