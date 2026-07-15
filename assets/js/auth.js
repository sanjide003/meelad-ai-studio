// MeeladPulse Authentication Service
import { auth, db } from "./firebase-init.js";
import { 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  signInWithEmailAndPassword as firebaseSignIn,
  sendPasswordResetEmail as firebaseResetPassword,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, query, collection, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function appPath(path) {
  return new URL(path.replace(/^\//, ""), new URL(/* @vite-ignore */ "../../", import.meta.url)).pathname;
}


async function establishManualFirebaseSession(profile) {
  if (auth.currentUser) {
    await auth.signOut();
  }
  let credential;
  try {
    credential = await signInAnonymously(auth);
  } catch (err) {
    const sessionErr = new Error('Manual login verified, but Firebase Anonymous Authentication is not enabled. Enable the Anonymous provider in Firebase Authentication and deploy the latest rules.');
    sessionErr.code = 'auth/manual-session-unavailable';
    throw sessionErr;
  }
  const manualUid = credential.user.uid;
  const sessionProfile = {
    uid: manualUid,
    manualAuth: true,
    role: profile.role,
    active: profile.active === true,
    institutionId: profile.institutionId,
    festivalId: profile.festivalId,
    username: profile.username || profile.email || profile.id,
    usernameLower: profile.usernameLower || (profile.username || profile.email || profile.id || '').toLowerCase(),
    name: profile.name || profile.institutionName || 'Institution Admin',
    email: profile.email || '',
    teamId: profile.teamId || '',
    judgeId: profile.judgeId || '',
    updatedAt: serverTimestamp(),
    lastLoginAt: serverTimestamp()
  };
  await setDoc(doc(db, 'users', manualUid), sessionProfile, { merge: true });
  return { ...profile, ...sessionProfile, password: profile.password };
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
  let institutionId = localStorage.getItem('meeladpulse_selected_institution_id');
  let festivalId = localStorage.getItem('meeladpulse_selected_fest_id');
  let profile = null;
  let usernameFound = false;

  let permissionDenied = false;

  // Scoped login links are the primary institution/team/judge login path. If production rules are
  // stale, continue to the top-level institution login index before showing a permission message.
  if (institutionId && festivalId) {
    try {
      const scopedQuery = query(collection(db, `institutions/${institutionId}/festivals/${festivalId}/manualUsers`), where('usernameLower', '==', usernameLower));
      const snap = await getDocs(scopedQuery);
      if (!snap.empty) {
        usernameFound = true;
        const candidate = { id: snap.docs[0].id, institutionId, festivalId, ...snap.docs[0].data(), manualAuth: true };
        if (candidate.password !== password) {
          const err = new Error('Password is incorrect. Please check the password entered for this admin account.');
          err.code = 'auth/manual-wrong-password';
          throw err;
        }
        profile = candidate;
      }
    } catch (err) {
      if (err.code !== 'permission-denied') throw err;
      permissionDenied = true;
      console.warn('Scoped manual login path is blocked by Firestore rules; trying institution login index.', err);
    }
  }

  // Institution admins can also log in without a selected scope through the Super Admin login index.
  if (!profile) {
    try {
      const indexSnap = await getDoc(doc(db, 'institutionLogins', usernameLower));
      if (indexSnap.exists()) {
        usernameFound = true;
        const indexedProfile = indexSnap.data();
        if (indexedProfile.password !== password) {
          const err = new Error('Password is incorrect. Please check the password entered for this admin account.');
          err.code = 'auth/manual-wrong-password';
          throw err;
        }
        institutionId = indexedProfile.institutionId;
        festivalId = indexedProfile.festivalId || indexedProfile.institutionId;
        profile = { id: indexSnap.id, ...indexedProfile, institutionId, festivalId, manualAuth: true };
      }
    } catch (err) {
      if (err.code !== 'permission-denied') throw err;
      permissionDenied = true;
    }
  }

  if (!profile && permissionDenied) {
    const permissionErr = new Error('Firebase permission denied. Deploy the latest Firestore rules and hosting files, then try this institution admin login again.');
    permissionErr.code = 'auth/manual-permission-denied';
    throw permissionErr;
  }

  if (!profile) {
    const err = new Error(usernameFound ? 'Invalid manual login.' : 'Admin username/email was not found for this institution. Please check the admin username.');
    err.code = usernameFound ? 'auth/manual-invalid' : 'auth/manual-user-not-found';
    throw err;
  }
  if (profile.active !== true) {
    const err = new Error('Account Inactive: This institution/admin login is suspended or expired.');
    err.code = 'auth/user-disabled';
    throw err;
  }

  profile = await establishManualFirebaseSession(profile);

  localStorage.setItem('meeladpulse_selected_institution_id', institutionId);
  localStorage.setItem('meeladpulse_selected_fest_id', festivalId);
  if (profile.institutionName || profile.festivalTitle) localStorage.setItem('meeladpulse_selected_fest_title', profile.institutionName || profile.festivalTitle);
  sessionStorage.setItem('meeladpulse_manual_user', JSON.stringify(profile));

  if (profile.role === 'institutionAdmin' || profile.role === 'admin') return appPath('admin/app.html');
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
