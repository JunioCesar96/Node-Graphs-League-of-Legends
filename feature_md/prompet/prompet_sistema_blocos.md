---

## Especificação da Feature: Editor de Blocos (BlockNodes)

**Descrição:** Uma nova forma de visualização e edição de *nodes*. Os blocos atuam como uma camada de abstração visual (armazenada em `blockStructures`) que permite aos usuários editar partes específicas e parametrizadas de um código complexo sem precisar lidar diretamente com a sintaxe bruta.

### 1. Design System (Tema Escuro)

As cores foram mapeadas com base no mockup fornecido para garantir contraste e legibilidade:

* **Fundos e Superfícies:**
* `#282828` (Darker Gray): Fundo principal da área de trabalho e contorno do inspetor.
* `#363636` (Dark Gray): Preenchimento do corpo dos blocos e painéis do inspetor.


* **Textos e Campos:**
* `#c4c4c4` (Light Gray): Textos principais, rótulos (labels) e fundo de campos de *input* inativos/vazios.


* **Interações e Slots:**
* `#80ffe6` (Cyan): Cor padrão para *slots* de variáveis genéricas e indicadores de seleção.
* `#40ff56` (Green): *Slots* de conexão bem-sucedida, saídas de dados específicos ou botões de ação positiva.
* `#ed1c24` (Red): Alertas, erros ou *slots* de exclusão/desconexão.


* **Ícones Padrão:** Imagem, Texto, Input e Slot (circulares).

### 2. Arquitetura da Interface

A feature é dividida em três componentes interligados:

#### A. Inspetor de Bloco

O painel de controle (lateral) onde a parametrização acontece (seguir desiner de estrutura igual o modelo do Inspector VFX, lists e parametros do tipo estruturas internas) .

* **Função:** Ler os elementos de um *node* bruto e permitir que o usuário escolha quais variáveis se tornarão manipuláveis no bloco visual.
* **Componentes:**
* Lista de parâmetros disponíveis do código original.
* Botões de definição (para transformar o parâmetro em um slot/input).
* Botão **"Gerar Bloco"** (compila a seleção e gera o JSON/Tokens).



#### B. O Bloco (Visual Node)

A representação gráfica (Card) gerada após a configuração no inspetor.

* **Cabeçalho (Header):** Contém o título (`_blockName`), botões de configuração global e pode conter *slots* principais de entrada/saída que afetam o bloco inteiro.
* **Divisor de Categoria:** Uma linha horizontal colorida abaixo do cabeçalho que muda de cor dependendo do tipo da estrutura (`_blockType`).
* **Corpo (Body):** A lista de parâmetros escolhidos no inspetor. Cada linha contém o nome do parâmetro e seu respectivo *input* de texto ou *slots* de entrada/saída de dados.

#### C. Código dos Blocos (Parser & Tokens)

A inteligência por trás da interface. O sistema substitui os valores reais do código por uma *string de identificação (Token)*.

**Sintaxe do Token de Identificação:**
A estrutura segue o padrão de chaves prefixadas por `_` e valores separados por `&`:
`_blockType&[Tipo]_blockName&[Nome]_idParameter&[ID]_nameParameter&[Label]_typeParameter&[TipoDeDado]{[ValorDefault]}_slotParameter&[RegrasDeSlot]_endParameter`

---

### 3. Estrutura de Dados (JSON)

O JSON gerado pelo Inspetor atuará como o "dicionário" que o renderizador visual usará para desenhar os blocos e reconectar os valores ao código `league bin`.

```json
{
  "code": "{code_with_tokens}",
  "blocks": {
    "VfxEmitterDefinitionData": {
      "color": "#00ff00",
      "slots": ["output[VfxEmitterDefinitionDataResult]"],
      "title": "Particle"
    },
    "VfxEmitterDefinitionDataResult": {
      "color": "#ed1c24",
      "slots": ["input[VfxEmitterDefinitionData]"],
      "title": "Emitter Name"
    }
  },
  "identification_codes": [
    "_blockType&VfxEmitterDefinitionDataResult_blockName&EmitterResult_idParameter&EmitterResult01_nameParameter&emitterName_typeParameter&string{\"circulo_magico_sparks\"}_endParameter",
    "_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&Emitter01_nameParameter&color_typeParameter&vec4{0.55,0.95,1,1}_slotParameter&output[vec4,vec4list]&input[multiplyVec4]_endParameter",
    "_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&Emitter02_nameParameter&particleLifetime_typeParameter&f32{1.15}_slotParameter&output[f32,f32range]_endParameter",
    "_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&Emitter03_nameParameter&@iconImg@texture_typeParameter&string{\"ASSETS/.../spark_soft.tex\"}_slotParameter&output[Img]_endParameter"
  ]
}

```

### 4. Fluxo de Trabalho do Usuário (Atualizado)

1. **Seleção:** O usuário clica e seleciona um *node* bruto já existente na área de trabalho (por exemplo, um *node* do tipo `VfxEmitterDefinitionData`).
2. **Inspeção:** A partir do momento da seleção, o painel do **Inspetor de Bloco** é ativado e carrega a lista completa de todas as propriedades e dados internos daquele *node* específico.
3. **Configuração:** No Inspetor, o usuário navega pela lista e define quais propriedades deseja tornar interativas na nova visualização (ex: habilitando botões/parâmetros para expor `Color` e `particleLifetime`).
4. **Geração:** O usuário aciona o botão de gerar bloco. O sistema processa as escolhas e injeta os tokens do `_identification_codes` no código por trás do *node*.
5. **Renderização (Conversão):** O *node* bruto na tela sofre um *update* visual e é transformado no **Bloco** final. Ele passa a exibir apenas o cabeçalho formatado e os parâmetros que foram escolhidos no inspetor, utilizando as cores e a interface do nosso Design System.

### 5. Ligação de blocos pela paleta (LINK NEW NODE) — implementado

Fluxo para criar um bloco filho compatível com um slot de **saída**, sem apontar directamente para o slot IN.

| Passo | Acção do utilizador | Sistema |
| --- | --- | --- |
| 1 | Arrastar slot **OUT** (parâmetro ou cabeçalho) | Inicia rascunho de ligação (`pendingBlockLink`) |
| 2 | Soltar na **grade vazia** | Abre `AddNodePalette` — título **LINK NEW NODE**, separador **Blocks** |
| 3 | Lista filtrada | Blocos com `in[campoPai]` / tipo compatível com `outTypes` e `fromParameterName` |
| 4 | Ordenação | No topo: bloco cujo nome = tipo de saída (ex.: `VfxAnimatedVector3fVariableData`) |
| 5 | UI | Match exacto: cartão **expandido** + parâmetros com tema `SyntaxType`; outros: **compactos** (só título) |
| 6 | Clique num bloco | `createBlockNodeFromDefinition` + `spawnLink` → ligação na **mesma** `updateScene` |

**Ficheiros principais:** `blockDefinitionLinkPalette.ts`, `blockDefinitionPaletteParameters.ts`, `blockSlotConnections.ts` (`applyBlockSlotConnectionToScene`, `classifyBlockSlotConnection`), `GraphCanvas.tsx`, `AddNodePalette.tsx`, `PaletteAddBlockOption.tsx`, `useSceneHistory.ts`.

**Documentação completa:** `feature_md/feature/feature-block-link-palette.md`.

#### 5.1 Ligação forçada (tipo de saída ≠ tipo do bloco filho)

Quando o IN do filho aceita o **campo pai** (ex.: `in[dynamics]`) mas o OUT só expõe outro tipo (ex.: `VfxAnimatedVector3fVariableData` ligado a `VfxAnimatedColorVariableData`):

- Arrasto directo para o slot IN → **Messenger** (`confirm_block_connection_forced`), sem `alert` nativo.
- Escolha na paleta após drop no vazio → ligação **automática** com `allowForced: true` (sem segundo diálogo).
- Conexões com `forced: true` → cores dos ports **invertidas** (OUT verde / IN âmbar); traço SVG opcional `connectionBlockForced`.

**Catálogo Messenger:** `messenger_popup_catalog.json` → `confirm_block_connection_forced`.

---

designer system da fature Bloco:
Color
	#363636, #282828, #c4c4c4, #40ff56, #ed1c24, #80ffe6

Nova feature `bloco`.
Composto por inspetor bloco, bloco, código do blocos.

O inspetor é responsável por listar todos elementos de um node, definir quais parâmetros serão criados no bloco, gerar o json do código, ele é composto lista de parâmetros, botão de definição de parâmetro para o bloco, botão gerar bloco.
 


O blocos, são outra forma de nodes,
pasta de blocos nome blockStructures,
a função dos blocos é mostrar só uma estrutura editável de uma parte  do códigos.

O bloco é comporto por cabeçalho, corpo, linha de divisão do entre parâmetro e cabeçalhos, no corpo fica os parâmetros que podem conter slot de entrada ou saída de dados, no cabeçalho  fica o titulo com o nome do bloco, no cabeçalho  pode conter slot de saída, entrada.


Json estrutura:
_blockType_nomeDoBloco_idParameter_nome_tipo_conectores_fimDoParametro

_blockType: define o tipo de bloco (uma linha entre o cabeçalho do bloco e os parâmetros tem uma cor especifica para cada tipo)
_blockName: o nome do bloco (card) cabeçalho 
_idParameter: o id que é composto por {_nomeDoBloco}{sequência  numero de id}
_nameParameter: nome do parâmetro que será exibido no bloco
_typeParameter: o tipo de paametro.
_slotParameter: entrada ou saída de um bloco
_endParameter: indicador de fim do identification_codes


json

{
	"code" : "{code}",
	"blocks" : {
      "VfxEmitterDefinitionData" : {"color": "#00ff00", "slot:"["output[VfxEmitterDefinitionDataResult]"]":, "title":"Particle"},
      "VfxEmitterDefinitionDataResult" : {"color": "#00ff00", "slot:"["input[VfxEmitterDefinitionData]"], "title":"Emitter Name"}
    },
	"identification_codes" : [
	"_blockType&VfxEmitterDefinitionDataResult_blockName&EmitterResult _idParameter&EmitterResult01_nameParameter&emitterName_typeParameter&string{"circulo_magico_sparks"}_endParameter",
	"_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&blockName&Emitter01_nameParameter&color_typeParameter&vec4{0.55,0.95,1,1}_slotParameter&output[vec4,vec4list]&input[multiplyVec4]_endParameter",
	"_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&blockName&Emitter02_nameParameter&particleLifetime_typeParameter&f32{1.15}_slotParameter&output[f32,f32range]_endParameter",
	"_blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&blockName&Emitter03_nameParameter&@iconImg@texture_typeParameter&sting{"ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex"}_slotParameter&output[Img]_endParameter"
	]
}]
}

            //codigo em league bin

            VfxEmitterDefinitionData {
                emitterName: string = "circulo_magico_sparks"
                rate: embed = ValueFloat {
                    constantValue: f32 = 52
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = 1.15
                }
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 240, 0 }
                }
                birthDrag: embed = ValueFloat {
                    constantValue: f32 = 0.05
                }
                birthOrbitalVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 12, 0 }
                }
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { -90, -90, 0 }
                }
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 256, 256, 7 }
                }
                birthScale1: embed = ValueVector3 {
                    constantValue: vec3 = { 484, 484, 14 }
                }
                0x65965391: embed = FlexValueVector3 {
                    constantValue: vec3 = { 1, 1, 1 }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = { 0.55, 0.95, 1, 1 }
                }
                texture: string = "ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex"
                blendMode: u8 = 4
                primitive: pointer = VfxPrimitiveArbitraryQuad {}
                miscRenderFlags: u8 = 1
            }


            //codigo do bloco

            VfxEmitterDefinitionData {
                emitterName: string = _blockType&VfxEmitterDefinitionDataResult_blockName&EmitterResult _idParameter&EmitterResult01_nameParameter&emitterName_typeParameter&string{"circulo_magico_sparks"}_endParameter
                rate: embed = ValueFloat {
                    constantValue: f32 = 52
                }
                particleLifetime: embed = ValueFloat {
                    constantValue: f32 = _blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&blockName&Emitter02_nameParameter&particleLifetime_typeParameter&f32{1.15}_slotParameter&output[f32,f32range]_endParameter
                }
                birthVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 240, 0 }
                }
                birthDrag: embed = ValueFloat {
                    constantValue: f32 = 0.05
                }
                birthOrbitalVelocity: embed = ValueVector3 {
                    constantValue: vec3 = { 0, 12, 0 }
                }
                birthRotation0: embed = ValueVector3 {
                    constantValue: vec3 = { -90, -90, 0 }
                }
                birthScale0: embed = ValueVector3 {
                    constantValue: vec3 = { 256, 256, 7 }
                }
                birthScale1: embed = ValueVector3 {
                    constantValue: vec3 = { 484, 484, 14 }
                }
                0x65965391: embed = FlexValueVector3 {
                    constantValue: vec3 = { 1, 1, 1 }
                }
                Color: embed = ValueColor {
                    constantValue: vec4 = _blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&blockName&Emitter01_nameParameter&color_typeParameter&vec4{0.55,0.95,1,1}_slotParameter&output[vec4,vec4list]&input[multiplyVec4]_endParameter
                }
                texture: string = _blockType&VfxEmitterDefinitionData_blockName&Emitter_idParameter&blockName&Emitter03_nameParameter&@iconImg@texture_typeParameter&sting{"ASSETS/Characters/Brand/Skins/Base/Particles/spark_soft.tex"}_slotParameter&output[Img]_endParameter
                blendMode: u8 = 4
                primitive: pointer = VfxPrimitiveArbitraryQuad {}
                miscRenderFlags: u8 = 1
            }