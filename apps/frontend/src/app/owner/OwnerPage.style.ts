import { styled } from "@mui/material/styles";
import { headingFont, media } from "@/theme/media";

export const Shell = styled("div")({ minHeight: "100vh", background: "var(--bg)" });

export const TopBar = styled("header")({
  position: "sticky",
  top: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 28px",
  background: "var(--nav)",
  color: "var(--nav-text)",
  boxShadow: "0 6px 24px rgba(23, 63, 53, 0.18)",
  "& .brand-logo": { height: 34, width: "auto", filter: "brightness(0) invert(1)" },
  [media.phone]: { padding: "10px 16px", gap: 10 },
});

export const ConsoleTag = styled("span")({
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  padding: "5px 9px",
  borderRadius: 7,
  background: "var(--nav-panel)",
  color: "var(--nav-muted)",
  border: "1px solid var(--nav-line)",
  [media.phone]: { display: "none" },
});

export const TopRight = styled("div")({
  marginLeft: "auto",
  display: "flex",
  alignItems: "center",
  gap: 10,
  "& .who": { fontSize: 12, color: "var(--nav-muted)", [media.tablet]: { display: "none" } },
  "& .top-btn": {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 36,
    padding: "0 13px",
    borderRadius: 9,
    border: "1px solid var(--nav-line)",
    background: "transparent",
    color: "var(--nav-text)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
    textDecoration: "none",
  },
  "& .top-btn:hover": { background: "var(--nav-hover)" },
  "& .top-btn .icon": { width: 15, height: 15 },
  [media.phone]: { "& .top-btn span": { display: "none" } },
});

export const Main = styled("main")({
  maxWidth: 1320,
  margin: "0 auto",
  padding: "26px 28px 60px",
  [media.phone]: { padding: "18px 14px 48px" },
});

export const Hero = styled("div")({
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 20,
  "& h1": { fontFamily: headingFont, fontSize: 30, color: "var(--heading)", margin: "4px 0 0", letterSpacing: "-0.02em" },
  "& .eyebrow": { fontSize: 12, fontWeight: 700, color: "var(--primary-dark)", letterSpacing: "0.08em", textTransform: "uppercase" },
  "& p": { margin: "6px 0 0", color: "var(--muted)" },
  [media.phone]: { "& h1": { fontSize: 24 } },
});

export const KpiGrid = styled("div")({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))",
  gap: 14,
  [media.phone]: { gridTemplateColumns: "1fr 1fr", gap: 10 },
});

export const Kpi = styled("button")<{ tone: string; active?: boolean }>(({ tone, active }) => ({
  textAlign: "left",
  font: "inherit",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  padding: "16px 18px 15px",
  borderRadius: 16,
  background: "var(--surface)",
  border: `1px solid ${active ? `var(--${tone})` : "var(--line-soft)"}`,
  boxShadow: active ? `0 0 0 3px var(--${tone}-soft)` : "var(--shadow-card)",
  transition: "transform .12s ease, box-shadow .12s ease",
  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 8px 22px rgba(23, 63, 53, 0.08)" },
  "&::before": { content: '""', position: "absolute", inset: "0 auto 0 0", width: 4, background: `var(--${tone})` },
  "& .label": { fontSize: 12, fontWeight: 700, color: "var(--muted)" },
  "& .value": { display: "block", fontFamily: headingFont, fontSize: 30, fontWeight: 800, color: "var(--heading)", marginTop: 4, lineHeight: 1.1 },
  "& .note": { display: "block", fontSize: 12, color: "var(--muted)", marginTop: 5 },
  [media.phone]: { padding: "13px 14px 12px", "& .value": { fontSize: 24 } },
}));

export const Row = styled("div")({
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.55fr) minmax(280px, 1fr)",
  gap: 16,
  marginTop: 16,
  [media.tablet]: { gridTemplateColumns: "1fr" },
});

export const Panel = styled("section")({
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 18,
  boxShadow: "var(--shadow-card)",
  padding: "18px 20px",
  "& h2": { fontFamily: headingFont, fontSize: 16, color: "var(--heading)", margin: 0 },
  "& .panel-head": { display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  "& .panel-note": { fontSize: 12, color: "var(--muted)" },
  // a chart panel stretches its bars to fill the card's height
  "&.chart": { display: "flex", flexDirection: "column" },
  "&.chart > [data-bars]": { flex: 1, minHeight: 120 },
});

/** A small bar chart: one bar per day. */
export const Bars = styled("div")<{ height?: number }>(({ height = 120 }) => ({
  display: "flex",
  alignItems: "flex-end",
  gap: 4,
  height,
  "& .bar": {
    flex: 1,
    minWidth: 3,
    borderRadius: "5px 5px 2px 2px",
    background: "linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%)",
    position: "relative",
  },
  "& .bar.zero": { background: "var(--neutral-soft)", height: "3px !important" },
  "& .bar:hover::after": {
    content: "attr(data-tip)",
    position: "absolute",
    bottom: "calc(100% + 6px)",
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    background: "var(--forest)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 7px",
    borderRadius: 6,
    zIndex: 2,
  },
}));

export const BarAxis = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "var(--subtle)",
  marginTop: 7,
});

export const Totals = styled("dl")({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  margin: 0,
  "& div": { background: "var(--bg)", border: "1px solid var(--line-soft)", borderRadius: 12, padding: "11px 13px" },
  "& dt": { fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" },
  "& dd": { margin: "4px 0 0", fontFamily: headingFont, fontSize: 20, fontWeight: 800, color: "var(--heading)" },
  "& .wide": { gridColumn: "1 / -1", background: "var(--forest)", border: 0 },
  "& .wide dt": { color: "var(--nav-muted)" },
  "& .wide dd": { color: "#fff" },
});

export const Toolbar = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 10,
  marginBottom: 14,
});

export const Search = styled("label")({
  flex: "1 1 260px",
  display: "flex",
  alignItems: "center",
  gap: 8,
  minHeight: 42,
  padding: "0 13px",
  borderRadius: 11,
  background: "var(--bg)",
  border: "1px solid var(--line)",
  "&:focus-within": { borderColor: "var(--primary)", boxShadow: "0 0 0 3px var(--primary-tint)" },
  "& input": { flex: 1, minWidth: 0, border: 0, outline: 0, background: "transparent", fontSize: 14 },
  "& .icon": { width: 16, height: 16, color: "var(--muted)" },
});

export const Select = styled("select")({
  minHeight: 42,
  padding: "0 12px",
  borderRadius: 11,
  border: "1px solid var(--line)",
  background: "var(--surface)",
  fontWeight: 600,
  color: "var(--ink)",
});

export const StateTabs = styled("div")({
  display: "flex",
  gap: 6,
  overflowX: "auto",
  paddingBottom: 2,
  marginBottom: 14,
  "& button": {
    flex: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    minHeight: 34,
    padding: "0 12px",
    borderRadius: 999,
    border: "1px solid var(--line-soft)",
    background: "var(--surface)",
    color: "var(--muted)",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
  },
  "& button.active": { background: "var(--forest)", borderColor: "var(--forest)", color: "#fff" },
  "& .n": { fontSize: 11, padding: "1px 7px", borderRadius: 999, background: "var(--neutral-soft)", color: "var(--ink)" },
  "& button.active .n": { background: "rgba(255,255,255,.18)", color: "#fff" },
});

export const Table = styled("table")({
  width: "100%",
  borderCollapse: "collapse",
  "& th": {
    textAlign: "left",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--muted)",
    padding: "0 10px 10px",
    borderBottom: "1px solid var(--line-soft)",
    whiteSpace: "nowrap",
  },
  "& td": { padding: "12px 10px", borderBottom: "1px solid var(--line-soft)", verticalAlign: "middle", fontSize: 13 },
  "& tbody tr": { cursor: "pointer", transition: "background .1s" },
  "& tbody tr:hover": { background: "var(--primary-tint)" },
  "& tbody tr:focus-visible": { outline: "2px solid var(--primary)", outlineOffset: -2 },
  "& .num": { textAlign: "right", fontVariantNumeric: "tabular-nums" },
  [media.laptop]: { "& .hide-laptop": { display: "none" } },
  [media.tablet]: { display: "none" },
});

export const ClientName = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 11,
  "& .avatar": {
    flex: "none",
    width: 36,
    height: 36,
    borderRadius: 11,
    display: "grid",
    placeItems: "center",
    background: "var(--forest-soft)",
    color: "var(--forest)",
    fontWeight: 800,
    fontSize: 13,
  },
  "& strong": { display: "block", color: "var(--heading)" },
  "& span": { fontSize: 12, color: "var(--muted)" },
});

/** Phone and tablet: the table becomes cards. */
export const Cards = styled("div")({
  display: "none",
  gap: 10,
  [media.tablet]: { display: "grid" },
  "& button": {
    textAlign: "left",
    font: "inherit",
    cursor: "pointer",
    display: "grid",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    border: "1px solid var(--line-soft)",
    background: "var(--bg)",
  },
  "& .meta": { display: "flex", flexWrap: "wrap", gap: "6px 14px", fontSize: 12, color: "var(--muted)" },
});

export const Pager = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  marginTop: 14,
  fontSize: 12,
  color: "var(--muted)",
  "& .pages": { display: "flex", gap: 6 },
});

export const Empty = styled("div")({
  padding: "40px 16px",
  textAlign: "center",
  color: "var(--muted)",
  "& strong": { display: "block", color: "var(--heading)", fontSize: 15, marginBottom: 4 },
});

// ── client drawer ──────────────────────────────────────────────────────────

export const DrawerBody = styled("div")({
  width: "min(560px, 100vw)",
  minHeight: "100%",
  background: "var(--bg)",
  display: "flex",
  flexDirection: "column",
});

export const DrawerHead = styled("div")({
  position: "sticky",
  top: 0,
  zIndex: 2,
  padding: "18px 20px 16px",
  background: "var(--forest)",
  color: "#fff",
  "& h2": { fontFamily: headingFont, fontSize: 20, margin: "8px 0 2px" },
  "& .sub": { fontSize: 12, color: "var(--nav-muted)" },
  "& .close": {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 9,
    border: "1px solid var(--nav-line)",
    background: "transparent",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
  },
});

export const DrawerSection = styled("section")({
  margin: "14px 16px 0",
  padding: "15px 16px",
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 14,
  "& h3": { fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", margin: "0 0 12px" },
  "&:last-of-type": { marginBottom: 24 },
});

export const Facts = styled("dl")({
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 8,
  margin: 0,
  "& div": { background: "var(--bg)", borderRadius: 10, padding: "9px 10px" },
  "& dt": { fontSize: 11, color: "var(--muted)", fontWeight: 700 },
  "& dd": { margin: "3px 0 0", fontWeight: 800, color: "var(--heading)", fontSize: 15 },
  [media.phone]: { gridTemplateColumns: "1fr 1fr" },
});

export const ContactLine = styled("div")({
  display: "grid",
  gap: 4,
  fontSize: 13,
  "& a": { color: "var(--primary-dark)", fontWeight: 700, textDecoration: "none" },
  "& .row": { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
});

export const ActionGrid = styled("div")({
  display: "grid",
  gap: 12,
  "& .field": { display: "grid", gap: 6 },
  "& label": { fontSize: 12, fontWeight: 700, color: "var(--muted)" },
  "& input[type=date], & select": {
    minHeight: 42,
    padding: "0 12px",
    borderRadius: 10,
    border: "1px solid var(--line)",
    background: "var(--surface)",
    fontWeight: 600,
    color: "var(--ink)",
  },
  "& input[type=date]:focus, & select:focus": { outline: 0, borderColor: "var(--primary)", boxShadow: "0 0 0 3px var(--primary-tint)" },
  "& .inline": { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" },
  "& .inline .field": { flex: "1 1 160px" },
  "& .quick": { display: "flex", gap: 6, flexWrap: "wrap" },
  "& .quick button": {
    minHeight: 30,
    padding: "0 11px",
    borderRadius: 999,
    border: "1px solid var(--line)",
    background: "var(--bg)",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
  "& .quick button:hover": { borderColor: "var(--primary)", color: "var(--primary-dark)" },
  "& .hint": { fontSize: 12, color: "var(--muted)" },
  "& .divider": { height: 1, background: "var(--line-soft)", margin: "2px 0" },
  "& .danger": { borderColor: "var(--error)", color: "var(--error-ink)" },
});

export const Timeline = styled("ol")({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 10,
  "& li": { display: "grid", gridTemplateColumns: "12px 1fr", gap: 10, fontSize: 13 },
  "& .dot": { width: 10, height: 10, borderRadius: 999, background: "var(--primary)", marginTop: 4 },
  "& time": { display: "block", fontSize: 11, color: "var(--muted)" },
});
