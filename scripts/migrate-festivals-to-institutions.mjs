/**
 * One-time migration helper for moving legacy `festivals/{festivalId}` data into
 * `institutions/{institutionId}/festivals/{festivalId}`.
 *
 * Usage after configuring Firebase Admin credentials:
 *   node scripts/migrate-festivals-to-institutions.mjs
 *
 * This script is intentionally conservative: it copies known subcollections and
 * does not delete legacy data. Remove legacy `/festivals` write rules only after
 * validating the copied data in production.
 */
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const app = initializeApp({ credential: process.env.GOOGLE_APPLICATION_CREDENTIALS ? applicationDefault() : undefined });
const db = getFirestore(app);

const SUBCOLLECTIONS = [
  'divisions',
  'subdivisions',
  'categories',
  'teams',
  'manualUsers',
  'festStudents',
  'competitions',
  'entries',
  'judgeAssignments',
  'judgeMarks',
  'results',
  'teamTotals',
  'publicData',
  'certificates',
  'verificationDocs',
  'announcements',
  'auditLogs',
];

async function copyCollection(sourceCol, targetCol) {
  const snap = await sourceCol.get();
  for (const docSnap of snap.docs) {
    await targetCol.doc(docSnap.id).set({ ...docSnap.data(), migratedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  return snap.size;
}

async function migrate() {
  const festivalsSnap = await db.collection('festivals').get();
  for (const festivalDoc of festivalsSnap.docs) {
    const festival = festivalDoc.data();
    const festivalId = festivalDoc.id;
    const institutionId = festival.institutionId || festivalId;

    await db.collection('institutions').doc(institutionId).set({
      id: institutionId,
      name: festival.institutionName || festival.name || festival.title || institutionId,
      slug: institutionId,
      active: festival.active !== false,
      plan: festival.plan || 'trial',
      subscriptionStatus: festival.subscriptionStatus || 'trial',
      migratedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    await db.doc(`institutions/${institutionId}/festivals/${festivalId}`).set({
      id: festivalId,
      ...festival,
      institutionId,
      migratedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    for (const sub of SUBCOLLECTIONS) {
      const count = await copyCollection(
        db.collection(`festivals/${festivalId}/${sub}`),
        db.collection(`institutions/${institutionId}/festivals/${festivalId}/${sub}`)
      );
      if (count) console.log(`Copied ${count} docs: ${festivalId}/${sub}`);
    }
  }
}

migrate().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
