import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Initialize Firebase Admin with project config (no service account needed for same-project)
if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminDb = getFirestore(firebaseConfig.firestoreDatabaseId);
