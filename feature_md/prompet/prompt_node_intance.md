Esse é um excelente rascunho de requisitos. Para que o seu prompt fique perfeito para análise de desenvolvimento (seja para documentação do seu projeto, para passar para outro programador, ou para usar como base na escrita do seu próprio código JavaScript), é ideal organizar as informações em uma **Especificação de Funcionalidade (Feature Spec)**.

Como o sistema envolve manipulação de JSON e exportação de dados, ter a estrutura bem definida evitará bugs na hora de salvar na pasta correta.

Aqui está uma versão refinada, corrigida e estruturada do seu prompt que você pode utilizar:

---

### 📋 Especificação de Feature: Node Instance

**Objetivo:**
Implementar a capacidade de criar uma "Node Instance" a partir de um nó existente, capturando seus elementos e valores atuais, e salvando-o como um arquivo JSON formatado no diretório pai.

#### 1. Interface de Usuário (UI - Inspetor)

* Adicionar um novo botão com o rótulo **`Instance`**.
* **Posicionamento:** O botão deve ficar localizado no painel do Inspetor, imediatamente acima do botão `Delete Node`.

#### 2. Comportamento e Função (`convertToNodeInstance`)

* Ao clicar no botão `Instance`, o sistema deve disparar a função `convertToNodeInstance()`.
* A função deve fazer o parse do nó atual, capturando todos os elementos adicionados e seus respectivos valores para compor os dados da nova instância.

#### 3. Validação e Definição do Nome (`string_name`)

Antes de concluir a conversão, o sistema precisa definir a variável `string_name`:

* O sistema deve buscar todos os parâmetros do tipo *string* presentes no nó atual.
* **Cenário A (Parâmetros encontrados):** Abrir uma lista (dropdown ou modal) exibindo todos os parâmetros do tipo *string* disponíveis para que o usuário escolha um. O valor selecionado se tornará o `string_name`.
* **Cenário B (Nenhum parâmetro encontrado):** Interromper a execução da função e exibir exatamente a seguinte mensagem de aviso ao usuário:
> *"Você precisa adicionar um parâmetro do tipo string em seu node para que defina o nome do node."*



#### 4. Regras de Salvamento (Exportação JSON)

* **Diretório de Destino:** O arquivo JSON deve ser salvo obrigatoriamente na "pasta mãe" do diretório atual em que o nó se encontra.
* *Exemplo lógico:* Se o nó estiver localizado em `pasta_mae/importado_VFX/`, o arquivo será salvo em `pasta_mae/importado/`.


* **Nomenclatura do Arquivo:** O arquivo gerado deve seguir o padrão:
* `{id_do_node}_{string_name}.json`



#### 5. Estrutura de Dados Interna (JSON)

Dentro do arquivo gerado, os metadados principais do nó instanciado devem ser preenchidos da seguinte forma:

* **`id`**: `{id_do_node}_{string_name}`
* **`title`**: `{id_do_node} · {string_name}`

---

**Dica extra para a sua implementação:** Se você estiver utilizando uma lógica de caminhos relativos (como em ambientes Node.js ou sistemas de manipulação de arquivos via web), para pegar a "pasta mãe", lembre-se de usar métodos como `caminho_atual.split('/')` ou `path.dirname()` para garantir que ele suba exatamente um nível na árvore de diretórios ao salvar o JSON, descartando o sufixo (como o `_VFX`).

O que achou dessa estrutura? Se precisar adicionar mais detalhes sobre quais elementos específicos do nó devem ser ignorados ou incluídos no JSON, podemos refinar ainda mais!