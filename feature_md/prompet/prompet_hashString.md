# Prompt de Implementação: Feature `hashString`

Você deve implementar uma nova funcionalidade chamada **hashString** no sistema de edição de nodes, seguindo rigorosamente as especificações abaixo.

## 1. Objetivo
Implementar a funcionalidade que permite vincular um identificador (hash) baseado em um parâmetro de string existente no node, refletindo essa escolha na estrutura JSON do objeto.

## 2. Interface (UI/UX)
- **Localização:** Adicionar um botão no painel **Inspector**.
- **Ícone:** Utilizar um ícone de hash (`#`).
- **Posicionamento:** O ícone deve estar posicionado imediatamente à esquerda do nome do node.
- **Comportamento Visual:**
    - **Estado Inativo:** O ícone deve aparecer esmaecido (opacidade reduzida).
    - **Interatividade:** Ao passar o mouse (hover) ou quando a função estiver ativa para aquele node, o ícone deve ser "destacado" (aumentar opacidade/brilho).
- **Condição de Visibilidade:** Este botão/ícone só deve ser exibido se a opção "Configurar" estiver checada no menu de configurações do node.

## 3. Lógica de Programação (`addHashStringInNode`)
Ao clicar no ícone, disparar a função `addHashStringInNode` com o seguinte fluxo:

### Passo A: Validação de Parâmetros
1. Listar todos os parâmetros do node atual que sejam estritamente do tipo `string`.

### Passo B: Fluxo de Decisão
- **Cenário 1: Se existirem parâmetros do tipo string:**
    - Exibir uma lista de seleção (dropdown ou modal) para o usuário escolher qual parâmetro será a base para a `hashString`.
    - **Persistência:** - Se já houver uma chave `"hashString"` no JSON do node, substitua o valor.
        - Se não houver, adicione a nova chave.
    - **Atualização:** Ao selecionar um novo parâmetro como hash, esmaeça a visualização do parâmetro anterior e dê foco visual ao novo parâmetro vinculado no inspetor.

- **Cenário 2: Se NÃO existirem parâmetros do tipo string:**
    - Acionar o componente `[ConsoleNotificationCapsule]`.
    - **Mensagem:** "Você precisa adicionar um parâmetro do tipo string name em seu node, adicione para definir a hashString".
    - **Duração:** O popup deve permanecer visível por exatamente **10 segundos**.

## 4. Estrutura de Dados (JSON)
Após a definição pelo usuário, o JSON adicionado a .json correspondente ao node e deve ser atualizado ou criado seguindo este formato:

```json
{
  "hashString": "{valor_do_parametro_da_string_escolhida}"
}

## 5. Requisitos Técnicos
Certifique-se de que a função addHashStringInNode gerencie corretamente o estado do node para que a UI reflita as mudanças de "esmaecido/destacado" em tempo real.

O mapeamento entre o parâmetro escolhido e a chave hashString deve ser reativo; se o valor da string original mudar, o valor em hashString deve ser atualizado conforme a lógica de persistência do sistema.