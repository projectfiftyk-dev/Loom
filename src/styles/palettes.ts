export interface BookPalette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textMuted: string;
  accent: string;
  accentFg: string;
  narratorBg: string;
  narratorBorder: string;
  narratorText: string;
  charBg: string;
  charBorder: string;
  charText: string;
}

export interface BookTheme {
  id: string;
  name: string;
  swatchBg: string;
  swatchAccent: string;
  palette: BookPalette;
}

export const BOOK_THEMES: BookTheme[] = [
  {
    id: 'dark',
    name: 'Dark',
    swatchBg: '#0C0B1A',
    swatchAccent: '#7C3AED',
    palette: {
      bg: '#0C0B1A', surface: '#1E1C30', surfaceAlt: '#16152B',
      text: '#FFFFFF', textMuted: '#8B87B8',
      accent: '#7C3AED', accentFg: '#FFFFFF',
      narratorBg: '#1E1C30', narratorBorder: '#2D2B47', narratorText: '#C4C0E8',
      charBg: '#2D2B47', charBorder: '#3D3B57', charText: '#FFFFFF',
    },
  },
  {
    id: 'light',
    name: 'Light',
    swatchBg: '#F5F3FF',
    swatchAccent: '#7C3AED',
    palette: {
      bg: '#F5F3FF', surface: '#FFFFFF', surfaceAlt: '#F0EEFF',
      text: '#1A1839', textMuted: '#7C6EA8',
      accent: '#7C3AED', accentFg: '#FFFFFF',
      narratorBg: '#EDE9FF', narratorBorder: '#C4B5FD', narratorText: '#1A1839',
      charBg: '#F5F3FF', charBorder: '#DDD6FE', charText: '#1A1839',
    },
  },
  {
    id: 'warm',
    name: 'Warm',
    swatchBg: '#1C1008',
    swatchAccent: '#D97706',
    palette: {
      bg: '#1C1008', surface: '#2C1F10', surfaceAlt: '#221708',
      text: '#F5E6CC', textMuted: '#B8936A',
      accent: '#D97706', accentFg: '#FFFFFF',
      narratorBg: '#2C1F10', narratorBorder: '#4A3018', narratorText: '#F5E6CC',
      charBg: '#3A2410', charBorder: '#5A3820', charText: '#F5E6CC',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    swatchBg: '#071828',
    swatchAccent: '#0EA5E9',
    palette: {
      bg: '#071828', surface: '#0E2840', surfaceAlt: '#0A2035',
      text: '#E0F2FE', textMuted: '#7EBBD4',
      accent: '#0EA5E9', accentFg: '#FFFFFF',
      narratorBg: '#0E2840', narratorBorder: '#1E4A6A', narratorText: '#E0F2FE',
      charBg: '#123454', charBorder: '#1E4A6A', charText: '#E0F2FE',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    swatchBg: '#0A1A0E',
    swatchAccent: '#22C55E',
    palette: {
      bg: '#0A1A0E', surface: '#122819', surfaceAlt: '#0E2014',
      text: '#E8F5E9', textMuted: '#81C784',
      accent: '#22C55E', accentFg: '#FFFFFF',
      narratorBg: '#122819', narratorBorder: '#1E4A25', narratorText: '#E8F5E9',
      charBg: '#1A3520', charBorder: '#2A5030', charText: '#E8F5E9',
    },
  },
  {
    id: 'parchment',
    name: 'Parchment',
    swatchBg: '#F7F0E0',
    swatchAccent: '#B45309',
    palette: {
      bg: '#F7F0E0', surface: '#FFFDF5', surfaceAlt: '#F0E8D0',
      text: '#3D2B1F', textMuted: '#8B7355',
      accent: '#B45309', accentFg: '#FFFFFF',
      narratorBg: '#F0E8D0', narratorBorder: '#D4B896', narratorText: '#3D2B1F',
      charBg: '#E8DCC0', charBorder: '#C4A880', charText: '#3D2B1F',
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
