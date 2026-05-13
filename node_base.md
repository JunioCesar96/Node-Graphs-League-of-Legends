agora vamos estrurar o.json do node base
id é  o collectionType e title collectionType
enquando estiver interando os arquivos .json com Extrair Node Base uma variavel (collectionType_info) que armazena os collectionType direfentes da sequinte forma "collectionType":{  "nomenclature": {
    "group": "#2 Entidades",
    "collection": "#2 Root Entry",
    "collectionType": "Emitter"
  }}

  collectionType ;e o valor dele porx exemplo 
  {
  "internalStructures": [],
  "id": "vfx-em-0x1c1ea8de-0-puddle-mesh",
  "nomenclature": {
    "group": "#2 Entidades",
    "collection": "#2 Root Entry",
    "collectionType": "Emitter"
  },
  "parameters": [
    {
      "id": "vfx-em-0x1c1ea8de-0-puddle-mesh-bind-weight",
      "name": "bindWeight",
      "type": "float",
      "defaultValue": "1"
    },
    {
      "defaultValue": "\"Puddle_Mesh\"",
      "id": "vfx-em-0x1c1ea8de-0-puddle-mesh-emitter-name",
      "name": "emitterName",
      "type": "string"
    },
    {
      "id": "vfx-em-0x1c1ea8de-0-puddle-mesh-particle-lifetime",
      "name": "particleLifetime",
      "type": "float",
      "defaultValue": "-1"
    },
    {
      "id": "vfx-em-0x1c1ea8de-0-puddle-mesh-rate",
      "name": "rate",
      "type": "float",
      "defaultValue": "1"
    }
  ],
  "title": "Emitter · Puddle_Mesh"
}

logo sera Emitter, "Emitter":{  "nomenclature": {
    "group": "#2 Entidades",
    "collection": "#2 Root Entry",
    "collectionType": "Emitter"
  }}

  Se dentro dessa lista collectionType_info conter o ollectionType o mesmo nome ele náo adiciona 

  quando acabar de construir todos os parametros, entra a nova funcao de criacao de corpo base.
  Vai passar pela a lista collectionType_info e criar o node da collectionType em sua respeqtiva pasta e no formato de json abaixo dinamicamente de acordo com a lista

exemplo:
{
  "internalStructures": [],
  "id": "Emitter",
  "nomenclature": {
    "group": "#2 Entidades",
    "collection": "#2 Root Entry",
    "collectionType": "Emitter"
  },
  "parameters": [],
  "title": "Emitter"
}


Fase 1: Coleta e Filtro (Extrair Node Base)

Você vai iterar sobre uma série de arquivos JSON complexos (como o exemplo do vfx-em-0x1c1ea8de-0-puddle-mesh).

O objetivo é olhar para o objeto nomenclature e capturar o collectionType (neste caso, "Emitter").

Você usa um dicionário/objeto chamado collectionType_info onde a chave é o nome do tipo (ex: "Emitter"). O fato de usar o nome como chave é uma excelente escolha, pois isso naturalmente impede duplicatas. Se um "Emitter" já existir, ele simplesmente sobrescreve ou é ignorado, resolvendo a sua regra de "Se conter o mesmo nome, ele não adiciona".

Fase 2: Geração do Corpo Base

Após varrer todos os arquivos, você terá uma lista limpa apenas com os tipos únicos de nodes.

Você vai iterar sobre esse collectionType_info para criar novos arquivos JSON mais simples.

Nesses novos arquivos, o id e o title recebem o nome do collectionType (ex: "Emitter"), e as listas de internalStructures e parameters ficam vazias [].