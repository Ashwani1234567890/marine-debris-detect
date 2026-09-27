import React, { useState } from 'react';
import { Search, ShieldCheck, AlertOctagon, Eye, ExternalLink, ArrowUpDown } from 'lucide-react';
import { DetectedDebrisTarget, DebrisClass, RiskLevel } from '../types/sonar';

interface DebrisInventoryTableProps {
  targets: DetectedDebrisTarget[];
  onSelectTarget: (target: DetectedDebrisTarget) => void;
}

export const DebrisInventoryTable: React.FC<DebrisInventoryTableProps> = ({
  targets,
  onSelectTarget
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState<'all' | 'verified' | 'rejected'>('all');
  const [sortField, setSortField] = useState<'id' | 'height' | 'confidence' | 'risk'>('height');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredTargets = targets
    .filter((t) => {
      const matchesSearch =
        t.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.debrisClass.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (verifiedFilter === 'verified') return t.physics.isPhysicsVerified;
      if (verifiedFilter === 'rejected') return !t.physics.isPhysicsVerified;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'height') {
        comparison = a.physics.calculatedHeight_m - b.physics.calculatedHeight_m;
      } else if (sortField === 'confidence') {
        comparison = a.confidence - b.confidence;
      } else if (sortField === 'risk') {
        const riskRank: Record<RiskLevel, number> = { critical: 4, high: 3, moderate: 2, low: 1 };
        comparison = riskRank[a.riskLevel] - riskRank[b.riskLevel];
      }
      return sortAsc ? comparison : -comparison;
    });

  const handleSort = (field: 'id' | 'height' | 'confidence' | 'risk') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-4">
      {/* Header & Search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wide">
            Hydrographic Debris Target Inventory
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 font-mono">
            <span>Total Targets: {targets.length}</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">Physics Verified: {targets.filter((t) => t.physics.isPhysicsVerified).length}</span>
            <span aria-hidden="true">·</span>
            <span className="text-rose-400">False Positives: {targets.filter((t) => !t.physics.isPhysicsVerified).length}</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search target ID, label, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-56 font-mono"
            />
          </div>

          {/* Segmented Filter */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setVerifiedFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                verifiedFilter === 'all'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({targets.length})
            </button>
            <button
              onClick={() => setVerifiedFilter('verified')}
              className={`px-2.5 py-1 rounded transition-colors ${
                verifiedFilter === 'verified'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Verified
            </button>
            <button
              onClick={() => setVerifiedFilter('rejected')}
              className={`px-2.5 py-1 rounded transition-colors ${
                verifiedFilter === 'rejected'
                  ? 'bg-rose-500/20 text-rose-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              False Positives
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400">
              <tr>
                <th
                  onClick={() => handleSort('id')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>TARGET & ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-3 px-3">CV MODEL</th>
                <th
                  onClick={() => handleSort('confidence')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>CONF</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-3 px-3">WGS84 COORDINATES</th>
                <th
                  onClick={() => handleSort('height')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>CALC HEIGHT (Ho)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-3 px-3">SHADOW (Ls)</th>
                <th className="py-3 px-3">STATUS</th>
                <th
                  onClick={() => handleSort('risk')}
                  className="py-3 px-3 cursor-pointer hover:text-slate-200"
                >
                  <div className="flex items-center gap-1">
                    <span>RISK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-600" />
                  </div>
                </th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredTargets.map((t) => {
                const isVerified = t.physics.isPhysicsVerified;
                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTarget(t)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{t.label}</span>
                      </div>
                      <div className="text-[11px] text-cyan-400">
                        {t.id} · <span className="capitalize text-slate-400">{t.debrisClass.replace('_', ' ')}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-emerald-400 font-semibold">{t.modelHead.toUpperCase()}</span>
                      <div className="text-[10px] text-slate-500">
                        {t.channel.toUpperCase()} CH
                      </div>
                    </td>

                    <td className="py-3 px-3 tabular-nums text-slate-200">
                      {(t.confidence * 100).toFixed(1)}%
                    </td>

                    <td className="py-3 px-3 tabular-nums text-slate-400 text-[11px]">
                      <div>{t.geospatial.lat.toFixed(5)}° N, {t.geospatial.lon.toFixed(5)}° E</div>
                      <div className="text-[10px] text-slate-500">Depth: {t.geospatial.depth_m.toFixed(1)}m</div>
                    </td>

                    <td className="py-3 px-3 tabular-nums font-bold text-amber-300">
                      {t.physics.calculatedHeight_m > 0 ? `${t.physics.calculatedHeight_m.toFixed(2)} m` : '—'}
                    </td>

                    <td className="py-3 px-3 tabular-nums text-slate-300">
                      {t.physics.shadowLength_m > 0 ? `${t.physics.shadowLength_m.toFixed(1)} m` : 'None'}
                    </td>

                    <td className="py-3 px-3">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-[11px]">
                          <AlertOctagon className="w-3.5 h-3.5" />
                          <span>Rejected FP</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`text-[11px] uppercase font-semibold ${
                          t.riskLevel === 'critical'
                            ? 'text-rose-400'
                            : t.riskLevel === 'high'
                            ? 'text-amber-400'
                            : t.riskLevel === 'moderate'
                            ? 'text-yellow-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {t.riskLevel}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTarget(t);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
