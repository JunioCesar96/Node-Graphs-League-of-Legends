# Jade-League-Bin-Editor spike

## Referência upstream

Projeto oficial: https://github.com/RitoShark/Jade-League-Bin-Editor

## Estado neste repositório

- Conversão `.bin` real **não está integrada**. `stubBinStructureDocument()` em [`src/core/binImportStub.ts`](src/core/binImportStub.ts) gera apenas um envelope JSON válido (`format: node-graphs-lol`, `version: 1`) para testar o fluxo de ficheiro e download de `json_structure_<timestamp>.json`.
- Menu **File → Stub .bin → JSON** apenas descarrega o stub e grava meta em `sessionStorage` via `STORAGE_LAST_STRUCTURE_META`.

## Passos seguintes típicos

1. Avaliar se o Jade editor expõe build web (Electron embutível, Monaco, parsers expostos) ou apenas desktop.
2. Se o parsing for apenas Node/native, usar script `pnpm`/CLI em paralelo durante o desenvolvimento e comunicar resultado ao browser via servidor local mínimo.
3. Formalizar fixture `.bin` mínimo e contract test entre bytes → `LeagueBinGraphDocumentV1`.
