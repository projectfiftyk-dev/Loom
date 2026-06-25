export interface BookPalette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  accent: string;
  accentFg: string;
}

const BOOK_THEMES: { id: string; palette: BookPalette }[] = [
  {
    id: 'dark',
    palette: {
      bg: '#0C0B1A', surface: '#1E1C30', surfaceAlt: '#16152B',
      text: '#FFFFFF', textMuted: '#8B87B8',
      accent: '#7C3AED', accentFg: '#FFFFFF',
    },
  },
  {
    id: 'light',
    palette: {
      bg: '#F5F3FF', surface: '#FFFFFF', surfaceAlt: '#F0EEFF',
      text: '#1A1839', textMuted: '#7C6EA8',
      accent: '#7C3AED', accentFg: '#FFFFFF',
    },
  },
  {
    id: 'warm',
    palette: {
      bg: '#1C1008', surface: '#2C1F10', surfaceAlt: '#221708',
      text: '#F5E6CC', textMuted: '#B8936A',
      accent: '#D97706', accentFg: '#FFFFFF',
    },
  },
  {
    id: 'ocean',
    palette: {
      bg: '#071828', surface: '#0E2840', surfaceAlt: '#0A2035',
      text: '#E0F2FE', textMuted: '#7EBBD4',
      accent: '#0EA5E9', accentFg: '#FFFFFF',
    },
  },
  {
    id: 'forest',
    palette: {
      bg: '#0A1A0E', surface: '#122819', surfaceAlt: '#0E2014',
      text: '#E8F5E9', textMuted: '#81C784',
      accent: '#22C55E', accentFg: '#FFFFFF',
    },
  },
  {
    id: 'parchment',
    palette: {
      bg: '#F7F0E0', surface: '#FFFDF5', surfaceAlt: '#F0E8D0',
      text: '#3D2B1F', textMuted: '#8B7355',
      accent: '#B45309', accentFg: '#FFFFFF',
    },
  },
];

export const DEFAULT_PALETTE = BOOK_THEMES[0].palette;

export function getPaletteForStyle(styleId: string | undefined): BookPalette {
  return BOOK_THEMES.find(t => t.id === styleId)?.palette ?? DEFAULT_PALETTE;
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
