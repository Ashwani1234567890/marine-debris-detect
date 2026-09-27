import React from 'react';
import { Sliders, Layers, Eye, ShieldCheck, Palette, Filter } from 'lucide-react';
import { ColormapTheme, DebrisClass, FilterState } from '../types/sonar';

interface FilterControlsProps {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  totalTargetsCount: number;
  verifiedCount: number;
  falsePositivesCount: number;
}

const CLASS_OPTIONS: { id: DebrisClass; label: string }[] = [
  { id: 'ghost_net', label: 'Ghost Nets' },
  { id: 'uxo', label: 'Munitions / UXO' },
  { id: 'container', label: 'Containers' },
  { id: 'cable', label: 'Power Cables' },
  { id: 'pipe', label: 'Pipes & Anchors' },
  { id: 'drum', label: 'Chemical Drums' },
  { id: 'tire', label: 'Tires' },
  { id: 'wreckage', label: 'Wreckage' }
];

export const FilterControls: React.FC<FilterControlsProps> = ({
  filter,
  setFilter,
  totalTargetsCount,
  verifiedCount,
  falsePositivesCount
}) => {
  const toggleClass = (cls: DebrisClass) => {
    setFilter((prev) => {
      const next = new Set(prev.selectedClasses);
      if (next.has(cls)) {
        next.delete(cls);
      } else {
        next.add(cls);
      }
      return { ...prev, selectedClasses: next };
    });
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 p-3 lg:p-4 space-y-3 text-xs">
      {/* Top row: Pipeline stages & Colormap */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Pipeline Layer Toggles */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-mono flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Pipeline:</span>
          </span>

          <button
            onClick={() => setFilter((f) => ({ ...f, showSrad: !f.showSrad }))}
            className={`px-2.5 py-1 rounded font-mono transition-colors border ${
              filter.showSrad
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            1. SRAD Denoise
          </button>

          <button
            onClick={() => setFilter((f) => ({ ...f, showClahe: !f.showClahe }))}
            className={`px-2.5 py-1 rounded font-mono transition-colors border ${
              filter.showClahe
                ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            2. CLAHE Equalize
          </button>

          <button
            onClick={() => setFilter((f) => ({ ...f, showYoloObb: !f.showYoloObb }))}
            className={`px-2.5 py-1 rounded font-mono transition-colors border ${
              filter.showYoloObb
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            3. YOLOv8-OBB
          </button>

          <button
            onClick={() => setFilter((f) => ({ ...f, showUnet: !f.showUnet }))}
            className={`px-2.5 py-1 rounded font-mono transition-colors border ${
              filter.showUnet
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            4. U-Net Masks
          </button>

          <button
            onClick={() =>
              setFilter((f) => ({ ...f, showShadowPhysics: !f.showShadowPhysics }))
            }
            className={`px-2.5 py-1 rounded font-mono transition-colors border ${
              filter.showShadowPhysics
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
          >
            5. Physics Shadow (Ho)
          </button>
        </div>

        {/* Colormap & Physics Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Physics Verified Only Switch */}
          <button
            onClick={() =>
              setFilter((f) => ({
                ...f,
                filterPhysicsVerifiedOnly: !f.filterPhysicsVerifiedOnly
              }))
            }
            className={`px-2.5 py-1 rounded font-medium flex items-center gap-1.5 transition-colors border ${
              filter.filterPhysicsVerifiedOnly
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title="Filter out unverified candidates lacking valid acoustic shadow"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Physics Verified Only ({verifiedCount}/{totalTargetsCount})</span>
          </button>

          {/* Colormap selector */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filter.colormap}
              onChange={(e) =>
                setFilter((f) => ({ ...f, colormap: e.target.value as ColormapTheme }))
              }
              aria-label="Acoustic colormap palette"
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="bronze">Marine Bronze (Klein SSS)</option>
              <option value="cobalt">Deep Cobalt Ice</option>
              <option value="copper">Warm Copper</option>
              <option value="grayscale">Acoustic Grayscale</option>
              <option value="jet">Hydrographic Jet</option>
            </select>
          </div>
        </div>
      </div>

      {/* Second row: Sliders & Debris Category Chips */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/60">
        {/* Sliders: Confidence & CLAHE */}
        <div className="flex items-center gap-5 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">Min Conf:</span>
            <input
              type="range"
              min="0.30"
              max="0.95"
              step="0.05"
              value={filter.minConfidence}
              onChange={(e) =>
                setFilter((f) => ({ ...f, minConfidence: parseFloat(e.target.value) }))
              }
              aria-label="Minimum AI confidence threshold"
              className="w-24 accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
            />
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {(filter.minConfidence * 100).toFixed(0)}%
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">SRAD Iter:</span>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={filter.sradIterations}
              onChange={(e) =>
                setFilter((f) => ({ ...f, sradIterations: parseInt(e.target.value) }))
              }
              aria-label="SRAD speckle diffusion iterations"
              className="w-20 accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
            />
            <span className="font-mono text-slate-300 font-semibold tabular-nums">
              {filter.sradIterations}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-mono text-[11px]">CLAHE Clip:</span>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.2"
              value={filter.claheClipLimit}
              onChange={(e) =>
                setFilter((f) => ({ ...f, claheClipLimit: parseFloat(e.target.value) }))
              }
              aria-label="CLAHE contrast clip limit"
              className="w-20 accent-cyan-400 h-1 bg-slate-800 rounded cursor-pointer"
            />
            <span className="font-mono text-slate-300 font-semibold tabular-nums">
              {filter.claheClipLimit.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Debris Categories */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-mono text-[11px]">Targets:</span>
          {CLASS_OPTIONS.map((c) => {
            const isSelected = filter.selectedClasses.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleClass(c.id)}
                className={`px-2 py-0.5 rounded text-[11px] font-sans transition-colors border ${
                  isSelected
                    ? 'bg-slate-800 text-slate-200 border-slate-700'
                    : 'bg-slate-950 text-slate-600 border-slate-900 line-through'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
