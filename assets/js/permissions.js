// MeeladPulse Permission Enforcement System
function appUrl(path) {
  return new URL(path.replace(/^\//, ""), new URL("../../", import.meta.url)).href;
}

export function hasPermission(userProfile, requiredPermission) {
  if (!userProfile || !userProfile.permissions) return false;
  // Admin with wildcard '*' gets access to everything
  if (userProfile.permissions.includes('*')) return true;
  return userProfile.permissions.includes(requiredPermission);
}

export function enforcePagePermission(userProfile, requiredPermission) {
  if (!hasPermission(userProfile, requiredPermission)) {
    window.location.replace(appUrl('unauthorized.html?reason=insufficient_permissions'));
    throw new Error('Security Error: Insufficient permissions for this action.');
  }
}
