import React from 'react';
import { Compass, Upload, MapPin, Database, Sparkles } from 'lucide-react';
import { MissionDataset } from '../types/sonar';
import { MISSION_DATASETS } from '../data/missions';

interface MissionSelectorProps {
  currentMissionId: string;
  onSelectMission: (mission: MissionDataset) => void;
  onOpenUploadModal: () => void;
}

export const MissionSelector: React.FC<MissionSelectorProps> = ({
  currentMissionId,
  onSelectMission,
  onOpenUploadModal
}) => {
  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      {/* Mission selector tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-slate-400 font-mono flex items-center gap-1.5 uppercase text-[11px]">
          <Database className="w-3.5 h-3.5 text-cyan-400" />
          <span>Active SSS Dataset:</span>
        </span>

        {MISSION_DATASETS.map((m) => {
          const isSelected = m.id === currentMissionId;
          return (
            <button
              key={m.id}
              onClick={() => onSelectMission(m)}
              className={`px-3 py-1 rounded text-xs transition-colors flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 font-medium'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <MapPin className="w-3 h-3 text-cyan-400" />
              <span>{m.region}</span>
            </button>
          );
        })}
      </div>

      {/* Custom upload trigger */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenUploadModal}
          className="px-3 py-1 rounded bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/50 transition-colors flex items-center gap-1.5 text-xs font-mono"
          title="Upload Side-Scan Sonar image or XTF scan file"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Sonar Scan Image</span>
        </button>
      </div>
    </div>
  );
};

