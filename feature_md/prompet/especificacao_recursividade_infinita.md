# Especificação de Refatoração: Algoritmo de Recursividade Infinita e Gestão de Pilha

Este documento descreve a problemática da limitação de níveis no analisador de estruturas binárias atual e define a nova lógica para permitir o aninhamento infinito de estruturas internas.

---

## 1. Problemática Atual: O "Teto" de Níveis e Vazamento de Escopo

O algoritmo atual utiliza uma nomenclatura fixa de **Nível #1 a #4**. Isso gera dois problemas críticos:
1. **Limitação de Profundidade:** Se uma estrutura interna (#3) contiver outra estrutura interna, o algoritmo não possui um "Nível #5" ou superior para classificá-la, resultando em erro de interpretação ou descarte de dados.
2. **Vazamento de Escopo (MainNode Flooding):** Devido à falta de uma gestão de "Pilha" (Stack), o analisador perde a referência de qual estrutura é pai de qual campo. Isso faz com que campos primitivos (como `flags` ou `armorMaterial`) sejam promovidos incorretamente a Nodes de Nível #2, gerando centenas de arquivos `.json` órfãos no diretório raiz.

---

## 2. Proposta de Solução: Recursividade Dinâmica e Pilha (Stack)

A solução consiste em abandonar a numeração fixa de níveis e adotar uma **identificação baseada em contexto e profundidade de indentação**.

### Conceitos Chave:
* **Pilha de Caminho (Path Stack):** Uma lista dinâmica que armazena os IDs dos pais ativos. Exemplo: `[entries, Zac, SkinAudioProperties, BankUnits]`.
* **Identificação por Fechamento:** O algoritmo deve rastrear os símbolos de abertura (`{`) e fechamento (`}`) para saber exatamente quando entrar e sair de uma estrutura, independentemente de quão profunda ela seja.
* **Hierarquia como Identidade:** O `pathHierarchy` deixa de ser uma string estática e passa a ser a representação da Pilha no momento da leitura.

---

## 3. Novo Prompt de Lógica (Instrução para o Analisador)

> **Objetivo:** Converter o arquivo `estrutura_bin` em um grafo de nodes sem limite de profundidade.
>
> ### Regras de Processamento:
> 1. **Gestão de Escopo:**
>    - Ao encontrar um identificador seguido de `{`, adicione este identificador à **Pilha de Escopo**.
>    - Ao encontrar `}`, remova o último identificador da **Pilha de Escopo**.
>
> 2. **Classificação Dinâmica:**
>    - **Raiz (Root):** Se a Pilha estiver vazia, a linha é `#1 Metadata` ou `#1 Root Map`.
>    - **Estrutura Interna (Internal Structure):** Se a linha define um objeto (`embed`, `pointer`, `list`, `map`) e abre uma chave `{`, ela é uma **Estrutura Interna**, não importa a profundidade.
>    - **Parâmetro (Field):** Se a linha contiver um sinal de `=` e atribuir um valor simples (string, número, vec, rgba), ela é um **Parâmetro** pertencente ao último item da Pilha.
>
> 3. **Geração de Caminhos (pathHierarchy):**
>    - O ID único de cada elemento será sempre `Pilha_Atual > Nome_do_Elemento`.
>    - **Importante:** Parâmetros (#4) **NUNCA** devem gerar arquivos JSON individuais. Eles devem ser encapsulados dentro do JSON da Estrutura Interna (#3) ou Entidade (#2) que está no topo da Pilha no momento da leitura.
>
> 4. **Recursividade ao Infinito:**
>    - O algoritmo deve repetir o processo para cada novo nível de indentação encontrado, tratando `N+1` como um filho de `N`, sem limite máximo de `N`.

---

## 4. Resultado Esperado no Grafo

Com esta lógica, uma estrutura complexa será visualizada assim:
- **Node Pai (Entidade)**
  - Parâmetros Primitivos do Pai
  - **Sub-Node (Estrutura Interna)**
    - Parâmetros Primitivos do Sub-Node
    - **Sub-Sub-Node (Estrutura Aninhada)**
      - Parâmetros Primitivos... (até o infinito)

---
*Documento gerado para auxiliar na estruturação do sistema de Node Graph.*
