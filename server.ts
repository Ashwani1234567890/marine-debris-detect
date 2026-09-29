import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// API health endpoint for Google Cloud Run load balancers
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'JAL LOCHAN (Acoustic Debris Detection Engine)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    cloud: 'Google Cloud Run',
  });
});

// Acoustic Telemetry status endpoint
app.get('/api/telemetry/status', (req, res) => {
  res.json({
    engine: 'TensorRT FP16 / ONNX Runtime',
    hardwareTarget: 'NVIDIA Jetson Orin AGX / Cloud TPU',
    samplingRateHz: 15,
    channels: ['CH-1 (Port)', 'CH-2 (Starboard)'],
    offlineAUVReady: true,
  });
});

// Serve frontend static files in production
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('JAL LOCHAN Backend API operational. Frontend building in progress.');
    }
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[JAL LOCHAN] Cloud Run Server listening on http://0.0.0.0:${PORT}`);
});
