/**
 * Color Utilities
 * Functions for extracting colors from images and generating theme color palettes
 */

/**
 * Extract RGB color from canvas at specific pixel coordinates
 */
export function getColorAtPixel(
  canvas: HTMLCanvasElement,
  x: number,
  y: number
): { r: number; g: number; b: number } | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    const imageData = ctx.getImageData(x, y, 1, 1);
    const [r, g, b] = imageData.data; // Skip alpha channel
    return { r, g, b };
  } catch (error) {
    console.error('Error extracting color from canvas:', error);
    return null;
  }
}

/**
 * Convert RGB values to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.padStart(2, '0');
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert hex color to HSL
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Convert to RGB
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / diff + 2) / 6;
        break;
      case b:
        h = ((r - g) / diff + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(hsl: { h: number; s: number; l: number }): string {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return rgbToHex(r * 255, g * 255, b * 255);
}

/**
 * Generate secondary color from primary using adaptive lightness variation
 * - If primary is light (L > 70): make secondary darker
 * - If primary is dark/medium: make secondary lighter
 */
export function deriveSecondaryColor(primaryHex: string): string {
  const hsl = hexToHSL(primaryHex);

  let newLightness: number;

  if (hsl.l > 70) {
    // Primary is light, make secondary darker
    newLightness = Math.max(hsl.l - 25, 20);
  } else {
    // Primary is dark/medium, make secondary lighter
    newLightness = Math.min(hsl.l + 25, 85);
  }

  return hslToHex({
    h: hsl.h,
    s: hsl.s,
    l: newLightness,
  });
}

/**
 * Generate complete 4-color theme from single primary color
 */
export function generateCompleteTheme(primaryHex: string): {
  primary: string;
  secondary: string;
  background: string;
  text: string;
} {
  const secondary = deriveSecondaryColor(primaryHex);

  return {
    primary: primaryHex,
    secondary,
    background: '#ffffff', // Always white for readability
    text: '#1a1a1a',      // Always dark gray for good contrast on white
  };
}

/**
 * Calculate relative luminance for contrast ratio calculation
 */
function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const [rs, gs, bs] = [r, g, b].map((c) => {
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check if two colors have good contrast ratio (WCAG AA: 4.5:1)
 */
export function hasGoodContrast(
  foreground: string,
  background: string
): boolean {
  const l1 = getRelativeLuminance(foreground);
  const l2 = getRelativeLuminance(background);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const contrastRatio = (lighter + 0.05) / (darker + 0.05);

  return contrastRatio >= 4.5;
}
