export function csvText(rows: (string | number)[][]) {
  // Escape formulas as well as CSV delimiters in user-controlled fields.
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            const safe = /^[\s]*[=+@\-]/.test(text) ? `'${text}` : text;
            return `"${safe.replaceAll('"', '""')}"`;
          })
          .join(","),
      )
      .join("\r\n")
  );
}
