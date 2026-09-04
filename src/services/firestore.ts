import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { deleteReflectionEntry, deleteDecisionCard } from './api';
import type { JournalEntry, DecisionCard } from '../types';

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Recursively cleans an object by removing any keys with `undefined` values,
 * since Firestore's SDK throws an error if any field in a document payload is `undefined`.
 */
function removeUndefinedValues<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => removeUndefinedValues(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefinedValues(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

export async function fetchUserEntries(uid: string): Promise<JournalEntry[]> {
  if (!uid) return [];
  const entriesPath = `users/${uid}/entries`;
  try {
    const entriesRef = collection(db, 'users', uid, 'entries');
    const q = query(entriesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: uid,
        title: data.title || 'Untitled Reflection',
        messages: data.messages || [],
        summary: data.summary || '',
        tags: data.tags || [],
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      } as JournalEntry;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, entriesPath);
  }
}

export async function saveUserEntry(uid: string, entry: Omit<JournalEntry, 'userId'>): Promise<JournalEntry> {
  if (!uid) throw new Error('Authentication required to save journal entry');
  const path = `users/${uid}/entries/${entry.id}`;
  const docRef = doc(db, 'users', uid, 'entries', entry.id);
  const now = new Date().toISOString();
  
  const payload = {
    ...entry,
    summary: entry.summary || '',
    tags: entry.tags || [],
    userId: uid,
    updatedAt: now,
    createdAt: entry.createdAt || now
  };

  const cleanPayload = removeUndefinedValues(payload);

  try {
    await setDoc(docRef, cleanPayload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteUserEntry(uid: string, entryId: string): Promise<void> {
  if (!uid) throw new Error('Authentication required to delete journal entry');
  if (!entryId) throw new Error('Reflection identifier is required to delete');
  // Backend verifies Firebase ID token, derives UID from verified token, and enforces ownership
  await deleteReflectionEntry(entryId);
}

export async function fetchUserDecisions(uid: string): Promise<DecisionCard[]> {
  if (!uid) return [];
  const decisionsPath = `users/${uid}/decisions`;
  try {
    const decisionsRef = collection(db, 'users', uid, 'decisions');
    const q = query(decisionsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: uid,
        decision: data.decision || '',
        options: data.options || [],
        whatMatters: data.whatMatters || [],
        pros: data.pros || [],
        cons: data.cons || [],
        tradeOffs: data.tradeOffs || [],
        risks: data.risks || [],
        nextAction: data.nextAction || '',
        deadline: data.deadline || '',
        unresolvedQuestions: data.unresolvedQuestions || [],
        confidence: data.confidence || 'Medium',
        status: data.status || 'Draft',
        sourceEntryId: data.sourceEntryId || '',
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      } as DecisionCard;
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, decisionsPath);
  }
}

export async function saveUserDecision(uid: string, decision: Omit<DecisionCard, 'userId'>): Promise<DecisionCard> {
  if (!uid) throw new Error('Authentication required to save decision card');
  const path = `users/${uid}/decisions/${decision.id}`;
  const docRef = doc(db, 'users', uid, 'decisions', decision.id);
  const now = new Date().toISOString();

  const payload: DecisionCard = {
    ...decision,
    sourceEntryId: decision.sourceEntryId || '',
    deadline: decision.deadline || '',
    userId: uid,
    updatedAt: now,
    createdAt: decision.createdAt || now
  };

  const cleanPayload = removeUndefinedValues(payload);

  try {
    await setDoc(docRef, cleanPayload, { merge: true });
    return payload;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserDecisionStatus(
  uid: string, 
  decisionId: string, 
  status: 'Draft' | 'Approved' | 'Done'
): Promise<void> {
  if (!uid) throw new Error('Authentication required');
  const path = `users/${uid}/decisions/${decisionId}`;
  const docRef = doc(db, 'users', uid, 'decisions', decisionId);
  try {
    await updateDoc(docRef, removeUndefinedValues({
      status,
      updatedAt: new Date().toISOString()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteUserDecision(uid: string, decisionId: string): Promise<void> {
  if (!uid) throw new Error('Authentication required to delete decision card');
  if (!decisionId || !decisionId.trim()) throw new Error('Decision Card identifier is required to delete');

  // Verify auth matches current authenticated session
  if (auth.currentUser && auth.currentUser.uid !== uid) {
    throw new Error('Unauthorized: User identifier mismatch');
  }

  // 1. First attempt authenticated server-side deletion where token is verified on the backend
  let apiSucceeded = false;
  try {
    await deleteDecisionCard(decisionId.trim());
    apiSucceeded = true;
  } catch (apiErr: any) {
    console.warn('[Decision Delete API warning]:', apiErr?.message || apiErr);
  }

  if (apiSucceeded) {
    return;
  }

  // 2. Direct authenticated client SDK deleteDoc fallback (enforced by Firestore security rules)
  const currentUid = auth.currentUser?.uid || uid;
  const path = `users/${currentUid}/decisions/${decisionId.trim()}`;
  const docRef = doc(db, 'users', currentUid, 'decisions', decisionId.trim());
  try {
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
