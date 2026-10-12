/** Where to go after login/signup: the ?next= path when it's internal, else the dashboard. */
export function nextPath(search) {
  const next = new URLSearchParams(search).get("next") || "";
  // Only same-site paths: "/jobs?x" is fine, "//evil.com" and "https://…" are not.
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/dashboard";
}
