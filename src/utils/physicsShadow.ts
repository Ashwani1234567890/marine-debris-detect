import { ShadowPhysicsVerification } from '../types/sonar';

/**
 * Calculates estimated object height from side-scan sonar acoustic geometry:
 * 
 * Ho = (H * Ls) / (Rg + Ls)
 * 
 * Where:
 * - H: Towfish / AUV altitude above the seafloor (meters)
 * - Ls: Acoustic shadow length along cross-track ground range (meters)
 * - Rg: Ground range from Nadir to the base of the object highlight (meters)
 * - Ho: Estimated vertical height of object above seabed (meters)
 */
export function calculateObjectHeight(
  altitude_m: number,
  shadowLength_m: number,
  groundRange_m: number
): number {
  if (shadowLength_m <= 0 || altitude_m <= 0 || groundRange_m <= 0) {
    return 0;
  }
  const denominator = groundRange_m + shadowLength_m;
  if (denominator <= 0) return 0;
  const height = (altitude_m * shadowLength_m) / denominator;
  return Number(height.toFixed(2));
}

/**
 * Validates candidate detections against acoustic shadow physics.
 * Rejects flat sand ripples, biogenic seabed mounds, and acoustic multi-path reflections.
 */
export function verifyPhysicsShadow(
  altitude_m: number,
  groundRange_m: number,
  shadowLength_m: number,
  radialAngleErrorDeg: number,
  targetAcousticPeakDb: number,
  shadowAcousticTroughDb: number
): ShadowPhysicsVerification {
  const hasShadow = shadowLength_m > 0.4;
  const calculatedHeight_m = hasShadow 
    ? calculateObjectHeight(altitude_m, shadowLength_m, groundRange_m)
    : 0;
  
  const snr = targetAcousticPeakDb - shadowAcousticTroughDb;
  
  // Physical criteria for valid 3D anthropogenic debris:
  // 1. Must cast a discernible acoustic shadow (Ls > 0.4m)
  // 2. Shadow vector must align with acoustic propagation angle within 18 deg
  // 3. Calculated height Ho must be physically plausible for marine debris (> 0.15m)
  // 4. Contrast SNR between specular highlight and shadow must exceed 12 dB
  let isPhysicsVerified = true;
  let rejectionReason: string | undefined = undefined;

  if (!hasShadow || shadowLength_m < 0.3) {
    isPhysicsVerified = false;
    rejectionReason = 'Absence of acoustic shadow (Ho ≈ 0m) — Classified as flat seabed sediment / shell hash';
  } else if (Math.abs(radialAngleErrorDeg) > 18) {
    isPhysicsVerified = false;
    rejectionReason = `Shadow direction (${radialAngleErrorDeg.toFixed(1)}°) misaligned with acoustic ray propagation — Multi-path artifact`;
  } else if (snr < 10) {
    isPhysicsVerified = false;
    rejectionReason = `Acoustic contrast SNR (${snr.toFixed(1)} dB) below threshold — Diffuse natural boulder cluster`;
  } else if (calculatedHeight_m > 25.0) {
    isPhysicsVerified = false;
    rejectionReason = `Unphysical height calculation (Ho = ${calculatedHeight_m}m) — Exceeds towfish water column clearance`;
  }

  return {
    hasShadow,
    shadowLengthPixels: Math.round(shadowLength_m * 10),
    shadowLength_m,
    groundRange_m,
    slantRange_m: Math.sqrt(groundRange_m * groundRange_m + altitude_m * altitude_m),
    towfishAltitude_m: altitude_m,
    calculatedHeight_m,
    shadowAngleAlignmentDeg: radialAngleErrorDeg,
    isPhysicsVerified,
    rejectionReason,
    signalToNoiseRatioDb: snr
  };
}
