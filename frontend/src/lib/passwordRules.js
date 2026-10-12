/** Password rules, kept in step with validate_password_strength() in backend/app/auth.py. */
export const PASSWORD_RULES = [
  { id: "len", label: "8+ characters", test: (pw) => pw.length >= 8 },
  { id: "upper", label: "Uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { id: "lower", label: "Lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { id: "digit", label: "Number", test: (pw) => /[0-9]/.test(pw) },
  { id: "special", label: "Special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
  { id: "space", label: "No spaces", test: (pw) => !/\s/.test(pw) },
];

export function passwordProblems(pw) {
  return PASSWORD_RULES.filter((r) => !r.test(pw)).map((r) => r.label.toLowerCase());
}
