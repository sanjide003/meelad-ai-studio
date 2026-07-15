// MeeladPulse Public Config Service
import { db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/**
 * Gets the current active festival ID from localStorage or returns a fallback default.
 */
export function getActiveFestivalId() {
  const localId = localStorage.getItem('meeladpulse_selected_fest_id');
  if (localId && localId !== 'undefined') {
    return localId;
  }
  return 'fest_default'; // Default fallback ID
}

/**
 * Fetches the public festival document.
 * @param {string} festId 
 */
export async function getPublicFestivalConfig(festId) {
  try {
    const festRef = doc(db, window.meeladPulseScopedFestivalPath());
    const snap = await getDoc(festRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error("Failed to fetch public festival config:", err);
    return null;
  }
}
