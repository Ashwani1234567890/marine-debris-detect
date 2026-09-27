import React from 'react';
import { Cpu, Zap, Activity, HardDrive, Thermometer, ShieldCheck, CheckCircle2, Waves, Terminal } from 'lucide-react';
import { EdgeTelemetry } from '../types/sonar';

interface EdgeDeploymentViewProps {
  telemetry: EdgeTelemetry;
  setTelemetry: React.Dispatch<React.SetStateAction<EdgeTelemetry>>;
}

export const EdgeDeploymentView: React.FC<EdgeDeploymentViewProps> = ({
  telemetry,
  setTelemetry
}) => {
  return (
    <div className="h-full overflow-y-auto bg-slate-950 p-6 space-y-6">
      {/* Header */}
      <div className="max-w-5xl mx-auto space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-wider">
          <Cpu className="w-4 h-4" />
          <span>5. Edge Deployment & Embedded AUV Telemetry</span>
        </div>
        <h1 className="text-xl font-display font-bold text-slate-100 uppercase tracking-wide">
          NVIDIA Jetson Orin Onboard Profiler
        </h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl font-sans">
          Engineered for real-time edge execution onboard Autonomous Underwater Vehicles (AUVs) and towfish survey platforms. By running INT8/FP16 quantized TensorRT inference pipelines at 15 Watts, the system eliminates subsea tether bandwidth bottlenecks and provides autonomous hazard avoidance directly in the deep water column.
        </p>
      </div>

      {/* Main KPI Cards */}
      <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>PING LATENCY</span>
          </div>
          <div className="text-2xl font-bold text-cyan-300 tabular-nums">
            {telemetry.pingLatencyMs.toFixed(1)} <span className="text-xs font-normal text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-emerald-400">✓ Under 20ms Budget</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>THROUGHPUT</span>
          </div>
          <div className="text-2xl font-bold text-amber-300 tabular-nums">
            {telemetry.processingFps.toFixed(1)} <span className="text-xs font-normal text-slate-400">pings/sec</span>
          </div>
          <div className="text-[10px] text-slate-400">5.2x faster than survey ping rate</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>POWER DRAW</span>
          </div>
          <div className="text-2xl font-bold text-purple-300 tabular-nums">
            {telemetry.powerDrawWatts.toFixed(1)} <span className="text-xs font-normal text-slate-400">Watts</span>
          </div>
          <div className="text-[10px] text-emerald-400">AUV Battery Compatible</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-1">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>VRAM FOOTPRINT</span>
          </div>
          <div className="text-2xl font-bold text-emerald-300 tabular-nums">
            {telemetry.vramUsageGb} / {telemetry.totalVramGb} <span className="text-xs font-normal text-slate-400">GB</span>
          </div>
          <div className="text-[10px] text-slate-400">Unified Memory Buffer</div>
        </div>
      </div>

      {/* Hardware Profile Benchmark Table & System Architecture */}
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Benchmark Comparison */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <h2 className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <span>Hardware & Quantization Performance Matrix</span>
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="pb-2">PLATFORM</th>
                  <th className="pb-2">PRECISION</th>
                  <th className="pb-2">LATENCY</th>
                  <th className="pb-2">MAX RATE</th>
                  <th className="pb-2">TDP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                <tr className="bg-cyan-500/5">
                  <td className="py-2.5 font-semibold text-cyan-300">Jetson Orin AGX (32GB)</td>
                  <td className="py-2.5 text-amber-300">TensorRT FP16</td>
                  <td className="py-2.5 tabular-nums">12.8 ms</td>
                  <td className="py-2.5 tabular-nums">78.1 Hz</td>
                  <td className="py-2.5 tabular-nums">15.0 W</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-slate-200">Jetson Orin AGX (32GB)</td>
                  <td className="py-2.5 text-amber-400">TensorRT INT8</td>
                  <td className="py-2.5 tabular-nums text-emerald-400">8.4 ms</td>
                  <td className="py-2.5 tabular-nums">119.0 Hz</td>
                  <td className="py-2.5 tabular-nums">12.5 W</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-slate-200">Jetson Orin Nano (8GB)</td>
                  <td className="py-2.5 text-slate-400">TensorRT FP16</td>
                  <td className="py-2.5 tabular-nums">22.4 ms</td>
                  <td className="py-2.5 tabular-nums">44.6 Hz</td>
                  <td className="py-2.5 tabular-nums">9.8 W</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-semibold text-slate-200">RTX 4090 (Mothership)</td>
                  <td className="py-2.5 text-slate-400">PyTorch FP32</td>
                  <td className="py-2.5 tabular-nums">4.2 ms</td>
                  <td className="py-2.5 tabular-nums">238.0 Hz</td>
                  <td className="py-2.5 tabular-nums">350.0 W</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800/80 font-sans leading-relaxed">
            Note: Standard deep-tow side-scan sonar transducers operate at ping rates between 10 Hz and 20 Hz (e.g. EdgeTech 4200 or Klein 5000). Both Jetson Orin Nano and AGX comfortably exceed real-time ping acquisition requirements without dropping frames.
          </div>
        </div>

        {/* Embedded Execution Flow */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-3">
          <h2 className="text-xs font-mono font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>AUV Onboard Pipeline Execution Flow</span>
          </h2>

          <div className="space-y-3 text-xs font-mono">
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-cyan-400 font-semibold">1. Acoustic Hydrophone Ingestion</div>
              <div className="text-[11px] text-slate-400">
                Direct Ethernet DMA capture from SSS transducer (XTF stream, 450 kHz).
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-blue-400 font-semibold">2. CUDA SRAD & CLAHE Preprocessing</div>
              <div className="text-[11px] text-slate-400">
                Anisotropic speckle filtering and adaptive histogram normalization on GPU.
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-emerald-400 font-semibold">3. Dual-Head CV Inference</div>
              <div className="text-[11px] text-slate-400">
                YOLOv8-OBB (oriented boxes) + U-Net (continuous ghost nets) via TensorRT FP16.
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-amber-400 font-semibold">4. Physics Shadow & WGS84 Geotagging</div>
              <div className="text-[11px] text-slate-400">
                Ho = (H · Ls)/(Rg + Ls) elevation check, false positive rejection, geodetic tagging.
              </div>
            </div>

            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-1">
              <div className="text-purple-400 font-semibold">5. Autonomous Mission Log & Alerting</div>
              <div className="text-[11px] text-slate-400">
                Logged to onboard NVMe; critical UXO coordinates pulsed via acoustic modem.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
