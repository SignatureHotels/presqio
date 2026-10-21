import { styled } from "@mui/material/styles";
import { displayFont, media } from "@/theme/media";

export const Page = styled("main")({
  minHeight: "100vh",
  background: "var(--bg)",
});

export const Head = styled("header")({
  height: 68,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "0 32px",
  borderBottom: "1px solid var(--line-soft)",
  [media.phone]: { padding: "0 16px" },
});

export const Body = styled("section")({
  maxWidth: 560,
  margin: "0 auto",
  padding: "48px 16px",
  display: "grid",
  gap: 14,
  "& h1": {
    margin: 0,
    fontFamily: displayFont,
    fontSize: 28,
    color: "var(--heading)",
  },
  "& > p": { margin: "-6px 0 10px" },
});

export const OrgList = styled("ul")({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 10,
});

/** Combine with className="card". */
export const OrgCard = styled("button")({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "16px 18px",
  textAlign: "left",
  color: "var(--ink)",
  "&:hover": { borderColor: "var(--primary)" },
});

export const OrgInitial = styled("span")({
  width: 42,
  height: 42,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  background: "var(--forest)",
  color: "var(--nav-text)",
  fontWeight: 800,
  fontSize: 17,
  flexShrink: 0,
});

export const OrgCopy = styled("span")({
  flex: 1,
  display: "grid",
  gap: 3,
  minWidth: 0,
});

/** Combine with className="card". */
export const CreateForm = styled("form")({
  padding: 18,
  display: "grid",
  gap: 14,
});
