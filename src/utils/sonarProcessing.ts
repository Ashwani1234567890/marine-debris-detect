import { ColormapTheme } from '../types/sonar';

/**
 * Generates an RGBA lookup table for side-scan sonar visualization.
 * Marine industry standards:
 * - Bronze/Amber: Klein / EdgeTech standard high-contrast acoustic display
 * - Cobalt: Deep-ocean ice blue
 * - Copper: Warm radiometric backscatter
 * - Grayscale: Normalized acoustic reflectivity
 * - Jet: Spectral pseudo-color
 */
export function getColormapRgb(theme: ColormapTheme, value: number): [number, number, number] {
  // Clamp value 0-255
  const t = Math.max(0, Math.min(255, Math.round(value))) / 255;

  switch (theme) {
    case 'bronze': {
      // Classic Amber/Bronze sonar palette
      const r = Math.min(255, Math.round(Math.pow(t, 0.8) * 255));
      const g = Math.min(255, Math.round(Math.pow(t, 1.2) * 200));
      const b = Math.min(255, Math.round(Math.pow(t, 2.0) * 80));
      return [r, g, b];
    }
    case 'cobalt': {
      // Deep ocean ice blue
      const r = Math.min(255, Math.round(Math.pow(t, 1.8) * 80));
      const g = Math.min(255, Math.round(Math.pow(t, 1.1) * 210));
      const b = Math.min(255, Math.round(Math.pow(t, 0.85) * 255));
      return [r, g, b];
    }
    case 'copper': {
      // Warm copper
      const r = Math.min(255, Math.round(Math.pow(t, 0.8) * 245));
      const g = Math.min(255, Math.round(Math.pow(t, 1.4) * 140));
      const b = Math.min(255, Math.round(Math.pow(t, 2.2) * 60));
      return [r, g, b];
    }
    case 'jet': {
      // Hydrographic rainbow jet
      let r = 0, g = 0, b = 0;
      if (t < 0.25) {
        b = 255;
        g = Math.round(t * 4 * 255);
      } else if (t < 0.5) {
        b = Math.round((0.5 - t) * 4 * 255);
        g = 255;
      } else if (t < 0.75) {
        g = 255;
        r = Math.round((t - 0.5) * 4 * 255);
      } else {
        r = 255;
        g = Math.round((1.0 - t) * 4 * 255);
      }
      return [r, g, b];
    }
    case 'grayscale':
    default: {
      const v = Math.round(t * 255);
      return [v, v, v];
    }
  }
}

/**
 * Speckle Reducing Anisotropic Diffusion (SRAD)
 * Reference: Yu & Acton (2002), "Speckle Reducing Anisotropic Diffusion", IEEE Trans. Image Processing.
 * Tailored for multiplicative acoustic sonar speckle.
 */
export function applySradFilter(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  iterations: number = 3,
  timeStep: number = 0.15
): Uint8ClampedArray {
  const size = width * height;
  const I = new Float32Array(size);
  const output = new Uint8ClampedArray(size);

  // Initialize normalized float intensity
  for (let i = 0; i < size; i++) {
    I[i] = input[i] / 255.0;
  }

  for (let iter = 0; iter < iterations; iter++) {
    // Estimate instantaneous coefficient of variation q0(t)
    let mean = 0;
    let variance = 0;
    for (let i = 0; i < size; i++) {
      mean += I[i];
    }
    mean /= size;
    for (let i = 0; i < size; i++) {
      const diff = I[i] - mean;
      variance += diff * diff;
    }
    variance /= size;
    const q0 = Math.max(0.05, Math.sqrt(variance) / (mean + 1e-6));
    const q0Sq = q0 * q0;

    const nextI = new Float32Array(I);

    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        const center = I[idx];

        // Directional gradients (North, South, East, West)
        const dN = I[idx - width] - center;
        const dS = I[idx + width] - center;
        const dE = I[idx + 1] - center;
        const dW = I[idx - 1] - center;

        // Laplacian
        const laplacian = dN + dS + dE + dW;

        // Gradient magnitude squared
        const gradMagSq = (dN * dN + dS * dS + dE * dE + dW * dW) / 2;

        // Relative variation q
        const denom = (1 + 0.25 * laplacian);
        const num = 0.5 * (gradMagSq / (center * center + 1e-6)) - (1 / 16) * Math.pow(laplacian / (center + 1e-6), 2);
        const qSq = Math.max(0, num / (denom * denom + 1e-6));

        // Diffusion coefficient c(q)
        const c = 1.0 / (1.0 + (qSq - q0Sq) / (q0Sq * (1.0 + q0Sq) + 1e-6));
        const cClamped = Math.max(0, Math.min(1, c));

        // Divergence
        const flux = cClamped * laplacian;
        nextI[idx] = Math.max(0, Math.min(1, center + timeStep * flux));
      }
    }

    I.set(nextI);
  }

  for (let i = 0; i < size; i++) {
    output[i] = Math.round(I[i] * 255.0);
  }

  return output;
}

/**
 * Contrast Limited Adaptive Histogram Equalization (CLAHE)
 * Divides the image into grid tiles, clips histogram bins to limit noise over-amplification,
 * and interpolates transfer functions.
 */
export function applyClaheFilter(
  input: Uint8ClampedArray,
  width: number,
  height: number,
  clipLimit: number = 2.5,
  tilesX: number = 8,
  tilesY: number = 8
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height);
  const tileW = Math.floor(width / tilesX);
  const tileH = Math.floor(height / tilesY);
  const cdfs: Float32Array[] = [];

  // 1. Calculate clipped histogram and CDF for each tile
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const hist = new Uint32Array(256);
      const xStart = tx * tileW;
      const yStart = ty * tileH;
      const xEnd = tx === tilesX - 1 ? width : (tx + 1) * tileW;
      const yEnd = ty === tilesY - 1 ? height : (ty + 1) * tileH;
      const numPixels = (xEnd - xStart) * (yEnd - yStart);

      for (let y = yStart; y < yEnd; y++) {
        const offset = y * width;
        for (let x = xStart; x < xEnd; x++) {
          hist[input[offset + x]]++;
        }
      }

      // Clip histogram
      const clipThreshold = Math.max(1, Math.round((clipLimit * numPixels) / 256));
      let excess = 0;
      for (let b = 0; b < 256; b++) {
        if (hist[b] > clipThreshold) {
          excess += hist[b] - clipThreshold;
          hist[b] = clipThreshold;
        }
      }

      // Distribute excess uniformly
      const bonusPerBin = Math.floor(excess / 256);
      const remainder = excess % 256;
      for (let b = 0; b < 256; b++) {
        hist[b] += bonusPerBin + (b < remainder ? 1 : 0);
      }

      // Compute CDF
      const cdf = new Float32Array(256);
      let sum = 0;
      for (let b = 0; b < 256; b++) {
        sum += hist[b];
        cdf[b] = sum / numPixels;
      }
      cdfs.push(cdf);
    }
  }

  // 2. Bilinear interpolation of mapping functions
  for (let y = 0; y < height; y++) {
    const normY = (y - tileH / 2) / tileH;
    const ty0 = Math.max(0, Math.min(tilesY - 1, Math.floor(normY)));
    const ty1 = Math.max(0, Math.min(tilesY - 1, ty0 + 1));
    const dy = Math.max(0, Math.min(1, normY - ty0));

    const rowOffset = y * width;

    for (let x = 0; x < width; x++) {
      const normX = (x - tileW / 2) / tileW;
      const tx0 = Math.max(0, Math.min(tilesX - 1, Math.floor(normX)));
      const tx1 = Math.max(0, Math.min(tilesX - 1, tx0 + 1));
      const dx = Math.max(0, Math.min(1, normX - tx0));

      const val = input[rowOffset + x];

      const cdf00 = cdfs[ty0 * tilesX + tx0][val];
      const cdf10 = cdfs[ty0 * tilesX + tx1][val];
      const cdf01 = cdfs[ty1 * tilesX + tx0][val];
      const cdf11 = cdfs[ty1 * tilesX + tx1][val];

      // Interpolate
      const top = (1 - dx) * cdf00 + dx * cdf10;
      const btm = (1 - dx) * cdf01 + dx * cdf11;
      const mapped = (1 - dy) * top + dy * btm;

      output[rowOffset + x] = Math.round(mapped * 255);
    }
  }

  return output;
}

/**
 * Slant Range Correction
 * Converts acoustic slant range Rs (travel time) to horizontal ground range Rg:
 * Rg = sqrt(Rs^2 - H^2)
 */
export function slantToGroundRange(slantRange: number, altitude: number): number {
  if (slantRange <= altitude) return 0;
  return Math.sqrt(slantRange * slantRange - altitude * altitude);
}

/**
 * Ground to Slant Range
 */
export function groundToSlantRange(groundRange: number, altitude: number): number {
  return Math.sqrt(groundRange * groundRange + altitude * altitude);
}
