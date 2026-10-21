import { keyframes, styled } from "@mui/material/styles";
import { motionOk } from "../../HomePage.style";

/** Soft colour wash drifting behind the closing call to action. */
const drift = keyframes`
  0%, 100% { background-position: 0% 50%, 100% 50%; }
  50% { background-position: 100% 50%, 0% 50%; }
`;

export const CtaBand = styled("section")({
  margin: "24px auto 72px",
  maxWidth: 1112,
  width: "calc(100% - 32px)",
  borderRadius: 28,
  padding: "56px 24px",
  backgroundColor: "var(--primary-tint)",
  backgroundImage:
    "radial-gradient(circle at center, rgba(255, 103, 120, 0.16), transparent 55%), radial-gradient(circle at center, rgba(36, 138, 103, 0.10), transparent 50%)",
  backgroundSize: "60% 160%, 55% 150%",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "0% 50%, 100% 50%",
  border: "1px solid var(--primary-soft)",
  textAlign: "center",
  display: "grid",
  justifyItems: "center",
  gap: 22,
  "& h2": {
    margin: 0,
    fontSize: "clamp(26px, 3.4vw, 36px)",
  },
  [motionOk]: { animation: `${drift} 14s ease-in-out infinite` },
});
