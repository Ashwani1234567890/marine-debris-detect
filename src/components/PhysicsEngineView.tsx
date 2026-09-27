import React, { useState } from 'react';
import { ShieldCheck, AlertOctagon, HelpCircle, ArrowRight, Waves } from 'lucide-react';
import { calculateObjectHeight } from '../utils/physicsShadow';

export const PhysicsEngineView: React.FC = () => {
  const [alt, setAlt] = useState<number>(12.0);
  const [shadowLen, setShadowLen] = useState<number>(5.4);
  const [groundRange, setGroundRange] = useState<number>(24.0);
  const [angleError, setAngleError] = useState<number>(1.2);
  const [snr, setSnr] = useState<number>(21.5);

  const calculatedHeight = calculateObjectHeight(alt, shadowLen, groundRange);

  // Physics verification logic
  const hasShadow = shadowLen > 0.4;
  const isAngleValid = Math.abs(angleError) <= 15.0;
  const isSnrValid = snr >= 12.0;
  const isPhysicsVerified = hasShadow && isAngleValid && isSnrValid && calculatedHeight > 0.15;

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Overview header */}
      <div className="max-w-4xl mx-auto space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
          <Waves className="w-4 h-4" />
          <span>3. Physics-Based Shadow Verification Engine</span>
        </div>
        <h1 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wide">
          Acoustic Geometry & Height Estimation
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-2xl font-sans">
          Side-scan sonar acoustic pulses illuminate the seabed at an oblique grazing angle. Elevated objects on the seafloor block sound rays, casting an acoustic shadow directly behind the target. By matching target/shadow pairs, the system validates physical 3D elevation and rejects 2D flat false positives.
        </p>
      </div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Parameter Workbench */}
        <div className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-5">
          <h2 className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider">
            Interactive Ray Geometry Sliders
          </h2>

          <div className="space-y-4 text-xs font-mono">
            {/* Towfish Altitude H */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Towfish Altitude (H):</span>
                <span className="text-cyan-400 font-bold tabular-nums">{alt.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="30.0"
                step="0.5"
                value={alt}
                onChange={(e) => setAlt(parseFloat(e.target.value))}
                aria-label="Towfish altitude slider"
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>2m (Near Seabed)</span>
                <span>30m (High Clearance)</span>
              </div>
            </div>

            {/* Acoustic Shadow Length Ls */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Acoustic Shadow Length (Ls):</span>
                <span className="text-amber-400 font-bold tabular-nums">{shadowLen.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="15.0"
                step="0.1"
                value={shadowLen}
                onChange={(e) => setShadowLen(parseFloat(e.target.value))}
                aria-label="Acoustic shadow length slider"
                className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0m (No Shadow - Flat)</span>
                <span>15m (Tall Obstruction)</span>
              </div>
            </div>

            {/* Ground Range Rg */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Ground Range to Base (Rg):</span>
                <span className="text-slate-200 font-bold tabular-nums">{groundRange.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="5.0"
                max="75.0"
                step="1.0"
                value={groundRange}
                onChange={(e) => setGroundRange(parseFloat(e.target.value))}
                aria-label="Ground range slider"
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>5m (Nadir Margin)</span>
                <span>75m (Far Range)</span>
              </div>
            </div>

            {/* Angular Alignment */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Shadow Radial Angle Deviation (θ):</span>
                <span className={`font-bold tabular-nums ${isAngleValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {angleError.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="-30.0"
                max="30.0"
                step="0.5"
                value={angleError}
                onChange={(e) => setAngleError(parseFloat(e.target.value))}
                aria-label="Shadow radial angle slider"
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>-30° (Misaligned)</span>
                <span>0° (Perfect Radial)</span>
                <span>+30° (Misaligned)</span>
              </div>
            </div>

            {/* Acoustic SNR */}
            <div className="space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Acoustic Contrast SNR:</span>
                <span className={`font-bold tabular-nums ${isSnrValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {snr.toFixed(1)} dB
                </span>
              </div>
              <input
                type="range"
                min="2.0"
                max="35.0"
                step="0.5"
                value={snr}
                onChange={(e) => setSnr(parseFloat(e.target.value))}
                aria-label="Acoustic contrast slider"
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>2 dB (Diffuse Bedform)</span>
                <span>35 dB (High Metal Contrast)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Calculated Result & Ray Diagram */}
        <div className="lg:col-span-6 space-y-5">
          {/* Result Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Real-Time Physics Evaluation
              </span>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded border flex items-center gap-1.5 ${
                isPhysicsVerified
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}>
                {isPhysicsVerified ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFIED 3D OBJECT</span>
                  </>
                ) : (
                  <>
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>FALSE POSITIVE REJECTED</span>
                  </>
                )}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded p-4 text-center space-y-1">
              <div className="text-xs font-mono text-slate-400">ESTIMATED OBJECT HEIGHT (Ho)</div>
              <div className="text-4xl font-display font-bold text-amber-300 tabular-nums">
                {calculatedHeight.toFixed(2)} <span className="text-lg font-mono font-normal text-slate-400">meters</span>
              </div>
              <div className="text-[11px] font-mono text-cyan-400 pt-1">
                Ho = ({alt.toFixed(1)} · {shadowLen.toFixed(1)}) / ({groundRange.toFixed(1)} + {shadowLen.toFixed(1)})
              </div>
            </div>

            {/* Validation checks */}
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Shadow Length Criterion (Ls &gt; 0.4m):</span>
                <span className={hasShadow ? 'text-emerald-400' : 'text-rose-400'}>
                  {hasShadow ? 'PASS (Cast valid shadow)' : 'FAIL (No shadow relief)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Radial Propagation Angle (|θ| ≤ 15°):</span>
                <span className={isAngleValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {isAngleValid ? 'PASS (Aligned with beam)' : 'FAIL (Multi-path artifact)'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-400">Highlight/Shadow SNR (≥ 12 dB):</span>
                <span className={isSnrValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {isSnrValid ? 'PASS (High acoustic contrast)' : 'FAIL (Natural sediment cluster)'}
                </span>
              </div>
            </div>
          </div>

          {/* Acoustic Shadow Ray Diagram */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-2">
            <div className="text-xs font-mono text-slate-300 font-semibold uppercase">
              Side-Scan Acoustic Ray Geometry
            </div>
            <div className="relative bg-slate-950 border border-slate-800 rounded p-3 h-44 overflow-hidden">
              <svg viewBox="0 0 380 140" className="w-full h-full">
                {/* Seabed baseline */}
                <line x1="20" y1="110" x2="360" y2="110" stroke="#334155" strokeWidth="2" />
                <text x="310" y="125" fill="#64748b" fontSize="8" fontFamily="JetBrains Mono">SEABED</text>

                {/* Towfish at (40, 30) */}
                <circle cx="40" cy="30" r="5" fill="#38bdf8" />
                <text x="18" y="22" fill="#38bdf8" fontSize="8" fontFamily="JetBrains Mono">TOWFISH</text>
                
                {/* Altitude H line */}
                <line x1="40" y1="30" x2="40" y2="110" stroke="#0ea5e9" strokeDasharray="2 2" />
                <text x="44" y="70" fill="#0ea5e9" fontSize="8" fontFamily="JetBrains Mono">H={alt}m</text>

                {/* Object on seabed at x=180 */}
                const objHeightPx = Math.max(6, Math.min(50, calculatedHeight * 12));
                <rect x="175" y={110 - Math.max(6, Math.min(50, calculatedHeight * 12))} width="12" height={Math.max(6, Math.min(50, calculatedHeight * 12))} fill="#10b981" />
                <text x="170" y={100 - Math.max(6, Math.min(50, calculatedHeight * 12))} fill="#10b981" fontSize="8" fontFamily="JetBrains Mono">TARGET</text>

                {/* Acoustic ray from Towfish to Object Tip */}
                <line x1="40" y1="30" x2="187" y2={110 - Math.max(6, Math.min(50, calculatedHeight * 12))} stroke="#f59e0b" strokeWidth="1.5" />
                
                {/* Tangent ray continuing to shadow termination */}
                const shadowPx = Math.max(10, Math.min(120, shadowLen * 8));
                <line x1="187" y1={110 - Math.max(6, Math.min(50, calculatedHeight * 12))} x2={187 + Math.max(10, Math.min(120, shadowLen * 8))} y2="110" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 2" />

                {/* Shadow region on seabed */}
                <rect x="187" y="108" width={Math.max(10, Math.min(120, shadowLen * 8))} height="4" fill="#000000" stroke="#ef4444" strokeWidth="0.5" />
                <text x={190 + Math.max(10, Math.min(120, shadowLen * 8)) / 2 - 12} y="125" fill="#ef4444" fontSize="8" fontFamily="JetBrains Mono">Ls={shadowLen}m</text>

                {/* Ground Range Rg */}
                <line x1="40" y1="110" x2="175" y2="110" stroke="#94a3b8" strokeDasharray="2 2" />
                <text x="95" y="125" fill="#94a3b8" fontSize="8" fontFamily="JetBrains Mono">Rg={groundRange}m</text>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
