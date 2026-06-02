### Para o git:
Crie uma nova, branche, commit de acordo com as instruicoes abaixo.
O arquivo README.md deve ser o mesmo que documento de documentação de implementação em formato Markdown (`.md`), siga as instruicoes para o git de acordo com as regras abaixo.


Atue como um Engenheiro de Software Sênior e Tech Lead. Eu preciso que você crie um documento de documentação de implementação em formato Markdown (`.md`) para uma nova feature que acabei de desenvolver. 

Com base nos **Dados da Implementação** fornecidos no final deste prompt, você deve gerar o conteúdo completo do documento seguindo ESTRITAMENTE a estrutura solicitada abaixo.

### 📜 Regras de Formatação e Saída:
1. Indique que o arquivo deve ser salvo na pasta `feature_md/feature`.
2. O título do arquivo deve ser exatamente o nome da branch informado, com a extensão `.md` (prefixo `feature-` no nome do ficheiro, ex.: branch `feature/block-link-palette` → `feature-block-link-palette.md`).
3. Para os fluxogramas, utilize obrigatoriamente a sintaxe **Mermaid** (em blocos de código ` ```mermaid `) para que sejam renderizados nativamente em plataformas como GitHub/GitLab.
4. **Sistema de Tags:** Utilize as tags `[NOVO]`, `[ATUALIZADO]` e `[REMOVIDO]` ao longo do documento (como na tabela de funções e na descrição) para classificar o que foi feito em cada componente ou função.
5. Entregue o resultado em um bloco de código Markdown pronto para ser copiado.
6. **Confirmações de UI:** usar sempre o **Messenger Popup** (`showConfirmByCatalogId` + entrada em `messenger_popup_catalog.json`). **Não** usar `window.confirm` / `window.alert` para fluxos novos (excepto erros técnicos já existentes).
7. **Sistema de blocos:** para features de ligação entre `BlockCard`, ler também `feature_md/prompet/prompet_sistema_blocos.md` (secção 5 — paleta LINK NEW NODE).

---

### 🏗️ Estrutura Obrigatória do Documento:

O documento gerado deve conter as seguintes seções, nesta ordem exata:

1. **Cabeçalho:** Contendo o Nome das Features, a Versão atual e o Hash do Commit.
2. **Definição e Resumo de Tags:**
   - Uma tabela definindo as tags de alteração utilizadas no projeto.
   - Uma lista de quais dessas tags estão presentes na implementação desta branch.
3. **Fluxograma de Funcionamento:** Um diagrama de fluxo (Graph TD ou LR) explicando a lógica de negócio macro e o caminho dos dados.
4. **Fluxograma de Acionamento de Funções:** Um diagrama de sequência (Sequence Diagram) mostrando exatamente a ordem em que as funções são chamadas e quem as aciona.
5. **Tabela de Funções e Componentes:** Uma tabela detalhada contendo as seguintes colunas:
   - Status (A Tag correspondente: `[NOVO]`, `[ATUALIZADO]` ou `[REMOVIDO]`)
   - Nome (Função, Componente, Botão, etc.)
   - Feature Correspondente
   - Descrição Técnica
   - Parâmetros Recebidos / Retorno
6. **Descrição Detalhada de Funcionamento:** Um texto em prosa explicando a arquitetura escolhida, as regras de negócio, o tratamento de exceções/erros, e contextualizando as criações, atualizações e remoções.
7. **Como utilizar (didático):** Secção em **português** e **inglês** com passos para o utilizador final.

---

### 🛠️ DADOS DA IMPLEMENTAÇÃO (Baseie-se nestes dados para gerar o documento)

*Por favor, leia as informações abaixo e construa a documentação técnica preenchendo as seções solicitadas de forma inteligente e coesa.*

- **Nome da Branch:** `[INSERIR_NOME_DA_BRANCH_AQUI]` — sugestão para entrega desta feature: `feature/block-link-palette`
- **Nome da(s) Feature(s):** `[INSERIR_NOME_DAS_FEATURES_AQUI]`
- **Versão:** `[INSERIR_VERSAO_AQUI]` — ex.: `1.5.0` (`package.json`)
- **Commit:** `[INSERIR_HASH_DO_COMMIT_AQUI]` — `git rev-parse HEAD`

**Tags Gerais aplicadas nesta branch:**
- `[LISTAR_AS_TAGS_AQUI - Ex: [NOVO], [ATUALIZADO]]`

**Lógica e Funcionamento (Para você basear os Fluxogramas e Descrição):**
- `[INSERIR_EXPLICACAO_DO_FLUXO_AQUI]`

**Mapeamento de Funções e Componentes (Indique a Tag de status):**
- `[NOVO/ATUALIZADO/REMOVIDO] [NOME_DA_FUNCAO_OU_COMPONENTE_1]: [O que faz e a qual feature pertence]`
- `[NOVO/ATUALIZADO/REMOVIDO] [NOME_DA_FUNCAO_OU_COMPONENTE_2]: [O que faz e a qual feature pertence]`

**Observações / Regras de Negócio Específicas:**
- `[INSERIR_REGRAS_DE_TRATAMENTO_DE_ERRO_OU_TECNOLOGIAS_USADAS_AQUI]`

**Referência já documentada (não substituir o template — usar como modelo):**
- Documento completo: `feature_md/feature/feature-block-link-palette.md`
- Plano de produto blocos: `feature_md/prompet/prompet_sistema_blocos.md` (secção 5)

---

### 📋 Exemplo preenchido — Paleta LINK NEW NODE (blocos)

_Use este bloco quando a branch for a paleta de ligação de blocos; copie/adapte para o ficheiro `feature-block-link-palette.md`._

- **Nome da Branch:** `feature/block-link-palette`
- **Nome da(s) Feature(s):** Paleta LINK NEW NODE (blocos), ligação forçada com Messenger, spawn com conexão atómica
- **Versão:** `1.5.0`
- **Commit:** _(hash da branch de entrega)_

**Tags:** `[NOVO]`, `[ATUALIZADO]`

**Lógica resumida:**
- Arrastar OUT de bloco → soltar no vazio → paleta Blocks filtrada por `outTypes` / `fromParameterName`.
- Escolher bloco na lista → `createBlockNodeFromDefinition(..., spawnLink)` + `applyBlockSlotConnectionToScene` na mesma `updateScene`.
- Arrastar OUT para IN incompatível (campo pai OK, tipo filho diferente) → `classifyBlockSlotConnection` = `forced` → Messenger `confirm_block_connection_forced` → `forced: true` + cores invertidas nos ports.

**Componentes-chave:**
- `[NOVO]` `blockDefinitionLinkPalette.ts`, `applyBlockSlotConnectionToScene`, `classifyBlockSlotConnection`
- `[ATUALIZADO]` `GraphCanvas`, `AddNodePalette`, `PaletteAddBlockOption`, `useSceneHistory.createBlockNodeFromDefinition`, `BlockSlot` (visual forced)

---

**SECOES TEXTO EM INGLES E DEPOIS PORTUGUES** (secção 7 do documento gerado).

**Quando terminar faz o push e todos processoces.**

**é os cretitos no README tambem:**

copie o texto feature_md/feature para o readme.md

adicione 
## Acknowledgements

Special thanks to **Bud**, creator of the Jade tool that powers the BIN conversion system used in this project.
GitHub: https://github.com/budlibu500

Key contributions include:

* BIN code conversion
* BIN League syntax analysis
* Particle editing systems
* General-purpose editing tools

Their work and support were essential to the development and functionality of this project.
