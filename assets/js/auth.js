// MeeladPulse Authentication Service
import { auth, db } from "./firebase-init.js";
import { 
  setPersistence, 
  browserLocalPersistence, 
  browserSessionPersistence, 
  signInWithEmailAndPassword as firebaseSignIn,
  sendPasswordResetEmail as firebaseResetPassword
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
    targetPath = "/admin/dashboard.html";
  } else if (role === "judge") {
    targetPath = "/judge/dashboard.html";
  } else if (role === "teamLeader") {
    targetPath = "/team/dashboard.html";
  } else {
    await auth.signOut();
    targetPath = "/unauthorized.html?reason=invalid_role";
  }

  return targetPath;
}

/**
 * Sends a password reset email for forgotten passwords.
 */
export async function resetPassword(email) {
  await firebaseResetPassword(auth, email);
}
