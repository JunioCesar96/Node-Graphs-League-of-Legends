fx_pathHierarchy  sera  uam nova funcao que adicion a nomenclature quando estiver definindo collection e group. antes nao existia pathHierarchy: [
      { id: "entries", type: "#1 Root Map" },
      { id: "Zac_Base_Q_tar", type: "#2 VFX Definition Root" }, // <- Aponta para a instância correta!
      { id: "ComplexEmitterDefinitionData", type: "#3 Collection Block" },
      { id: "Ring_Emitter_01", type: "#3 Embed Block" }
    ]

pathHierarchy devera ser gerado dinamicamente de acordo com a estrutura do codigo bin league e sua funcao e mostrar o caminho de hiecarquia para posteriormente ser usado pelo elemente_pathHierarchy_internalStructures.
Dentro do carde do node existe o batao + Elementos que adiciona 2 tipos de elemento parâmetro e  estruturas internas(node), elemente_pathHierarchy_internalStructures sera uma nova função de adicionar a lista de +Elemento as estruturas internas, correspondende de acordo com o  caminho de hierarquia.

1. A Função Geradora: fx_pathHierarchy
O que ela faz: Roda dinamicamente durante a leitura (parsing) do código .bin. Enquanto o seu script estiver descendo os níveis do arquivo (do #1 Root Map para o #2 Root Entry, etc.), esta função vai empilhando o "rastro" de onde o código está. Quando for a hora de montar o objeto nomenclature do Node, ela injeta a array pathHierarchy.

Como implementar a lógica (Conceito de Pilha/Stack):
Você precisa de uma variável global temporária no seu parser, como currentPathStack = [].

Ao entrar no mapa principal, roda: currentPathStack.push({ id: "entries", type: "#1 Root Map" })

Ao entrar no Zac_Q, roda: currentPathStack.push({ id: "Zac_Base_Q_tar", type: "#2 VFX Definition Root" })

Aqui entra a fx_pathHierarchy: Ela pega o estado atual do currentPathStack e salva dentro do nomenclature do Node que está sendo gerado.

Ao sair de um bloco (fechar as chaves } no .bin), dá um currentPathStack.pop() para voltar um nível.

Exemplo de como a função atua no objeto final:

function fx_pathHierarchy(currentStack) {
    // Retorna uma cópia exata do caminho atual no momento em que o Node é criado
    return [...currentStack]; 
}

// Durante a criação do Node do Emitter no seu parser:
node.nomenclature.pathHierarchy = fx_pathHierarchy(currentPathStack);

2. A Função Consumidora: elemente_pathHierarchy_internalStructures
O que ela faz:
Roda na Interface de Usuário (UI). Quando o usuário clica no botão [+ Elementos] dentro do card de um Node, esta função lê o pathHierarchy gerado pela função anterior para descobrir exatamente em qual contexto estamos, e então retorna apenas as Estruturas Internas (Nodes) válidas para listar.

Como implementar a lógica:

Lê o Alvo: Pega o último item da array pathHierarchy do Node atual. Ele diz quem é o Pai (ex: type: "#2 VFX Definition Root").

Filtra o Dicionário: Você terá um dicionário/schema da League of Legends bin language que mapeia o que cada tipo aceita. A função busca nesse dicionário.

Popula o Botão: Retorna a lista para o front-end desenhar as opções no menu do botão.

Exemplo Lógico:
function elemente_pathHierarchy_internalStructures(nodePathHierarchy) {
    // 1. Descobre quem é o Node atual pegando o último item do caminho
    const currentNodeContext = nodePathHierarchy[nodePathHierarchy.length - 1];
    
    let validInternalStructures = [];

    // 2. Compara com as regras do motor do LoL (Schema)
    if (currentNodeContext.type === "#2 VFX Definition Root") {
        validInternalStructures = [
            { label: "+ VfxEmitterDefinitionData", type: "#3 Embed Block" },
            { label: "+ VfxEmitterAudio", type: "#3 Embed Block" },
            { label: "+ ComplexEmitterDefinitionData", type: "#3 Collection Block" }
        ];
    } 
    else if (currentNodeContext.type === "#2 Root Entry (SkinCharacterDataProperties)") {
        validInternalStructures = [
            { label: "+ SkinMeshDataProperties", type: "#3 Embed Block" },
            { label: "+ SkinAudioProperties", type: "#3 Embed Block" }
        ];
    }
    // ... outros mapeamentos

    // 3. Retorna a lista limpa para o botão [+ Elementos] renderizar
    return validInternalStructures;
}

function elemente_pathHierarchy_internalStructures(nodePathHierarchy) {
    // 1. Descobre quem é o Node atual pegando o último item do caminho
    const currentNodeContext = nodePathHierarchy[nodePathHierarchy.length - 1];
    
    let validInternalStructures = [];

    // 2. Compara com as regras do motor do LoL (Schema)
    if (currentNodeContext.type === "#2 VFX Definition Root") {
        validInternalStructures = [
            { label: "+ VfxEmitterDefinitionData", type: "#3 Embed Block" },
            { label: "+ VfxEmitterAudio", type: "#3 Embed Block" },
            { label: "+ ComplexEmitterDefinitionData", type: "#3 Collection Block" }
        ];
    } 
    else if (currentNodeContext.type === "#2 Root Entry (SkinCharacterDataProperties)") {
        validInternalStructures = [
            { label: "+ SkinMeshDataProperties", type: "#3 Embed Block" },
            { label: "+ SkinAudioProperties", type: "#3 Embed Block" }
        ];
    }
    // ... outros mapeamentos

    // 3. Retorna a lista limpa para o botão [+ Elementos] renderizar
    return validInternalStructures;
}

O Fluxo Completo Trabalhando Junto:
O seu parser lê o arquivo .bin.

A fx_pathHierarchy constrói o mapa dinâmico de onde cada elemento está e salva isso no payload do card.

A interface desenha o card na tela.

O usuário clica em + Elementos. O botão chama a função de adicionar parâmetros (que já existia) e também chama a elemente_pathHierarchy_internalStructures.

O menu suspenso se abre mostrando exatamente os Nodes de Estrutura Interna que fazem sentido para aquele local da hierarquia.