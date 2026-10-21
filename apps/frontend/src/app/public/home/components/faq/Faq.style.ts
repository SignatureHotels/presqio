import { keyframes, styled } from "@mui/material/styles";
import { canHover, ease, motionOk } from "../../HomePage.style";

const openAnswer = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
`;

export const FaqList = styled("div")({
  display: "grid",
  gap: 10,
  maxWidth: 820,
});

/** Combine with className="card". */
export const FaqItem = styled("details")({
  padding: 0,
  transition: `border-color 0.3s ${ease}, box-shadow 0.3s ${ease}`,
  "& summary": {
    cursor: "pointer",
    padding: "20px 22px",
    fontWeight: 700,
    fontSize: 16,
    listStyle: "none",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    transition: `color 0.25s ${ease}`,
  },
  "& summary::-webkit-details-marker": { display: "none" },
  // "+" that turns into "×" when the answer is open.
  "& summary::after": {
    content: '"+"',
    color: "var(--primary-dark)",
    fontSize: 20,
    lineHeight: 1,
    flexShrink: 0,
    transition: `transform 0.35s ${ease}`,
  },
  "&[open] summary::after": { transform: "rotate(45deg)" },
  "&[open]": {
    borderColor: "var(--primary-soft)",
    boxShadow: "0 14px 34px rgba(23, 63, 53, 0.07)",
  },
  "& p": {
    margin: 0,
    padding: "0 22px 20px",
    color: "var(--muted)",
    lineHeight: 1.65,
  },
  [motionOk]: {
    "&[open] p": { animation: `${openAnswer} 0.4s ${ease}` },
  },
  [canHover]: {
    "& summary:hover": { color: "var(--primary-dark)" },
  },
});
