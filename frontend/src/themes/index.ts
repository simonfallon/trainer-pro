/**
 * Theme definitions from theme-factory skill
 * Integrated from .agent/skills/theme-factory/themes/
 */

export interface Theme {
  id: string;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

export const themes: Theme[] = [
  {
    id: "ocean-depths",
    name: "Profundidades del Océano",
    description: "Tema marítimo profesional y relajante",
    colors: {
      primary: "#1a5f7a",
      secondary: "#57a0c9",
      background: "#f0f8ff",
      text: "#0d2b3e",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "sunset-boulevard",
    name: "Bulevar al Atardecer",
    description: "Colores de atardecer cálidos y vibrantes",
    colors: {
      primary: "#ff6b35",
      secondary: "#f7c59f",
      background: "#fffaf5",
      text: "#2e1f1a",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "forest-canopy",
    name: "Dosel del Bosque",
    description: "Tonos tierra naturales y equilibrados",
    colors: {
      primary: "#2d5a3d",
      secondary: "#6b8e6b",
      background: "#f5f6f0",
      text: "#1a2e1a",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "modern-minimalist",
    name: "Mínimo Moderno",
    description: "Escala de grises limpia y contemporánea",
    colors: {
      primary: "#36454f",
      secondary: "#708090",
      background: "#ffffff",
      text: "#1a1a1a",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "golden-hour",
    name: "Hora Dorada",
    description: "Paleta otoñal rica y cálida",
    colors: {
      primary: "#c4922a",
      secondary: "#d4a84b",
      background: "#fffcf5",
      text: "#3d2e14",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "arctic-frost",
    name: "Escarcha Ártica",
    description: "Tema fresco inspirado en el invierno",
    colors: {
      primary: "#4a90a4",
      secondary: "#a8d5e5",
      background: "#f8fbfc",
      text: "#1e3a44",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "desert-rose",
    name: "Rosa del Desierto",
    description: "Tonos empolvados suaves y sofisticados",
    colors: {
      primary: "#b76e79",
      secondary: "#d4a5ad",
      background: "#fcf9f8",
      text: "#3d2a2e",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "tech-innovation",
    name: "Innovación Tecnológica",
    description: "Estética tecnológica audaz y moderna",
    colors: {
      primary: "#0066ff",
      secondary: "#00ffff",
      background: "#1e1e1e",
      text: "#ffffff",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "botanical-garden",
    name: "Jardín Botánico",
    description: "Colores de jardín frescos y orgánicos",
    colors: {
      primary: "#4a7c59",
      secondary: "#8fbc8f",
      background: "#f5faf5",
      text: "#1a2e1a",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "midnight-galaxy",
    name: "Galaxia de Medianoche",
    description: "Tonos profundos dramáticos y cósmicos",
    colors: {
      primary: "#6b5b95",
      secondary: "#9370db",
      background: "#1a1625",
      text: "#e8e4f0",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "bmx",
    name: "BMX Pro",
    description: "Tema gris oscuro para ciclismo",
    colors: {
      primary: "#334155",
      secondary: "#94a3b8",
      background: "#f8fafc",
      text: "#0f172a",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
  {
    id: "physio",
    name: "Fisioterapia",
    description: "Tema azul profesional para fisioterapia",
    colors: {
      primary: "#1e3a8a",
      secondary: "#3b82f6",
      background: "#f8fafc",
      text: "#0f172a",
    },
    fonts: {
      heading: "DejaVu Sans Bold, sans-serif",
      body: "DejaVu Sans, sans-serif",
    },
  },
];

export const getThemeById = (id: string): Theme | undefined => {
  return themes.find((theme) => theme.id === id);
};

export const defaultTheme = themes.find((t) => t.id === "modern-minimalist") || themes[0];
