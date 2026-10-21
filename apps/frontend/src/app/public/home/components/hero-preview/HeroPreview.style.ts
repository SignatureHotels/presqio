import { keyframes, styled } from "@mui/material/styles";
import { canHover, ease, fadeUp, media, motionOk } from "../../HomePage.style";

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
`;
const spin = keyframes`
  to { transform: rotate(360deg); }
`;
const scan = keyframes`
  0% { top: 12%; opacity: 0; }
  12% { opacity: 1; }
  88% { opacity: 1; }
  100% { top: 84%; opacity: 0; }
`;
const popIn = keyframes`
  from { opacity: 0; transform: translateY(8px) scale(0.97); }
  to { opacity: 1; transform: none; }
`;
const tick = keyframes`
  0% { transform: scale(0); }
  70% { transform: scale(1.25); }
  100% { transform: scale(1); }
`;
const confirm = keyframes`
  0% { transform: scale(0.92); opacity: 0; }
  60% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
`;
const glow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 103, 120, 0.45); }
  50% { box-shadow: 0 0 0 10px rgba(255, 103, 120, 0); }
`;
const slideIn = keyframes`
  from { opacity: 0; transform: translate(-24px, 16px); }
  to { opacity: 1; transform: none; }
`;

/** When the check rows finish, the "Checked in" confirmation lands. */
const CHECK_START_MS = 900;
const CHECK_STEP_MS = 320;
const CONFIRM_MS = CHECK_START_MS + 3 * CHECK_STEP_MS + 100;

export const Visual = styled("div")({
  position: "relative",
  display: "flex",
  justifyContent: "center",
  padding: "20px 0 40px",
  perspective: 1200,
  [motionOk]: { animation: `${fadeUp} 1s ${ease} 0.35s both` },
  [media.phone]: {
    flexDirection: "column",
    alignItems: "center",
  },
});

/** Follows the pointer with a gentle 3D tilt (angles set as CSS variables from the component). */
export const Tilt = styled("div")({
  width: "min(300px, 100%)",
  transformStyle: "preserve-3d",
  transform: "rotateX(var(--tilt-x, 0deg)) rotateY(var(--tilt-y, 0deg))",
  transition: `transform 0.6s ${ease}`,
});

export const Phone = styled("div")({
  borderRadius: 34,
  background: "var(--forest)",
  padding: "22px 18px 20px",
  color: "var(--nav-text)",
  boxShadow: "0 30px 60px rgba(23, 63, 53, 0.22)",
  display: "grid",
  gap: 18,
  [motionOk]: { animation: `${float} 6s ease-in-out 1.4s infinite` },
});

export const PhoneTop = styled("div")({
  display: "flex",
  justifyContent: "space-between",
  fontSize: 12,
  color: "var(--nav-muted)",
});

export const PhoneTime = styled("span")({
  fontWeight: 700,
  color: "var(--nav-text)",
});

export const Selfie = styled("div")({
  aspectRatio: "1",
  borderRadius: 24,
  background: "radial-gradient(circle at 50% 40%, var(--nav-hover), var(--nav-panel))",
  display: "grid",
  placeItems: "center",
  position: "relative",
  overflow: "hidden",
});

export const SelfieRing = styled("span")({
  width: "58%",
  aspectRatio: "1",
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  color: "var(--nav-muted)",
  position: "relative",
  // The dashed ring sits on its own layer so it can rotate without turning the face icon.
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "3px dashed var(--primary)",
    [motionOk]: { animation: `${spin} 14s linear infinite` },
  },
});

/** Face-scan line sweeping over the selfie frame. */
export const ScanLine = styled("span")({
  display: "none",
  position: "absolute",
  left: "14%",
  right: "14%",
  height: 2,
  borderRadius: 2,
  background: "linear-gradient(90deg, transparent, var(--primary), transparent)",
  boxShadow: "0 0 14px var(--primary)",
  [motionOk]: {
    display: "block",
    animation: `${scan} 2.4s ease-in-out 0.6s infinite alternate`,
  },
});

export const Checks = styled("div")({
  display: "grid",
  gap: 8,
});

export const CheckRow = styled("span", {
  shouldForwardProp: (prop) => prop !== "order",
})<{ order: number }>(({ order }) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 12,
  padding: "9px 10px",
  borderRadius: 10,
  background: "var(--nav-panel)",
  "& .icon": { color: "var(--success-soft)" },
  [motionOk]: {
    animation: `${popIn} 0.55s ${ease} ${CHECK_START_MS + order * CHECK_STEP_MS}ms both`,
    "& .icon": {
      animation: `${tick} 0.45s ${ease} ${CHECK_START_MS + order * CHECK_STEP_MS + 180}ms both`,
    },
  },
}));

export const PhoneButton = styled("span")({
  textAlign: "center",
  padding: 13,
  borderRadius: 14,
  background: "var(--primary)",
  color: "var(--ink)",
  fontWeight: 800,
  [motionOk]: {
    animation: `${confirm} 0.6s ${ease} ${CONFIRM_MS}ms both, ${glow} 2.6s ease-out ${CONFIRM_MS + 600}ms infinite`,
  },
});

export const FloatCard = styled("div")({
  position: "absolute",
  left: 0,
  bottom: 8,
  padding: "16px 18px",
  display: "grid",
  gap: 6,
  minWidth: 220,
  "& strong": {
    fontSize: 20,
    color: "var(--heading)",
    fontVariantNumeric: "tabular-nums",
  },
  [motionOk]: { animation: `${slideIn} 0.9s ${ease} 0.9s both` },
  [canHover]: {
    transition: `transform 0.4s ${ease}, box-shadow 0.4s ${ease}`,
    "&:hover": {
      transform: "translateY(-4px)",
      boxShadow: "0 18px 40px rgba(23, 63, 53, 0.12)",
    },
  },
  [media.phone]: {
    position: "static",
    marginTop: 16,
  },
});

export const FloatLabel = styled("span")({
  fontSize: 11,
  fontWeight: 700,
  color: "var(--muted)",
  textTransform: "uppercase",
  letterSpacing: "0.8px",
});

export const FloatBar = styled("span")({
  height: 6,
  borderRadius: 6,
  background: "var(--neutral-soft)",
  overflow: "hidden",
});

export const FloatBarFill = styled("span", {
  shouldForwardProp: (prop) => prop !== "percent",
})<{ percent: number }>(({ percent }) => ({
  display: "block",
  height: "100%",
  width: `${percent}%`,
  background: "var(--success)",
  [motionOk]: { transition: `width 1.4s ${ease}` },
}));
