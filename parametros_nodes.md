# Função: Extrair Node Base Parameters

Ao clicar em **“Extrair Node Base”**, o sistema deve executar o seguinte fluxo:

---

## 1. Seleção de pasta
- Exibir uma lista com todas as pastas dentro de `nodeStructures`.
- A pasta `default` **não deve aparecer** na lista.
- O usuário seleciona uma pasta de destino (`pasta_escolhida`).

---

## 2. Varredura de arquivos
- A função deve analisar dinamicamente **todos os arquivos `.json`** dentro de `pasta_escolhida`.
- Para cada arquivo:
  - Identificar o valor de `collectionType`.

---

## 3. Criação dinâmica de pasta por collectionType
Para cada `collectionType` encontrado:

### Nome da pasta:
nome_da_pasta_escolhida_collectionType
Regra:
[nome_da_pasta_escolhida]_[collectionType]
Exemplo:
Jade_Emitter
4. Estrutura de arquivos gerados
Local:

Dentro de pasta_escolhida

Arquivos:
A) temp/parameters_list.json

Responsável por armazenar todos os parâmetros encontrados.

Formato:

[
  "collectionType_name"
]
B) collectionType_name.json

Cada parâmetro deve gerar um arquivo individual.

Formato:

{
  "id": "collectionType_name",
  "name": "",
  "type": "",
  "defaultValue": ""
}
5. Regras do ID

O campo id deve ser composto por:

collectionType_name
Exemplo:
Emitter_birthVelocity
6. DefaultValue dinâmico por tipo

O campo defaultValue deve ser preenchido automaticamente com base no type.

Exemplos:
Vector3 → "0,0,0"
Float   → "0"
Int     → "0"
Bool    → "false"
String  → ""
7. Lógica de verificação
Se a pasta nome_da_pasta_escolhida_collectionType não existir:
Criar automaticamente.
Se temp/parameters_list.json não existir:
Criar automaticamente dentro de pasta_escolhida/temp.
Se o parâmetro já existir:
Ignorar e seguir para o próximo.
Se não existir:
Criar collectionType_name.json
Adicionar "collectionType_name" em parameters_list.json
8. Fluxo de processamento detalhado
Usuário seleciona pasta_escolhida
Sistema percorre todos os .json
Detecta collectionType
Cria pasta:
pasta_escolhida_collectionType
Exemplo:
Jade_Emitter
Verifica/cria:
temp/parameters_list.json
Para cada parâmetro:
Verifica se já existe
Se não existir:
Cria collectionType_name.json
Define estrutura base
Adiciona à lista
9. Objetivo principal

Essa função deve extrair automaticamente todos os parâmetros de qualquer collectionType, de forma escalável e dinâmica, evitando duplicações e organizando a estrutura base para reutilização em nodes.

Resumo técnico
Entrada:
JSONs da pasta escolhida (pasta_escolhida)
Processo:
Detecta collectionType
Extrai parâmetros
Organiza estrutura automaticamente
Saída:
Pastas organizadas por collectionType
parameters_list.json
JSON individual para cada parâmetro
Regras importantes
Não processar default
Não duplicar parâmetros
Estrutura totalmente dinâmica
Compatível com múltiplos collectionTypes
Sistema escalável para futuras expansões
Organização padronizada por pasta + tipo