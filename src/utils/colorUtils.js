// Convert RGB to HSL color space for better color manipulation
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: h = 0;
    }

    h /= 6;
  }

  return [h, s, l];
}

// Convert HSL back to RGB
export function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// Convert hex color to RGB
export function hexToRgb(hex) {
  // Remove the hash if present
  hex = hex.replace('#', '');

  // Parse the RGB components
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  return [r, g, b];
}

// Apply lipstick color to the pixel
export function applyLipstickToPixel(originalRGB, lipstickRGB, opacity = 0.7) {
  // Convert original pixel color to HSL
  const [h, s, l] = rgbToHsl(...originalRGB);

  // Convert lipstick color to HSL
  const [lipH, lipS, lipL] = rgbToHsl(...lipstickRGB);

  // Use lipstick hue and saturation, but maintain original luminance for natural look
  const newRGB = hslToRgb(lipH, lipS, l * 0.9);

  // Blend original and new color based on opacity
  return [
    Math.round(originalRGB[0] * (1 - opacity) + newRGB[0] * opacity),
    Math.round(originalRGB[1] * (1 - opacity) + newRGB[1] * opacity),
    Math.round(originalRGB[2] * (1 - opacity) + newRGB[2] * opacity)
  ];
}
