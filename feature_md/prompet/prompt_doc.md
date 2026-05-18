### Para o git:
Crie uma nova, branche, commit de acordo com as instruicoes abaixo.
O arquivo README.md deve ser o mesmo que documento de documentação de implementação em formato Markdown (`.md`), siga as instruicoes para o git de acordo com as regras abaixo.


Atue como um Engenheiro de Software Sênior e Tech Lead. Eu preciso que você crie um documento de documentação de implementação em formato Markdown (`.md`) para uma nova feature que acabei de desenvolver. 

Com base nos **Dados da Implementação** fornecidos no final deste prompt, você deve gerar o conteúdo completo do documento seguindo ESTRITAMENTE a estrutura solicitada abaixo.

### 📜 Regras de Formatação e Saída:
1. Indique que o arquivo deve ser salvo na pasta `feature_md/feature`.
2. O título do arquivo deve ser exatamente o nome da branch informado, com a extensão `.md`.
3. Para os fluxogramas, utilize obrigatoriamente a sintaxe **Mermaid** (em blocos de código ` ```mermaid `) para que sejam renderizados nativamente em plataformas como GitHub/GitLab.
4. **Sistema de Tags:** Utilize as tags `[NOVO]`, `[ATUALIZADO]` e `[REMOVIDO]` ao longo do documento (como na tabela de funções e na descrição) para classificar o que foi feito em cada componente ou função.
5. Entregue o resultado em um bloco de código Markdown pronto para ser copiado.

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

---

### 🛠️ DADOS DA IMPLEMENTAÇÃO (Baseie-se nestes dados para gerar o documento)

*Por favor, leia as informações abaixo e construa a documentação técnica preenchendo as seções solicitadas de forma inteligente e coesa.*

- **Nome da Branch:** `[INSERIR_NOME_DA_BRANCH_AQUI]`
- **Nome da(s) Feature(s):** `[INSERIR_NOME_DAS_FEATURES_AQUI]`
- **Versão:** `[INSERIR_VERSAO_AQUI]`
- **Commit:** `[INSERIR_HASH_DO_COMMIT_AQUI]`

**Tags Gerais aplicadas nesta branch:**
- `[LISTAR_AS_TAGS_AQUI - Ex: [NOVO], [ATUALIZADO]]`

**Lógica e Funcionamento (Para você basear os Fluxogramas e Descrição):**
- `[INSERIR_EXPLICACAO_DO_FLUXO_AQUI - Ex: O usuário clica no botão X, que chama a rota Y, valida os dados e salva no banco Z]`

**Mapeamento de Funções e Componentes (Indique a Tag de status):**
- `[NOVO/ATUALIZADO/REMOVIDO] [NOME_DA_FUNCAO_OU_COMPONENTE_1]: [O que faz e a qual feature pertence]`
- `[NOVO/ATUALIZADO/REMOVIDO] [NOME_DA_FUNCAO_OU_COMPONENTE_2]: [O que faz e a qual feature pertence]`
- `[NOVO/ATUALIZADO/REMOVIDO] [NOME_DA_FUNCAO_OU_COMPONENTE_3]: [O que faz e a qual feature pertence]`

**Observações / Regras de Negócio Específicas:**
- `[INSERIR_REGRAS_DE_TRATAMENTO_DE_ERRO_OU_TECNOLOGIAS_USADAS_AQUI]`
