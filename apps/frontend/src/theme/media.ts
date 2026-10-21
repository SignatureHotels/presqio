/** Admin/app breakpoints (desktop-first), shared by component `.style.ts` files. */
export const media = {
  wide: "@media (max-width: 1260px)",
  laptop: "@media (max-width: 1050px)",
  tablet: "@media (max-width: 870px)",
  phone: "@media (max-width: 530px)",
} as const;

export const headingFont =
  '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

/** Heading stack used by the public, auth and onboarding pages (falls back to DM Sans). */
export const displayFont = '"Plus Jakarta Sans", "DM Sans", sans-serif';
