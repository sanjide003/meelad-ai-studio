import { auth, db } from "./firebase-init.js";
import { getActiveScope } from "./firestore-service.js";
import {
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export async function hashManualPassword(password) {
  if (!password) return '';
  const data = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normalizeLogin(value = '') {
  return value.trim().toLowerCase();
}

async function passwordMatches(profile = {}, enteredPassword = '') {
  if (profile.passwordHash) return profile.passwordHash === await hashManualPassword(enteredPassword);
  return profile.password === enteredPassword;
}

function getSessionManualProfile() {
  try {
    return JSON.parse(sessionStorage.getItem('meeladpulse_manual_user') || 'null');
  } catch (err) {
    return null;
  }
}

function saveSessionManualProfile(patch = {}) {
  const current = getSessionManualProfile() || {};
  const next = { ...current, ...patch };
  delete next.password;
  delete next.passwordHash;
  sessionStorage.setItem('meeladpulse_manual_user', JSON.stringify(next));
  window.currentUserProfile = { ...(window.currentUserProfile || {}), ...next };
  return next;
}

export function buildInstitutionPublicLinks(institutionId, festivalId = institutionId) {
  const withParams = (path, params = {}) => {
    const url = new URL(path, window.location.href);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    return url.href;
  };
  const scopeParams = { institution: institutionId, festival: festivalId };
  return {
    login: withParams('../login.html'),
    publicHome: withParams('../index.html', scopeParams),
    publicDirect: withParams('../public/index.html', scopeParams),
    schedule: withParams('../public/schedule.html', scopeParams),
    latestResults: withParams('../public/latest-results.html', scopeParams),
    resultSearch: withParams('../public/result-search.html', scopeParams),
    downloads: withParams('../public/downloads.html', scopeParams)
  };
}

export async function getInstitutionAccountContext() {
  const scope = getActiveScope();
  const profile = window.currentUserProfile || getSessionManualProfile() || {};
  const [institutionSnap, loginSnap, manualSnap] = await Promise.all([
    getDoc(doc(db, 'institutions', scope.institutionId)),
    profile.usernameLower ? getDoc(doc(db, 'institutionLogins', profile.usernameLower)) : Promise.resolve(null),
    profile.usernameLower ? getDoc(doc(db, `institutions/${scope.institutionId}/festivals/${scope.festivalId}/manualUsers`, profile.usernameLower)) : Promise.resolve(null)
  ]);

  const institution = institutionSnap.exists() ? { id: institutionSnap.id, ...institutionSnap.data() } : { id: scope.institutionId };
  const loginProfile = loginSnap?.exists?.() ? loginSnap.data() : (manualSnap?.exists?.() ? manualSnap.data() : profile);
  return { scope, profile: { ...profile, ...loginProfile }, institution, links: buildInstitutionPublicLinks(scope.institutionId, scope.festivalId) };
}

export async function updateInstitutionAdminCredentials({ currentPassword, newUsername, newPassword }) {
  const { scope, profile } = await getInstitutionAccountContext();
  const currentLogin = normalizeLogin(profile.usernameLower || profile.username || profile.email);
  const nextLogin = normalizeLogin(newUsername || currentLogin);

  if (!currentLogin) throw new Error('Current admin username is not available in this session. Please sign out and sign in again.');
  if (!currentPassword) throw new Error('Current password is required to update account credentials.');
  if (!nextLogin) throw new Error('New username/email is required.');
  if (newPassword && newPassword.length < 6) throw new Error('New password must be at least 6 characters.');

  const currentLoginRef = doc(db, 'institutionLogins', currentLogin);
  const currentScopedRef = doc(db, `institutions/${scope.institutionId}/festivals/${scope.festivalId}/manualUsers`, currentLogin);
  const [loginSnap, scopedSnap] = await Promise.all([getDoc(currentLoginRef), getDoc(currentScopedRef)]);
  const sourceData = loginSnap.exists() ? loginSnap.data() : (scopedSnap.exists() ? scopedSnap.data() : profile);

  if (!(await passwordMatches(sourceData, currentPassword))) {
    throw new Error('Current password is incorrect. Please try again.');
  }

  if (nextLogin !== currentLogin) {
    const [nextLoginSnap, nextScopedSnap] = await Promise.all([
      getDoc(doc(db, 'institutionLogins', nextLogin)),
      getDoc(doc(db, `institutions/${scope.institutionId}/festivals/${scope.festivalId}/manualUsers`, nextLogin))
    ]);
    if (nextLoginSnap.exists() || nextScopedSnap.exists()) throw new Error('This username/email is already in use. Choose another one.');
  }

  const passwordForHash = newPassword || (!sourceData.passwordHash ? currentPassword : '');

  const nextData = {
    ...sourceData,
    institutionId: scope.institutionId,
    festivalId: scope.festivalId,
    uid: `manual_institution_${scope.institutionId}_${nextLogin.replace(/[^a-z0-9]+/g, '_')}`,
    username: nextLogin,
    usernameLower: nextLogin,
    email: nextLogin.includes('@') ? nextLogin : '',
    updatedAt: serverTimestamp(),
    password: deleteField(),
    ...(passwordForHash ? {
      passwordHash: await hashManualPassword(passwordForHash),
      passwordUpdatedAt: serverTimestamp(),
      legacyPasswordMigrated: true
    } : {})
  };

  const nextLoginRef = doc(db, 'institutionLogins', nextLogin);
  const nextScopedRef = doc(db, `institutions/${scope.institutionId}/festivals/${scope.festivalId}/manualUsers`, nextLogin);
  await setDoc(nextLoginRef, nextData, { merge: true });
  await setDoc(nextScopedRef, nextData, { merge: true });

  if (nextLogin !== currentLogin) {
    await deleteDoc(currentLoginRef);
    await deleteDoc(currentScopedRef);
  }

  if (auth.currentUser) {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      username: nextLogin,
      usernameLower: nextLogin,
      email: nextLogin.includes('@') ? nextLogin : '',
      updatedAt: serverTimestamp()
    });
  }

  saveSessionManualProfile({
    username: nextLogin,
    usernameLower: nextLogin,
    email: nextLogin.includes('@') ? nextLogin : ''
  });

  return { username: nextLogin };
}
