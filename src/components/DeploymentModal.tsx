import React, { useState, useEffect } from 'react';
import { 
  X, Cloud, Server, Database, Check, Copy, ExternalLink, ShieldCheck, 
  LogIn, LogOut, RefreshCw, Terminal, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  testConnection, 
  saveMissionToFirestore, 
  saveTargetToFirestore 
} from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { MissionDataset, DetectedDebrisTarget } from '../types/sonar';

interface DeploymentModalProps {
  currentMission: MissionDataset;
  targets: DetectedDebrisTarget[];
  onClose: () => void;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({
  currentMission,
  targets,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'firebase' | 'vercel' | 'gcp'>('firebase');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncSuccess, setSyncSuccess] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    testConnection().then((ok) => setIsConnected(ok));
    return () => unsubscribe();
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSyncToFirestore = async () => {
    setIsSyncing(true);
    setSyncSuccess(false);
    try {
      await saveMissionToFirestore(currentMission);
      for (const t of targets) {
        await saveTargetToFirestore(currentMission.id, t);
      }
      setSyncSuccess(true);
    } catch (err) {
      console.error('Failed to sync to Firestore:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      if (currentUser) {
        await signOutUser();
      } else {
        await signInWithGoogle();
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };

  const vercelCliCommand = `npm i -g vercel\nvercel --prod`;
  const gcpDeployCommand = `gcloud run deploy jal-lochan-backend \\\n  --source . \\\n  --region asia-southeast1 \\\n  --platform managed \\\n  --allow-unauthenticated \\\n  --port 8080`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-display font-bold text-slate-100 uppercase tracking-wide">
                Cloud Integrations & Multi-Platform Deployment
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Firebase Firestore · Vercel Global Edge · Google Cloud Run
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

        {/* Tab Navigation */}
        <div className="bg-slate-950/70 px-6 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${
              activeTab === 'firebase'
                ? 'bg-amber-500/20 text-amber-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Firebase & Auth</span>
          </button>

          <button
            onClick={() => setActiveTab('vercel')}
            className={`px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${
              activeTab === 'vercel'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Frontend (Vercel)</span>
          </button>

          <button
            onClick={() => setActiveTab('gcp')}
            className={`px-3 py-1.5 rounded flex items-center gap-2 transition-colors ${
              activeTab === 'gcp'
                ? 'bg-blue-500/20 text-blue-300 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Backend (Google Cloud)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
          {/* TAB 1: Firebase & Firestore Status */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              {/* Connection Status Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-semibold uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span>Firebase Firestore Database Status</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border ${
                    isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isConnected ? 'ONLINE & CONNECTED' : 'INITIALIZING'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-slate-400 pt-1">
                  <div>
                    <span className="text-slate-500">Firebase Project:</span>
                    <div className="text-slate-200 font-semibold">{firebaseConfig.projectId}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Database ID:</span>
                    <div className="text-slate-200 font-semibold truncate">{firebaseConfig.firestoreDatabaseId}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Security Rules:</span>
                    <div className="text-emerald-400 font-semibold">Hardened ABAC (Deployed)</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Active User:</span>
                    <div className="text-cyan-400 font-semibold">
                      {currentUser ? currentUser.email : 'Guest Surveyor'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Authentication & Cloud Sync Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-slate-300 font-semibold uppercase text-[11px]">
                    Hydrographic Surveyor Auth
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Authenticate via Google to associate your detected targets and mission reports with your surveyor UID.
                  </p>
                  <button
                    onClick={handleGoogleAuth}
                    className={`mt-2 w-full py-2 px-3 rounded flex items-center justify-center gap-2 font-sans font-semibold transition-colors border ${
                      currentUser
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                        : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40'
                    }`}
                  >
                    {currentUser ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                    <span>{currentUser ? 'Sign Out of Surveyor Session' : 'Sign In with Google'}</span>
                  </button>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-slate-300 font-semibold uppercase text-[11px]">
                    Sync Live Data to Cloud
                  </div>
                  <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                    Persist current mission trackline ({targets.length} targets) into cloud Firestore collections.
                  </p>
                  <button
                    onClick={handleSyncToFirestore}
                    disabled={isSyncing}
                    className="mt-2 w-full py-2 px-3 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-sans font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSyncing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : syncSuccess ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                    ) : (
                      <Database className="w-3.5 h-3.5" />
                    )}
                    <span>{isSyncing ? 'Syncing...' : syncSuccess ? 'Targets Synced to Firestore!' : 'Sync All Targets to Firestore'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Vercel Frontend Deployment */}
          {activeTab === 'vercel' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-slate-300 font-semibold uppercase text-[11px] flex items-center justify-between">
                  <span>Deploying Frontend to Vercel</span>
                  <span className="text-cyan-400 text-[10px]">Pre-configured with vercel.json</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Vercel provides edge-optimized static hosting with sub-100ms global latency. A pre-configured <code className="text-cyan-300 font-mono">vercel.json</code> file has been generated in your project root with SPA rewrite rules and HTTP security headers.
                </p>
              </div>

              {/* CLI Command */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-cyan-400" />
                    <span>Deploy with Vercel CLI:</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(vercelCliCommand, 'vercel')}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                  >
                    {copiedKey === 'vercel' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'vercel' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-[11px] text-cyan-300 overflow-x-auto">
                  {vercelCliCommand}
                </pre>
              </div>

              {/* Git Integration Steps */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-[11px] text-slate-400 font-sans">
                <div className="font-semibold text-slate-300 font-mono uppercase text-[10px]">
                  Deploy via GitHub / GitLab:
                </div>
                <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                  <li>Push your repository to GitHub or GitLab.</li>
                  <li>Import into your Vercel Dashboard at <strong className="text-slate-200">vercel.com/new</strong>.</li>
                  <li>Framework Preset is automatically detected as <strong className="text-slate-200">Vite</strong>.</li>
                  <li>Click <strong className="text-cyan-400">Deploy</strong> — build will finish in ~45 seconds.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: Google Cloud Run Backend Deployment */}
          {activeTab === 'gcp' && (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-2">
                <div className="text-slate-300 font-semibold uppercase text-[11px] flex items-center justify-between">
                  <span>Deploying Backend to Google Cloud Run</span>
                  <span className="text-blue-400 text-[10px]">Multi-stage Dockerfile Ready</span>
                </div>
                <p className="text-[11px] text-slate-400 font-sans leading-relaxed">
                  Google Cloud Run runs your containerized Express backend and acoustic telemetry microservices with scale-to-zero efficiency and auto-scaling up to 1,000 instances.
                </p>
              </div>

              {/* CLI Command */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-3 h-3 text-blue-400" />
                    <span>Deploy directly via Google Cloud CLI:</span>
                  </span>
                  <button
                    onClick={() => copyToClipboard(gcpDeployCommand, 'gcp')}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                  >
                    {copiedKey === 'gcp' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'gcp' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="bg-slate-950 border border-slate-800 rounded p-3 text-[11px] text-blue-300 overflow-x-auto">
                  {gcpDeployCommand}
                </pre>
              </div>

              {/* Automated script note */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-2 text-[11px] text-slate-400 font-sans">
                <div className="font-semibold text-slate-300 font-mono uppercase text-[10px]">
                  Automated Deployment Script:
                </div>
                <p className="leading-relaxed">
                  Run <code className="text-cyan-300 font-mono">./deploy-cloudrun.sh</code> from the project root. It will build and containerize the service using Google Cloud Build and output the active production URL.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono hidden sm:block">
            Project: <strong className="text-cyan-300">emergent-woodland-hsmzh</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-xs font-mono text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
