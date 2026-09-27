import { DetectedDebrisTarget, SonarMetadata } from '../types/sonar';

/**
 * Projects a waterfall acoustic pixel offset (along-track & cross-track)
 * to WGS84 geodetic coordinates (Lat, Lon) using towfish kinematics.
 */
export function calculateGeotag(
  metadata: SonarMetadata,
  pingIndex: number,
  groundRange_m: number,
  channel: 'port' | 'starboard'
): { lat: number; lon: number; alongTrack_m: number; crossTrack_m: number } {
  const alongTrack_m = pingIndex * metadata.sampleIntervalMeters;
  const crossTrack_m = (channel === 'port' ? -1 : 1) * groundRange_m;

  const headingRad = (metadata.baseHeadingDeg * Math.PI) / 180;

  // Rotation matrix based on survey heading
  const deltaEast_m = crossTrack_m * Math.cos(headingRad) + alongTrack_m * Math.sin(headingRad);
  const deltaNorth_m = -crossTrack_m * Math.sin(headingRad) + alongTrack_m * Math.cos(headingRad);

  const metersPerDegreeLat = 111139.0;
  const metersPerDegreeLon = 111139.0 * Math.cos((metadata.startLat * Math.PI) / 180);

  const lat = metadata.startLat + deltaNorth_m / metersPerDegreeLat;
  const lon = metadata.startLon + deltaEast_m / metersPerDegreeLon;

  return {
    lat: Number(lat.toFixed(6)),
    lon: Number(lon.toFixed(6)),
    alongTrack_m: Number(alongTrack_m.toFixed(1)),
    crossTrack_m: Number(crossTrack_m.toFixed(1))
  };
}

/**
 * Generates an RFC 7946 compliant GeoJSON FeatureCollection
 */
export function exportToGeoJson(
  targets: DetectedDebrisTarget[],
  metadata: SonarMetadata
): string {
  const features = targets.map((t) => ({
    type: 'Feature',
    id: t.id,
    geometry: {
      type: 'Point',
      coordinates: [t.geospatial.lon, t.geospatial.lat, -t.geospatial.depth_m]
    },
    properties: {
      targetId: t.id,
      label: t.label,
      debrisClass: t.debrisClass,
      modelHead: t.modelHead,
      confidence: t.confidence,
      calculatedHeightMeters: t.physics.calculatedHeight_m,
      shadowLengthMeters: t.physics.shadowLength_m,
      groundRangeMeters: t.physics.groundRange_m,
      towfishAltitudeMeters: t.physics.towfishAltitude_m,
      isPhysicsVerified: t.physics.isPhysicsVerified,
      rejectionReason: t.physics.rejectionReason || null,
      riskLevel: t.riskLevel,
      hazardType: t.hazardType,
      recoveryProtocol: t.recoveryProtocol,
      surveyMission: metadata.missionName,
      surveySensorKhz: metadata.sensorFrequencyKhz,
      timestamp: new Date().toISOString()
    }
  }));

  const geoJson = {
    type: 'FeatureCollection',
    name: `${metadata.missionId}_Acoustic_Debris_Survey`,
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    features
  };

  return JSON.stringify(geoJson, null, 2);
}

/**
 * Generates Hydrographic Hazard Survey CSV
 */
export function exportToCsv(
  targets: DetectedDebrisTarget[],
  metadata: SonarMetadata
): string {
  const headers = [
    'Target_ID',
    'Classification',
    'Detection_Model',
    'Confidence_Score',
    'Latitude_WGS84',
    'Longitude_WGS84',
    'Water_Depth_m',
    'Towfish_Altitude_H_m',
    'Ground_Range_Rg_m',
    'Shadow_Length_Ls_m',
    'Calculated_Height_Ho_m',
    'Physics_Verified',
    'Risk_Level',
    'Hazard_Type',
    'Recommended_ROV_Recovery_Protocol'
  ];

  const rows = targets.map((t) => [
    `"${t.id}"`,
    `"${t.label}"`,
    `"${t.modelHead.toUpperCase()}"`,
    t.confidence.toFixed(3),
    t.geospatial.lat.toFixed(6),
    t.geospatial.lon.toFixed(6),
    t.geospatial.depth_m.toFixed(1),
    t.physics.towfishAltitude_m.toFixed(1),
    t.physics.groundRange_m.toFixed(1),
    t.physics.shadowLength_m.toFixed(1),
    t.physics.calculatedHeight_m.toFixed(2),
    t.physics.isPhysicsVerified ? 'VERIFIED' : 'FALSE_POSITIVE',
    `"${t.riskLevel.toUpperCase()}"`,
    `"${t.hazardType}"`,
    `"${t.recoveryProtocol.replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
}

/**
 * Generates Google Earth Pro KML Document
 */
export function exportToKml(
  targets: DetectedDebrisTarget[],
  metadata: SonarMetadata
): string {
  const placemarks = targets.map((t) => {
    const colorHex = t.riskLevel === 'critical' ? 'ff0000ff' : t.riskLevel === 'high' ? 'ff0088ff' : 'ff00ffff';
    return `    <Placemark>
      <name>${t.label} [${t.id}]</name>
      <description><![CDATA[
        <h3>${t.label} (${t.debrisClass})</h3>
        <p><b>Status:</b> ${t.physics.isPhysicsVerified ? 'Physics Verified Anthropogenic Debris' : 'Rejected False Positive'}</p>
        <p><b>Calculated Height (Ho):</b> ${t.physics.calculatedHeight_m} m</p>
        <p><b>Acoustic Shadow (Ls):</b> ${t.physics.shadowLength_m} m</p>
        <p><b>Ground Range (Rg):</b> ${t.physics.groundRange_m} m</p>
        <p><b>Depth:</b> ${t.geospatial.depth_m} m</p>
        <p><b>Confidence:</b> ${(t.confidence * 100).toFixed(1)}%</p>
        <p><b>Risk Rating:</b> ${t.riskLevel.toUpperCase()}</p>
        <p><b>ROV Protocol:</b> ${t.recoveryProtocol}</p>
      ]]></description>
      <Style>
        <IconStyle>
          <color>${colorHex}</color>
          <scale>1.2</scale>
          <Icon>
            <href>http://maps.google.com/mapfiles/kml/shapes/caution.png</href>
          </Icon>
        </IconStyle>
      </Style>
      <Point>
        <coordinates>${t.geospatial.lon},${t.geospatial.lat},${-t.geospatial.depth_m}</coordinates>
      </Point>
    </Placemark>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${metadata.missionName} - Hazard Report</name>
    <description>AI-Powered Acoustic Sonar Debris Survey conducted by ${metadata.surveyVessel}</description>
${placemarks}
  </Document>
</kml>`;
}

/**
 * Triggers file download in client browser
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
