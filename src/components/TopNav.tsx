import React from 'react';
import { Waves, Download, Play, Pause, Radio, RefreshCw, Upload } from 'lucide-react';

interface TopNavProps {
  activeTab: 'waterfall' | 'chart' | 'physics' | 'telemetry' | 'targets';
  setActiveTab: (tab: 'waterfall' | 'chart' | 'physics' | 'telemetry' | 'targets') => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  onOpenExport: () => void;
  onOpenUpload: () => void;
  onResetPing: () => void;
  missionName: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  isPlaying,
  setIsPlaying,
  onOpenExport,
  onOpenUpload,
  onResetPing,
  missionName
}) => {
  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 lg:px-6 flex items-center justify-between z-30 shrink-0 sticky top-0">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <Waves className="w-4 h-4" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-display font-bold text-lg tracking-wider text-slate-100 uppercase">
            JAL LOCHAN
          </span>
          <span className="hidden sm:inline text-xs font-mono text-cyan-400/80">
            Acoustic Eye · SSS/XTF
          </span>
        </div>
      </div>

      {/* Zone 2: 4-5 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('waterfall')}
          className={`transition-colors text-xs lg:text-sm tracking-wide ${
            activeTab === 'waterfall'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Sonar Waterfall
        </button>
        <button
          onClick={() => setActiveTab('chart')}
          className={`transition-colors text-xs lg:text-sm tracking-wide ${
            activeTab === 'chart'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Nautical GIS Chart
        </button>
        <button
          onClick={() => setActiveTab('physics')}
          className={`transition-colors text-xs lg:text-sm tracking-wide ${
            activeTab === 'physics'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Physics Shadow Engine
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`transition-colors text-xs lg:text-sm tracking-wide ${
            activeTab === 'telemetry'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Edge Telemetry
        </button>
        <button
          onClick={() => setActiveTab('targets')}
          className={`transition-colors text-xs lg:text-sm tracking-wide ${
            activeTab === 'targets'
              ? 'text-cyan-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Debris Inventory
        </button>
      </nav>

      {/* Zone 3: Primary operational actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Play / Pause live AUV ping stream */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          title={isPlaying ? 'Pause acoustic waterfall feed' : 'Resume live acoustic ping stream'}
          className={`px-3 py-1.5 rounded text-xs font-mono font-medium transition-colors flex items-center gap-1.5 border ${
            isPlaying
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
              : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">LIVE STREAM</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PAUSED</span>
            </>
          )}
        </button>

        <button
          onClick={onResetPing}
          title="Rewind to start of trackline"
          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        {/* Upload Sonar Scan Image trigger */}
        <button
          onClick={onOpenUpload}
          className="px-3 py-1.5 rounded text-xs font-medium text-cyan-300 bg-cyan-950/70 border border-cyan-500/40 hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5 font-sans whitespace-nowrap"
          title="Upload local sonar scan image to run acoustic processing"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Upload Image</span>
        </button>

        {/* Export geodata modal trigger */}
        <button
          onClick={onOpenExport}
          className="px-3 py-1.5 rounded text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5 font-sans whitespace-nowrap shadow-sm shadow-cyan-950"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Geodata</span>
        </button>
      </div>
    </header>
  );
};
