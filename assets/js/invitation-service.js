// MeeladPulse Secure Invitation Token Service (Client-Side SHA-256 Token Hashing)
import { db, auth } from "./firebase-init.js";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { 
  createUserWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { assertOnline } from "./network-status.js";

/**
 * Computes the SHA-256 hash of a string natively using the Web Crypto API.
 * This utilizes client-side SHA-256 token hashing to avoid exposing raw tokens in database logs.
 */
export async function hashTokenSHA256(rawToken) {
  const encoder = new TextEncoder();
  const data = encoder.encode(rawToken);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generates a URL-safe cryptographically secure 32-byte token.
 */
export function generateSecureToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  // Convert to hex string (64 characters) which is inherently URL-safe
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Creates a new invitation token (Admin Action).
 * Stores only the client-side SHA-256 hash inside Firestore collection `userInvitations`.
 */
export async function createSecureInvitation(recipientName, recipientEmail, assignedRole, teamId = null) {
  assertOnline('Invitation Creation');
  const rawToken = generateSecureToken();
  const tokenHash = await hashTokenSHA256(rawToken);

  const invitationData = {
    name: recipientName,
    email: recipientEmail.toLowerCase().trim(),
    role: assignedRole,
    teamId: assignedRole === 'teamLeader' ? teamId : null,
    status: 'pending',
    createdAt: serverTimestamp()
  };

  // Store ONLY the token hash in Firestore
  await setDoc(doc(db, "userInvitations", tokenHash), invitationData);

  const activationUrl = `${window.location.origin}/activate-account.html?token=${rawToken}`;
  return {
    rawToken,
    activationUrl
  };
}

/**
 * Verifies if an invitation is valid and pending based on the raw token from URL.
 */
export async function verifyInvitation(rawToken) {
  if (!rawToken) {
    throw new Error("No activation token was provided in the URL.");
  }

  const tokenHash = await hashTokenSHA256(rawToken);
  const docRef = doc(db, "userInvitations", tokenHash);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    throw new Error("Invalid activation link or the token does not exist.");
  }

  const invitation = docSnap.data();

  if (invitation.status !== "pending") {
    throw new Error(`This invitation has already been used or revoked (Status: ${invitation.status}).`);
  }

  return invitation;
}

/**
 * Performs account activation, creating Auth credentials and matching Firestore user profile.
 * 
 * CRITICAL TECHNICAL ARCHITECTURE NOTE:
 * Firebase Authentication user creation (createUserWithEmailAndPassword) and Firestore writes are NOT atomic.
 * Firebase Authentication cannot be bundled into a Firestore WriteBatch. As a result, this process executes
 * sequentially: first creating the Authentication user record, and then writing their user profile to Firestore.
 * If the user profile write fails or is interrupted, the Authentication user will exist without a corresponding
 * profile document. The application handles this edge case by checking for missing profile documents during log-in.
 */
export async function activateInvitation(rawToken, enteredEmail, password) {
  // 1. Verify invitation again to fetch official constraints
  const invitation = await verifyInvitation(rawToken);
  
  if (enteredEmail.toLowerCase().trim() !== invitation.email.toLowerCase().trim()) {
    throw new Error("Validation Error: The email address entered does not match the invitation email.");
  }

  // 2. Compute the token hash to mark it as used later
  const tokenHash = await hashTokenSHA256(rawToken);

  // 3. Create actual Firebase Email & Password user account (Not atomic with Firestore write below)
  const userCredential = await createUserWithEmailAndPassword(auth, enteredEmail.toLowerCase().trim(), password);
  const user = userCredential.user;

  // 4. Create the corresponding profile in users/{uid} strictly using invitation values
  const userProfile = {
    uid: user.uid,
    name: invitation.name,
    email: invitation.email,
    emailLower: invitation.email.toLowerCase().trim(),
    role: invitation.role,
    teamId: invitation.role === 'teamLeader' ? invitation.teamId : null,
    active: true,
    permissions: invitation.role === 'admin' ? ['*'] : [],
    invitationId: tokenHash,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, "users", user.uid), userProfile);

  // 5. Update invitation status to used
  await updateDoc(doc(db, "userInvitations", tokenHash), {
    status: "used",
    activatedAt: serverTimestamp(),
    activatedUid: user.uid
  });

  return userProfile;
}
