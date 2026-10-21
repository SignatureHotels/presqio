import { styled } from "@mui/material/styles";
import { displayFont } from "@/theme/media";
import { enter, motionOk, ease } from "../../EmployeeApp.style";

export const Header = styled("header", {
  shouldForwardProp: (prop) => prop !== "hero",
})<{ hero?: boolean }>(({ hero }) => ({
  padding: "18px 20px 22px",
  paddingTop: "max(18px, env(safe-area-inset-top))",
  ...(hero && {
    background: "var(--forest)",
    color: "var(--nav-text)",
    borderRadius: "0 0 28px 28px",
    paddingBottom: 72,
  }),
}));

export const TopRow = styled("div")({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
});

export const Brand = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 9,
  fontFamily: displayFont,
  fontWeight: 800,
  fontSize: 17,
  "& img": { display: "block", width: 36, height: 36, objectFit: "contain" },
});

export const Initials = styled("span")({
  width: 34,
  height: 34,
  borderRadius: "50%",
  display: "grid",
  placeItems: "center",
  fontSize: 12,
  fontWeight: 800,
  background: "var(--primary-soft)",
  color: "var(--primary-dark)",
});

export const Title = styled("div")({
  marginTop: 22,
  "& h1": {
    margin: 0,
    fontFamily: displayFont,
    fontSize: 25,
    letterSpacing: -0.5,
    color: "inherit",
  },
  "& p": { margin: "6px 0 0", opacity: 0.78, fontSize: 14 },
});

export const Body = styled("main", {
  shouldForwardProp: (prop) => prop !== "overlap",
})<{ overlap?: boolean }>(({ overlap }) => ({
  flex: 1,
  padding: "0 16px 110px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  ...(overlap && { marginTop: -56 }),
  [motionOk]: { "& > *": { animation: `${enter} 0.5s ${ease} both` } },
}));
