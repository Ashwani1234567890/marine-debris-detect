import React from 'react';
import { X, ShieldCheck, AlertOctagon, CheckCircle2, Navigation, Anchor, Waves, ArrowRight, Image as ImageIcon } from 'lucide-react';
import { DetectedDebrisTarget, SonarMetadata } from '../types/sonar';

interface InspectorModalProps {
  target: DetectedDebrisTarget | null;
  metadata: SonarMetadata;
  onClose: () => void;
}

export const InspectorModal: React.FC<InspectorModalProps> = ({
  target,
  metadata,
  onClose
}) => {
  if (!target) return null;

  const isVerified = target.physics.isPhysicsVerified;
  const p = target.physics;

  // Generate SVG points for the A-scan acoustic cross-section profile
  const svgWidth = 420;
  const svgHeight = 120;
  const profile = target.acousticProfile;
  const maxVal = Math.max(...profile, 255);
  const minVal = 0;

  const pointsString = profile
    .map((val, idx) => {
      const x = (idx / (profile.length - 1)) * svgWidth;
      const y = svgHeight - (val / maxVal) * (svgHeight - 20) - 10;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded flex items-center justify-center ${
              isVerified ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
            }`}>
              {isVerified ? <ShieldCheck className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-display font-bold text-slate-100 uppercase tracking-wide">
                  {target.label}
                </h2>
                <span className="text-xs font-mono text-cyan-400">[{target.id}]</span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {target.channel.toUpperCase()} CHANNEL · PING #{target.pingIndex} · RANGE {target.physics.groundRange_m}m
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
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Optional Uploaded Sonar Scan Preview */}
          {target.uploadedImageUrl && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>User Ingested Sonar Scan Image</span>
              </div>
              <div className="relative rounded overflow-hidden border border-slate-800 bg-black flex items-center justify-center max-h-48">
                <img
                  src={target.uploadedImageUrl}
                  alt={target.label}
                  className="max-h-48 object-contain rounded"
                />
              </div>
            </div>
          )}

          {/* Section 1: Physics-Based Shadow Verification Engine */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5" />
                <span>3. Physics-Based Shadow Verification Engine</span>
              </span>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded border ${
                isVerified 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {isVerified ? 'PHYSICS VERIFIED DEBRIS' : 'REJECTED: NATURAL SEDIMENT'}
              </span>
            </div>

            {/* Formula Presentation */}
            <div className="bg-slate-900 border border-slate-800 rounded p-3 text-xs font-mono space-y-2">
              <div className="text-slate-400 flex items-center justify-between flex-wrap gap-2">
                <span className="text-cyan-300 font-semibold">ACOUSTIC GEOMETRY EQUATION:</span>
                <span className="bg-slate-950 px-2 py-1 rounded text-amber-300 font-bold">
                  Ho = (H · Ls) / (Rg + Ls)
                </span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800 text-[11px]">
                <div>
                  <div className="text-slate-500">Towfish Alt (H)</div>
                  <div className="text-slate-200 font-semibold tabular-nums">{p.towfishAltitude_m} m</div>
                </div>
                <div>
                  <div className="text-slate-500">Shadow Length (Ls)</div>
                  <div className="text-slate-200 font-semibold tabular-nums">{p.shadowLength_m} m</div>
                </div>
                <div>
                  <div className="text-slate-500">Ground Range (Rg)</div>
                  <div className="text-slate-200 font-semibold tabular-nums">{p.groundRange_m} m</div>
                </div>
                <div>
                  <div className="text-amber-400 font-bold">Calc Height (Ho)</div>
                  <div className="text-amber-300 font-bold text-sm tabular-nums">{p.calculatedHeight_m} m</div>
                </div>
              </div>

              {/* Substitution Math Line */}
              <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                <span>Calculation: </span>
                <span className="text-slate-300">
                  Ho = ({p.towfishAltitude_m} · {p.shadowLength_m}) / ({p.groundRange_m} + {p.shadowLength_m}) = {p.calculatedHeight_m} m
                </span>
              </div>
            </div>

            {/* Verification status explanation */}
            <div className="text-xs space-y-1">
              {isVerified ? (
                <div className="flex items-start gap-2 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    Valid acoustic target/shadow pair detected. The object casts an acoustic shadow of {p.shadowLength_m}m extending precisely away from the nadir beam (angular alignment error {p.shadowAngleAlignmentDeg.toFixed(1)}°). Contrast SNR is {p.signalToNoiseRatioDb.toFixed(1)} dB.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-rose-400">
                  <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    {p.rejectionReason || 'Target rejected due to missing or misaligned acoustic shadow.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Acoustic A-Scan Reflectivity Cross-Section Graph */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-semibold">
                ACOUSTIC A-SCAN CROSS-SECTION (REFLECTIVITY vs RANGE)
              </span>
              <span className="text-slate-500">
                Specular Peak: {Math.max(...profile)} · Shadow Trough: {Math.min(...profile)}
              </span>
            </div>

            <div className="relative bg-slate-900 border border-slate-800 rounded p-2 overflow-hidden">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-28 overflow-visible">
                {/* Baseline grid */}
                <line x1="0" y1="20" x2={svgWidth} y2="20" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2={svgWidth} y2="60" stroke="#1e293b" strokeDasharray="3 3" />
                <line x1="0" y1="100" x2={svgWidth} y2="100" stroke="#1e293b" strokeDasharray="3 3" />

                {/* Highlight band label */}
                <rect x="70" y="5" width="80" height="110" fill="rgba(56, 189, 248, 0.05)" />
                <rect x="150" y="5" width="120" height="110" fill="rgba(0, 0, 0, 0.4)" />

                {/* A-scan curve */}
                <polyline
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsString}
                />

                {/* Annotation labels */}
                <text x="75" y="16" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">
                  SPECULAR ECHO
                </text>
                <text x="155" y="16" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">
                  ACOUSTIC SHADOW
                </text>
              </svg>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>← Nadir (Near-Range)</span>
              <span>Across-Track Propagation</span>
              <span>Far-Range Seabed →</span>
            </div>
          </div>

          {/* Section 3: Dual-Head CV Inference & Geospatial Coordinates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CV Model Telemetry */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono">
              <div className="text-slate-400 font-semibold uppercase text-[11px]">
                2. Dual-Head CV Inference
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Inference Head:</span>
                  <span className="text-emerald-400 font-semibold">{target.modelHead.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Classification:</span>
                  <span className="text-slate-200 capitalize">{target.debrisClass.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Confidence:</span>
                  <span className="text-cyan-400 font-semibold">{(target.confidence * 100).toFixed(1)}%</span>
                </div>
                {target.obb && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Orientation Angle (θ):</span>
                    <span className="text-slate-200">{target.obb.angleDeg.toFixed(1)}°</span>
                  </div>
                )}
                {target.unetMask && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Segmented Area:</span>
                    <span className="text-purple-300 font-semibold">{target.unetMask.areaSqMeters.toFixed(1)} m²</span>
                  </div>
                )}
              </div>
            </div>

            {/* Geotag Coordinates */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2 text-xs font-mono">
              <div className="text-slate-400 font-semibold uppercase text-[11px] flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                <span>4. WGS84 Geotag</span>
              </div>
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latitude:</span>
                  <span className="text-slate-200 tabular-nums">{target.geospatial.lat.toFixed(6)}° N</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Longitude:</span>
                  <span className="text-slate-200 tabular-nums">{target.geospatial.lon.toFixed(6)}° E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Seabed Depth:</span>
                  <span className="text-slate-200 tabular-nums">{target.geospatial.depth_m.toFixed(1)} m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Across-Track Offset:</span>
                  <span className="text-slate-200 tabular-nums">{target.geospatial.crossTrackOffset_m.toFixed(1)} m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Offshore Cleanup & Recovery Directive */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber-400 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Anchor className="w-3.5 h-3.5" />
                <span>Offshore Cleanup Team Action Protocol</span>
              </span>
              <span className="text-slate-400 uppercase text-[11px]">
                Risk: <strong className="text-rose-400">{target.riskLevel}</strong>
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {target.recoveryProtocol}
            </p>
            <div className="text-[11px] text-slate-400 italic pt-1">
              Acoustic analyst notes: {target.notes}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition-colors"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
