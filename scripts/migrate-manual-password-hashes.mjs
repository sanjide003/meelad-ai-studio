#!/usr/bin/env node
import { createHash } from 'node:crypto';

const WRITE = process.argv.includes('--write');

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

async function loadAdmin() {
  try {
    return await import('firebase-admin');
  } catch (err) {
    console.error('firebase-admin is required for this migration. Install it in the execution environment or run inside an environment that already provides it.');
    process.exitCode = 1;
    throw err;
  }
}

function serviceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON to a Firebase service-account JSON string before running this migration.');
  }
  return JSON.parse(raw);
}

async function main() {
  const admin = await loadAdmin();
  const serviceAccount = serviceAccountFromEnv();

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();
  const deleteField = admin.firestore.FieldValue.delete();
  let loginUpdates = 0;
  let institutionUpdates = 0;
  let manualUserUpdates = 0;

  const loginSnap = await db.collection('institutionLogins').get();
  for (const docSnap of loginSnap.docs) {
    const data = docSnap.data();
    if (typeof data.password === 'string' && data.password) {
      loginUpdates += 1;
      const patch = {
        password: deleteField,
        passwordHash: data.passwordHash || sha256(data.password),
        passwordMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
        legacyPasswordMigrated: true
      };
      console.log(`${WRITE ? 'Updating' : 'Would update'} institutionLogins/${docSnap.id}: remove password, add passwordHash`);
      if (WRITE) await docSnap.ref.update(patch);
    }
  }

  const manualUsersSnap = await db.collectionGroup('manualUsers').get();
  for (const docSnap of manualUsersSnap.docs) {
    const data = docSnap.data();
    if (typeof data.password === 'string' && data.password) {
      manualUserUpdates += 1;
      const patch = {
        password: deleteField,
        passwordHash: data.passwordHash || sha256(data.password),
        passwordMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
        legacyPasswordMigrated: true
      };
      console.log(`${WRITE ? 'Updating' : 'Would update'} ${docSnap.ref.path}: remove password, add passwordHash`);
      if (WRITE) await docSnap.ref.update(patch);
    }
  }

  const institutionSnap = await db.collection('institutions').get();
  for (const docSnap of institutionSnap.docs) {
    const data = docSnap.data();
    if (Object.prototype.hasOwnProperty.call(data, 'ownerPassword')) {
      institutionUpdates += 1;
      const patch = {
        ownerPassword: deleteField,
        ownerPasswordSet: Boolean(data.ownerPassword) || data.ownerPasswordSet === true,
        ownerPasswordMigratedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      console.log(`${WRITE ? 'Updating' : 'Would update'} institutions/${docSnap.id}: remove ownerPassword`);
      if (WRITE) await docSnap.ref.update(patch);
    }
  }

  console.log(`\nMode: ${WRITE ? 'WRITE' : 'DRY RUN'}`);
  console.log(`institutionLogins needing plaintext password removal: ${loginUpdates}`);
  console.log(`manualUsers needing plaintext password removal: ${manualUserUpdates}`);
  console.log(`institutions needing ownerPassword removal: ${institutionUpdates}`);
  if (!WRITE) console.log('Re-run with --write after confirming the dry-run output.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
