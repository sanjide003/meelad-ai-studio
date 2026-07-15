// MeeladPulse Role Guard and Protected Page Verification
import { auth, db } from "./firebase-init.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function appUrl(path) {
  return new URL(path.replace(/^\//, ""), new URL(/* @vite-ignore */ "../../", import.meta.url)).href;
}

function appUrlWithCurrentScope(path) {
  const url = new URL(appUrl(path));
  const currentParams = new URLSearchParams(window.location.search);
  const institutionId = currentParams.get('institution') || localStorage.getItem('meeladpulse_selected_institution_id');
  const festivalId = currentParams.get('festival') || localStorage.getItem('meeladpulse_selected_fest_id') || institutionId;
  if (institutionId) url.searchParams.set('institution', institutionId);
  if (festivalId) url.searchParams.set('festival', festivalId);
  return url.href;
}

// Initially hide elements or display a clean loading overlay.
// Internal admin navigation uses a fast-nav flag to avoid the heavy full-screen loader flicker on every tab click.
const loaderEl = document.getElementById('global-page-loader');
const fastNavRequested = sessionStorage.getItem('meeladpulse_fast_nav') === '1';
sessionStorage.removeItem('meeladpulse_fast_nav');
if (loaderEl) {
  loaderEl.classList.toggle('hidden', fastNavRequested);
}

function isSubscriptionDataAvailable(data = {}) {
  const subscriptionStatus = ['trial', 'active', 'suspended'].includes(data.subscriptionStatus) ? data.subscriptionStatus : (data.plan === 'purchased' ? 'active' : 'trial');
  const expiryDate = subscriptionStatus === 'trial' ? data.trialEndsAt : data.subscriptionEndsAt;
  const isUnlimited = data.billingCycle === 'unlimited';
  const expiredByDate = expiryDate && !isUnlimited && new Date(`${expiryDate}T23:59:59`) < new Date();
  return data.active !== false && subscriptionStatus !== 'suspended' && !expiredByDate;
}

async function isSelectedFestivalAvailable(festId, role, profile = null) {
  if (role === 'superAdmin') return true;
  if (profile?.manualAuth) {
    try {
      const loginKey = profile.usernameLower || profile.username?.toLowerCase();
      if (loginKey) {
        const loginSnap = await getDoc(doc(db, 'institutionLogins', loginKey));
        if (loginSnap.exists()) return isSubscriptionDataAvailable(loginSnap.data());
      }
    } catch (err) {
      console.warn('Could not refresh manual subscription from login index; using session profile.', err);
    }
    return isSubscriptionDataAvailable(profile);
  }
  try {
    const snap = await getDoc(doc(db, window.meeladPulseScopedFestivalPath()));
    if (!snap.exists()) return false;
    return isSubscriptionDataAvailable(snap.data());
  } catch (err) {
    console.warn('Could not verify selected festival subscription:', err);
    return false;
  }
}

function isRoleAllowed(role, allowedRoles) {
  return allowedRoles.includes(role) || (role === 'institutionAdmin' && allowedRoles.includes('admin'));
}

export async function verifyUserRole(allowedRoles) {
  const manualProfileRaw = sessionStorage.getItem('meeladpulse_manual_user');
  if (manualProfileRaw) {
    let manualProfile = null;
    try {
      manualProfile = JSON.parse(manualProfileRaw);
    } catch (err) {
      sessionStorage.removeItem('meeladpulse_manual_user');
    }
    if (manualProfile) {
      if (manualProfile.active === true && isRoleAllowed(manualProfile.role, allowedRoles)) {
        window.currentUserProfile = manualProfile;
        const currentPath = window.location.pathname;
        if (!currentPath.includes('select-fest.html') && !currentPath.includes('unauthorized.html')) {
          const selectedFestId = localStorage.getItem('meeladpulse_selected_fest_id');
          if (!selectedFestId) {
            window.location.replace(appUrlWithCurrentScope('select-fest.html'));
            throw new Error('No festival selected');
          }
          const available = await isSelectedFestivalAvailable(selectedFestId, manualProfile.role, manualProfile);
          if (!available) {
            window.location.replace(appUrl('unauthorized.html?reason=subscription_inactive'));
            throw new Error('Selected festival is inactive or subscription is blocked');
          }
        }
        const loader = document.getElementById('global-page-loader');
        if (loader) loader.classList.add('hidden');
        return manualProfile;
      }
      if (manualProfile.active !== true) {
        window.location.replace(appUrl('unauthorized.html?reason=manual_inactive'));
        throw new Error('Manual account is inactive');
      }
      window.location.replace(appUrl('unauthorized.html?reason=manual_role_denied'));
      throw new Error('Manual role unauthorized');
    }
  }
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Unsubscribe immediately to prevent multiple triggers
      unsubscribe();
      
      if (!user) {
        window.location.replace(appUrlWithCurrentScope('login.html'));
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

        if (!isRoleAllowed(userData.role, allowedRoles)) {
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
            const isAdminDashboard = ['admin', 'superAdmin', 'institutionAdmin'].includes(userData.role) && (currentPath.includes('admin/dashboard.html') || currentPath.includes('admin/app.html'));
            if (!isAdminDashboard) {
              window.location.replace(appUrlWithCurrentScope('select-fest.html'));
              return reject('No festival selected');
            }
          } else {
            const available = await isSelectedFestivalAvailable(selectedFestId, userData.role, userData);
            if (!available) {
              window.location.replace(appUrl('unauthorized.html?reason=subscription_inactive'));
              return reject('Selected festival is inactive or subscription is blocked');
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
