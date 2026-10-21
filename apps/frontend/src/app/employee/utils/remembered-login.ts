const KEY = "presqio.employeeLogin";

/** The employee ID is remembered on this phone so returning employees just tap Sign in. */
export function rememberLogin(employeeCode: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ employeeCode }));
  } catch {
    // Private mode: nothing remembered.
  }
}

export function rememberedLogin(): { employeeCode: string } {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (value && typeof value.employeeCode === "string") return { employeeCode: value.employeeCode };
  } catch {
    // Unreadable or blocked storage.
  }
  return { employeeCode: "" };
}
