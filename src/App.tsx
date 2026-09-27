import React, { useState, useEffect } from 'react';
import { TopNav } from './components/TopNav';
import { EdgeTelemetryBar } from './components/EdgeTelemetryBar';
import { MissionSelector } from './components/MissionSelector';
import { FilterControls } from './components/FilterControls';
import { WaterfallViewer } from './components/WaterfallViewer';
import { NauticalChart } from './components/NauticalChart';
import { PhysicsEngineView } from './components/PhysicsEngineView';
import { EdgeDeploymentView } from './components/EdgeDeploymentView';
import { DebrisInventoryTable } from './components/DebrisInventoryTable';
import { InspectorModal } from './components/InspectorModal';
import { ExportModal } from './components/ExportModal';
import { UploadScanModal } from './components/UploadScanModal';
import { MISSION_DATASETS, INITIAL_FILTER_STATE } from './data/missions';
import { DetectedDebrisTarget, EdgeTelemetry, FilterState, MissionDataset } from './types/sonar';

export default function App() {
  const [currentMission, setCurrentMission] = useState<MissionDataset>(MISSION_DATASETS[0]);
  const [activeTab, setActiveTab] = useState<'waterfall' | 'chart' | 'physics' | 'telemetry' | 'targets'>('waterfall');
  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER_STATE);

  const [targets, setTargets] = useState<DetectedDebrisTarget[]>(currentMission.targets);
  const [selectedTarget, setSelectedTarget] = useState<DetectedDebrisTarget | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);

  // Playback / live streaming state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [pingOffset, setPingOffset] = useState<number>(0);
  const [pingCount, setPingCount] = useState<number>(1042);

  // Edge Hardware Telemetry state
  const [telemetry, setTelemetry] = useState<EdgeTelemetry>({
    targetHardware: 'NVIDIA Jetson Orin AGX',
    inferenceEngine: 'TensorRT FP16',
    pingLatencyMs: 12.8,
    processingFps: 78.1,
    gpuUtilizationPercent: 68,
    powerDrawWatts: 14.8,
    vramUsageGb: 3.4,
    totalVramGb: 32.0,
    temperatureCelsius: 48,
    isOfflineMode: true
  });

  // Switch mission
  const handleSelectMission = (mission: MissionDataset) => {
    setCurrentMission(mission);
    setTargets(mission.targets);
    setSelectedTarget(null);
    setPingOffset(0);
  };

  // Custom upload
  const handleCustomUpload = (newTarget: DetectedDebrisTarget) => {
    setTargets((prev) => [newTarget, ...prev]);
    setSelectedTarget(newTarget);
    setActiveTab('waterfall');
  };

  // Live ping waterfall animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setPingOffset((prev) => (prev + 1) % 520);
      setPingCount((prev) => prev + 1);
    }, 120);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const verifiedCount = targets.filter((t) => t.physics.isPhysicsVerified).length;
  const falsePositivesCount = targets.filter((t) => !t.physics.isPhysicsVerified).length;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* 1. Top Navigation Bar (Strict 3-zone Top Bar Contract) */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isPlaying={isPlaying}
        setIsPlaying={setIsPlaying}
        onOpenExport={() => setShowExportModal(true)}
        onOpenUpload={() => setShowUploadModal(true)}
        onResetPing={() => {
          setPingOffset(0);
          setPingCount(1000);
        }}
        missionName={currentMission.name}
      />

      {/* 2. NVIDIA Jetson Orin Edge Telemetry Ribbon */}
      <EdgeTelemetryBar
        telemetry={telemetry}
        setTelemetry={setTelemetry}
        pingCount={pingCount}
      />

      {/* 3. Mission Dataset Selector & Custom SSS Upload */}
      <MissionSelector
        currentMissionId={currentMission.id}
        onSelectMission={handleSelectMission}
        onOpenUploadModal={() => setShowUploadModal(true)}
      />

      {/* 4. Preprocessing & CV Filter Controls (shown on Waterfall & Chart views) */}
      {(activeTab === 'waterfall' || activeTab === 'chart') && (
        <FilterControls
          filter={filter}
          setFilter={setFilter}
          totalTargetsCount={targets.length}
          verifiedCount={verifiedCount}
          falsePositivesCount={falsePositivesCount}
        />
      )}

      {/* 5. Main Workspace Viewport */}
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'waterfall' && (
          <WaterfallViewer
            targets={targets}
            metadata={currentMission.metadata}
            filter={filter}
            onSelectTarget={(target) => setSelectedTarget(target)}
            selectedTargetId={selectedTarget?.id}
            pingOffset={pingOffset}
          />
        )}

        {activeTab === 'chart' && (
          <NauticalChart
            targets={targets}
            metadata={currentMission.metadata}
            tracklinePoints={currentMission.tracklinePoints}
            onSelectTarget={(target) => setSelectedTarget(target)}
            selectedTargetId={selectedTarget?.id}
          />
        )}

        {activeTab === 'physics' && (
          <PhysicsEngineView />
        )}

        {activeTab === 'telemetry' && (
          <EdgeDeploymentView
            telemetry={telemetry}
            setTelemetry={setTelemetry}
          />
        )}

        {activeTab === 'targets' && (
          <DebrisInventoryTable
            targets={targets}
            onSelectTarget={(target) => setSelectedTarget(target)}
          />
        )}
      </main>

      {/* 6. Target Detail & Physics Inspector Modal */}
      {selectedTarget && (
        <InspectorModal
          target={selectedTarget}
          metadata={currentMission.metadata}
          onClose={() => setSelectedTarget(null)}
        />
      )}

      {/* 7. Geospatial & Reports Export Modal */}
      {showExportModal && (
        <ExportModal
          targets={targets}
          metadata={currentMission.metadata}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* 8. User Sonar Scan Image Upload & Analysis Modal */}
      {showUploadModal && (
        <UploadScanModal
          metadata={currentMission.metadata}
          onClose={() => setShowUploadModal(false)}
          onAddTargetToMission={(newTarget) => {
            handleCustomUpload(newTarget);
          }}
        />
      )}
    </div>
  );
}
