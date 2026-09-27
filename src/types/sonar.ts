export type DebrisClass = 
  | 'ghost_net'
  | 'pipe'
  | 'container'
  | 'tire'
  | 'uxo'
  | 'drum'
  | 'wreckage'
  | 'cable';

export type ModelHeadType = 'yolov8_obb' | 'unet';

export type ChannelSide = 'port' | 'starboard';

export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export type ColormapTheme = 'bronze' | 'cobalt' | 'copper' | 'grayscale' | 'jet';

export interface BoundingBoxOBB {
  cx: number;        // Center X in waterfall canvas
  cy: number;        // Center Y in waterfall canvas
  width: number;     // Width across acoustic axis
  height: number;    // Length along acoustic axis
  angleDeg: number;  // Orientation angle (-90 to +90)
}

export interface UnetSegmentation {
  contour: [number, number][]; // Polygon points in canvas coordinates
  areaSqMeters: number;
  permeabilityIndex: number;  // Acoustic transmission through mesh (0.1 - 0.9)
}

export interface ShadowPhysicsVerification {
  hasShadow: boolean;
  shadowLengthPixels: number;
  shadowLength_m: number;      // L_s (cross-track acoustic shadow length)
  groundRange_m: number;       // R_g (nadir to highlight base)
  slantRange_m: number;        // R_s
  towfishAltitude_m: number;   // H (towfish/AUV height above seabed)
  calculatedHeight_m: number;  // Ho = (H * Ls) / (Rg + Ls)
  shadowAngleAlignmentDeg: number; // Difference from acoustic radial vector (0 = perfect alignment)
  isPhysicsVerified: boolean;
  rejectionReason?: string;    // If false positive (e.g. flat bedform, biogenic mound)
  signalToNoiseRatioDb: number;
}

export interface GeospatialCoordinate {
  lat: number;
  lon: number;
  depth_m: number;
  alongTrackOffset_m: number;
  crossTrackOffset_m: number;
}

export interface UploadedScanAnalysis {
  fileName: string;
  fileSize: number;
  imageUrl: string;
  width: number;
  height: number;
  channel: ChannelSide;
  towfishAltitude_m: number;
  maxRange_m: number;
  detectedTargets: DetectedDebrisTarget[];
}

export interface DetectedDebrisTarget {
  id: string;
  label: string;
  debrisClass: DebrisClass;
  modelHead: ModelHeadType;
  channel: ChannelSide;
  pingIndex: number;
  rangeIndex: number;
  confidence: number;
  obb?: BoundingBoxOBB;
  unetMask?: UnetSegmentation;
  physics: ShadowPhysicsVerification;
  geospatial: GeospatialCoordinate;
  riskLevel: RiskLevel;
  hazardType: 'entanglement' | 'navigational' | 'toxic_ordnance' | 'infrastructure';
  acousticProfile: number[]; // A-scan cross-track intensity profile (highlight & shadow)
  recoveryProtocol: string;
  notes: string;
  uploadedImageUrl?: string;
}

export interface SonarMetadata {
  missionId: string;
  missionName: string;
  locationName: string;
  surveyVessel: string;
  auvModel: string;
  sensorFrequencyKhz: number;
  pingRateHz: number;
  maxRangeMeters: number;
  sampleIntervalMeters: number;
  waterDepthMeters: number;
  towfishAltitudeMeters: number;
  surveySpeedKnots: number;
  startLat: number;
  startLon: number;
  baseHeadingDeg: number;
}

export interface MissionDataset {
  id: string;
  name: string;
  region: string;
  description: string;
  metadata: SonarMetadata;
  targets: DetectedDebrisTarget[];
  falsePositivesCount: number;
  tracklinePoints: { lat: number; lon: number; depth: number }[];
}

export interface FilterState {
  showRaw: boolean;
  showSrad: boolean;
  showClahe: boolean;
  showYoloObb: boolean;
  showUnet: boolean;
  showShadowPhysics: boolean;
  filterPhysicsVerifiedOnly: boolean;
  minConfidence: number;
  sradIterations: number;
  sradDiffusionRate: number;
  claheClipLimit: number;
  selectedClasses: Set<DebrisClass>;
  selectedRiskLevels: Set<RiskLevel>;
  colormap: ColormapTheme;
}

export interface EdgeTelemetry {
  targetHardware: 'NVIDIA Jetson Orin AGX' | 'NVIDIA Jetson Orin Nano' | 'RTX 4090 Workstation';
  inferenceEngine: 'TensorRT FP16' | 'TensorRT INT8' | 'ONNX Runtime';
  pingLatencyMs: number;
  processingFps: number;
  gpuUtilizationPercent: number;
  powerDrawWatts: number;
  vramUsageGb: number;
  totalVramGb: number;
  temperatureCelsius: number;
  isOfflineMode: boolean;
}
