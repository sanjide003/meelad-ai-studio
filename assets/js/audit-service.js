// MeeladPulse Audit Log Service
import { db } from "./firebase-init.js";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Creates an audit log record in the festival's private audit subcollection.
 */
export async function createAuditLog(festId, action, targetId, details, userUid, userEmail) {
  try {
    const colRef = collection(db, `festivals/${festId}/auditLogs`);
    const logDoc = {
      action,
      targetId,
      details: typeof details === 'string' ? details : JSON.stringify(details),
      performedBy: userUid || 'unknown_user',
      performedByEmail: userEmail || 'unknown@example.com',
      timestamp: serverTimestamp()
    };
    await addDoc(colRef, logDoc);
    console.log(`[Audit] ${action} performed on ${targetId}`);
    return true;
  } catch (err) {
    console.error("Failed to write audit log:", err);
    return false;
  }
}

/**
 * Compatibility wrapper for other services.
 */
export async function logAuditEvent(action, targetId, details, meta = {}) {
  const festId = localStorage.getItem('meeladpulse_selected_fest_id') || 'fest_default';
  return createAuditLog(festId, action, targetId, { message: details, ...meta }, null, null);
}

/**
 * Returns audit logs for a target inside the selected festival.
 * Kept as a named export for admin mark-review imports.
 */
export async function getAuditLogsForTarget(targetId, action = null) {
  const festId = localStorage.getItem('meeladpulse_selected_fest_id') || 'fest_default';
  const constraints = [where('targetId', '==', targetId)];

  if (action) {
    constraints.push(where('action', '==', action));
  }

  const snapshot = await getDocs(query(collection(db, `festivals/${festId}/auditLogs`), ...constraints));
  return snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data()
  })).sort((a, b) => {
    const aMillis = a.timestamp?.toMillis?.() || 0;
    const bMillis = b.timestamp?.toMillis?.() || 0;
    return bMillis - aMillis;
  });
}
