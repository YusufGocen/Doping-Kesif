/** Preview artwork only; authenticated metadata and progress come from the API. */
export const puzzleCovers: Record<string, string> = {
  DEMO_HISTORY: '/images/discovery/history.png',
  DEMO_NATURE: '/images/discovery/nature.png',
  DEMO_CITY: '/images/discovery/city.png',
  DEMO_WORLD: '/images/discovery/world.png',
};
export const previewPuzzles = [
  { code: 'DEMO_HISTORY', title: 'Tarihi Şehir', pieceCount: 20 },
  { code: 'DEMO_NATURE', title: 'Doğa Keşfi', pieceCount: 20 },
  { code: 'DEMO_CITY', title: 'Şehir Manzarası', pieceCount: 20 },
  { code: 'DEMO_WORLD', title: 'Renkli Dünya', pieceCount: 20 },
] as const;
