import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Crosshair, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, ShieldCheck, Info } from 'lucide-react';
import { DetectedDebrisTarget, FilterState, SonarMetadata } from '../types/sonar';
import { getColormapRgb, applySradFilter, applyClaheFilter } from '../utils/sonarProcessing';

interface WaterfallViewerProps {
  targets: DetectedDebrisTarget[];
  metadata: SonarMetadata;
  filter: FilterState;
  onSelectTarget: (target: DetectedDebrisTarget) => void;
  selectedTargetId?: string;
  pingOffset: number;
}

export const WaterfallViewer: React.FC<WaterfallViewerProps> = ({
  targets,
  metadata,
  filter,
  onSelectTarget,
  selectedTargetId,
  pingOffset
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [zoom, setZoom] = useState<number>(1);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredTarget, setHoveredTarget] = useState<DetectedDebrisTarget | null>(null);

  const canvasWidth = 720;
  const canvasHeight = 520;
  const nadirWidth = 48; // Center nadir water column blind zone
  const channelWidth = (canvasWidth - nadirWidth) / 2;

  // Filter targets based on user settings
  const visibleTargets = useMemo(() => {
    return targets.filter((t) => {
      if (t.confidence < filter.minConfidence) return false;
      if (!filter.selectedClasses.has(t.debrisClass)) return false;
      if (filter.filterPhysicsVerifiedOnly && !t.physics.isPhysicsVerified) return false;
      return true;
    });
  }, [targets, filter]);

  // Generate base acoustic texture once or on mission/filter changes
  const baseAcousticBuffer = useMemo(() => {
    const size = canvasWidth * canvasHeight;
    const raw = new Uint8ClampedArray(size);

    // Deterministic pseudo-random seed generator
    let seed = 42;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const nadirLeft = channelWidth;
    const nadirRight = channelWidth + nadirWidth;

    for (let y = 0; y < canvasHeight; y++) {
      const rowOffset = y * canvasWidth;
      const ripplePhase = Math.sin(y * 0.08) * 4;

      for (let x = 0; x < canvasWidth; x++) {
        const idx = rowOffset + x;

        // 1. Nadir column: Low acoustic backscatter through water column
        if (x >= nadirLeft && x <= nadirRight) {
          const distToBottomBounce = Math.min(x - nadirLeft, nadirRight - x);
          if (distToBottomBounce < 4) {
            // First seabed acoustic bottom bounce echo (high intensity)
            raw[idx] = Math.min(255, 140 + Math.round(rand() * 40));
          } else {
            // Water column clearance (dark)
            raw[idx] = Math.round(rand() * 15);
          }
          continue;
        }

        // 2. Cross-track range attenuation: High near nadir bounce, decaying toward outer margins
        const distFromNadir = x < nadirLeft ? (nadirLeft - x) : (x - nadirRight);
        const normDist = distFromNadir / channelWidth;
        const tvgCompensation = 1.0 - normDist * 0.45; // Simulated Time Varied Gain (TVG)

        // 3. Seabed sand ripples & sediment speckle
        const sedimentNoise = (rand() - 0.5) * 45;
        const ripple = Math.sin((x + ripplePhase) * 0.22) * 16;
        const baseIntensity = Math.max(10, Math.min(220, 85 * tvgCompensation + ripple + sedimentNoise));

        raw[idx] = Math.round(baseIntensity);
      }
    }

    // Embed acoustic target highlights and cast acoustic shadows
    for (const t of targets) {
      const cx = t.channel === 'port' ? channelWidth - t.rangeIndex * 0.8 : channelWidth + nadirWidth + t.rangeIndex * 0.8;
      const cy = (t.pingIndex + pingOffset) % canvasHeight;
      const shadowDirection = t.channel === 'port' ? -1 : 1;
      const shadowLen = Math.min(120, t.physics.shadowLengthPixels * 1.4);

      // Specular highlight
      const rH = t.modelHead === 'unet' ? 24 : 14;
      for (let dy = -rH; dy <= rH; dy++) {
        for (let dx = -rH; dx <= rH; dx++) {
          const px = Math.round(cx + dx);
          const py = Math.round(cy + dy);
          if (px >= 0 && px < canvasWidth && py >= 0 && py < canvasHeight) {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < rH) {
              const boost = Math.round(180 * (1 - d / rH));
              const idx = py * canvasWidth + px;
              raw[idx] = Math.min(255, raw[idx] + boost);
            }
          }
        }
      }

      // Cast acoustic shadow away from nadir
      if (t.physics.hasShadow) {
        for (let s = 4; s < shadowLen; s++) {
          const shadowX = Math.round(cx + s * shadowDirection);
          for (let dy = -Math.round(rH * 0.9); dy <= Math.round(rH * 0.9); dy++) {
            const shadowY = Math.round(cy + dy);
            if (shadowX >= 0 && shadowX < canvasWidth && shadowY >= 0 && shadowY < canvasHeight) {
              const idx = shadowY * canvasWidth + shadowX;
              // True acoustic shadow is devoid of return
              raw[idx] = Math.round(raw[idx] * 0.08);
            }
          }
        }
      }
    }

    return raw;
  }, [targets, pingOffset]);

  // Apply real-time SRAD & CLAHE processing pipeline
  const processedBuffer = useMemo(() => {
    let buf: Uint8ClampedArray<any> = baseAcousticBuffer;

    if (filter.showSrad) {
      buf = applySradFilter(buf, canvasWidth, canvasHeight, filter.sradIterations, filter.sradDiffusionRate);
    }

    if (filter.showClahe) {
      buf = applyClaheFilter(buf, canvasWidth, canvasHeight, filter.claheClipLimit, 8, 8);
    }

    return buf;
  }, [baseAcousticBuffer, filter.showSrad, filter.showClahe, filter.sradIterations, filter.sradDiffusionRate, filter.claheClipLimit]);

  // Paint the canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Acoustic Pixels via ImageData
    const imgData = ctx.createImageData(canvasWidth, canvasHeight);
    const data = imgData.data;

    for (let i = 0; i < canvasWidth * canvasHeight; i++) {
      const val = processedBuffer[i];
      const [r, g, b] = getColormapRgb(filter.colormap, val);
      const p = i * 4;
      data[p] = r;
      data[p + 1] = g;
      data[p + 2] = b;
      data[p + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Render Nadir Trackline & Channel Divider
    ctx.save();
    const nadirCenter = canvasWidth / 2;
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(nadirCenter, 0);
    ctx.lineTo(nadirCenter, canvasHeight);
    ctx.stroke();

    // Range scale lines (every 25m ground range)
    const rangeStepPx = (channelWidth / metadata.maxRangeMeters) * 25;
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.7)';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.setLineDash([2, 4]);

    for (let r = 1; r <= 3; r++) {
      const distM = r * 25;
      const leftX = channelWidth - r * rangeStepPx;
      const rightX = channelWidth + nadirWidth + r * rangeStepPx;

      if (leftX > 0) {
        ctx.beginPath();
        ctx.moveTo(leftX, 0);
        ctx.lineTo(leftX, canvasHeight);
        ctx.stroke();
        ctx.fillText(`-${distM}m`, leftX + 3, 14);
      }
      if (rightX < canvasWidth) {
        ctx.beginPath();
        ctx.moveTo(rightX, 0);
        ctx.lineTo(rightX, canvasHeight);
        ctx.stroke();
        ctx.fillText(`+${distM}m`, rightX + 3, 14);
      }
    }
    ctx.restore();

    // 3. Render AI Detections & Physics Vectors
    visibleTargets.forEach((t) => {
      const cx = t.channel === 'port' ? channelWidth - t.rangeIndex * 0.8 : channelWidth + nadirWidth + t.rangeIndex * 0.8;
      const cy = (t.pingIndex + pingOffset) % canvasHeight;
      const isSelected = selectedTargetId === t.id;
      const shadowDir = t.channel === 'port' ? -1 : 1;
      const shadowLen = Math.min(120, t.physics.shadowLengthPixels * 1.4);

      ctx.save();

      // Layer 5: Physics Shadow Vector Rayline
      if (filter.showShadowPhysics && t.physics.hasShadow) {
        ctx.strokeStyle = t.physics.isPhysicsVerified ? '#f59e0b' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + shadowLen * shadowDir, cy);
        ctx.stroke();

        // Arrow head at shadow termination
        ctx.fillStyle = t.physics.isPhysicsVerified ? '#f59e0b' : '#ef4444';
        ctx.beginPath();
        ctx.arc(cx + shadowLen * shadowDir, cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Physics Height Tag
        ctx.setLineDash([]);
        ctx.font = '10px "JetBrains Mono", monospace';
        const heightText = `Ho=${t.physics.calculatedHeight_m.toFixed(2)}m (Ls=${t.physics.shadowLength_m.toFixed(1)}m)`;
        const textWidth = ctx.measureText(heightText).width;
        const textX = shadowDir === 1 ? cx + 15 : cx - textWidth - 15;
        const textY = cy - 8;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(textX - 3, textY - 10, textWidth + 6, 14);
        ctx.fillStyle = t.physics.isPhysicsVerified ? '#fbbf24' : '#f87171';
        ctx.fillText(heightText, textX, textY);
      }

      // Layer 3: YOLOv8-OBB (Oriented Bounding Box)
      if (filter.showYoloObb && t.modelHead === 'yolov8_obb' && t.obb) {
        ctx.translate(cx, cy);
        ctx.rotate((t.obb.angleDeg * Math.PI) / 180);

        ctx.strokeStyle = isSelected ? '#38bdf8' : t.physics.isPhysicsVerified ? '#10b981' : '#f43f5e';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.1)';

        const halfW = t.obb.width / 2;
        const halfH = t.obb.height / 2;

        ctx.strokeRect(-halfW, -halfH, t.obb.width, t.obb.height);
        ctx.fillRect(-halfW, -halfH, t.obb.width, t.obb.height);

        // Heading tick mark on oriented box
        ctx.beginPath();
        ctx.moveTo(0, -halfH);
        ctx.lineTo(0, -halfH - 6);
        ctx.stroke();

        ctx.rotate((-t.obb.angleDeg * Math.PI) / 180);
        ctx.translate(-cx, -cy);

        // Label box
        const label = `${t.label.slice(0, 18)} · ${(t.confidence * 100).toFixed(0)}%`;
        ctx.font = '10px "Plus Jakarta Sans", sans-serif';
        const lw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(cx - lw / 2 - 4, cy - 28, lw + 8, 16);
        ctx.strokeStyle = isSelected ? '#38bdf8' : '#334155';
        ctx.strokeRect(cx - lw / 2 - 4, cy - 28, lw + 8, 16);
        ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';
        ctx.fillText(label, cx - lw / 2, cy - 16);
      }

      // Layer 4: U-Net Segmentation Mask
      if (filter.showUnet && t.modelHead === 'unet' && t.unetMask) {
        ctx.strokeStyle = isSelected ? '#c084fc' : '#a855f7';
        ctx.fillStyle = isSelected ? 'rgba(192, 132, 252, 0.25)' : 'rgba(168, 85, 247, 0.15)';
        ctx.lineWidth = isSelected ? 2 : 1.5;

        ctx.beginPath();
        const pts = t.unetMask.contour;
        // Center offset relative to cx, cy
        const centerRef = pts[0];
        pts.forEach(([px, py], idx) => {
          const drawX = cx + (px - centerRef[0]);
          const drawY = cy + (py - centerRef[1]);
          if (idx === 0) ctx.moveTo(drawX, drawY);
          else ctx.lineTo(drawX, drawY);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Area badge
        const areaLabel = `U-Net: ${t.unetMask.areaSqMeters.toFixed(0)}m² mesh`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const aw = ctx.measureText(areaLabel).width;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(cx - aw / 2 - 4, cy - 24, aw + 8, 15);
        ctx.fillStyle = '#d8b4fe';
        ctx.fillText(areaLabel, cx - aw / 2, cy - 13);
      }

      ctx.restore();
    });
  }, [processedBuffer, visibleTargets, filter, selectedTargetId, pingOffset, metadata]);

  // Handle canvas mouse move for interactive coordinate HUD
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const y = ((e.clientY - rect.top) / rect.height) * canvasHeight;
    setCrosshairPos({ x, y });

    // Check hit test for target hover
    const hit = visibleTargets.find((t) => {
      const cx = t.channel === 'port' ? channelWidth - t.rangeIndex * 0.8 : channelWidth + nadirWidth + t.rangeIndex * 0.8;
      const cy = (t.pingIndex + pingOffset) % canvasHeight;
      const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
      return dist < 32;
    });

    setHoveredTarget(hit || null);
  };

  // Handle canvas click to select target
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredTarget) {
      onSelectTarget(hoveredTarget);
    }
  };

  // Compute live crosshair acoustic coordinates
  const crosshairTelemetry = useMemo(() => {
    if (!crosshairPos) return null;
    const isPort = crosshairPos.x < channelWidth;
    const isStarboard = crosshairPos.x > channelWidth + nadirWidth;
    const channel = isPort ? 'PORT' : isStarboard ? 'STARBOARD' : 'NADIR (BLIND ZONE)';

    let groundRange_m = 0;
    if (isPort) {
      groundRange_m = ((channelWidth - crosshairPos.x) / channelWidth) * metadata.maxRangeMeters;
    } else if (isStarboard) {
      groundRange_m = ((crosshairPos.x - (channelWidth + nadirWidth)) / channelWidth) * metadata.maxRangeMeters;
    }

    const altitude = metadata.towfishAltitudeMeters;
    const slantRange_m = Math.sqrt(groundRange_m * groundRange_m + altitude * altitude);
    const pingIdx = Math.round(crosshairPos.y);

    return {
      channel,
      groundRange_m: groundRange_m.toFixed(1),
      slantRange_m: slantRange_m.toFixed(1),
      pingIdx
    };
  }, [crosshairPos, metadata, channelWidth, nadirWidth]);

  return (
    <div className="relative flex flex-col h-full bg-slate-950 select-none overflow-hidden">
      {/* Top Waterfall Header & Channel Labels */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-6">
          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>PORT CHANNEL (CH-1)</span>
          </span>
          <span className="text-slate-500 font-normal">NADIR SWATH</span>
          <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
            <span>STARBOARD CHANNEL (CH-2)</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          </span>
        </div>

        {/* Viewport Zoom & Reset Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.75, z - 0.25))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-400 tabular-nums font-mono text-[11px]">
            {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(2.0, z + 0.25))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
            title="Reset zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Canvas Stage */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto flex items-center justify-center p-4 bg-radar-grid"
      >
        <div
          className="relative border border-slate-800 rounded shadow-2xl transition-transform duration-100 ease-out"
          style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
        >
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => {
              setCrosshairPos(null);
              setHoveredTarget(null);
            }}
            onClick={handleCanvasClick}
            className="cursor-crosshair block rounded bg-black"
          />

          {/* Hover tooltip for candidate debris */}
          {hoveredTarget && crosshairPos && (
            <div
              className="absolute pointer-events-none z-20 bg-slate-900/95 border border-cyan-500/40 rounded p-2 text-xs font-mono text-slate-200 shadow-xl backdrop-blur-sm -translate-y-full -translate-x-1/2"
              style={{
                left: crosshairPos.x,
                top: crosshairPos.y - 10
              }}
            >
              <div className="flex items-center gap-1.5 font-bold text-cyan-300">
                <span>{hoveredTarget.label}</span>
                <span className="text-slate-400 font-normal">[{hoveredTarget.id}]</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 space-y-0.5">
                <div>Model: <span className="text-emerald-400">{hoveredTarget.modelHead.toUpperCase()}</span> ({(hoveredTarget.confidence * 100).toFixed(1)}%)</div>
                <div>Status: <span className={hoveredTarget.physics.isPhysicsVerified ? 'text-emerald-400' : 'text-rose-400'}>
                  {hoveredTarget.physics.isPhysicsVerified ? 'Physics Verified Anthropogenic Debris' : 'Rejected False Positive'}
                </span></div>
                <div>Est. Height (Ho): <span className="text-amber-300 font-semibold">{hoveredTarget.physics.calculatedHeight_m} m</span></div>
                <div>Shadow (Ls): {hoveredTarget.physics.shadowLength_m} m · Range: {hoveredTarget.physics.groundRange_m} m</div>
              </div>
              <div className="text-[10px] text-cyan-400 mt-1 italic">Click to inspect acoustic physics profile</div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Acoustic HUD Ribbon */}
      <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            <span>CROSSHAIR:</span>
            <span className="text-cyan-300 font-semibold">
              {crosshairTelemetry ? crosshairTelemetry.channel : 'SCANNING'}
            </span>
          </div>

          {crosshairTelemetry && (
            <>
              <div>
                <span>GROUND RANGE (Rg): </span>
                <span className="text-slate-200 font-semibold tabular-nums">
                  {crosshairTelemetry.groundRange_m} m
                </span>
              </div>
              <div>
                <span>SLANT RANGE (Rs): </span>
                <span className="text-slate-200 font-semibold tabular-nums">
                  {crosshairTelemetry.slantRange_m} m
                </span>
              </div>
              <div>
                <span>PING INDEX: </span>
                <span className="text-slate-200 font-semibold tabular-nums">
                  #{crosshairTelemetry.pingIdx}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">ALTITUDE (H):</span>
            <span className="text-slate-200 font-semibold tabular-nums">
              {metadata.towfishAltitudeMeters.toFixed(1)} m
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">MAX SWATH:</span>
            <span className="text-slate-200 font-semibold tabular-nums">
              {(metadata.maxRangeMeters * 2).toFixed(0)} m
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
