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

window.meeladPulseGetActiveScope = function meeladPulseGetActiveScope() {
  const festivalId = readScopeParam('festival') || localStorage.getItem('meeladpulse_selected_fest_id') || 'main-festival';
  const institutionId = readScopeParam('institution') || localStorage.getItem('meeladpulse_selected_institution_id') || festivalId;
  return { institutionId, festivalId };
};

window.meeladPulseScopedFestivalPath = function meeladPulseScopedFestivalPath(subPath = '') {
  const { institutionId, festivalId } = window.meeladPulseGetActiveScope();
  const suffix = subPath ? `/${String(subPath).replace(/^\//, '')}` : '';
  return `institutions/${institutionId}/festivals/${festivalId}${suffix}`;
};

export { app, auth, db };
