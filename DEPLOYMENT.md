# JAL LOCHAN - Deployment Architecture Guide

This guide details the deployment process for:
1. **Frontend**: Vercel (Fast Global Edge CDN)
2. **Backend**: Google Cloud Run (Containerized Microservice)
3. **Database & Auth**: Google Cloud Firestore & Firebase Auth

---

## 1. Frontend Deployment on Vercel

The application is pre-configured with `vercel.json` for seamless Vite SPA hosting with automatic client-side rewrites.

### Option A: Via Vercel CLI (Recommended)
```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy from the root folder
vercel

# 3. For production deployment
vercel --prod
```

### Option B: Via Vercel Web Dashboard (Git Integration)
1. Push your repository to GitHub / GitLab / Bitbucket.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel automatically detects the Vite framework:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add any required runtime variables (e.g., `VITE_APP_URL`).
5. Click **Deploy**.

---

## 2. Backend Deployment on Google Cloud Run

The backend is packaged with a multi-stage `Dockerfile` and `server.ts` configured for Google Cloud Run's port `8080` standard.

### Prerequisites:
- Google Cloud SDK (`gcloud`) installed and authenticated.
- Enabled APIs: `run.googleapis.com` and `artifactregistry.googleapis.com`.

### One-Command Deployment:
```bash
# 1. Authenticate with your Google Cloud account
gcloud auth login

# 2. Set your Google Cloud Project ID
gcloud config set project emergent-woodland-hsmzh

# 3. Deploy directly from source via Cloud Build
gcloud run deploy jal-lochan-backend \
  --source . \
  --region asia-southeast1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi
```
Or execute the automated deployment script:
```bash
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh
```

---

## 3. Firebase Firestore & Security Rules

The application uses Firebase Project: `emergent-woodland-hsmzh` with database `ai-studio-jallochanaiacous-a92301ec-301a-4358-b887-9aa6b46a2f14`.

- **Rules**: Hardened Zero-Trust ABAC rules in `firestore.rules`.
- **Entities**: Documented in `firebase-blueprint.json`.
- **Deploy Rules**:
```bash
firebase deploy --only firestore:rules
```
