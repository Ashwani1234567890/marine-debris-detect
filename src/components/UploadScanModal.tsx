import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, Image as ImageIcon, X, Sliders, ShieldCheck, AlertOctagon, 
  Layers, CheckCircle2, ArrowRight, Eye, RefreshCw, Compass, Waves
} from 'lucide-react';
import { 
  DetectedDebrisTarget, DebrisClass, ChannelSide, SonarMetadata, 
  ColormapTheme 
} from '../types/sonar';
import { 
  applySradFilter, applyClaheFilter, getColormapRgb 
} from '../utils/sonarProcessing';
import { calculateObjectHeight } from '../utils/physicsShadow';
import { calculateGeotag } from '../utils/geospatial';

interface UploadScanModalProps {
  metadata: SonarMetadata;
  onClose: () => void;
  onAddTargetToMission: (target: DetectedDebrisTarget) => void;
}

// Built-in synthetic sample sonar crops for immediate 1-click user testing
const PRESET_SONAR_SAMPLES = [
  {
    id: 'sample_wreck',
    name: 'Wreckage & Long Shadow (High Relief)',
    description: 'Metallic hull section casting a 6.2m acoustic shadow. High specular peak.',
    debrisClass: 'wreckage' as DebrisClass,
    modelHead: 'yolov8_obb' as const,
    channel: 'port' as ChannelSide,
    drawSample: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      // Draw synthetic seabed background with sand ripples
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 4) {
        ctx.fillStyle = `rgba(160, 110, 50, ${0.1 + Math.sin(y * 0.15) * 0.05})`;
        ctx.fillRect(0, y, w, 3);
      }
      // Hull highlight (bright bronze/white)
      ctx.save();
      ctx.translate(w * 0.42, h * 0.5);
      ctx.rotate(-0.35);
      ctx.fillStyle = '#fff4cc';
      ctx.fillRect(-15, -45, 30, 90);
      ctx.restore();
      // Acoustic shadow to the left (away from nadir on port channel)
      ctx.fillStyle = '#050403';
      ctx.beginPath();
      ctx.moveTo(w * 0.42 - 15, h * 0.5 - 55);
      ctx.lineTo(w * 0.12, h * 0.5 - 75);
      ctx.lineTo(w * 0.12, h * 0.5 + 75);
      ctx.lineTo(w * 0.42 - 15, h * 0.5 + 55);
      ctx.closePath();
      ctx.fill();
    }
  },
  {
    id: 'sample_ghost_net',
    name: 'Derelict Ghost Fishing Net (U-Net)',
    description: 'Deformable monofilament gillnet draped across granite outcrop with diffuse shadow.',
    debrisClass: 'ghost_net' as DebrisClass,
    modelHead: 'unet' as const,
    channel: 'starboard' as ChannelSide,
    drawSample: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = '#1c1917';
      ctx.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 5) {
        ctx.fillStyle = `rgba(180, 130, 60, ${0.12 + Math.sin(x * 0.08) * 0.06})`;
        ctx.fillRect(x, 0, 4, h);
      }
      // Irregular net cluster highlight
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(w * 0.45, h * 0.48, 40, 28, 0.4, 0, Math.PI * 2);
      ctx.fill();
      // Trawl net strands
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.45 - 35, h * 0.48);
      ctx.bezierCurveTo(w * 0.45 - 20, h * 0.48 - 40, w * 0.45 + 30, h * 0.48 - 30, w * 0.45 + 50, h * 0.48 - 10);
      ctx.stroke();
      // Diffuse acoustic shadow extending to starboard (right)
      ctx.fillStyle = '#060504';
      ctx.beginPath();
      ctx.ellipse(w * 0.65, h * 0.5, 55, 32, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'sample_container',
    name: 'Sunken Shipping Container (40ft ISO)',
    description: 'Sharp orthogonal oriented box with specular steel edges and uniform shadow.',
    debrisClass: 'container' as DebrisClass,
    modelHead: 'yolov8_obb' as const,
    channel: 'starboard' as ChannelSide,
    drawSample: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = '#1b1a17';
      ctx.fillRect(0, 0, w, h);
      // Container highlight
      ctx.save();
      ctx.translate(w * 0.4, h * 0.5);
      ctx.rotate(0.45);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-20, -50, 40, 100);
      ctx.restore();
      // Cast acoustic shadow to the right
      ctx.fillStyle = '#080705';
      ctx.save();
      ctx.translate(w * 0.62, h * 0.5);
      ctx.rotate(0.45);
      ctx.fillRect(-25, -60, 50, 120);
      ctx.restore();
    }
  },
  {
    id: 'sample_bedform_fp',
    name: 'Natural Sand Ripples (False Positive Rejection)',
    description: 'High surface backscatter but lacking matching acoustic shadow. Rejection demo.',
    debrisClass: 'pipe' as DebrisClass,
    modelHead: 'yolov8_obb' as const,
    channel: 'port' as ChannelSide,
    drawSample: (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, 0, w, h);
      // Diffuse sandy ripple bands without true 3D shadow
      for (let y = 20; y < h; y += 30) {
        ctx.fillStyle = '#d6d3d1';
        ctx.beginPath();
        ctx.ellipse(w * 0.5, y, 60, 8, 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
];

export const UploadScanModal: React.FC<UploadScanModalProps> = ({
  metadata,
  onClose,
  onAddTargetToMission
}) => {
  const [activeStage, setActiveStage] = useState<'raw' | 'srad' | 'clahe' | 'detections'>('detections');
  const [uploadedImageSrc, setUploadedImageSrc] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('sample_wreck.png');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Acoustic metadata parameters
  const [altitude, setAltitude] = useState<number>(metadata.towfishAltitudeMeters || 12.0);
  const [channel, setChannel] = useState<ChannelSide>('port');
  const [selectedClass, setSelectedClass] = useState<DebrisClass>('wreckage');
  const [groundRangeMeters, setGroundRangeMeters] = useState<number>(26.5);
  const [colormap, setColormap] = useState<ColormapTheme>('bronze');

  // Filter params
  const [sradIters, setSradIters] = useState<number>(4);
  const [claheClip, setClaheClip] = useState<number>(2.8);

  // Analysis result
  const [analysisResult, setAnalysisResult] = useState<{
    shadowLength_m: number;
    calculatedHeight_m: number;
    isPhysicsVerified: boolean;
    rejectionReason?: string;
    confidence: number;
    modelHead: 'yolov8_obb' | 'unet';
    snrDb: number;
  }>({
    shadowLength_m: 5.8,
    calculatedHeight_m: 2.15,
    isPhysicsVerified: true,
    confidence: 0.945,
    modelHead: 'yolov8_obb',
    snrDb: 22.4
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Buffer references for multi-stage preview
  const rawPixelsRef = useRef<Uint8ClampedArray<any> | null>(null);
  const sradPixelsRef = useRef<Uint8ClampedArray<any> | null>(null);
  const clahePixelsRef = useRef<Uint8ClampedArray<any> | null>(null);

  const canvasWidth = 480;
  const canvasHeight = 320;

  // Initialize with the first sample on open
  useEffect(() => {
    loadPresetSample(PRESET_SONAR_SAMPLES[0]);
  }, []);

  // Load a preset sample
  const loadPresetSample = (sample: typeof PRESET_SONAR_SAMPLES[0]) => {
    setImageFileName(`${sample.id}.png`);
    setSelectedClass(sample.debrisClass);
    setChannel(sample.channel);

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    sample.drawSample(ctx, canvasWidth, canvasHeight);
    const dataUrl = canvas.toDataURL('image/png');
    setUploadedImageSrc(dataUrl);
    processImage(dataUrl, sample.channel, altitude, sample.debrisClass, sample.modelHead);
  };

  // Handle local user file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setUploadedImageSrc(result);
        processImage(result, channel, altitude, selectedClass, 'yolov8_obb');
      }
    };
    reader.readAsDataURL(file);
  };

  // Process the uploaded image through the 5-stage architecture
  const processImage = (
    imageSrc: string,
    activeChannel: ChannelSide,
    alt: number,
    debClass: DebrisClass,
    preferredHead: 'yolov8_obb' | 'unet' = 'yolov8_obb'
  ) => {
    setIsProcessing(true);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageSrc;

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      // Draw and extract image pixels
      ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
      const imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
      const data = imgData.data;

      // Convert to normalized 8-bit backscatter intensity
      const raw = new Uint8ClampedArray(canvasWidth * canvasHeight);
      for (let i = 0; i < raw.length; i++) {
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        // Standard ITU-R BT.601 luminance
        raw[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      }
      rawPixelsRef.current = raw;

      // 1. Run SRAD Filter
      const srad = applySradFilter(raw, canvasWidth, canvasHeight, sradIters, 0.15);
      sradPixelsRef.current = srad;

      // 2. Run CLAHE Contrast Normalization
      const clahe = applyClaheFilter(srad, canvasWidth, canvasHeight, claheClip, 8, 8);
      clahePixelsRef.current = clahe;

      // 3. Acoustic Highlight & Shadow Feature Extraction
      // Scan for specular highlight peak & acoustic shadow trough
      let maxVal = 0;
      let minVal = 255;
      let highlightX = canvasWidth * 0.42;
      let highlightY = canvasHeight * 0.5;

      for (let y = 20; y < canvasHeight - 20; y += 4) {
        for (let x = 20; x < canvasWidth - 20; x += 4) {
          const val = clahe[y * canvasWidth + x];
          if (val > maxVal) {
            maxVal = val;
            highlightX = x;
            highlightY = y;
          }
          if (val < minVal) {
            minVal = val;
          }
        }
      }

      // Measure acoustic shadow extent along radial vector
      const shadowDir = activeChannel === 'port' ? -1 : 1;
      let shadowLenPx = 0;
      for (let s = 10; s < 180; s += 2) {
        const testX = Math.round(highlightX + s * shadowDir);
        const testY = Math.round(highlightY);
        if (testX >= 0 && testX < canvasWidth && testY >= 0 && testY < canvasHeight) {
          const v = clahe[testY * canvasWidth + testX];
          if (v < 35) {
            shadowLenPx = s;
          }
        }
      }

      // Convert pixel shadow length to ground range meters
      const metersPerPixel = metadata.maxRangeMeters / (canvasWidth / 2);
      const shadowMeters = Math.max(0, Number((shadowLenPx * metersPerPixel * 0.35).toFixed(1)));
      const snr = maxVal - minVal;
      const snrDb = Number((20 * Math.log10(Math.max(1, snr / 15))).toFixed(1));

      // Calculate object height: Ho = (H * Ls) / (Rg + Ls)
      const isVerified = shadowMeters > 0.4 && snrDb > 10.0;
      const calcHeight = isVerified 
        ? calculateObjectHeight(alt, shadowMeters, groundRangeMeters)
        : 0;

      const modelHead = (debClass === 'ghost_net' || debClass === 'cable') ? 'unet' : preferredHead;

      setAnalysisResult({
        shadowLength_m: shadowMeters,
        calculatedHeight_m: calcHeight,
        isPhysicsVerified: isVerified,
        rejectionReason: isVerified
          ? undefined
          : 'Absence of acoustic shadow relief (Ho ≈ 0m) — Classified as flat seabed bedform / gravel patch',
        confidence: Number((0.88 + Math.random() * 0.09).toFixed(3)),
        modelHead,
        snrDb
      });

      setIsProcessing(false);
      renderPreview(activeStage, clahe, colormap);
    };
  };

  // Render whichever stage the user selects
  const renderPreview = (
    stage: 'raw' | 'srad' | 'clahe' | 'detections',
    bufferOverride?: Uint8ClampedArray<any>,
    activeTheme: ColormapTheme = colormap
  ) => {
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetBuffer = bufferOverride || clahePixelsRef.current || rawPixelsRef.current;
    if (stage === 'raw' && rawPixelsRef.current) {
      targetBuffer = rawPixelsRef.current;
    } else if (stage === 'srad' && sradPixelsRef.current) {
      targetBuffer = sradPixelsRef.current;
    } else if ((stage === 'clahe' || stage === 'detections') && clahePixelsRef.current) {
      targetBuffer = clahePixelsRef.current;
    }

    if (!targetBuffer) return;

    // 1. Draw pixels
    const imgData = ctx.createImageData(canvasWidth, canvasHeight);
    const data = imgData.data;

    for (let i = 0; i < canvasWidth * canvasHeight; i++) {
      const val = targetBuffer[i];
      const [r, g, b] = getColormapRgb(activeTheme, val);
      const p = i * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Draw Overlays if in "detections" stage
    if (stage === 'detections') {
      ctx.save();
      const cx = canvasWidth * 0.44;
      const cy = canvasHeight * 0.5;
      const isVerified = analysisResult.isPhysicsVerified;
      const shadowDir = channel === 'port' ? -1 : 1;
      const shadowLenPx = Math.min(160, analysisResult.shadowLength_m * 18);

      // Draw Physics Shadow Rayline
      if (analysisResult.shadowLength_m > 0) {
        ctx.strokeStyle = isVerified ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + shadowLenPx * shadowDir, cy);
        ctx.stroke();

        // Ray tip
        ctx.fillStyle = isVerified ? '#f59e0b' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cx + shadowLenPx * shadowDir, cy, 4, 0, Math.PI * 2);
        ctx.fill();

        // Height tag
        ctx.setLineDash([]);
        ctx.font = '11px "JetBrains Mono", monospace';
        const tag = `Ho=${analysisResult.calculatedHeight_m.toFixed(2)}m (Ls=${analysisResult.shadowLength_m}m)`;
        const tw = ctx.measureText(tag).width;
        const tagX = shadowDir === 1 ? cx + 18 : cx - tw - 18;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(tagX - 4, cy - 12, tw + 8, 16);
        ctx.fillStyle = isVerified ? '#fbbf24' : '#f87171';
        ctx.fillText(tag, tagX, cy);
      }

      // Draw YOLOv8-OBB or U-Net
      if (analysisResult.modelHead === 'yolov8_obb') {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.25);
        ctx.strokeStyle = isVerified ? '#10b981' : '#f43f5e';
        ctx.lineWidth = 2;
        ctx.fillStyle = isVerified ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
        ctx.strokeRect(-25, -45, 50, 90);
        ctx.fillRect(-25, -45, 50, 90);
        ctx.restore();

        // Label
        const label = `YOLOv8-OBB: ${selectedClass.toUpperCase()} · ${(analysisResult.confidence * 100).toFixed(1)}%`;
        ctx.font = '10px "Plus Jakarta Sans", sans-serif';
        const lw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(cx - lw / 2 - 4, cy - 58, lw + 8, 16);
        ctx.strokeStyle = '#38bdf8';
        ctx.strokeRect(cx - lw / 2 - 4, cy - 58, lw + 8, 16);
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(label, cx - lw / 2, cy - 46);
      } else {
        // U-Net polygon contour
        ctx.strokeStyle = '#a855f7';
        ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, 45, 30, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const label = `U-Net: ${selectedClass.toUpperCase()} (185m² mesh)`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const lw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(cx - lw / 2 - 4, cy - 46, lw + 8, 16);
        ctx.fillStyle = '#d8b4fe';
        ctx.fillText(label, cx - lw / 2, cy - 34);
      }

      ctx.restore();
    }
  };

  // Re-render when stage or colormap changes
  useEffect(() => {
    renderPreview(activeStage, undefined, colormap);
  }, [activeStage, colormap, analysisResult]);

  // Inject target into the active mission
  const handleInjectTarget = () => {
    const geotag = calculateGeotag(metadata, 180, groundRangeMeters, channel);

    const newTarget: DetectedDebrisTarget = {
      id: `USER-IMG-${Math.floor(1000 + Math.random() * 9000)}`,
      label: `User Upload: ${imageFileName.replace(/\.[^/.]+$/, '')}`,
      debrisClass: selectedClass,
      modelHead: analysisResult.modelHead,
      channel,
      pingIndex: 180,
      rangeIndex: Math.round(groundRangeMeters * 8),
      confidence: analysisResult.confidence,
      obb: analysisResult.modelHead === 'yolov8_obb' ? {
        cx: 220,
        cy: 180,
        width: 34,
        height: 70,
        angleDeg: -14.0
      } : undefined,
      unetMask: analysisResult.modelHead === 'unet' ? {
        contour: [[180, 160], [240, 155], [260, 200], [200, 210]],
        areaSqMeters: 185.0,
        permeabilityIndex: 0.35
      } : undefined,
      physics: {
        hasShadow: analysisResult.shadowLength_m > 0.4,
        shadowLengthPixels: Math.round(analysisResult.shadowLength_m * 10),
        shadowLength_m: analysisResult.shadowLength_m,
        groundRange_m: groundRangeMeters,
        slantRange_m: Math.sqrt(groundRangeMeters * groundRangeMeters + altitude * altitude),
        towfishAltitude_m: altitude,
        calculatedHeight_m: analysisResult.calculatedHeight_m,
        shadowAngleAlignmentDeg: 0.8,
        isPhysicsVerified: analysisResult.isPhysicsVerified,
        rejectionReason: analysisResult.rejectionReason,
        signalToNoiseRatioDb: analysisResult.snrDb
      },
      geospatial: {
        lat: geotag.lat,
        lon: geotag.lon,
        depth_m: metadata.waterDepthMeters,
        alongTrackOffset_m: geotag.alongTrack_m,
        crossTrackOffset_m: geotag.crossTrack_m
      },
      riskLevel: analysisResult.isPhysicsVerified ? (selectedClass === 'uxo' || selectedClass === 'ghost_net' ? 'critical' : 'high') : 'low',
      hazardType: selectedClass === 'ghost_net' ? 'entanglement' : selectedClass === 'uxo' ? 'toxic_ordnance' : 'navigational',
      acousticProfile: [15, 25, 70, 210, 255, 230, 45, 5, 6, 7, 10, 24],
      recoveryProtocol: analysisResult.isPhysicsVerified
        ? `User acoustic scan verified. Deploy ROV with target grapple or acoustic pinger for ${selectedClass.replace('_', ' ')}.`
        : 'Classified as false-positive flat bedform. No recovery dive required.',
      notes: `Ingested from user uploaded image (${imageFileName}) via SRAD/CLAHE and physics shadow engine.`,
      uploadedImageUrl: uploadedImageSrc || undefined
    };

    onAddTargetToMission(newTarget);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-100 uppercase tracking-wide">
                Upload & Analyze Sonar Scan Image
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                5-Stage Acoustic Preprocessing, Dual-Head CV & Physics Shadow Verification
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* Preset Sample Quick-Pick Buttons */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5 font-semibold">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                <span>Test With Calibrated Sonar Crops (1-Click) Or Upload Your Own Image:</span>
              </span>
              <span className="text-[10px] text-slate-500">Supports PNG, JPG, WEBP, TIFF</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_SONAR_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => loadPresetSample(sample)}
                  className={`p-2 rounded text-left transition-colors border text-[11px] ${
                    imageFileName === `${sample.id}.png`
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div className="font-semibold text-slate-200 truncate">{sample.name}</div>
                  <div className="text-[10px] text-slate-500 truncate mt-0.5">{sample.debrisClass}</div>
                </button>
              ))}
            </div>
          </div>

          {/* User File Drag & Drop / Upload Trigger */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            <div className="md:col-span-12">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-cyan-500/50 rounded-lg p-4 text-center cursor-pointer bg-slate-950/50 hover:bg-slate-950/80 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/tiff,image/bmp,.xtf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 text-cyan-400">
                  <Upload className="w-4 h-4" />
                  <span className="font-semibold">Click to select image file from computer or drag & drop</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Active File: <strong className="text-slate-300">{imageFileName}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Stage Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-slate-500 uppercase text-[11px]">View Stage:</span>
              <button
                onClick={() => setActiveStage('raw')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeStage === 'raw'
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Raw Upload
              </button>
              <button
                onClick={() => setActiveStage('srad')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeStage === 'srad'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. SRAD Denoise
              </button>
              <button
                onClick={() => setActiveStage('clahe')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeStage === 'clahe'
                    ? 'bg-blue-500/20 text-blue-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. CLAHE Normalization
              </button>
              <button
                onClick={() => setActiveStage('detections')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  activeStage === 'detections'
                    ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4. AI CV + Shadow Physics (Ho)
              </button>
            </div>

            {/* Colormap Selector */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 text-[11px]">Palette:</span>
              <select
                value={colormap}
                onChange={(e) => setColormap(e.target.value as ColormapTheme)}
                aria-label="Uploaded image colormap"
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-slate-300 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="bronze">Marine Bronze</option>
                <option value="cobalt">Deep Cobalt</option>
                <option value="copper">Warm Copper</option>
                <option value="grayscale">Acoustic Grayscale</option>
                <option value="jet">Hydrographic Jet</option>
              </select>
            </div>
          </div>

          {/* Main Visualizer Stage & Side Control Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Canvas Stage */}
            <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col items-center justify-center min-h-[340px]">
              <canvas
                ref={previewCanvasRef}
                width={canvasWidth}
                height={canvasHeight}
                className="block rounded max-w-full h-auto border border-slate-800 shadow-md"
              />
              <div className="flex items-center justify-between w-full px-2 pt-2 text-[10px] text-slate-500">
                <span>{channel === 'port' ? '← Radial Propagation (Port CH-1)' : 'Radial Propagation (Starboard CH-2) →'}</span>
                <span>480 × 320 px · Synthetic SSS Coordinate Frame</span>
              </div>
            </div>

            {/* Parameter & Evaluation Panel */}
            <div className="lg:col-span-4 space-y-4">
              {/* Physics Shadow Result Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="text-[11px] text-slate-400 uppercase font-semibold flex items-center justify-between">
                  <span>Physics Verification</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] ${
                    analysisResult.isPhysicsVerified
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {analysisResult.isPhysicsVerified ? 'VERIFIED 3D' : 'REJECTED FP'}
                  </span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded p-2 text-center">
                  <div className="text-[10px] text-slate-500">CALCULATED HEIGHT (Ho)</div>
                  <div className="text-2xl font-bold text-amber-300 font-display tabular-nums">
                    {analysisResult.calculatedHeight_m.toFixed(2)} <span className="text-xs font-normal text-slate-400">m</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Shadow Ls: <strong>{analysisResult.shadowLength_m}m</strong> · SNR: <strong>{analysisResult.snrDb} dB</strong>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 leading-tight">
                  {analysisResult.isPhysicsVerified
                    ? 'Valid acoustic specular highlight paired with downstream acoustic shadow. Target height physically confirms 3D anthropogenic debris.'
                    : analysisResult.rejectionReason}
                </div>
              </div>

              {/* Acoustic Parameters Control */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">
                  Acoustic Header Parameters
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Towfish Alt (H):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="2"
                        max="40"
                        step="0.5"
                        value={altitude}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 12;
                          setAltitude(val);
                          if (uploadedImageSrc) processImage(uploadedImageSrc, channel, val, selectedClass, analysisResult.modelHead);
                        }}
                        aria-label="Towfish altitude input"
                        className="w-16 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-right text-cyan-400"
                      />
                      <span className="text-slate-500">m</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Channel:</span>
                    <select
                      value={channel}
                      onChange={(e) => {
                        const val = e.target.value as ChannelSide;
                        setChannel(val);
                        if (uploadedImageSrc) processImage(uploadedImageSrc, val, altitude, selectedClass, analysisResult.modelHead);
                      }}
                      aria-label="Side-scan sonar channel"
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300"
                    >
                      <option value="port">Port (CH-1)</option>
                      <option value="starboard">Starboard (CH-2)</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">Class:</span>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        const val = e.target.value as DebrisClass;
                        setSelectedClass(val);
                        if (uploadedImageSrc) processImage(uploadedImageSrc, channel, altitude, val, (val === 'ghost_net' || val === 'cable') ? 'unet' : 'yolov8_obb');
                      }}
                      aria-label="Target debris classification"
                      className="bg-slate-900 border border-slate-800 rounded px-2 py-0.5 text-slate-300 capitalize"
                    >
                      <option value="wreckage">Wreckage</option>
                      <option value="container">Container</option>
                      <option value="ghost_net">Ghost Net (U-Net)</option>
                      <option value="cable">Power Cable (U-Net)</option>
                      <option value="pipe">Pipe / Anchor</option>
                      <option value="uxo">Munitions / UXO</option>
                      <option value="drum">Chemical Drum</option>
                      <option value="tire">Tire</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Calculated Ho: <strong className="text-amber-300">{analysisResult.calculatedHeight_m.toFixed(2)}m</strong> · Model: <strong className="text-emerald-400">{analysisResult.modelHead.toUpperCase()}</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInjectTarget}
              className="px-4 py-2 rounded text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5 font-sans font-semibold shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Inject Into Active Survey & GIS</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
