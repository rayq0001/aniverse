
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// ─── Presence System ───
const HEARTBEAT_INTERVAL = 60_000; // 1 minute
const ONLINE_THRESHOLD = 2 * 60_000; // 2 minutes — if no heartbeat in 2min, consider offline

let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

async function sendHeartbeat() {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'presence', auth.currentUser.uid), {
      lastSeen: serverTimestamp(),
      isOnline: true
    });
  } catch { /* silent */ }
}

async function markOffline() {
  if (!auth.currentUser) return;
  try {
    await setDoc(doc(db, 'presence', auth.currentUser.uid), {
      lastSeen: serverTimestamp(),
      isOnline: false
    });
  } catch { /* silent */ }
}

export function startPresence() {
  if (heartbeatTimer) return;
  sendHeartbeat();
  heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  window.addEventListener('beforeunload', markOffline);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') markOffline();
    else sendHeartbeat();
  });
}

export function stopPresence() {
  if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  markOffline();
}

/** Subscribe to a user's online status. Returns unsubscribe function. */
export function onPresenceChange(uid: string, callback: (online: boolean) => void): () => void {
  return onSnapshot(doc(db, 'presence', uid), (snap) => {
    if (!snap.exists()) { callback(false); return; }
    const data = snap.data();
    if (!data.isOnline) { callback(false); return; }
    const lastSeen = data.lastSeen?.toMillis?.() || 0;
    callback(Date.now() - lastSeen < ONLINE_THRESHOLD);
  }, () => callback(false));
}

export const ONLINE_THRESHOLD_MS = ONLINE_THRESHOLD;

// Error handling helper
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
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Test connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Firestore connection failed. Please check your Firebase configuration or ensure the database is provisioned.");
    }
  }
}
testConnection();
