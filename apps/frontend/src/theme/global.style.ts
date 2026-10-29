import type { CSSObject } from "@mui/material/styles";

/**
 * App-wide base styles and the shared design-system classes (`.btn`, `.card`, `.chip`, `.icon`,
 * brand lock-up, form shells …) used across admin, auth and public pages. Injected once by
 * AppProvider through MUI GlobalStyles. Component-specific styles live next to each component
 * in its own `.style.ts`.
 *
 * An ordered array (one entry per rule) so later rules still win exactly as they would in a
 * stylesheet, even where a selector or media query appears more than once.
 */
export const globalStyles: CSSObject[] = [
  {
    "*": {
      boxSizing: "border-box",
    },
  },
  {
    "body": {
      margin: "0",
      background: "var(--bg)",
      color: "var(--ink)",
      fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      fontSize: 14,
    },
  },
  {
    "button, input, select, textarea": {
      font: "inherit",
    },
  },
  {
    "button": {
      cursor: "pointer",
    },
  },
  {
    "button:disabled": {
      opacity: 0.55,
      cursor: "not-allowed",
    },
  },
  {
    "a": {
      textDecoration: "none",
      color: "inherit",
    },
  },
  {
    ".hidden": {
      display: "none !important",
    },
  },
  {
    ".icon": {
      width: 18,
      height: 18,
      stroke: "currentColor",
      strokeWidth: 1.9,
      fill: "none",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      flexShrink: 0,
    },
  },
  {
    ".tiny": {
      width: 15,
      height: 15,
    },
  },
  {
    ".muted": {
      color: "var(--muted)",
    },
  },
  {
    ".sm": {
      fontSize: 12,
    },
  },
  {
    ".mono": {
      fontVariantNumeric: "tabular-nums",
    },
  },
  {
    ".fw7": {
      fontWeight: 700,
    },
  },
  {
    ".flex": {
      display: "flex",
    },
  },
  {
    ".between": {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
  },
  {
    ".gap8": {
      gap: 8,
    },
  },
  {
    ".gap12": {
      gap: 12,
    },
  },
  {
    ".chip": {
      fontSize: 11,
      fontWeight: 700,
      borderRadius: 7,
      padding: "6px 9px",
    },
  },
  {
    ".chip.accent": {
      background: "var(--primary-soft)",
      color: "var(--primary-dark)",
    },
  },
  {
    ".chip.success": {
      background: "var(--success-soft)",
      color: "var(--success-ink)",
    },
  },
  {
    ".chip.warning": {
      background: "var(--warning-soft)",
      color: "var(--warning-ink)",
    },
  },
  {
    ".chip.error": {
      background: "var(--error-soft)",
      color: "var(--error-ink)",
    },
  },
  {
    ".chip.neutral": {
      background: "var(--neutral-soft)",
      color: "var(--muted)",
    },
  },
  {
    ".view-tabs": {
      display: "flex",
      gap: 5,
      background: "var(--neutral-soft)",
      border: "1px solid var(--line-soft)",
      borderRadius: 12,
      padding: 5,
    },
  },
  {
    ".view-tab": {
      border: "0",
      background: "transparent",
      borderRadius: 9,
      padding: "10px 17px",
      color: "var(--muted)",
      fontWeight: 700,
      fontSize: 13,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
  },
  {
    ".view-tab.active": {
      color: "var(--primary-dark)",
      background: "var(--surface)",
      boxShadow: "var(--shadow-primary)",
    },
  },
  {
    ".preview-tip": {
      display: "flex",
      alignItems: "center",
      gap: 8,
      color: "var(--muted)",
      fontSize: 12,
    },
  },
  {
    ".input-shell": {
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--neutral-soft)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: "10px 12px",
      minHeight: 42,
      color: "var(--muted)",
    },
  },
  {
    ".input-shell input, .input-shell select": {
      background: "transparent",
      border: "0",
      outline: "0",
      minWidth: "0",
      color: "var(--ink)",
    },
  },
  {
    ".search-shell": {
      width: 210,
    },
  },
  {
    ".search-shell input": {
      width: "100%",
      fontSize: 12,
    },
  },
  {
    ".btn": {
      borderRadius: 10,
      border: "1px solid var(--line)",
      padding: "10px 15px",
      fontSize: 12,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      background: "var(--surface)",
      color: "var(--ink)",
      minHeight: 40,
    },
  },
  {
    ".btn.primary": {
      background: "var(--primary)",
      color: "var(--ink)",
      borderColor: "var(--primary)",
      boxShadow: "var(--shadow-primary)",
    },
  },
  {
    ".btn.danger-solid": {
      background: "var(--error)",
      color: "#fff",
      borderColor: "var(--error)",
    },
    ".btn:disabled": { opacity: 0.5, cursor: "not-allowed" },
  },
  {
    ".btn:hover": {
      filter: "brightness(0.98)",
    },
  },
  {
    ".circle-btn": {
      border: "1px solid var(--line)",
      width: 40,
      height: 40,
      background: "var(--surface)",
      borderRadius: 10,
      color: "var(--muted)",
      display: "grid",
      placeItems: "center",
      position: "relative",
    },
  },
  {
    ".circle-btn .notify": {
      position: "absolute",
      right: 9,
      top: 8,
      width: 6,
      height: 6,
      borderRadius: "50%",
      background: "var(--neutral-soft)",
      border: "1px solid var(--surface)",
    },
  },
  {
    ".company-switch": {
      fontSize: 12,
      fontWeight: 700,
      background: "var(--surface)",
      border: "1px solid var(--line)",
      borderRadius: 10,
      padding: "10px 11px",
      color: "var(--ink)",
      maxWidth: 165,
    },
  },
  {
    ".card": {
      background: "var(--surface)",
      border: "1px solid var(--line-soft)",
      borderRadius: 17,
      boxShadow: "var(--shadow-card)",
    },
  },
  {
    ".stat-icon": {
      width: 40,
      height: 40,
      display: "grid",
      placeItems: "center",
      borderRadius: 11,
    },
  },
  {
    ".stat-icon.accent": {
      background: "var(--primary-soft)",
      color: "var(--primary-dark)",
    },
  },
  {
    ".stat-icon.success": {
      background: "var(--success-soft)",
      color: "var(--success-ink)",
    },
  },
  {
    ".stat-icon.warning": {
      background: "var(--warning-soft)",
      color: "var(--warning-ink)",
    },
  },
  {
    ".stat-icon.error": {
      background: "var(--error-soft)",
      color: "var(--error-ink)",
    },
  },
  {
    ".card-pad": {
      padding: 22,
    },
  },
  {
    ".small-pill": {
      background: "var(--surface)",
      border: "1px solid var(--line-soft)",
      color: "var(--muted)",
      padding: "8px 9px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 700,
    },
  },
  {
    ".dot": {
      width: 8,
      height: 8,
      borderRadius: "50%",
      flexShrink: 0,
    },
  },
  {
    ".link": {
      color: "var(--primary-dark)",
      fontSize: 12,
      fontWeight: 800,
      background: "transparent",
      border: "0",
    },
  },
  {
    ".mini-icon": {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    },
  },
  {
    ".mini-icon svg": {
      width: 14,
      height: 14,
    },
  },
  {
    ".branch-avatar": {
      width: 37,
      height: 37,
      borderRadius: 10,
      background: "var(--forest-soft)",
      display: "grid",
      placeItems: "center",
      color: "var(--forest)",
    },
  },
  {
    ".page-grid": {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18,
    },
  },
  {
    ".controls-row": {
      display: "flex",
      gap: 11,
      alignItems: "center",
      marginBottom: 18,
      flexWrap: "wrap",
    },
  },
  {
    ".empty-box": {
      minHeight: 130,
      display: "grid",
      placeItems: "center",
      color: "var(--muted)",
      textAlign: "center",
    },
  },
  {
    ".policy-list": {
      marginTop: 17,
      display: "grid",
      gap: 12,
    },
  },
  {
    ".policy": {
      display: "flex",
      justifyContent: "space-between",
      padding: 14,
      border: "1px solid var(--neutral-soft)",
      borderRadius: 12,
    },
  },
  {
    ".policy b": {
      fontSize: 13,
    },
  },
  {
    ".policy p": {
      fontSize: 12,
      color: "var(--muted)",
      margin: "4px 0 0",
    },
  },
  {
    ".switch": {
      width: 38,
      height: 21,
      background: "var(--primary)",
      borderRadius: 20,
      position: "relative",
    },
  },
  {
    ".switch:after": {
      content: "\"\"",
      width: 15,
      height: 15,
      background: "var(--surface)",
      borderRadius: "50%",
      position: "absolute",
      right: 3,
      top: 3,
    },
  },
  {
    ".form-field": {
      display: "grid",
      gap: 7,
      marginBottom: 14,
    },
  },
  {
    ".form-field label": {
      fontSize: 12,
      fontWeight: 700,
      color: "var(--muted)",
    },
  },
  {
    ".form-field input, .form-field select, .form-field textarea": {
      background: "var(--surface)",
      border: "1px solid var(--line-soft)",
      borderRadius: 9,
      padding: "11px 12px",
      outline: "0",
      color: "var(--ink)",
      width: "100%",
    },
  },
  {
    ".form-field input:focus, .form-field select:focus": {
      borderColor: "var(--primary)",
    },
  },
  {
    "body": {
      fontFamily: "\"DM Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
    },
  },
  {
    ".chip": {
      display: "inline-block",
      whiteSpace: "nowrap",
    },
  },
  {
    ".card-pad": {
      minWidth: "0",
    },
  },
  {
    ".verification": {
      color: "var(--success-ink)",
    },
  },
  {
    ".controls-row": {
      marginTop: 2,
      marginBottom: 6,
    },
  },
  {
    ".inline-note": {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 12,
      lineHeight: 1.7,
      color: "var(--muted)",
      margin: "20px 0",
    },
  },
  {
    ".policy": {
      gap: 15,
      alignItems: "center",
    },
  },
  {
    ".policy p": {
      lineHeight: 1.6,
    },
  },
  {
    ".section-action": {
      marginTop: 20,
    },
  },
  {
    ".section-spacing": {
      marginTop: 20,
    },
  },
  {
    ".dialog-fields": {
      display: "grid",
      gap: 20,
      paddingTop: "12px !important",
    },
  },
  {
    ".dialog-fields > p": {
      fontSize: 13,
      margin: "0",
      lineHeight: 1.7,
    },
  },
  {
    ".form-columns": {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16,
    },
  },
  {
    ".sr-only": {
      position: "absolute",
      width: 1,
      height: 1,
      padding: "0",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: "0",
    },
  },
  {
    "button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible": {
      outline: "3px solid var(--forest)",
      outlineOffset: 3,
    },
  },
  {
    ".input-shell:focus-within": {
      outline: "2px solid var(--forest)",
    },
  },
  {
    "@media (max-width: 1260px)": {
      ".search-shell": {
        width: 170,
      },
    },
  },
  {
    "@media (max-width: 1050px)": {
      ".search-shell": {
        display: "none",
      },
    },
  },
  {
    "@media (max-width: 870px)": {
      ".page-grid": {
        gridTemplateColumns: "1fr",
      },
    },
  },
  {
    "@media (max-width: 530px)": {
      ".company-switch": {
        maxWidth: 145,
        fontSize: 11,
      },
    },
  },
  {
    "@media (max-width: 530px)": {
      ".stat-icon": {
        width: 30,
        height: 30,
        borderRadius: 9,
      },
    },
  },
  {
    "@media (max-width: 530px)": {
      ".card-pad": {
        padding: 17,
      },
    },
  },
  {
    "@media (max-width: 530px)": {
      ".policy": {
        flexWrap: "wrap",
      },
    },
  },
  {
    "@media (max-width: 530px)": {
      ".form-columns": {
        gridTemplateColumns: "1fr",
      },
    },
  },
  {
    "@media (prefers-reduced-motion: reduce)": {
      "*, *::before, *::after": {
        transition: "none !important",
        scrollBehavior: "auto !important",
      },
    },
  },
  {
    "html body": {
      fontSize: 14,
      background: "var(--bg)",
    },
  },
  {
    ".sr-only": {
      left: "0",
      top: "0",
    },
  },
  {
    "body": {
      minWidth: 320,
      margin: "0",
    },
  },
  {
    "::selection": {
      background: "var(--primary-soft)",
    },
  },
  {
    ".upcoming-portal": {
      maxWidth: 720,
      margin: "100px auto",
      padding: 32,
    },
  },
  {
    ".upcoming-portal h1": {
      fontSize: 36,
      letterSpacing: -1,
    },
  },
  {
    ".upcoming-portal p": {
      color: "var(--muted)",
      marginBottom: 28,
      lineHeight: 1.7,
    },
  },
  {
    ".brand-logo": {
      display: "block",
      width: "clamp(120px, 16vw, 180px)",
      height: "auto",
      objectFit: "contain",
      flexShrink: 0,
    },
    ".brand-wrap": {
      display: "flex",
      alignItems: "center",
      gap: 13,
    },
  },
  {
    ".brand-mark": {
      width: 38,
      height: 38,
      borderRadius: 12,
      background: "var(--primary)",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--ink)",
      fontSize: 23,
      fontWeight: 800,
      letterSpacing: -2,
      boxShadow: "var(--shadow-primary)",
    },
  },
  {
    ".brand-name": {
      fontFamily: "\"Plus Jakarta Sans\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
      fontWeight: 800,
      fontSize: 19,
      letterSpacing: -0.8,
      color: "var(--heading)",
    },
  },
];
