// MeeladPulse Announcement and Notification Service
import { db, auth } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  setDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getActiveFestivalId, handleFirestoreError, OperationType, assertAdminRole } from "./firestore-service.js";

/**
 * Creates an announcement (Admin Only).
 */
export async function createAnnouncement(title, content, targetRole = 'all') {
  assertAdminRole();
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('announcements');
  try {
    const payload = {
      title,
      content,
      targetRole, // 'all' | 'judge' | 'team_leader'
      createdBy: auth.currentUser?.uid || 'admin',
      createdByName: auth.currentUser?.displayName || 'Administrator',
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, path), payload);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

/**
 * Loads announcements readable by a specific role.
 */
export async function getAnnouncementsForRole(role) {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('announcements');
  try {
    // We get announcements that target 'all' or the user's role, ordered by timestamp
    const snap = await getDocs(collection(db, path));
    const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Filter and sort client-side to prevent complex index errors
    return list
      .filter(a => a.targetRole === 'all' || a.targetRole === role)
      .sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA; // desc
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
