flowchart TB
  subgraph Grafo
    Up[Nó upstream<br/>bloco / addon / ritual]
    Gal[Addon Galeria]
    Down[Nós downstream<br/>slot currentImage]
    Up -->|connection<br/>toAddonSlotId: addon:index:input| Gal
    Gal -->|addon:currentImage:output| Down
  end

  subgraph Host["AddonCardHost"]
    R1[resolveAddonInputs]
    R2[resolveWiredAddonInputSlotNames]
    R3[buildAddonWiredInputsFeedKey]
  end

  subgraph Card["AddonCard + logic.js"]
    Sync[syncWiredAddonInputsToDom]
    Drive[ReactiveDriveEngine.evaluateInputChange]
    Exec[logic.execute]
    View[updateGalleryView]
  end

  subgraph Scene["Cena persistida"]
    Cache[addonInstance.outputValues<br/>currentImage, ...]
  end

  Up --> R1
  R1 -->|resolvedInputs.index| Card
  R2 -->|index está ligado?| Card
  R3 -->|muda valor upstream| Drive
  Drive --> Exec
  Exec --> View
  View -->|currentImage blob URL| Cache
  Cache --> Down
