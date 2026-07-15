// MeeladPulse Firebase Initializer
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  databaseId: firebaseConfig.firestoreDatabaseId || "(default)"
});

function readScopeParam(key) {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch (_) {
    return null;
  }
}

function normalizeScopeValue(value) {
  return value ? String(value).trim() : '';
}

function persistScopeFromUrl() {
  const institutionId = normalizeScopeValue(readScopeParam('institution'));
  const festivalId = normalizeScopeValue(readScopeParam('festival'));
  if (institutionId) localStorage.setItem('meeladpulse_selected_institution_id', institutionId);
  if (festivalId) localStorage.setItem('meeladpulse_selected_fest_id', festivalId);
  if (institutionId && !festivalId) localStorage.setItem('meeladpulse_selected_fest_id', institutionId);
}

persistScopeFromUrl();

window.meeladPulseGetActiveScope = function meeladPulseGetActiveScope() {
  const urlFestivalId = normalizeScopeValue(readScopeParam('festival'));
  const urlInstitutionId = normalizeScopeValue(readScopeParam('institution'));
  const festivalId = urlFestivalId || localStorage.getItem('meeladpulse_selected_fest_id') || urlInstitutionId || 'main-festival';
  const institutionId = urlInstitutionId || localStorage.getItem('meeladpulse_selected_institution_id') || festivalId;
  return { institutionId, festivalId };
};

window.meeladPulseBuildScopedUrl = function meeladPulseBuildScopedUrl(path) {
  const { institutionId, festivalId } = window.meeladPulseGetActiveScope();
  const url = new URL(path.replace(/^\//, ''), window.location.origin + window.location.pathname.replace(/[^/]*$/, ''));
  url.searchParams.set('institution', institutionId);
  url.searchParams.set('festival', festivalId);
  return url.href;
};

window.meeladPulseScopedFestivalPath = function meeladPulseScopedFestivalPath(subPath = '') {
  const { institutionId, festivalId } = window.meeladPulseGetActiveScope();
  const suffix = subPath ? `/${String(subPath).replace(/^\//, '')}` : '';
  return `institutions/${institutionId}/festivals/${festivalId}${suffix}`;
};

export { app, auth, db };
