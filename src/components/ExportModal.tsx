import React, { useState } from 'react';
import { X, Download, Copy, Check, FileJson, FileSpreadsheet, Globe, FileText } from 'lucide-react';
import { DetectedDebrisTarget, SonarMetadata } from '../types/sonar';
import { exportToGeoJson, exportToCsv, exportToKml, downloadFile } from '../utils/geospatial';

interface ExportModalProps {
  targets: DetectedDebrisTarget[];
  metadata: SonarMetadata;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  targets,
  metadata,
  onClose
}) => {
  const [activeFormat, setActiveFormat] = useState<'geojson' | 'csv' | 'kml' | 'briefing'>('geojson');
  const [copied, setCopied] = useState(false);

  const geoJsonContent = exportToGeoJson(targets, metadata);
  const csvContent = exportToCsv(targets, metadata);
  const kmlContent = exportToKml(targets, metadata);

  // Generate Executive Salvage Mission Briefing
  const verifiedTargets = targets.filter((t) => t.physics.isPhysicsVerified);
  const falsePositives = targets.filter((t) => !t.physics.isPhysicsVerified);

  const briefingContent = `================================================================================
JAL LOCHAN: OFFSHORE ACOUSTIC DEBRIS REMEDIATION MISSION BRIEFING
SURVEY MISSION: ${metadata.missionName} [ID: ${metadata.missionId}]
VESSEL / PLATFORM: ${metadata.surveyVessel} · AUV: ${metadata.auvModel}
LOCATION: ${metadata.locationName} (${metadata.startLat.toFixed(4)}°N, ${metadata.startLon.toFixed(4)}°E)
DATE GENERATED: ${new Date().toUTCString()}
================================================================================

1. EXECUTIVE SUMMARY & STATISTICS:
   • Total Candidate Detections (Dual-Head CV): ${targets.length} targets
   • Physics-Verified Anthropogenic Debris: ${verifiedTargets.length} targets
   • Rejected False Positives (Natural Sand/Moraine): ${falsePositives.length} targets
   • Physics Shadow False Positive Rejection Rate: ${((falsePositives.length / (targets.length || 1)) * 100).toFixed(1)}%
   • Survey Speed: ${metadata.surveySpeedKnots} knots · Sonar Frequency: ${metadata.sensorFrequencyKhz} kHz
   • Water Column Clearance (Altitude H): ${metadata.towfishAltitudeMeters} m

2. CRITICAL RECOVERY DIRECTIVES FOR ROV / DIVE CREW:
${verifiedTargets
  .map(
    (t, idx) => `
   [TARGET #${idx + 1}] ${t.id} - ${t.label}
   • Classification: ${t.debrisClass.toUpperCase()} (Model: ${t.modelHead.toUpperCase()}, Conf: ${(t.confidence * 100).toFixed(1)}%)
   • Coordinates: ${t.geospatial.lat.toFixed(6)}° N, ${t.geospatial.lon.toFixed(6)}° E (Depth: ${t.geospatial.depth_m}m)
   • Physics Calculations:
     - Shadow Length (Ls): ${t.physics.shadowLength_m} m
     - Ground Range (Rg): ${t.physics.groundRange_m} m
     - Estimated Height Above Seabed (Ho): ${t.physics.calculatedHeight_m} m
   • Hazard Level: ${t.riskLevel.toUpperCase()} (${t.hazardType})
   • Operational ROV Protocol:
     ${t.recoveryProtocol}
`
  )
  .join('\n')}

3. REJECTED NATURAL TARGETS (NO SALVAGE ACTION REQUIRED):
${falsePositives
  .map(
    (fp) => `   • ${fp.id} (${fp.label}): ${fp.physics.rejectionReason}`
  )
  .join('\n')}

================================================================================
END OF HYDROGRAPHIC MISSION BRIEFING
================================================================================`;

  const getCurrentContent = () => {
    switch (activeFormat) {
      case 'geojson':
        return geoJsonContent;
      case 'csv':
        return csvContent;
      case 'kml':
        return kmlContent;
      case 'briefing':
        return briefingContent;
    }
  };

  const handleDownload = () => {
    const filenameBase = `${metadata.missionId}_debris_survey`;
    switch (activeFormat) {
      case 'geojson':
        downloadFile(geoJsonContent, `${filenameBase}.geojson`, 'application/geo+json');
        break;
      case 'csv':
        downloadFile(csvContent, `${filenameBase}.csv`, 'text/csv');
        break;
      case 'kml':
        downloadFile(kmlContent, `${filenameBase}.kml`, 'application/vnd.google-earth.kml+xml');
        break;
      case 'briefing':
        downloadFile(briefingContent, `${filenameBase}_briefing.txt`, 'text/plain');
        break;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-100 uppercase tracking-wide">
                Geospatial Export & Offshore Reports
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {metadata.missionName} · {verifiedTargets.length} Verified Targets
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

        {/* Format Selector Tabs */}
        <div className="bg-slate-950/60 px-6 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveFormat('geojson')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeFormat === 'geojson'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>GeoJSON</span>
          </button>

          <button
            onClick={() => setActiveFormat('csv')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeFormat === 'csv'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>CSV Survey Log</span>
          </button>

          <button
            onClick={() => setActiveFormat('kml')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeFormat === 'kml'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Google Earth KML</span>
          </button>

          <button
            onClick={() => setActiveFormat('briefing')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-colors ${
              activeFormat === 'briefing'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>ROV Mission Briefing</span>
          </button>
        </div>

        {/* Content Preview Box */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-2">
            <span>PREVIEW DATA STREAM:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 hover:text-slate-200 text-slate-400 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <pre className="flex-1 overflow-auto bg-slate-950 border border-slate-800 rounded p-4 text-[11px] font-mono text-slate-300 leading-relaxed max-h-80 select-all">
            {getCurrentContent()}
          </pre>
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            Compliant with OGC WGS84 & hydrographic survey specifications
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 transition-colors flex items-center gap-1.5 font-sans font-semibold shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span>Download {activeFormat.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
