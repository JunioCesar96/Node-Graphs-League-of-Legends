Entendido! Vamos estruturar um documento de especificação técnica definitivo (**Blueprint / Feature RFC**) focado puramente na arquitetura de dados e no mapeamento de arquivos para a feature de add-ons reativos.

Esse documento serve como o "norte" para o desenvolvimento dentro da sua estrutura atual.

---

# 📑 Feature Specification: Reactive Add-on System (`"drive": "inputChange"`)

## 1. Escopo Técnico

Implementar um pipeline reativo onde pacotes de terceiros (Add-ons) isolados em nível de sistema de arquivos contendo Metadados (`manifest.json`), Interface (`ui.html`) e Execução (`logic.js`) sejam carregados de forma assíncrona, instanciados no grafo do Canvas, e executados dinamicamente via mutações de DOM e barramento de dados nativo do Core.

---

## 2. Arquitetura de Pastas de Baixo Nível

Abaixo está a exata localização de cada arquivo necessário para o funcionamento da feature, respeitando as camadas de design atômico e o desacoplamento do `core/` técnico.

```text
src/
├── public/                          # Ativos estáticos servidos pelo Vite (Agnósticos)
│   └── addons/                      # Sandbox de distribuição de add-ons
│       └── addon-string-prefix/     # ID Único do Add-on (Diretório isolado)
│           ├── manifest.json        # Contrato de dados, metadados e tipo de gatilho
│           ├── ui.html              # Fragmento bruto de DOM injetável para o corpo do nó
│           └── logic.js             # Script ESM Puro contendo o algoritmo de processamento
│
└── src/
    ├── blockStructures/             # Definições globais de blocos disponíveis
    │   └── addonRegistry.ts         # Singleton do Core que cataloga os pacotes carregados em runtime
    │
    ├── nodeStructures/              # Estado e instâncias de nós ativos no Canvas
    │   └── instanceEvaluator.ts     # Engine do Core que resolve as conexões (quem passa dado para quem)
    │
    ├── core/
    │   └── engine/                  # Regras de negócio sem ligação com a View (Pure JS/TS)
    │       └── reactiveDrive.ts     # Gerenciador de eventos e ciclos de vida reativos ("inputChange")
    │
    ├── services/
    │   └── addonLoader.service.ts   # Client de I/O encarregado do Fetch e importação dinâmica (Dynamic Import)
    │
    ├── components/
    │   ├── atoms/
    │   │   └── SlotPin.tsx          # Componente atômico para os pontos de ancoragem (Input/Output)
    │   │
    │   ├── molecules/
    │   │   └── AddonCard.tsx        # Ponte React ↔ Core. Renderiza a casca, os slots e faz o Bind do HTML vivo
    │   │
    │   └── organisms/
    │       └── Canvas.tsx           # Tela de pintura que gerencia o ciclo visual e renderização dos nós
    │
    └── ritualDrag/
        └── addonDropHandler.ts      # Interceptador do ritual de Drop para instanciar blocos do catálogo

```

---

## 3. Blueprint Prático de Implementação da Lógica

Aqui está a implementação estrita e tipada que orquestra a comunicação entre os arquivos descritos na arquitetura acima.

### A. O Contrato de Dados (`src/services/addonLoader.service.ts`)

```typescript
export interface AddonSlot {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  direction: 'input' | 'output';
}

export interface AddonManifest {
  id: string;
  name: string;
  category: string;
  drive: 'inputChange' | 'always' | 'manual';
  data: AddonSlot[];
  get: boolean;
  set: boolean;
}

export interface AddonPackage {
  manifest: AddonManifest;
  uiHtml: string;
  execute: (inputs: Record<string, any>, cardDOM: HTMLElement) => Record<string, any>;
}

export const AddonLoaderService = {
  /**
   * Executa o download assíncrono do pacote do Add-on contido na pasta pública.
   */
  async loadFromSandbox(addonId: string): Promise<AddonPackage> {
    const basePath = `/addons/${addonId}`;
    
    // Resolve manifest e template HTML em paralelo
    const [manifest, uiHtml] = await Promise.all([
      fetch(`${basePath}/manifest.json`).then(res => res.json() as Promise<AddonManifest>),
      fetch(`${basePath}/ui.html`).then(res => res.text())
    ]);

    // Importação dinâmica do script ESM para isolamento de escopo de execução
    const module = await import(/* @vite-ignore */ `${basePath}/logic.js`);
    
    if (!module.logic || typeof module.logic.execute !== 'function') {
      throw new Error(`Falha crítica: Add-on ${addonId} não exporta um método "logic.execute" válido.`);
    }

    return {
      manifest,
      uiHtml,
      execute: module.logic.execute
    };
  }
};

```

### B. O Motor Reativo de Execução (`src/core/engine/reactiveDrive.ts`)

```typescript
import { AddonPackage } from '../../services/addonLoader.service';

export const ReactiveDriveEngine = {
  /**
   * Processa o algoritmo do bloco isolando os efeitos colaterais na UI interna do add-on.
   * @param addonPkg O pacote compilado do add-on
   * @param cardDOM Referência real do elemento HTML interno injetado
   * @param incomingData Dicionário contendo os valores que entram via Slots conectados
   * @param pipelineCallback Disparado para propagar as saídas para a árvore de nós subsequentes
   */
  evaluateInputChange(
    addonPkg: AddonPackage,
    cardDOM: HTMLElement,
    incomingData: Record<string, any>,
    pipelineCallback: (outputs: Record<string, any>) => void
  ): void {
    try {
      // 1. Injeta os dados de entrada na função pura do Add-on e passa a gerência controlada do DOM interno
      const outputs = addonPkg.execute(incomingData, cardDOM);
      
      // 2. Propaga o payload de saída de volta para o motor do grafo do Core (nodeStructures)
      pipelineCallback(outputs);
      
    } catch (error) {
      // Manipulação de erro integrada: tenta injetar o feedback visual caso o slot console-log exista no ui.html
      const logContainer = cardDOM.querySelector('[name="console-log"]');
      if (logContainer) {
        logContainer.textContent = `CRITICAL_ERROR: ${error instanceof Error ? error.message : String(error)}`;
      } else {
        console.error(`Error executing add-on [${addonPkg.manifest.id}]:`, error);
      }
    }
  }
};

```

### C. A View Baseada em Eventos (`src/components/molecules/AddonCard.tsx`)

```tsx
import React, { useEffect, useRef } from 'react';
import { AddonPackage } from '../../services/addonLoader.service';
import { ReactiveDriveEngine } from '../../core/engine/reactiveDrive';

interface AddonCardProps {
  instanceId: string;
  addonPackage: AddonPackage;
  resolvedInputs: Record<string, any>; // Estado mantido pelo 'nodeStructures' do Core
  onGraphStateMutation: (nodeId: string, outputPayload: Record<string, any>) => void;
}

export const AddonCard: React.FC<AddonCardProps> = ({
  instanceId,
  addonPackage,
  resolvedInputs,
  onGraphStateMutation
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { manifest, uiHtml } = addonPackage;

  useEffect(() => {
    const domElement = containerRef.current;
    if (!domElement) return;

    // Handler encapsulado para interceptar as mudanças por delegação nativa de eventos do DOM
    const triggerExecutionPipeline = () => {
      if (manifest.drive !== 'inputChange') return;

      ReactiveDriveEngine.evaluateInputChange(
        addonPackage,
        domElement,
        resolvedInputs,
        (outputs) => {
          // Atualiza de volta o estado semântico do grafo global (Core -> React Context/Store)
          onGraphStateMutation(instanceId, outputs);
        }
      );
    };

    // Escuta qualquer input interno do HTML injetado por borbulhamento (Event Bubbling)
    domElement.addEventListener('input', triggerExecutionPipeline);

    // Ciclo de Execução Inicial Obrigatório (Garante cálculo imediato se houver dados pré-conectados)
    triggerExecutionPipeline();

    return () => {
      domElement.removeEventListener('input', triggerExecutionPipeline);
    };
  }, [resolvedInputs, addonPackage, instanceId]);

  return (
    <div className={`node-card-wrapper cat-${manifest.category.toLowerCase()}`} data-instance-id={instanceId}>
      {/* 1. Header Controlado pelo Core */}
      <div className="node-card-header">
        <span className="node-title">{manifest.name}</span>
      </div>

      {/* 2. Slots de Ancoragem (Mapeamento Dinâmico) */}
      <div className="node-slots-dock">
        {manifest.data.map((slot, index) => (
          <div key={`${slot.name}-${index}`} className={`slot-pin-container direction-${slot.direction}`}>
            <div className="slot-trigger-dot" data-type={slot.type} />
            <span className="slot-label">{slot.name}</span>
          </div>
        ))}
      </div>

      {/* 3. Slot de UI Viva: Injeção Segura Isolada */}
      <div 
        className="node-custom-html-body"
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: uiHtml }}
      />
    </div>
  );
};

```

---

## 4. Fluxo de Execução de Dados da Feature

1. O Usuário arrasta o bloco, `addonLoader.service.ts` faz a resolução estática.
2. O React renderiza o `<AddonCard />` montando a casca estrutural e injetando o fragmento HTML cru.
3. Quando o usuário digita no input de texto do `ui.html`, o listener nativo intercepta a alteração via borbulhamento.
4. O `reactiveDrive.ts` recebe a ordem, puxa os dados estocados em `nodeStructures` que estão vindo por conexões ativas de outros nós e injeta na função `.execute()` do arquivo `logic.js` externo.
5. O script externo modifica diretamente via Web API o DOM local da instância (ex: `{set}` e `{consoleLog}`) e cospe o output final atualizando o barramento do grafo geral do app.