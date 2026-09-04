import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { AuthUser } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with the provisioned databaseId
export const db: Firestore = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Connection test on app boot as required by Firebase skill
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
    }
  }
}

testFirestoreConnection();

export function mapFirebaseUser(user: FirebaseUser | null): AuthUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL
  };
}

export async function signInWithGoogle(timeoutMs: number = 35000): Promise<AuthUser> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const err: any = new Error(
        'Sign-in popup did not respond in time. Your browser may have blocked the popup window. Please allow popups and try again.'
      );
      err.code = 'auth/popup-blocked';
      reject(err);
    }, timeoutMs);
  });

  try {
    const authPromise = (async () => {
      const result = await signInWithPopup(auth, googleProvider);
      const mapped = mapFirebaseUser(result.user);
      if (!mapped) throw new Error('Authentication failed to return a valid user');
      return mapped;
    })();

    const user = await Promise.race([authPromise, timeoutPromise]);
    return user;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function getCurrentIdToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return await currentUser.getIdToken(forceRefresh);
}
