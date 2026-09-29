import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  setDoc, 
  collection, 
  onSnapshot, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { DetectedDebrisTarget, MissionDataset } from '../types/sonar';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection as required by skill guidelines
export async function testConnection(): Promise<boolean> {
  const testPath = 'test/connection';
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline or connecting...');
      return false;
    }
    // Expected in brand new collection
    return true;
  }
}

// Authentication Helpers
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign-Out Error:', error);
    throw error;
  }
}

// Save Mission Metadata to Firestore
export async function saveMissionToFirestore(mission: MissionDataset): Promise<void> {
  const path = `missions/${mission.id}`;
  try {
    await setDoc(doc(db, 'missions', mission.id), {
      id: mission.id,
      name: mission.name,
      region: mission.region,
      description: mission.description,
      surveyVessel: mission.metadata.surveyVessel,
      auvModel: mission.metadata.auvModel,
      waterDepthMeters: mission.metadata.waterDepthMeters,
      towfishAltitudeMeters: mission.metadata.towfishAltitudeMeters,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Save Target to Firestore subcollection
export async function saveTargetToFirestore(missionId: string, target: DetectedDebrisTarget): Promise<void> {
  const path = `missions/${missionId}/targets/${target.id}`;
  try {
    await setDoc(doc(db, 'missions', missionId, 'targets', target.id), {
      id: target.id,
      label: target.label,
      debrisClass: target.debrisClass,
      modelHead: target.modelHead,
      channel: target.channel,
      confidence: target.confidence,
      calculatedHeight_m: target.physics.calculatedHeight_m,
      shadowLength_m: target.physics.shadowLength_m,
      groundRange_m: target.physics.groundRange_m,
      towfishAltitude_m: target.physics.towfishAltitude_m,
      isPhysicsVerified: target.physics.isPhysicsVerified,
      riskLevel: target.riskLevel,
      hazardType: target.hazardType,
      lat: target.geospatial.lat,
      lon: target.geospatial.lon,
      depth_m: target.geospatial.depth_m,
      recoveryProtocol: target.recoveryProtocol,
      createdBy: auth.currentUser?.uid || 'guest-surveyor',
      createdAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Real-time listener for mission targets
export function subscribeToMissionTargets(
  missionId: string,
  onUpdate: (targets: DetectedDebrisTarget[]) => void
): () => void {
  const path = `missions/${missionId}/targets`;
  const targetsCollection = collection(db, 'missions', missionId, 'targets');

  return onSnapshot(
    targetsCollection,
    (snapshot) => {
      const firestoreTargets: DetectedDebrisTarget[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: d.id || docSnap.id,
          label: d.label || 'Debris Target',
          debrisClass: d.debrisClass || 'wreckage',
          modelHead: d.modelHead || 'yolov8_obb',
          channel: d.channel || 'port',
          pingIndex: 180,
          rangeIndex: Math.round((d.groundRange_m || 20) * 8),
          confidence: d.confidence || 0.9,
          physics: {
            hasShadow: (d.shadowLength_m || 0) > 0.4,
            shadowLengthPixels: Math.round((d.shadowLength_m || 0) * 10),
            shadowLength_m: d.shadowLength_m || 0,
            groundRange_m: d.groundRange_m || 20,
            slantRange_m: Math.sqrt(Math.pow(d.groundRange_m || 20, 2) + Math.pow(d.towfishAltitude_m || 12, 2)),
            towfishAltitude_m: d.towfishAltitude_m || 12,
            calculatedHeight_m: d.calculatedHeight_m || 0,
            shadowAngleAlignmentDeg: 0.8,
            isPhysicsVerified: d.isPhysicsVerified ?? true,
            signalToNoiseRatioDb: 22.0,
          },
          geospatial: {
            lat: d.lat || 0,
            lon: d.lon || 0,
            depth_m: d.depth_m || 70,
            alongTrackOffset_m: 100,
            crossTrackOffset_m: d.groundRange_m || 20,
          },
          riskLevel: d.riskLevel || 'high',
          hazardType: d.hazardType || 'navigational',
          acousticProfile: [15, 25, 70, 210, 255, 230, 45, 5, 6, 7, 10, 24],
          recoveryProtocol: d.recoveryProtocol || 'Standard ROV recovery protocol',
          notes: 'Synced from cloud Firestore database',
        };
      });

      if (firestoreTargets.length > 0) {
        onUpdate(firestoreTargets);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
