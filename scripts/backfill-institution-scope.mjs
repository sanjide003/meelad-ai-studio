#!/usr/bin/env node
/**
 * Backfill institutionId/festivalId onto legacy top-level users and userInvitations.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/service-account.json \
 *   BACKFILL_INSTITUTION_ID=yourInstitution BACKFILL_FESTIVAL_ID=yourFestival \
 *   npm run migrate:scope -- --write
 *
 * Defaults to dry-run. Pass --write to commit changes.
 */

const write = process.argv.includes('--write');
const defaultInstitutionId = process.env.BACKFILL_INSTITUTION_ID || '';
const defaultFestivalId = process.env.BACKFILL_FESTIVAL_ID || defaultInstitutionId;

async function loadAdmin() {
  try {
    const app = await import('firebase-admin/app');
    const firestore = await import('firebase-admin/firestore');
    return { app, firestore };
  } catch (err) {
    console.error('firebase-admin is required for this migration. Install it in the execution environment or run with Firebase Admin tooling available.');
    console.error('Original import error:', err.message);
    process.exit(1);
  }
}

function initializeAdmin(app) {
  if (app.getApps().length) return app.getApps()[0];
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return app.initializeApp({
      credential: app.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
  }
  return app.initializeApp({ credential: app.applicationDefault() });
}

function hasScope(data = {}) {
  return typeof data.institutionId === 'string' && data.institutionId.length > 0 &&
    typeof data.festivalId === 'string' && data.festivalId.length > 0;
}

function fallbackScope() {
  if (!defaultInstitutionId) return null;
  return { institutionId: defaultInstitutionId, festivalId: defaultFestivalId || defaultInstitutionId };
}

async function resolveScopeForUser(db, user) {
  if (hasScope(user)) return null;
  if (user.institutionId && !user.festivalId) return { institutionId: user.institutionId, festivalId: user.institutionId };
  if (user.invitationId) {
    const inviteSnap = await db.collection('userInvitations').doc(user.invitationId).get();
    if (inviteSnap.exists) {
      const invite = inviteSnap.data();
      if (hasScope(invite)) return { institutionId: invite.institutionId, festivalId: invite.festivalId };
    }
  }
  return fallbackScope();
}

async function backfillCollection(db, collectionName, resolver) {
  const snap = await db.collection(collectionName).get();
  let scanned = 0;
  let planned = 0;
  let skipped = 0;
  const batch = db.batch();

  for (const docSnap of snap.docs) {
    scanned += 1;
    const data = docSnap.data();
    if (hasScope(data)) {
      skipped += 1;
      continue;
    }
    const scope = await resolver(data, docSnap.id);
    if (!scope?.institutionId || !scope?.festivalId) {
      console.warn(`[skip] ${collectionName}/${docSnap.id}: no scope could be resolved`);
      skipped += 1;
      continue;
    }
    planned += 1;
    console.log(`[${write ? 'write' : 'dry-run'}] ${collectionName}/${docSnap.id} -> institutionId=${scope.institutionId}, festivalId=${scope.festivalId}`);
    if (write) batch.update(docSnap.ref, { ...scope, scopeBackfilledAt: new Date() });
  }

  if (write && planned > 0) await batch.commit();
  return { collectionName, scanned, planned, skipped };
}

const { app, firestore } = await loadAdmin();
initializeAdmin(app);
const db = firestore.getFirestore();

console.log(`Scope backfill started in ${write ? 'WRITE' : 'DRY-RUN'} mode.`);
if (!write) console.log('Pass --write to commit updates.');
if (!defaultInstitutionId) console.log('BACKFILL_INSTITUTION_ID not set; only invitation-derived scopes can be backfilled.');

const invitations = await backfillCollection(db, 'userInvitations', async () => fallbackScope());
const users = await backfillCollection(db, 'users', async (user) => resolveScopeForUser(db, user));

console.table([invitations, users]);
console.log('Scope backfill completed.');
