import { styled } from "@mui/material/styles";

/** Colour pairs for initials avatars (text, background). */
const tones = {
  lav: ["var(--primary-dark)", "var(--primary-soft)"],
  mint: ["var(--success-ink)", "var(--success-soft)"],
  peach: ["var(--warning-ink)", "var(--warning-soft)"],
  blue: ["var(--forest)", "var(--forest-soft)"],
  pink: ["var(--error-ink)", "var(--error-soft)"],
} as const;
export type AvatarTone = keyof typeof tones;
export const isAvatarTone = (value: string | undefined): value is AvatarTone =>
  Boolean(value && value in tones);

/** Round initials badge; also used for the signed-in user in the sidebar. */
export const AvatarBadge = styled("span", {
  shouldForwardProp: (prop) => prop !== "tone",
})<{ tone?: AvatarTone }>(({ tone = "lav" }) => ({
  flex: "0 0 auto",
  width: 34,
  height: 34,
  display: "grid",
  placeItems: "center",
  borderRadius: "50%",
  fontSize: 10,
  fontWeight: 800,
  color: tones[tone][0],
  background: tones[tone][1],
}));

export const Person = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: 10,
  "& b": {
    display: "block",
    color: "var(--ink)",
    fontSize: 12,
  },
  "& small": {
    display: "block",
    color: "var(--muted)",
    fontSize: 10,
    marginTop: 4,
  },
});
