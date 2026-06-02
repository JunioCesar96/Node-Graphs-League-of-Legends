essa parte  do plano esta errada
Parâmetros nunca geram JSON: mantêm-se em parameters[] do schema pai; não entram em schemas[] como nós independentes.
JSON é para gerar o jso é a 2 tipos de parametros 
Parametros estruturais são parametros que contém valores compostos por classe exemplo:
	 complexEmitterDefinitionData: list[pointer] = {}

Parametros {Nome_Parâmetro} {tipo} {valor} 

node {collectionType}:
	VfxSystemDefinitionData {}

internalStructures sao nodes filhos de nodes exemplo:
	VfxSystemDefinitionData, seu filho seria complexEmitterDefinitionData, logo complexEmitterDefinitionData seria internalStructures.
ou VfxEmitterDefinitionData  que é filho de complexEmitterDefinitionData.

Você tem toda a razão. Minha análise anterior foi imprecisa ao generalizar que "parâmetros não geram JSON". No seu sistema de **Node Graph**, a distinção entre o que é um **valor interno** e o que é uma **estrutura de conexão** é o que define o grafo.

O erro no plano estava em tratar tudo como "parâmetro". Para o seu sistema funcionar, precisamos separar os dois tipos de dados que você definiu:

### 1. Parâmetros Simples (Atributos do Node)

Estes **não geram novos Nodes**. Eles são os dados que ficam dentro da caixa do Node atual.

* **Exemplos:** `particleName: string`, `flags: u16`, `f32`, `bool`.
* **No JSON:** Devem estar dentro de uma lista de atributos (ex: `parameters[]`) no arquivo do Node pai.

### 2. Parâmetros Estruturais (Internal Structures / Nodes Filhos)

Estes **geram Nodes**. Eles representam a hierarquia e as conexões do seu sistema.

* **Exemplos:** `complexEmitterDefinitionData: list[pointer]`, `VfxEmitterDefinitionData`, `embed`.
* **Lógica:** Se o parâmetro contém uma classe ou uma lista de ponteiros, ele é uma **Internal Structure**.
* **No JSON:** Ele deve ser tratado como um Node filho (ou um link para um) para que o Graph possa desenhar a conexão.

---

### Reestruturando a Lógica de Geração

De acordo com a sua correção, a estrutura de "Pai e Filho" deve seguir este fluxo:

| Nome | Tipo | Ação no Sistema |
| --- | --- | --- |
| `VfxSystemDefinitionData` | **Node (Class)** | Cria o arquivo JSON principal do Node. |
| `particleName` | **Parâmetro Simples** | Adicionado ao `parameters[]` do `VfxSystemDefinitionData`. |
| `complexEmitterDefinitionData` | **Parâmetro Estrutural** | Identificado como **Internal Structure**. Gera conexão para Nodes filhos. |
| `VfxEmitterDefinitionData` | **Node Filho** | Cria um novo arquivo JSON que se conecta ao `complexEmitterDefinitionData`. |

---

### Onde o Plano deve ser Corrigido:

O ponto do plano que dizia *"Parâmetros nunca geram JSON"* deve ser alterado para:

> **"Apenas Parâmetros Simples (tipos primitivos) são mantidos no schema pai. Parâmetros Estruturais (classes, embeds, lists) são promovidos a Internal Structures e geram seus próprios blocos/nodes no sistema."**

### Por que isso resolve o seu problema?

O "vazamento" de arquivos como `mainnode_mflags.json` acontecia porque o seu algoritmo estava classificando o parâmetro simples `mFlags` como se fosse um parâmetro estrutural (Node).

Ao aplicar essa nova regra:

1. O sistema vê `mFlags: u16 = 0` -> Identifica como **Simples** -> Salva dentro do Node atual.
2. O sistema vê `complexEmitterDefinitionData` -> Identifica como **Estrutural** -> Cria a **Internal Structure** (Node filho).

**UI (Element menu):** Internal_Structures top-level permanecem na secção do card e em `internalStructures[]`, mas deixaram de ser tratadas como “elemento de nó” no menu **Element** (`+`/`-` global): são parâmetros estruturais geridos pelo ritual e ligação por porta, não por `catalog-structure` / remoção via picker global.

Essa lógica de separação entre **Valor** e **Estrutura** está alinhada com o que você visualizou para o Zac? Se sim, a implementação da pilha deve focar em detectar se a linha contém um valor primitivo ou uma nova abertura de classe/estrutura.

E uma descricao de forma simples e didica que como ultilizar as features novas caso, seja alguma que o ulsuaririo tenha que usar.
E SECOES TEXTO EM INGLES E DEPOIS PORTUGUES.