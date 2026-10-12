/**
 * Admin sign-in is separate from user accounts: the admin password (the backend's ADMIN_TOKEN) is kept
 * in sessionStorage, so it lasts for this browser tab only, and is sent as X-Admin-Token on admin API calls.
 */
const KEY = "adminToken";

export function getAdminToken() {
  try {
    return sessionStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token) {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    /* storage blocked: the admin has to sign in again on the next load */
  }
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing stored */
  }
}
