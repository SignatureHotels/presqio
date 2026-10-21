import { keyframes, styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import { displayFont } from "@/theme/media";

/** Home page breakpoints (desktop-first). */
export const media = {
  tablet: "@media (max-width: 980px)",
  phone: "@media (max-width: 600px)",
} as const;

export const headingFont = displayFont;

/** Horizontal page gutter shared by every home section. */
export const gutter = "clamp(16px, 5vw, 64px)";

/** Every animation sits under this query, so reduced-motion visitors get the static page. */
export const motionOk = "@media (prefers-reduced-motion: no-preference)";
/** Hover effects only where a real pointer can hover. */
export const canHover = "@media (hover: hover) and (pointer: fine)";
/** Soft "expo out" curve used for entrances and hovers. */
export const ease = "cubic-bezier(0.22, 1, 0.36, 1)";

export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: none; }
`;
export const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const STAGGER_MS = 90;
const revealUp = keyframes`
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: none; }
`;

export const PageRoot = styled("div")({
  background: "var(--bg)",
  color: "var(--ink)",
  fontSize: 15,
  overflowX: "clip",
  "& h1, & h2, & h3": {
    fontFamily: headingFont,
    color: "var(--heading)",
    letterSpacing: "-0.6px",
  },
  // Slightly larger than the admin `.btn` for marketing calls to action.
  "& .btn": {
    fontSize: 14,
    minHeight: 44,
    padding: "11px 18px",
    transition: `transform 0.25s ${ease}, box-shadow 0.25s ${ease}, filter 0.2s`,
  },
  "& .btn .icon": { transition: `transform 0.3s ${ease}` },
  [canHover]: {
    "& .btn:hover": { transform: "translateY(-1px)" },
    "& .btn.primary:hover": { boxShadow: "0 8px 22px rgba(255, 103, 120, 0.32)" },
    "& .btn:hover .icon": { transform: "translateX(3px)" },
    "& .btn:active": { transform: "translateY(0) scale(0.98)" },
  },
  /*
   * Scroll reveal. `data-reveal` animates the element itself; `data-reveal-children` animates
   * each direct child, staggered by its `--i` index (see `stagger()`). The animation fills
   * backwards only, so once it ends hover transforms work normally. The hidden state exists
   * only when motion is allowed, so content is always visible for reduced-motion visitors.
   */
  [motionOk]: {
    "& [data-reveal='out'], & [data-reveal-children='out'] > *": { opacity: 0 },
    "& [data-reveal='in'], & [data-reveal-children='in'] > *": {
      animation: `${revealUp} 0.8s ${ease} backwards`,
      animationDelay: `calc(var(--i, 0) * ${STAGGER_MS}ms)`,
    },
  },
});

export const Section = styled("section")({
  maxWidth: 1240,
  margin: "0 auto",
  padding: `72px ${gutter}`,
  // Anchor jumps land below the sticky navigation.
  scrollMarginTop: 72,
  [media.phone]: {
    paddingTop: 56,
    paddingBottom: 56,
  },
});

/** Eyebrow + title (+ lead) block that reveals as one staggered group. */
export const SectionIntro = styled("div")({});

export const SectionTitle = styled("h2")({
  fontSize: "clamp(28px, 3.6vw, 40px)",
  margin: "10px 0 32px",
  maxWidth: 720,
});

export const Eyebrow = styled("span", {
  shouldForwardProp: (prop) => prop !== "light",
})<{ light?: boolean }>(({ light }) => ({
  // inline-block so the reveal's translate applies.
  display: "inline-block",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "1.2px",
  textTransform: "uppercase",
  color: light ? "var(--primary)" : "var(--primary-dark)",
}));

const largeCta = {
  // `&&` outranks the global `.btn` rule regardless of stylesheet order.
  "&&": {
    minHeight: 52,
    padding: "14px 22px",
    fontSize: 15,
  },
};

/** Large call-to-action; combine with className="btn" or "btn primary". */
export const LargeLink = styled(Link)(largeCta);
export const LargeAnchor = styled("a")(largeCta);
