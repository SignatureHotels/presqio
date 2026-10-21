import { styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";

export const Stats = styled("div")({
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
  "& div": {
    background: "var(--surface)",
    border: "1px solid var(--line-soft)",
    borderRadius: 18,
    padding: 16,
  },
  "& small": { color: "var(--muted)", fontSize: 12 },
  "& b": { display: "block", fontFamily: displayFont, fontSize: 26, color: "var(--heading)", marginTop: 4 },
});

export const DayList = styled("ul")({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "grid",
  gap: 10,
});

export const DayRow = styled("li")({
  display: "flex",
  alignItems: "center",
  gap: 14,
  background: "var(--surface)",
  border: "1px solid var(--line-soft)",
  borderRadius: 18,
  padding: "12px 14px",
  "& .date": {
    width: 46,
    textAlign: "center",
    "& strong": { display: "block", fontSize: 20, color: "var(--heading)", lineHeight: 1 },
    "& small": { fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: 0.6 },
  },
  "& .info": {
    flex: 1,
    minWidth: 0,
    "& strong": { display: "block", fontSize: 14 },
    "& small": { color: "var(--muted)", fontSize: 12 },
  },
});

export const Empty = styled("p")({
  textAlign: "center",
  color: "var(--muted)",
  padding: "30px 10px",
  margin: 0,
});
