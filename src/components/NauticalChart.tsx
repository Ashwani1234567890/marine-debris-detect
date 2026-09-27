import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Compass, Navigation, ZoomIn, ZoomOut, RotateCcw, MapPin, Anchor, Eye } from 'lucide-react';
import { DetectedDebrisTarget, SonarMetadata } from '../types/sonar';

interface NauticalChartProps {
  targets: DetectedDebrisTarget[];
  metadata: SonarMetadata;
  tracklinePoints: { lat: number; lon: number; depth: number }[];
  onSelectTarget: (target: DetectedDebrisTarget) => void;
  selectedTargetId?: string;
}

export const NauticalChart: React.FC<NauticalChartProps> = ({
  targets,
  metadata,
  tracklinePoints,
  onSelectTarget,
  selectedTargetId
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState<number>(1.2);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredTarget, setHoveredTarget] = useState<DetectedDebrisTarget | null>(null);
  const [mouseCoord, setMouseCoord] = useState<{ lat: number; lon: number } | null>(null);

  const canvasWidth = 720;
  const canvasHeight = 520;

  // Geographic bounds calculation
  const geoBounds = useMemo(() => {
    let minLat = metadata.startLat;
    let maxLat = metadata.startLat;
    let minLon = metadata.startLon;
    let maxLon = metadata.startLon;

    tracklinePoints.forEach((p) => {
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
      minLon = Math.min(minLon, p.lon);
      maxLon = Math.max(maxLon, p.lon);
    });

    targets.forEach((t) => {
      minLat = Math.min(minLat, t.geospatial.lat);
      maxLat = Math.max(maxLat, t.geospatial.lat);
      minLon = Math.min(minLon, t.geospatial.lon);
      maxLon = Math.max(maxLon, t.geospatial.lon);
    });

    // Add padding margin
    const latSpan = Math.max(0.005, (maxLat - minLat) * 1.4);
    const lonSpan = Math.max(0.008, (maxLon - minLon) * 1.4);

    return {
      centerLat: (minLat + maxLat) / 2,
      centerLon: (minLon + maxLon) / 2,
      latSpan,
      lonSpan
    };
  }, [metadata, tracklinePoints, targets]);

  // Convert geodetic (lat, lon) to canvas screen (x, y)
  const geoToScreen = (lat: number, lon: number): [number, number] => {
    const normX = (lon - geoBounds.centerLon) / geoBounds.lonSpan;
    const normY = (lat - geoBounds.centerLat) / geoBounds.latSpan;

    const baseCx = canvasWidth / 2;
    const baseCy = canvasHeight / 2;

    const scale = Math.min(canvasWidth, canvasHeight) * 0.8 * zoom;

    const screenX = baseCx + normX * scale + pan.x;
    const screenY = baseCy - normY * scale + pan.y; // Invert Y for latitude

    return [screenX, screenY];
  };

  // Convert canvas screen (x, y) to geodetic (lat, lon)
  const screenToGeo = (screenX: number, screenY: number): { lat: number; lon: number } => {
    const baseCx = canvasWidth / 2;
    const baseCy = canvasHeight / 2;
    const scale = Math.min(canvasWidth, canvasHeight) * 0.8 * zoom;

    const normX = (screenX - baseCx - pan.x) / scale;
    const normY = -(screenY - baseCy - pan.y) / scale;

    const lon = geoBounds.centerLon + normX * geoBounds.lonSpan;
    const lat = geoBounds.centerLat + normY * geoBounds.latSpan;

    return { lat, lon };
  };

  // Render chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Draw Deep Water Bathymetric Canvas
    const bgGradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
    bgGradient.addColorStop(0, '#061325');
    bgGradient.addColorStop(0.5, '#081a33');
    bgGradient.addColorStop(1, '#050f1d');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // 2. Bathymetric Depth Contours (Isobars)
    ctx.save();
    const depthLevels = [
      { depth: metadata.waterDepthMeters - 4, label: `-${(metadata.waterDepthMeters - 4).toFixed(0)}m` },
      { depth: metadata.waterDepthMeters, label: `-${metadata.waterDepthMeters.toFixed(0)}m` },
      { depth: metadata.waterDepthMeters + 4, label: `-${(metadata.waterDepthMeters + 4).toFixed(0)}m` }
    ];

    depthLevels.forEach((dl, i) => {
      ctx.strokeStyle = i === 1 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = i === 1 ? 1.5 : 1;
      ctx.setLineDash(i === 1 ? [] : [4, 6]);

      ctx.beginPath();
      // Curved bathymetric contour
      const yBase = canvasHeight * 0.25 + i * 110 + pan.y * 0.5;
      ctx.moveTo(0, yBase);
      ctx.bezierCurveTo(
        canvasWidth * 0.33,
        yBase - 30 * zoom,
        canvasWidth * 0.66,
        yBase + 40 * zoom,
        canvasWidth,
        yBase - 15 * zoom
      );
      ctx.stroke();

      ctx.fillStyle = 'rgba(56, 189, 248, 0.4)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`CONTOUR ${dl.label}`, 24, yBase - 6);
    });
    ctx.restore();

    // 3. Acoustic Swath Footprint Corridor (150m swath polygon)
    if (tracklinePoints.length >= 2) {
      ctx.save();
      ctx.beginPath();
      const swathWidthMeters = metadata.maxRangeMeters * 2;
      const headingRad = (metadata.baseHeadingDeg * Math.PI) / 180;
      const normalRad = headingRad + Math.PI / 2;

      // Calculate swath boundary points
      const leftBoundary: [number, number][] = [];
      const rightBoundary: [number, number][] = [];

      tracklinePoints.forEach((p) => {
        const [scX, scY] = geoToScreen(p.lat, p.lon);
        const swathOffsetPx = 42 * zoom; // Visual swath corridor

        leftBoundary.push([
          scX + Math.cos(normalRad) * swathOffsetPx,
          scY + Math.sin(normalRad) * swathOffsetPx
        ]);
        rightBoundary.push([
          scX - Math.cos(normalRad) * swathOffsetPx,
          scY - Math.sin(normalRad) * swathOffsetPx
        ]);
      });

      // Construct polygon
      if (leftBoundary.length > 0) {
        ctx.moveTo(leftBoundary[0][0], leftBoundary[0][1]);
        for (let i = 1; i < leftBoundary.length; i++) {
          ctx.lineTo(leftBoundary[i][0], leftBoundary[i][1]);
        }
        for (let i = rightBoundary.length - 1; i >= 0; i--) {
          ctx.lineTo(rightBoundary[i][0], rightBoundary[i][1]);
        }
        ctx.closePath();

        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 4. AUV Survey Trackline & Heading Vector
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    ctx.beginPath();
    tracklinePoints.forEach((p, idx) => {
      const [sx, sy] = geoToScreen(p.lat, p.lon);
      if (idx === 0) ctx.moveTo(sx, sy);
      else ctx.lineTo(sx, sy);
    });
    ctx.stroke();

    // Trackline nodes
    tracklinePoints.forEach((p, idx) => {
      const [sx, sy] = geoToScreen(p.lat, p.lon);
      ctx.fillStyle = idx === 0 ? '#10b981' : '#38bdf8';
      ctx.beginPath();
      ctx.arc(sx, sy, 3, 0, Math.PI * 2);
      ctx.fill();

      // Heading arrow at final node (Active AUV Location)
      if (idx === tracklinePoints.length - 1) {
        const headingRad = (metadata.baseHeadingDeg * Math.PI) / 180;
        const arrowLen = 24 * zoom;
        const headX = sx + Math.sin(headingRad) * arrowLen;
        const headY = sy - Math.cos(headingRad) * arrowLen;

        ctx.strokeStyle = '#f59e0b';
        ctx.fillStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(headX, headY);
        ctx.stroke();

        // Arrowhead
        ctx.beginPath();
        ctx.arc(headX, headY, 4, 0, Math.PI * 2);
        ctx.fill();

        // AUV Label
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#fbbf24';
        ctx.fillText(`AUV (${metadata.surveySpeedKnots} kn · ${metadata.baseHeadingDeg}°)`, sx + 8, sy - 8);
      }
    });
    ctx.restore();

    // 5. Debris Target Waypoints
    targets.forEach((t) => {
      const [sx, sy] = geoToScreen(t.geospatial.lat, t.geospatial.lon);
      const isSelected = selectedTargetId === t.id;
      const isVerified = t.physics.isPhysicsVerified;

      ctx.save();

      // Halo for selected target
      if (isSelected) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 14, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Marker Icon Circle
      let markerColor = '#10b981';
      if (!isVerified) markerColor = '#64748b'; // Gray for rejected false positive
      else if (t.riskLevel === 'critical') markerColor = '#ef4444';
      else if (t.riskLevel === 'high') markerColor = '#f59e0b';
      else if (t.riskLevel === 'moderate') markerColor = '#eab308';

      ctx.fillStyle = markerColor;
      ctx.beginPath();
      ctx.arc(sx, sy, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Pin Label
      ctx.font = '10px "Plus Jakarta Sans", sans-serif';
      const label = `${t.id}`;
      const lw = ctx.measureText(label).width;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(sx + 8, sy - 9, lw + 6, 14);
      ctx.fillStyle = isSelected ? '#38bdf8' : isVerified ? '#f1f5f9' : '#94a3b8';
      ctx.fillText(label, sx + 11, sy + 2);

      ctx.restore();
    });

    // 6. Nautical Compass Rose (top-right corner)
    ctx.save();
    const compassX = canvasWidth - 48;
    const compassY = 48;
    const compassRadius = 22;

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(compassX, compassY, compassRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // North Pointer
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - compassRadius + 4);
    ctx.lineTo(compassX - 4, compassY);
    ctx.lineTo(compassX + 4, compassY);
    ctx.closePath();
    ctx.fill();

    // South Pointer
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(compassX, compassY + compassRadius - 4);
    ctx.lineTo(compassX - 4, compassY);
    ctx.lineTo(compassX + 4, compassY);
    ctx.closePath();
    ctx.fill();

    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('N', compassX - 3.5, compassY - compassRadius + 2);
    ctx.restore();

    // 7. Nautical Distance Scale Bar (bottom-left corner)
    ctx.save();
    const scaleBarX = 24;
    const scaleBarY = canvasHeight - 24;
    const scaleBarPx = 80;
    const scaleMeters = 50 * zoom;

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(scaleBarX, scaleBarY);
    ctx.lineTo(scaleBarX + scaleBarPx, scaleBarY);
    ctx.moveTo(scaleBarX, scaleBarY - 4);
    ctx.lineTo(scaleBarX, scaleBarY + 4);
    ctx.moveTo(scaleBarX + scaleBarPx, scaleBarY - 4);
    ctx.lineTo(scaleBarX + scaleBarPx, scaleBarY + 4);
    ctx.stroke();

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(`${scaleMeters.toFixed(0)} m (WGS84 Scale)`, scaleBarX, scaleBarY - 8);
    ctx.restore();
  }, [targets, metadata, tracklinePoints, zoom, pan, selectedTargetId]);

  // Handle Drag & Pan
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenX = ((e.clientX - rect.left) / rect.width) * canvasWidth;
    const screenY = ((e.clientY - rect.top) / rect.height) * canvasHeight;

    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    // Update mouse geodetic coordinate HUD
    const geo = screenToGeo(screenX, screenY);
    setMouseCoord(geo);

    // Hit test target markers
    const hit = targets.find((t) => {
      const [sx, sy] = geoToScreen(t.geospatial.lat, t.geospatial.lon);
      const d = Math.sqrt(Math.pow(screenX - sx, 2) + Math.pow(screenY - sy, 2));
      return d < 14;
    });

    setHoveredTarget(hit || null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredTarget) {
      onSelectTarget(hoveredTarget);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-950 select-none overflow-hidden">
      {/* Top Chart Toolbar */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-3">
          <Navigation className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 font-semibold uppercase">
            WGS84 GIS BATHYMETRIC CHART
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">
            {metadata.locationName}
          </span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-slate-400 tabular-nums font-mono text-[11px]">
            {(zoom * 100).toFixed(0)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, z + 0.2))}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              setZoom(1.2);
              setPan({ x: 0, y: 0 });
            }}
            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 ml-1"
            title="Recenter trackline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Chart Canvas Stage */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-4 bg-radar-grid">
        <div className="relative border border-slate-800 rounded shadow-2xl">
          <canvas
            ref={canvasRef}
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDragging(false);
              setHoveredTarget(null);
              setMouseCoord(null);
            }}
            onClick={handleClick}
            className="cursor-grab active:cursor-grabbing block rounded"
          />

          {/* Hover popup for debris pin */}
          {hoveredTarget && (
            <div className="absolute pointer-events-none z-20 bg-slate-900/95 border border-cyan-500/50 rounded p-2.5 text-xs font-mono text-slate-200 shadow-xl backdrop-blur-md -translate-y-full -translate-x-1/2 top-1/2 left-1/2">
              <div className="flex items-center justify-between gap-3 font-bold text-cyan-300">
                <span>{hoveredTarget.label}</span>
                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {hoveredTarget.debrisClass}
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                <div>WGS84: {hoveredTarget.geospatial.lat.toFixed(6)}° N, {hoveredTarget.geospatial.lon.toFixed(6)}° E</div>
                <div>Status: <span className={hoveredTarget.physics.isPhysicsVerified ? 'text-emerald-400 font-semibold' : 'text-rose-400'}>
                  {hoveredTarget.physics.isPhysicsVerified ? 'VERIFIED 3D DEBRIS' : 'REJECTED NATURAL BEDFORM'}
                </span></div>
                <div>Calc Height (Ho): <span className="text-amber-300 font-bold">{hoveredTarget.physics.calculatedHeight_m} m</span></div>
                <div>Risk Rating: <span className="uppercase font-semibold">{hoveredTarget.riskLevel}</span> ({hoveredTarget.hazardType})</div>
              </div>
              <div className="text-[10px] text-cyan-400 mt-1 italic">Click pin to inspect physics analysis</div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Bottom Coordinates HUD */}
      <div className="bg-slate-950/90 border-t border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Compass className="w-3.5 h-3.5 text-cyan-400" />
            <span>CURSOR WGS84:</span>
            <span className="text-cyan-300 font-semibold tabular-nums">
              {mouseCoord ? `${mouseCoord.lat.toFixed(6)}°N, ${mouseCoord.lon.toFixed(6)}°E` : 'HOVER TO PROBE'}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span>HEADING:</span>
            <span className="text-slate-200 font-semibold tabular-nums">
              {metadata.baseHeadingDeg.toFixed(1)}° TRUE
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>SPEED:</span>
            <span className="text-slate-200 font-semibold tabular-nums">
              {metadata.surveySpeedKnots} KTS
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>SWATH COVERAGE: 150m CORRIDOR</span>
          </div>
        </div>
      </div>
    </div>
  );
};
