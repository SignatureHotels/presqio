import { styled } from "@mui/material/styles";
import { media } from "@/theme/media";

/** Card that wraps a heading, a DataTable and an optional footer. Combine with className="card". */
export const TableCard = styled("section")({
  marginTop: 18,
  overflow: "hidden",
});

export const TableHeading = styled("div")({
  padding: "21px 23px 18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 20,
  // The SectionHeader takes the free space; actions stay on the right.
  "& > div:first-of-type": { flex: 1 },
  "& .link": {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    whiteSpace: "nowrap",
  },
  [media.phone]: {
    padding: "18px 15px",
    alignItems: "flex-start",
    "& .link": { fontSize: 10 },
  },
});

export const TableFooter = styled("div")({
  borderTop: "1px solid var(--line-soft)",
  padding: "12px 22px",
  fontSize: 11,
  color: "var(--muted)",
});

export const TableScroll = styled("div")({
  overflowX: "auto",
});

export const Table = styled("table")({
  borderCollapse: "collapse",
  width: "100%",
  textAlign: "left",
  "& th": {
    background: "var(--neutral-soft)",
    fontSize: 10,
    color: "var(--muted)",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: 0.65,
    padding: "13px 22px",
    whiteSpace: "nowrap",
  },
  "& td": {
    padding: "14px 22px",
    borderTop: "1px solid var(--line-soft)",
    fontSize: 12,
    color: "var(--muted)",
    whiteSpace: "nowrap",
  },
  "& tr:hover td": { background: "var(--neutral-soft)" },
  // Cell modifiers a column can opt into through `className`.
  "& .empty-cell": {
    textAlign: "center",
    padding: "36px !important",
    color: "var(--muted)",
  },
  "& .wrap-cell": {
    whiteSpace: "normal !important",
    minWidth: 180,
    maxWidth: 320,
    lineHeight: 1.6,
    overflowWrap: "anywhere",
  },
  [media.wide]: {
    "& td, & th": { paddingLeft: 15, paddingRight: 15 },
  },
  [media.phone]: { minWidth: 660 },
});
