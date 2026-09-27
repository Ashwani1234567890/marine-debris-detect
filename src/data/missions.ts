import { MissionDataset, DetectedDebrisTarget, FilterState, DebrisClass, RiskLevel } from '../types/sonar';

export const MISSION_DATASETS: MissionDataset[] = [
  {
    id: 'mission_baltic_uxo_04',
    name: 'Baltic Sea Bornholm Basin Munitions & Ghost Net Sweep',
    region: 'Baltic Sea (Bornholm Deep)',
    description: 'High-density debris survey across historical dumping grounds and commercial cod trawling routes. Dual-head CV detects high-risk UXO and extensive derelict gillnet entanglements.',
    metadata: {
      missionId: 'BALTIC-2026-04B',
      missionName: 'Bornholm Deep Acoustic Remediation Survey',
      locationName: 'Bornholm Basin, Sector 7-C',
      surveyVessel: 'R/V Alkor (GEOMAR)',
      auvModel: 'Kongsberg HUGIN Edge AUV',
      sensorFrequencyKhz: 450,
      pingRateHz: 15,
      maxRangeMeters: 75,
      sampleIntervalMeters: 0.12,
      waterDepthMeters: 72.4,
      towfishAltitudeMeters: 12.0,
      surveySpeedKnots: 3.2,
      startLat: 55.314200,
      startLon: 15.421800,
      baseHeadingDeg: 42.0
    },
    falsePositivesCount: 6,
    tracklinePoints: [
      { lat: 55.314200, lon: 15.421800, depth: 71.8 },
      { lat: 55.315600, lon: 15.423700, depth: 72.1 },
      { lat: 55.317000, lon: 15.425500, depth: 72.4 },
      { lat: 55.318400, lon: 15.427300, depth: 72.9 },
      { lat: 55.319800, lon: 15.429200, depth: 73.2 },
      { lat: 55.321200, lon: 15.431000, depth: 72.8 }
    ],
    targets: [
      {
        id: 'TGT-BALTIC-01',
        label: 'Continuous Ghost Gillnet Complex',
        debrisClass: 'ghost_net',
        modelHead: 'unet',
        channel: 'port',
        pingIndex: 124,
        rangeIndex: 185,
        confidence: 0.942,
        unetMask: {
          contour: [
            [130, 95], [175, 102], [210, 135], [235, 170],
            [195, 185], [150, 160], [125, 125]
          ],
          areaSqMeters: 385.5,
          permeabilityIndex: 0.42
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 38,
          shadowLength_m: 5.7,
          groundRange_m: 22.8,
          slantRange_m: 25.7,
          towfishAltitude_m: 12.0,
          calculatedHeight_m: 2.4, // (12.0 * 5.7) / (22.8 + 5.7) = 68.4 / 28.5 = 2.40m
          shadowAngleAlignmentDeg: 1.8,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 18.4
        },
        geospatial: {
          lat: 55.315842,
          lon: 15.421110,
          depth_m: 72.0,
          alongTrackOffset_m: 148.8,
          crossTrackOffset_m: -22.8
        },
        riskLevel: 'critical',
        hazardType: 'entanglement',
        acousticProfile: [14, 18, 22, 38, 85, 195, 230, 210, 80, 12, 8, 9, 10, 11, 14, 25, 32],
        recoveryProtocol: 'ROV equipped with hydraulic rotary cutter and hydraulic grabber. High marine fauna entanglement hazard (harbor porpoises/seals).',
        notes: 'Polyethylene monofilament net snagged on granite outcrop. High acoustic reflectivity on leadline with diffuse mesh backscatter.'
      },
      {
        id: 'TGT-BALTIC-02',
        label: 'WWII Aerial Bomb / Cylindrical UXO',
        debrisClass: 'uxo',
        modelHead: 'yolov8_obb',
        channel: 'starboard',
        pingIndex: 288,
        rangeIndex: 395,
        confidence: 0.968,
        obb: {
          cx: 480,
          cy: 288,
          width: 22,
          height: 54,
          angleDeg: -28.5
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 24,
          shadowLength_m: 3.6,
          groundRange_m: 31.4,
          slantRange_m: 33.6,
          towfishAltitude_m: 12.0,
          calculatedHeight_m: 1.23, // (12.0 * 3.6) / (31.4 + 3.6) = 43.2 / 35.0 = 1.23m
          shadowAngleAlignmentDeg: 0.6,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 24.8
        },
        geospatial: {
          lat: 55.317920,
          lon: 15.428980,
          depth_m: 72.6,
          alongTrackOffset_m: 345.6,
          crossTrackOffset_m: 31.4
        },
        riskLevel: 'critical',
        hazardType: 'toxic_ordnance',
        acousticProfile: [12, 15, 28, 90, 245, 255, 220, 45, 4, 3, 5, 6, 8, 12, 28, 30],
        recoveryProtocol: 'DO NOT DISTURB WITH ROV CLAW. Transmit geocoordinates to Naval Explosive Ordnance Disposal (EOD) Unit Flensburg.',
        notes: 'Distinct metallic acoustic specular peak followed by crisp triangular acoustic shadow. Dimensions match 500lb unexploded aerial munition.'
      },
      {
        id: 'TGT-BALTIC-03',
        label: 'Industrial Chemical / Heavy Steel Drum',
        debrisClass: 'drum',
        modelHead: 'yolov8_obb',
        channel: 'port',
        pingIndex: 412,
        rangeIndex: 215,
        confidence: 0.885,
        obb: {
          cx: 215,
          cy: 412,
          width: 18,
          height: 28,
          angleDeg: 12.0
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 16,
          shadowLength_m: 2.1,
          groundRange_m: 18.5,
          slantRange_m: 22.0,
          towfishAltitude_m: 12.0,
          calculatedHeight_m: 1.22, // (12 * 2.1) / (18.5 + 2.1) = 25.2 / 20.6 = 1.22m
          shadowAngleAlignmentDeg: 1.2,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 19.2
        },
        geospatial: {
          lat: 55.319450,
          lon: 15.423980,
          depth_m: 73.0,
          alongTrackOffset_m: 494.4,
          crossTrackOffset_m: -18.5
        },
        riskLevel: 'high',
        hazardType: 'toxic_ordnance',
        acousticProfile: [15, 20, 40, 180, 240, 190, 40, 6, 7, 8, 9, 12, 24, 30],
        recoveryProtocol: 'ROV suction sampler inspection before hoisting. Check containment envelope for arsenic/chemical corrosion.',
        notes: '200L standard drum profile lying on port bilge. Acoustic shadow matches 1.2m relief above seabed.'
      },
      {
        id: 'TGT-BALTIC-04',
        label: 'Rejected Candidate: Natural Glacial Moraine Boulder',
        debrisClass: 'wreckage',
        modelHead: 'yolov8_obb',
        channel: 'starboard',
        pingIndex: 180,
        rangeIndex: 450,
        confidence: 0.74,
        obb: {
          cx: 450,
          cy: 180,
          width: 25,
          height: 30,
          angleDeg: 45.0
        },
        physics: {
          hasShadow: false,
          shadowLengthPixels: 2,
          shadowLength_m: 0.2,
          groundRange_m: 42.0,
          slantRange_m: 43.7,
          towfishAltitude_m: 12.0,
          calculatedHeight_m: 0.05,
          shadowAngleAlignmentDeg: 34.2,
          isPhysicsVerified: false,
          rejectionReason: 'Absence of acoustic shadow (Ho = 0.05m) and shadow angle misaligned by 34.2° — Natural gravel moraine bedform.',
          signalToNoiseRatioDb: 8.1
        },
        geospatial: {
          lat: 55.316820,
          lon: 15.430150,
          depth_m: 72.2,
          alongTrackOffset_m: 216.0,
          crossTrackOffset_m: 42.0
        },
        riskLevel: 'low',
        hazardType: 'navigational',
        acousticProfile: [20, 35, 95, 110, 85, 60, 55, 50, 45, 40, 35, 30],
        recoveryProtocol: 'None required. Verified as non-hazardous natural seabed topography.',
        notes: 'Initial CV confidence 0.74 rejected by Physics-Based Shadow Verification Engine. Prevents false mobilization of salvage vessel.'
      }
    ]
  },
  {
    id: 'mission_northsea_windfarm_12',
    name: 'North Sea Windfarm Export Cable & Rig Debris',
    region: 'Dogger Bank Offshore Wind Farm',
    description: 'Post-construction clearance corridor along high-voltage export cable routes. Identification of discarded anchor fluke, severed umbilical cables, and heavy crane wire rope.',
    metadata: {
      missionId: 'NS-DOGGER-2026-12',
      missionName: 'Array Cable Clearway Acoustic Sweep',
      locationName: 'Dogger Bank C, Substation East',
      surveyVessel: 'M/V Ocean Endeavour',
      auvModel: 'Teledyne Gavia Offshore',
      sensorFrequencyKhz: 900,
      pingRateHz: 20,
      maxRangeMeters: 60,
      sampleIntervalMeters: 0.08,
      waterDepthMeters: 38.5,
      towfishAltitudeMeters: 8.5,
      surveySpeedKnots: 2.8,
      startLat: 54.821400,
      startLon: 2.148200,
      baseHeadingDeg: 125.0
    },
    falsePositivesCount: 8,
    tracklinePoints: [
      { lat: 54.821400, lon: 2.148200, depth: 38.2 },
      { lat: 54.820200, lon: 2.151800, depth: 38.5 },
      { lat: 54.819000, lon: 2.155400, depth: 38.8 },
      { lat: 54.817800, lon: 2.159000, depth: 39.1 }
    ],
    targets: [
      {
        id: 'TGT-DOGGER-01',
        label: 'Exposed High-Voltage Armored Subsea Cable',
        debrisClass: 'cable',
        modelHead: 'unet',
        channel: 'starboard',
        pingIndex: 165,
        rangeIndex: 380,
        confidence: 0.955,
        unetMask: {
          contour: [
            [350, 110], [380, 150], [420, 210], [450, 280],
            [438, 285], [405, 215], [370, 155], [340, 115]
          ],
          areaSqMeters: 142.0,
          permeabilityIndex: 0.15
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 18,
          shadowLength_m: 1.8,
          groundRange_m: 24.5,
          slantRange_m: 25.9,
          towfishAltitude_m: 8.5,
          calculatedHeight_m: 0.58, // (8.5 * 1.8) / (24.5 + 1.8) = 15.3 / 26.3 = 0.58m
          shadowAngleAlignmentDeg: 0.8,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 22.1
        },
        geospatial: {
          lat: 54.820120,
          lon: 2.153100,
          depth_m: 38.4,
          alongTrackOffset_m: 110.0,
          crossTrackOffset_m: 24.5
        },
        riskLevel: 'critical',
        hazardType: 'infrastructure',
        acousticProfile: [10, 15, 25, 70, 220, 250, 210, 30, 8, 9, 10, 15, 28],
        recoveryProtocol: 'URGENT: Alert offshore wind control room. Cable loop unburied, susceptible to bottom-trawler gear snagging.',
        notes: 'Continuous linear metallic backscatter trace spanning 68 meters. Shadow confirms free-span off seabed by 58 cm.'
      },
      {
        id: 'TGT-DOGGER-02',
        label: 'Discarded Stevpris High-Holding Anchor',
        debrisClass: 'pipe',
        modelHead: 'yolov8_obb',
        channel: 'port',
        pingIndex: 320,
        rangeIndex: 190,
        confidence: 0.912,
        obb: {
          cx: 190,
          cy: 320,
          width: 32,
          height: 48,
          angleDeg: 62.4
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 32,
          shadowLength_m: 4.2,
          groundRange_m: 18.2,
          slantRange_m: 20.1,
          towfishAltitude_m: 8.5,
          calculatedHeight_m: 1.59, // (8.5 * 4.2) / (18.2 + 4.2) = 35.7 / 22.4 = 1.59m
          shadowAngleAlignmentDeg: 1.4,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 26.4
        },
        geospatial: {
          lat: 54.819240,
          lon: 2.150900,
          depth_m: 38.7,
          alongTrackOffset_m: 213.3,
          crossTrackOffset_m: -18.2
        },
        riskLevel: 'high',
        hazardType: 'navigational',
        acousticProfile: [18, 25, 60, 230, 255, 240, 50, 5, 6, 7, 10, 22],
        recoveryProtocol: 'Heavy lift crane vessel required. Attach 20-tonne synthetic rigging slings via ROV shackle tool.',
        notes: 'Fluke embedded with shank standing 1.59m proud of seabed. Severe snag hazard for export cable lay operations.'
      }
    ]
  },
  {
    id: 'mission_med_containers_09',
    name: 'Mediterranean Strait Container & Vehicle Tire Loss',
    region: 'Strait of Sicily / Malta Channel',
    description: 'Investigation along international freight transit lanes following severe storm cargo jettison. Identifies 40ft high-cube shipping containers and sunken tire clusters.',
    metadata: {
      missionId: 'MED-SICILY-2026-09',
      missionName: 'Strait Transit Deep Debris Localization',
      locationName: 'Malta Channel, Trackline Bravo',
      surveyVessel: 'R/V Pelagia (NIOZ)',
      auvModel: 'Kongsberg HUGIN 6000 Deep AUV',
      sensorFrequencyKhz: 300,
      pingRateHz: 10,
      maxRangeMeters: 100,
      sampleIntervalMeters: 0.16,
      waterDepthMeters: 185.0,
      towfishAltitudeMeters: 18.0,
      surveySpeedKnots: 3.5,
      startLat: 36.214000,
      startLon: 14.512000,
      baseHeadingDeg: 260.0
    },
    falsePositivesCount: 12,
    tracklinePoints: [
      { lat: 36.214000, lon: 14.512000, depth: 184.0 },
      { lat: 36.213200, lon: 14.506500, depth: 185.5 },
      { lat: 36.212400, lon: 14.501000, depth: 186.2 },
      { lat: 36.211600, lon: 14.495500, depth: 187.0 }
    ],
    targets: [
      {
        id: 'TGT-MED-01',
        label: 'Sunken 40ft High-Cube Shipping Container',
        debrisClass: 'container',
        modelHead: 'yolov8_obb',
        channel: 'port',
        pingIndex: 145,
        rangeIndex: 160,
        confidence: 0.984,
        obb: {
          cx: 160,
          cy: 145,
          width: 36,
          height: 110,
          angleDeg: 34.0
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 52,
          shadowLength_m: 8.2,
          groundRange_m: 42.0,
          slantRange_m: 45.7,
          towfishAltitude_m: 18.0,
          calculatedHeight_m: 2.94, // (18.0 * 8.2) / (42.0 + 8.2) = 147.6 / 50.2 = 2.94m
          shadowAngleAlignmentDeg: 0.5,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 28.5
        },
        geospatial: {
          lat: 36.213450,
          lon: 14.508200,
          depth_m: 185.2,
          alongTrackOffset_m: 198.0,
          crossTrackOffset_m: -42.0
        },
        riskLevel: 'high',
        hazardType: 'navigational',
        acousticProfile: [14, 18, 25, 95, 255, 255, 255, 180, 25, 4, 5, 6, 8, 14, 25],
        recoveryProtocol: 'Survey exterior corner castings with Work-Class ROV. Verify manifest for hazardous lithium/chemical cargo.',
        notes: 'Sharp rectangular specular acoustic return. Calculated height of 2.94m perfectly matches standard 40ft High-Cube (2.9m nominal).'
      },
      {
        id: 'TGT-MED-02',
        label: 'Commercial Truck / Tractor Tire Cluster',
        debrisClass: 'tire',
        modelHead: 'yolov8_obb',
        channel: 'starboard',
        pingIndex: 275,
        rangeIndex: 420,
        confidence: 0.892,
        obb: {
          cx: 420,
          cy: 275,
          width: 28,
          height: 35,
          angleDeg: -15.0
        },
        physics: {
          hasShadow: true,
          shadowLengthPixels: 22,
          shadowLength_m: 3.5,
          groundRange_m: 35.0,
          slantRange_m: 39.3,
          towfishAltitude_m: 18.0,
          calculatedHeight_m: 1.64, // (18.0 * 3.5) / (35.0 + 3.5) = 63.0 / 38.5 = 1.64m
          shadowAngleAlignmentDeg: 1.1,
          isPhysicsVerified: true,
          signalToNoiseRatioDb: 17.8
        },
        geospatial: {
          lat: 36.212720,
          lon: 14.503450,
          depth_m: 186.0,
          alongTrackOffset_m: 375.4,
          crossTrackOffset_m: 35.0
        },
        riskLevel: 'moderate',
        hazardType: 'entanglement',
        acousticProfile: [16, 22, 50, 175, 210, 160, 45, 8, 9, 10, 14, 26],
        recoveryProtocol: 'ROV multi-prong debris basket hoist. Prevent microplastic tire tread dispersion.',
        notes: 'Characteristic toroidal acoustic signature with central hollow acoustic void and crescent shadow.'
      }
    ]
  }
];

export const INITIAL_FILTER_STATE: FilterState = {
  showRaw: false,
  showSrad: true,
  showClahe: true,
  showYoloObb: true,
  showUnet: true,
  showShadowPhysics: true,
  filterPhysicsVerifiedOnly: false,
  minConfidence: 0.70,
  sradIterations: 4,
  sradDiffusionRate: 0.15,
  claheClipLimit: 2.8,
  selectedClasses: new Set<DebrisClass>([
    'ghost_net', 'pipe', 'container', 'tire', 'uxo', 'drum', 'wreckage', 'cable'
  ]),
  selectedRiskLevels: new Set<RiskLevel>(['critical', 'high', 'moderate', 'low']),
  colormap: 'bronze'
};
