// MeeladPulse Role Guard and Protected Page Verification
import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function appUrl(path) {
  return new URL(path.replace(/^\//, ""), new URL(/* @vite-ignore */ "../../", import.meta.url)).href;
}

// Initially hide elements or display a clean loading overlay
if (document.getElementById('global-page-loader')) {
  document.getElementById('global-page-loader').classList.remove('hidden');
}

export async function verifyUserRole(allowedRoles) {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Unsubscribe immediately to prevent multiple triggers
      unsubscribe();
      
      if (!user) {
        window.location.replace(appUrl('login.html'));
        return reject('Not authenticated');
      }

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          await signOut(auth);
          window.location.replace(appUrl('unauthorized.html?reason=no_profile'));
          return reject('No profile');
        }

        const userData = userDoc.data();

        if (userData.active !== true) {
          await signOut(auth);
          window.location.replace(appUrl('unauthorized.html?reason=inactive'));
          return reject('Inactive account');
        }

        if (!allowedRoles.includes(userData.role)) {
          window.location.replace(appUrl('unauthorized.html?reason=access_denied'));
          return reject('Role unauthorized');
        }

        // Store user in window session
        window.currentUserProfile = userData;

        // Verify festival selection (if not already on the festival selection page)
        const currentPath = window.location.pathname;
        if (!currentPath.includes('select-fest.html') && !currentPath.includes('unauthorized.html')) {
          const selectedFestId = localStorage.getItem('meeladpulse_selected_fest_id');
          if (!selectedFestId) {
            const isAdminDashboard = userData.role === 'admin' && currentPath.includes('admin/dashboard.html');
            if (!isAdminDashboard) {
              window.location.replace(appUrl('select-fest.html'));
              return reject('No festival selected');
            }
          }
        }

        // Complete verification: Hide loading spinner
        const loader = document.getElementById('global-page-loader');
        if (loader) {
          loader.classList.add('hidden');
        }
        resolve(userData);
      } catch (error) {
        console.error("Auth security verification error:", error);
        await signOut(auth);
        window.location.replace(appUrl('unauthorized.html?reason=verification_failed'));
        reject(error);
      }
    });
  });
}
