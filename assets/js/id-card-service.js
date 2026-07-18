// MeeladPulse ID Card Service
import { db } from "./firebase-init.js";
import { collection, getDocs, query, where, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getActiveFestivalId, getActiveScope } from "./firestore-service.js";

/**
 * Returns the public verification URL for a specific card.
 */
export function getVerificationUrl(id, role, festId) {
  const origin = window.location.origin;
  return `${origin}/public/verify.html?id=${id}&role=${role}&festId=${festId}`;
}

/**
 * Generates the QR Code Image URL.
 */
export function getQrCodeImageUrl(dataString) {
  const encoded = encodeURIComponent(dataString);
  return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encoded}`;
}

/**
 * Registers/Syncs a public-safe ID card verification record in Firestore under verificationDocs.
 */
export async function syncIdCardVerification(item, festId) {
  if (!festId || !item || !item.id) return;
  
  try {
    const verDocRef = doc(db, window.meeladPulseScopedFestivalPath('verificationDocs'), item.id);
    const cats = { cat_subjunior: 'Sub-Junior', cat_junior: 'Junior', cat_senior: 'Senior' };
    
    let subDetails = "";
    let status = "inactive";
    let statusLabel = "INACTIVE ACCESS PASS (SUSPENDED)";
    let documentNo = item.id.slice(-5).toUpperCase();

    if (item.role === 'student') {
      subDetails = `Chest Number: ${item.chestNumber || 'N/A'} • Category: ${cats[item.categoryId] || 'Student'}`;
      status = item.status === 'active' ? 'valid' : 'inactive';
      statusLabel = item.status === 'active' ? 'VERIFIED PARTICIPANT (ACTIVE)' : 'PENDING OR INACTIVE PARTICIPANT';
      documentNo = item.chestNumber || item.id.slice(-5).toUpperCase();
    } else {
      const roles = {
        admin: 'System Administrator',
        judge: 'Panel Judge',
        teamLeader: 'Team Leader',
        volunteer: 'Volunteer Staff'
      };
      subDetails = roles[item.role] || item.role || 'Volunteer Staff';
      status = item.active === true ? 'valid' : 'inactive';
      statusLabel = item.active === true ? 'VERIFIED STAFF ACCESS (ACTIVE)' : 'INACTIVE ACCESS PASS (SUSPENDED)';
    }

    const payload = {
      festId,
      documentType: 'id_card',
      name: item.name || 'Anonymous User',
      subDetails,
      teamId: item.teamId || 'STAFF',
      status,
      statusLabel,
      issuedAt: item.updatedAt || serverTimestamp(),
      documentNo
    };

    await setDoc(verDocRef, payload, { merge: true });
  } catch (err) {
    console.error("Error syncing ID Card verification:", err);
  }
}

/**
 * Fetches all active/approved festival students for ID cards and registers/syncs their verification records.
 */
export async function getFestivalStudentsForCards() {
  const festId = getActiveFestivalId();
  const path = window.meeladPulseScopedFestivalPath('festStudents');
  const snap = await getDocs(collection(db, path));
  
  const list = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      chestNumber: data.chestNumber,
      categoryId: data.categoryId,
      teamId: data.teamId,
      status: data.status,
      role: 'student',
      ...data
    };
  }).filter(s => s.status === 'active');

  // Trigger non-blocking async sync of verification records for active students
  list.forEach(s => syncIdCardVerification(s, festId));

  return list;
}

/**
 * Fetches system users (Admins, Judges, Team Leaders, Volunteers) and registers/syncs their verification records.
 */
export async function getSystemUsersForCards() {
  const festId = getActiveFestivalId();
  const { institutionId } = getActiveScope();
  const q = query(collection(db, "users"), where("active", "==", true), where("institutionId", "==", institutionId));
  const snap = await getDocs(q);
  
  const list = snap.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name || 'Anonymous User',
      email: data.email,
      role: data.role || 'volunteer',
      teamId: data.teamId || '',
      ...data
    };
  });

  // Trigger non-blocking async sync of verification records for active staff
  if (festId) {
    list.forEach(u => syncIdCardVerification(u, festId));
  }

  return list;
}
