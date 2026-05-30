# Implementation Documentation — VFX Character GLTF Engine

File location: `feature_md/feature/feature-vfx-character-gltf-engine.md`

## 1. Header

| Field | Value |
| --- | --- |
| Branch Name | `feature-vfx-character-gltf-engine` |
| Feature Name(s) | VFX Character GLTF Pipeline · Engine VFX (ReSize + Rotation) · Character Panel UX · Preview 3D Context Menu |
| Current Version | `1.5.1` |
| Commit Hash | `PENDING` |

---

## 2. Tag Definition and Summary

| Tag | Definition |
| --- | --- |
| `[NOVO]` | New module, component, API endpoint, or behaviour that did not exist before. |
| `[ATUALIZADO]` | Existing file or API extended without removing the previous contract. |
| `[REMOVIDO]` | Removed code path, export, or UI entry. |

Tags present in this implementation:

- `[NOVO]`
- `[ATUALIZADO]`

---

## 3. Operation Flowchart

```mermaid
flowchart TD
  subgraph assets [Assets folder]
    Pick[Pasta assets Game]
    Collect[collectCharacterGltfSourceFiles]
    AnimsOnly[".anm só em {skin}/animations/"]
    Pick --> Collect --> AnimsOnly
  end

  subgraph convert [Conversão lol2gltf]
    API["POST /api/character-gltf/convert"]
    GLB["character-gltf/{campeao}.glb"]
    AnimsOnly --> API --> GLB
  end

  subgraph panel [Character panel]
    Preview[VfxCharacterGltfPreviewSlot Geometria]
    Inst{GLB já existe?}
    UseExist[Usar GLTF existente]
    Reconvert[Reconverter GLTF]
    NewConv[Instanciar + converter]
    Inst -->|sim| UseExist
    Inst -->|sim| Reconvert
    Inst -->|não| NewConv
  end

  subgraph preview3d [Preview 3D — menu de contexto]
    RMB[Clique direito no slot 3D]
    Menu[VfxPreview3dContextMenu]
    Spin[Preview3dAutoSpinGroup]
    RMB --> Menu
    Menu -->|eixo X/Y/Z| Spin
    Menu -->|Parar| Stop[spinAxis = null]
  end

  subgraph engine [Engine VFX — só viewport]
    ResizeOn{ReSize activo?}
    RotOn{Rotation activo?}
    Scale["scale = vfxScale | 1"]
    Rot["rotation.x = 90° | 0"]
    ResizeOn --> Scale
    RotOn --> Rot
  end

  GLB --> Preview
  Preview --> RMB
  UseExist --> Scene[VfxCharacterGltfScene]
  Reconvert --> API
  NewConv --> API
  Scene --> engine
  Scale --> Viewport[VfxViewport + partículas alinhadas]
  Rot --> Viewport
  Scene --> Bound[boundObjectSizeLol → FlexShape]
```

---

## 4. Function Activation Sequence Diagram

```mermaid
sequenceDiagram
  actor U as User
  participant Slot as VfxPreview3dSlotFrame
  participant Menu as VfxPreview3dContextMenu
  participant Hook as useVfxPreview3dContextMenu
  participant Canvas as Preview Canvas R3F
  participant Spin as Preview3dAutoSpinGroup
  participant Panel as VfxCharacterPanel
  participant Scene as VfxCharacterGltfScene

  U->>Slot: Clique direito no preview Geometria ou mesh
  Slot->>Hook: openMenu(clientX, clientY)
  Hook->>Menu: render portal com anchor
  U->>Menu: Rotacionar no eixo Y
  Menu->>Hook: selectAxis('y')
  Hook->>Canvas: spinAxis='y', frameloop='always'
  Canvas->>Spin: useFrame(delta) → rotation.y += speed

  U->>Menu: Parar rotação
  Menu->>Hook: selectAxis(null)
  Hook->>Canvas: spinAxis=null, frameloop='demand'

  U->>Panel: Usar GLTF existente
  Panel->>Scene: engineScale + rotationXLolDeg (Engine VFX)
  Note over Slot,Scene: Preview Geometria: 90° X fixo, sem vfxScale; rotação automática só via menu
```

---

## 5. Functions and Components Table

| Status | Name | Feature | Technical Description | Parameters / Return |
| --- | --- | --- | --- | --- |
| `[NOVO]` | `lol2gltfRunner.mjs` | GLTF pipeline | Executa lol2gltf CLI; grava `character-gltf/{base}.glb`. | buffers SKN/SKL/ANM → GLB |
| `[NOVO]` | `vite.plugin.characterGltf.ts` | GLTF API | Dev-only: health, list, convert, serve GLB. | Vite plugin |
| `[NOVO]` | `characterGltfConvert.ts` | GLTF pipeline | `pickAnmFiles` — só `{skin}/animations/*.anm`. | champion, files → POST |
| `[NOVO]` | `characterGltfCatalog.ts` | GLTF catalog | Lista GLBs convertidos; `getGltfUrl`. | champion → URL |
| `[NOVO]` | `characterGltfClips.ts` | GLTF animation | Normaliza clips; stats; default idle/dance. | clips → names |
| `[NOVO]` | `characterGltfAnimations.ts` | GLTF animation | Lista nomes via GLTFLoader (sem instanciar). | champion → string[] |
| `[NOVO]` | `characterEngineVfx.ts` | Engine VFX | `resolveCharacterEngineScale`, `resolveCharacterEngineRotationXDeg` (90° fixo). | boolean → number |
| `[NOVO]` | `getBoundObjectSizeLolFromObject3D` | FlexShape bound | AABB Three → unidades LoL / engineScale. | Object3D, scale → vec3 |
| `[NOVO]` | `collectCharacterGltfSourceFiles` | Asset collect | SKN/SKL/tex skin + ANM só pasta animations. | handle, champion → File[] |
| `[NOVO]` | `VfxCharacterGltfScene.tsx` | Viewport character | GLTFLoader + AnimationMixer + group scale/rotation Engine VFX. | engineScale, rotationXLolDeg |
| `[NOVO]` | `VfxCharacterGltfPreviewSlot.tsx` | Geometria preview | Canvas 3D; 90° X fixo; sem escala Engine VFX; menu rotação. | url, animationName |
| `[NOVO]` | `VfxMeshPreviewSlot.tsx` | Mesh inspector preview | Preview 3D de mesh VFX no inspector; menu rotação. | geometry, ritualPath |
| `[NOVO]` | `preview3dSpin.ts` | Preview 3D spin | Tipo `Preview3dSpinAxis`; constante de velocidade rad/s. | — |
| `[NOVO]` | `useVfxPreview3dContextMenu.ts` | Preview 3D menu | Estado `spinAxis` + anchor do menu de contexto. | hook API |
| `[NOVO]` | `VfxPreview3dContextMenu.tsx` | Preview 3D menu | Portal: Rotacionar X/Y/Z, Parar rotação; i18n 434–438. | anchor, activeAxis, callbacks |
| `[NOVO]` | `VfxPreview3dSlotFrame.tsx` | Preview 3D shell | Wrapper do slot com `onContextMenu` e render do menu. | children(spinAxis) |
| `[NOVO]` | `Preview3dAutoSpinGroup.tsx` | Preview 3D spin | `useFrame` aplica rotação contínua no eixo escolhido. | spinAxis, children |
| `[NOVO]` | `useVfxCharacterScene.ts` | Character state | Catálogo, instanciar/reconverter, Engine VFX toggles, bound. | hook API |
| `[NOVO]` | `VfxCharacterPanel.tsx` | Character UI | Campeões colapsáveis, Geometria GLTF, Engine VFX checkboxes. | scene, vfxScale |
| `[ATUALIZADO]` | `VfxDock.tsx` | Wiring | Passa engineScale/rotation e boundObjectSizeLol ao preview VFX. | character props |
| `[ATUALIZADO]` | `VfxViewport.tsx` | Viewport | Props Engine VFX para `VfxCharacterGltfScene`. | character |
| `[ATUALIZADO]` | `VfxToolsDock.tsx` | Tools dock | Passa `vfxScale` ao painel Character. | vfxScale |
| `[ATUALIZADO]` | `vfxViewportPreferences.ts` | Ground default | Chão padrão **11×11** (era 20×20). | groundScale2d |
| `[ATUALIZADO]` | `vfxCharacterAssets.ts` | Paths | Helpers pasta `animations/` por skin. | champion, skin |
| `[ATUALIZADO]` | `language/*.json` | i18n | LangIds 368–438 (Character, Engine VFX, Preview 3D menu). | — |

---

## 6. Detailed Operation Description

### Architecture

Characters are converted offline in dev via **lol2gltf** into `character-gltf/{campeao}.glb` (no `gltf_` prefix). The Vite plugin exposes REST endpoints only during `pnpm dev`. The viewport renders via **React Three Fiber** (`VfxCharacterGltfScene`) with `SkeletonUtils.clone` for skinning.

**Engine VFX** (viewport only) aligns the character mesh with the particle pipeline: when **Character ReSize** is on, the root group scales by timeline `vfxScale` (default 0.01); when off, scale is 1. When **Character Rotation** is on, a fixed **90°** rotation is applied on **Three X** (LoL X); when off, rotation is 0.

The **Geometria preview** (`VfxCharacterGltfPreviewSlot`) is independent: it always applies **90° on X** for correct bind-pose viewing, does **not** apply `vfxScale`, and centres the model via `fitCameraToObject`. The **mesh inspector preview** (`VfxMeshPreviewSlot`) uses the same context-menu shell.

**Preview 3D context menu** wraps both preview slots via `VfxPreview3dSlotFrame`. Right-click opens `VfxPreview3dContextMenu` (portal, placement via `computeContextMenuPlacement`). Choosing an axis sets `spinAxis` and switches Canvas `frameloop` to `always`; `Preview3dAutoSpinGroup` rotates at `PREVIEW_3D_SPIN_SPEED_RAD_PER_SEC` (π/3 rad/s). **Stop rotation** clears the axis and returns to `demand` frameloop.

`boundObjectSizeLol` is computed from the GLTF AABB and feeds existing **FlexShape** multipliers in `vfxTransformEngine` / `useVfxPreview`.

### Business rules

- Animation files for conversion: **only** `characters/{campeao}/{skin}/animations/*.anm` (same skin as SKN).
- If GLB already exists: panel offers **Usar GLTF existente** or **Reconverter** inside **Campeões** (not auto-load).
- Champion list expands **only** when search is focused; collapses on selection.
- **Sync with VFX timeline** (animations): default **off**.
- Ground default size: **11 × 11** in viewport preferences.
- Engine VFX controls are **checkboxes only** (no numeric fields in UI).
- Preview auto-rotation is **local to the preview slot** and does not affect the main VFX viewport or Engine VFX toggles.
- Switching spin axis resets the inner spin group rotation to avoid accumulated drift.

### Errors / edge cases

- `LOL2GLTF_NOT_FOUND` if `tools/lol2gltf/lol2gltf.exe` missing — see `LEIA-ME.txt`.
- Conversion API unavailable outside `pnpm dev`.
- Empty animations folder → convert error with path hint.
- Engine VFX rotation checkbox only fixes orientation around X in the viewport; other axes need future work if GLTF export is lying down.
- Context menu closes on outside click (left button) or Escape.

---

## How to use (EN)

1. Install **lol2gltf** in `tools/lol2gltf/` (see `LEIA-ME.txt`) and run **`pnpm dev`**.
2. VFX dock → **Character** tool → set **Assets path** to your Game folder (e.g. custom skin `assets`).
3. Select a champion. If **Geometria** shows GLTF preview, a converted GLB exists.
4. **Campeões**: use **Usar GLTF existente** or **Reconverter**; otherwise **Instanciar** converts first.
5. **Render → Engine VFX**: toggle **Character ReSize** (sync `vfxScale`) and **Character Rotation** (90° X) to align with VFX particles in the **main viewport**.
6. **Animações**: pick clip; optional **Sync with VFX timeline** links pose to timeline playhead.
7. **Preview 3D rotation**: right-click the Geometria preview or mesh inspector 3D slot → **Rotate on X/Y/Z axis**; **Stop rotation** to freeze. Orbit controls still work while spinning.

---

## Como usar (PT)

1. Instale o **lol2gltf** em `tools/lol2gltf/` (ver `LEIA-ME.txt`) e execute **`pnpm dev`**.
2. Dock VFX → ferramenta **Character** → defina **Assets path** para a pasta Game (ex.: `assets` do skin custom).
3. Seleccione um campeão. Se **Geometria** mostrar preview GLTF, já existe GLB convertido.
4. **Campeões**: **Usar GLTF existente** ou **Reconverter**; senão **Instanciar** converte primeiro.
5. **Render → Engine VFX**: active **Character ReSize** (escala = vfxScale da timeline) e **Character Rotation** (90° no eixo X) para alinhar com as partículas VFX no **viewport principal**.
6. **Animações**: escolha o clip; **Sync with VFX timeline** (desligado por defeito) liga a pose à timeline.
7. **Rotação no preview 3D**: clique direito no preview de Geometria ou no slot 3D do inspector de mesh → **Rotacionar no eixo X/Y/Z**; **Parar rotação** para parar. Os OrbitControls continuam disponíveis durante a rotação.

### Tests

```bash
pnpm test -- src/core/vfx/characterGltfConvert.test.ts src/core/vfx/characterEngineVfx.test.ts src/core/vfx/vfxCharacterBounds.test.ts src/core/vfx/characterGltfCatalog.test.ts
```

---

## Acknowledgements

Special thanks to **Bud**, creator of the Jade tool that powers the BIN conversion system used in this project.
GitHub: https://github.com/budlibu500

Key contributions include:

* BIN code conversion
* BIN League syntax analysis
* Particle editing systems
* General-purpose editing tools

Their work and support were essential to the development and functionality of this project.
