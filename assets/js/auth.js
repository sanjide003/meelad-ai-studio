// MeeladPulse Authentication Service
import { auth, db } from "./firebase-init.js";
import { 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  signInWithEmailAndPassword as firebaseSignIn,
  sendPasswordResetEmail as firebaseResetPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function appPath(path) {
  return new URL(path.replace(/^\//, ""), new URL(/* @vite-ignore */ "../../", import.meta.url)).pathname;
}

/**
 * Handles the secure login sequence following the 9-step exact flow.
 */
export async function loginWithEmailAndPassword(email, password, rememberMe) {
  // 1. Establish persistence mode
  const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, persistence);

  // 2. Perform raw Firebase Sign In
  const userCredential = await firebaseSignIn(auth, email, password);
  const user = userCredential.user;

  // 3. Fetch matched Firestore profile
  const userDocRef = doc(db, "users", user.uid);
  const userDocSnapshot = await getDoc(userDocRef);

  if (!userDocSnapshot.exists()) {
    await auth.signOut();
    const noProfileErr = new Error("Security Check Failed: No authorized database profile was found for this user UID.");
    noProfileErr.code = "auth/profile-missing";
    throw noProfileErr;
  }

  const userData = userDocSnapshot.data();

  // 4. Check active account flag
  if (userData.active !== true) {
    await auth.signOut();
    const inactiveErr = new Error("Account Inactive: Your account access has been suspended by the administrator.");
    inactiveErr.code = "auth/user-disabled";
    throw inactiveErr;
  }

  // 5. Update lastLoginAt timestamp securely in Firestore
  try {
    await updateDoc(userDocRef, {
      lastLoginAt: serverTimestamp()
    });
  } catch (err) {
    console.warn("Could not update last login timestamp:", err);
  }

  // 6. Evaluate verified role and determine redirect path
  const role = userData.role;
  let targetPath = "";

  if (role === "admin") {
    targetPath = appPath("admin/app.html");
  } else if (role === "judge") {
    targetPath = appPath("judge/dashboard.html");
  } else if (role === "teamLeader") {
    targetPath = appPath("team/dashboard.html");
  } else if (role === "superAdmin") {
    targetPath = appPath("select-fest.html");
  } else {
    await auth.signOut();
    targetPath = appPath("unauthorized.html?reason=invalid_role");
  }

  return targetPath;
}

export async function loginWithUsernamePassword(username, password) {
  const usernameLower = username.trim().toLowerCase();
  const institutionId = localStorage.getItem('meeladpulse_selected_institution_id');
  const festivalId = localStorage.getItem('meeladpulse_selected_fest_id');
  let snap = null;

  if (institutionId && festivalId) {
    const scopedQuery = query(collection(db, `institutions/${institutionId}/festivals/${festivalId}/manualUsers`), where('usernameLower', '==', usernameLower), where('password', '==', password));
    snap = await getDocs(scopedQuery);
  }

  if (!snap || snap.empty) {
    const legacyQuery = query(collection(db, 'manualUsers'), where('usernameLower', '==', usernameLower), where('password', '==', password));
    snap = await getDocs(legacyQuery);
  }

  if (snap.empty) {
    const err = new Error('Invalid username or password.');
    err.code = 'auth/manual-invalid';
    throw err;
  }
  const profile = { id: snap.docs[0].id, institutionId, festivalId, ...snap.docs[0].data(), manualAuth: true };
  if (profile.active !== true) {
    const err = new Error('Account Inactive: Your account access has been suspended by the administrator.');
    err.code = 'auth/user-disabled';
    throw err;
  }
  sessionStorage.setItem('meeladpulse_manual_user', JSON.stringify(profile));
  if (profile.role === 'judge') return appPath('judge/dashboard.html');
  if (profile.role === 'teamLeader') return appPath('team/dashboard.html');
  return appPath('unauthorized.html?reason=invalid_manual_role');
}

/**
 * Sends a password reset email for forgotten passwords.
 */
export async function resetPassword(email) {
  await firebaseResetPassword(auth, email);
}
