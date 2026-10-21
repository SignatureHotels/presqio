export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// Most common leaked passwords that still pass the length rule (NIST 800-63B: block known-bad).
const COMMON = new Set([
  "password", "password1", "password12", "password123", "password@123", "passw0rd",
  "12345678", "123456789", "1234567890", "12341234", "11111111", "00000000", "87654321",
  "qwertyui", "qwerty123", "qwertyuiop", "asdfghjk", "asdf1234", "zxcvbnm1", "1q2w3e4r",
  "1qaz2wsx", "abcd1234", "abc12345", "abcdefgh", "iloveyou", "welcome1", "welcome123",
  "sunshine", "princess", "football", "baseball", "superman", "trustno1", "letmein1",
  "admin123", "admin@123", "administrator", "changeme", "default1", "test1234",
  "india123", "india@123", "presqio", "presqio1", "presqio123", "attendance",
]);

/**
 * Returns a reason the password is unacceptable, or null when it is fine.
 * Length and blocklist rules only: composition rules ("one symbol") make passwords weaker in practice.
 */
export function passwordProblem(
  password: string,
  context: { email?: string | null; name?: string | null },
): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return "This password is too common. Choose something harder to guess.";
  if (/^(.)\1+$/.test(password)) return "Don't repeat a single character.";
  const local = context.email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && lower.includes(local))
    return "Your password must not contain your email address.";
  const nameParts = (context.name ?? "").toLowerCase().split(/\s+/).filter((part) => part.length >= 3);
  if (nameParts.some((part) => lower.includes(part)))
    return "Your password must not contain your name.";
  return null;
}
