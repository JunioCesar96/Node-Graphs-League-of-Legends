### Classification Nomenclature (collection)
* #1 Header Metadata
* #1 Dependency Array
* #1 Root Map
  * #2 Root Entry
    * #3 Embed Block
      * #4 Primitive Field
      * #4 Compound/Vector Field
      * #4 Optional Field
    * #3 Collection Block
    * #3 Pointer Node
    * #3 Graph Link
  * #2 VFX Definition Root

---

### Set Nomenclature (group)
* #1 Classes
  * #2 Entities
    * #3 Internal Structures
      * #4 Parameters


INÍCIO ALGORITMO Analisador_Estrutura_Bin

1. LER ficheiro linha a linha.
2. DETERMINAR o nível de indentação da linha atual.

3. // --- NÍVEL 1: IDENTIFICAÇÃO GLOBAL ---
   SE linha contiver "type: string" OU "version: u32" ENTÃO
       CLASSIFICAR como "#1 Header Metadata"
   SENÃO SE linha contiver "linked: list[string]" ENTÃO
       CLASSIFICAR como "#1 Dependency Array"
   SENÃO SE linha contiver "entries: map[" ENTÃO
       CLASSIFICAR como "#1 Root Map"

4. // --- NÍVEL 2: IDENTIFICAÇÃO DE REGISTOS ---
   DENTRO de "#1 Root Map":
   SE a linha não tiver recuo (indentação nível 1) E começar por aspas ("") ENTÃO
       SE a classe instanciada for "VfxSystemDefinitionData" ENTÃO
           CLASSIFICAR como "#2 VFX Definition Root"
       SENÃO 
           CLASSIFICAR como "#2 Root Entry"

5. // --- NÍVEL 3: IDENTIFICAÇÃO DE BLOCOS DE ESTRUTURA ---
   DENTRO de um "#2" (Lendo as chaves internas):
   SE o tipo da variável contiver "embed" ENTÃO
       CLASSIFICAR como "#3 Embed Block"
   SENÃO SE o tipo da variável contiver "list[" ou "list2[" ENTÃO
       CLASSIFICAR como "#3 Collection Block"
   SENÃO SE o tipo da variável contiver "pointer" ENTÃO
       CLASSIFICAR como "#3 Pointer Node"
   SENÃO SE o tipo da variável contiver "link" ENTÃO
       CLASSIFICAR como "#3 Graph Link"

6. // --- NÍVEL 4: IDENTIFICAÇÃO DE FOLHAS / CAMPOS ---
   DENTRO de um "#3" (Lendo as variáveis finais que recebem um valor '='):
   SE o tipo da variável for "vec2", "vec3", "vec4", "rgba" ENTÃO
       CLASSIFICAR como "#4 Compound/Vectorial Field"
   SENÃO SE o tipo da variável for "option[" ENTÃO
       CLASSIFICAR como "#4 Optional Field"
   SENÃO SE o tipo da variável for um tipo básico ("f32", "u32", "u8", "string", "bool", "flag", "hash", "i16") ENTÃO
       CLASSIFICAR como "#4 Primitive Field"

7. // --- MAPEAMENTO PARA NOMENCLATURA DE CONJUNTOS ---
   AO MESMO TEMPO, aplicar máscara de Domínio:
   - Tudo o que for "#1 Root Map" equivale a "#1 Classes"
   - Tudo o que for Nível "#2" equivale a "#2 Entidades"
   - Tudo o que for Nível "#3" equivale a "#3 Estruturas Internas"
   - Tudo o que for Nível "#4" equivale a "#4 Parâmetros"

FIM ALGORITMO
