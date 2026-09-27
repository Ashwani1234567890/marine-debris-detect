import React from 'react';
import { Cpu, Zap, Activity, ShieldCheck, HardDrive, Thermometer, WifiOff } from 'lucide-react';
import { EdgeTelemetry } from '../types/sonar';

interface EdgeTelemetryBarProps {
  telemetry: EdgeTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<EdgeTelemetry>>;
  pingCount: number;
}

export const EdgeTelemetryBar: React.FC<EdgeTelemetryBarProps> = ({
  telemetry,
  setTelemetry,
  pingCount
}) => {
  return (
    <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300">
      {/* Edge Hardware Profile & Quantization */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <select
            value={telemetry.targetHardware}
            onChange={(e) =>
              setTelemetry((prev) => ({
                ...prev,
                targetHardware: e.target.value as EdgeTelemetry['targetHardware'],
                powerDrawWatts: e.target.value.includes('Nano') ? 9.8 : 14.8,
                pingLatencyMs: e.target.value.includes('Nano') ? 22.4 : 12.8
              }))
            }
            aria-label="Target edge compute hardware"
            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-emerald-400 focus:outline-none focus:border-emerald-500"
          >
            <option value="NVIDIA Jetson Orin AGX">NVIDIA Jetson Orin AGX (32GB)</option>
            <option value="NVIDIA Jetson Orin Nano">NVIDIA Jetson Orin Nano (8GB)</option>
            <option value="RTX 4090 Workstation">RTX 4090 Workstation (Mothership)</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <select
            value={telemetry.inferenceEngine}
            onChange={(e) =>
              setTelemetry((prev) => ({
                ...prev,
                inferenceEngine: e.target.value as EdgeTelemetry['inferenceEngine'],
                pingLatencyMs: e.target.value.includes('INT8') ? 8.4 : 12.8
              }))
            }
            aria-label="Inference quantization engine"
            className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-400 focus:outline-none focus:border-amber-500"
          >
            <option value="TensorRT FP16">TensorRT FP16 (Quantized)</option>
            <option value="TensorRT INT8">TensorRT INT8 (Ultra-Low Latency)</option>
            <option value="ONNX Runtime">ONNX Runtime (CPU Fallback)</option>
          </select>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-slate-400">
          <span>LATENCY:</span>
          <span className="font-semibold text-cyan-400 tabular-nums">
            {telemetry.pingLatencyMs.toFixed(1)} ms/ping
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>FPS:</span>
          <span className="font-semibold text-emerald-400 tabular-nums">
            {telemetry.processingFps.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Hardware Telemetry & Offline Status */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="hidden xl:flex items-center gap-2 text-slate-400">
          <HardDrive className="w-3.5 h-3.5 text-slate-400" />
          <span>VRAM:</span>
          <span className="text-slate-200 tabular-nums">
            {telemetry.vramUsageGb} / {telemetry.totalVramGb} GB
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
          <Thermometer className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-slate-200 tabular-nums">{telemetry.temperatureCelsius}°C</span>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
          <Activity className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-slate-200 tabular-nums">PING #{pingCount}</span>
        </div>

        {/* Offline AUV Autonomous mode indicator/toggle */}
        <button
          onClick={() =>
            setTelemetry((prev) => ({ ...prev, isOfflineMode: !prev.isOfflineMode }))
          }
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs transition-colors border ${
            telemetry.isOfflineMode
              ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
          title="Toggle fully offline edge deployment mode for autonomous underwater vehicles"
        >
          <WifiOff className="w-3 h-3" />
          <span>{telemetry.isOfflineMode ? 'OFFLINE AUV AIRGAP' : 'ONLINE TELEMETRY'}</span>
        </button>
      </div>
    </div>
  );
};
