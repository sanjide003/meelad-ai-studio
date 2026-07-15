// MeeladPulse Backup & Disaster Recovery Service
import { db } from "./firebase-init.js";
import { 
  collection, 
  doc, 
  getDocs, 
  writeBatch 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { assertOnline } from "./network-status.js";

/**
 * Creates a complete consolidated backup of the active festival workspace.
 */
export async function exportDatabaseBackup(activeFestId) {
  assertOnline('Database Backup');
  
  const subcollections = [
    'festStudents',
    'results',
    'teams',
    'competitions',
    'teamTotals',
    'correctionRequests',
    'announcements'
  ];

  const backupData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      festivalId: activeFestId,
      system: "MeeladPulse Secure Registry Backup"
    },
    payload: {}
  };

  const queries = subcollections.map(async (colName) => {
    const snap = await getDocs(collection(db, window.meeladPulseScopedFestivalPath(colName)));
    backupData.payload[colName] = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });

  await Promise.all(queries);
  return backupData;
}

/**
 * Restores a database snapshot from backup data.
 */
export async function restoreDatabaseBackup(activeFestId, backupObj) {
  assertOnline('Backup Restore');

  if (!backupObj || !backupObj.metadata || !backupObj.payload) {
    throw new Error("Invalid backup structure. Required metadata or payload attributes are missing.");
  }

  const collections = backupObj.payload;
  let opsCount = 0;
  let currentBatch = writeBatch(db);

  const commitBatchIfLimit = async () => {
    opsCount++;
    if (opsCount >= 400) {
      await currentBatch.commit();
      currentBatch = writeBatch(db);
      opsCount = 0;
    }
  };

  for (const [colName, docs] of Object.entries(collections)) {
    if (!Array.isArray(docs)) continue;

    for (const docData of docs) {
      const { id, ...fields } = docData;
      if (!id) continue;

      const docRef = doc(db, window.meeladPulseScopedFestivalPath(colName), id);
      currentBatch.set(docRef, fields, { merge: true });
      await commitBatchIfLimit();
    }
  }

  await currentBatch.commit();
  return true;
}
