import { LANGUAGES, getLang, setLang, useT } from ".";

/** English · हिंदी · తెలుగు as a compact switch. */
export function LanguagePicker({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  const t = useT();
  const active = getLang();
  const dark = tone === "dark";
  return (
    <div role="group" aria-label={t("lang.label")} className={className}
      style={{ display: "inline-flex", gap: 4, padding: 3, borderRadius: 999, border: `1px solid ${dark ? "#2b3d36" : "var(--line, #d0d5dd)"}` }}>
      {LANGUAGES.map((lang) => (
        <button key={lang.id} type="button" lang={lang.id} aria-pressed={active === lang.id} onClick={() => setLang(lang.id)}
          style={{
            border: 0, borderRadius: 999, padding: "6px 12px", font: "inherit", fontSize: 14, cursor: "pointer",
            fontWeight: active === lang.id ? 700 : 500,
            background: active === lang.id ? (dark ? "#3fb27f" : "var(--forest, #173F35)") : "transparent",
            color: active === lang.id ? (dark ? "#06130d" : "#fff") : (dark ? "#9fb0a8" : "inherit"),
          }}>
          {lang.label}
        </button>
      ))}
    </div>
  );
}
