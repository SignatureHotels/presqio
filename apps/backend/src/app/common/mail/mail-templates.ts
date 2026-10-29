/** Rendered email: HTML for capable clients, plain text for everything else. */
export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

// Inline styles only: most email clients ignore <style> blocks and CSS variables.
const C = {
  bg: "#FFF9EF",
  surface: "#FFFEFC",
  coral: "#FF6778",
  forest: "#173F35",
  ink: "#171A17",
  muted: "#6D695F",
  line: "#EAE3D8",
};

interface Layout {
  subject: string;
  preheader: string;
  heading: string;
  /** Plain-text paragraphs; escaped before being placed in HTML. */
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote: string;
}

function layout({ subject, preheader, heading, paragraphs, action, footnote }: Layout): RenderedMail {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${C.ink}">${escapeHtml(p)}</p>`)
    .join("");
  const button = action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:12px;background:${C.coral}">
<a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:700;color:${C.ink};text-decoration:none;border-radius:12px">${escapeHtml(action.label)}</a>
</td></tr></table>
<p style="margin:0 0 16px;font-size:12px;line-height:1.6;color:${C.muted}">If the button doesn't work, paste this link into your browser:<br><a href="${escapeHtml(action.url)}" style="color:${C.forest};word-break:break-all">${escapeHtml(action.url)}</a></p>`
    : "";
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px">
<tr><td style="padding:0 0 20px"><span style="display:inline-block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:10px;background:${C.coral};color:${C.ink};font-weight:800;font-size:19px">P</span>
<span style="font-size:19px;font-weight:800;color:${C.forest};vertical-align:middle;margin-left:8px">presqio</span></td></tr>
<tr><td style="background:${C.surface};border:1px solid ${C.line};border-radius:18px;padding:32px 28px">
<h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;color:${C.forest}">${escapeHtml(heading)}</h1>
${body}${button}
<p style="margin:8px 0 0;padding-top:16px;border-top:1px solid ${C.line};font-size:12px;line-height:1.6;color:${C.muted}">${escapeHtml(footnote)}</p>
</td></tr>
<tr><td style="padding:18px 4px 0;font-size:11px;color:${C.muted}">Presqio · Attendance for multi-branch teams</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    heading,
    "",
    ...paragraphs.flatMap((p) => [p, ""]),
    ...(action ? [`${action.label}: ${action.url}`, ""] : []),
    footnote,
    "",
    "Presqio",
  ].join("\n");
  return { subject, html, text };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export const mailTemplates = {
  welcome: (input: { name: string; organizationName: string; verifyUrl: string }) =>
    layout({
      subject: "Welcome to Presqio – please verify your email",
      preheader: "Confirm your email to finish setting up your workspace.",
      heading: `Welcome, ${firstName(input.name)}!`,
      paragraphs: [
        `Your Presqio workspace for ${input.organizationName} is ready, with a 14-day free trial of every feature.`,
        "Please confirm this is your email address. You'll need a verified email to invite teammates and export reports.",
      ],
      action: { label: "Verify email", url: input.verifyUrl },
      footnote: "This link expires in 24 hours. If you didn't create a Presqio account, you can ignore this email.",
    }),

  /** To the Presqio team (ADMIN_NOTIFY_EMAIL) when a business signs up. */
  newSignup: (input: { name: string; email: string; organizationName: string; signedUpAt: Date; consoleUrl: string }) =>
    layout({
      subject: `New sign-up: ${input.organizationName}`,
      preheader: `${input.name} just created a Presqio workspace.`,
      heading: "A new business signed up",
      paragraphs: [
        `Business: ${input.organizationName}`,
        `Owner: ${input.name}`,
        `Email: ${input.email}`,
        `Signed up: ${input.signedUpAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST`,
        "They are on the 14-day free trial and have been sent a verification email.",
      ],
      action: { label: "Open the owner console", url: input.consoleUrl },
      footnote: "You get this because your address is set as ADMIN_NOTIFY_EMAIL (or GMAIL_USER) for Presqio.",
    }),

  verifyEmail: (input: { name: string; verifyUrl: string }) =>
    layout({
      subject: "Verify your Presqio email",
      preheader: "Confirm your email address.",
      heading: "Confirm your email address",
      paragraphs: [`Hi ${firstName(input.name)}, here is your new verification link.`],
      action: { label: "Verify email", url: input.verifyUrl },
      footnote: "This link expires in 24 hours and replaces any earlier link.",
    }),

  resetPassword: (input: { name: string; resetUrl: string }) =>
    layout({
      subject: "Reset your Presqio password",
      preheader: "Use this link within 30 minutes.",
      heading: "Reset your password",
      paragraphs: [
        `Hi ${firstName(input.name)}, we received a request to reset the password for your Presqio account.`,
        "Choosing a new password signs you out on every device.",
      ],
      action: { label: "Choose a new password", url: input.resetUrl },
      footnote:
        "This link expires in 30 minutes and can be used once. If you didn't ask for a reset, ignore this email: your password stays the same.",
    }),

  passwordChanged: (input: { name: string; when: string; resetUrl: string }) =>
    layout({
      subject: "Your Presqio password was changed",
      preheader: "If this wasn't you, reset your password now.",
      heading: "Your password was changed",
      paragraphs: [
        `Hi ${firstName(input.name)}, the password for your Presqio account was changed on ${input.when}. All devices were signed out.`,
        "If you made this change, no action is needed.",
      ],
      action: { label: "This wasn't me – reset password", url: input.resetUrl },
      footnote: "For your security we send this notice for every password change.",
    }),

  accountLocked: (input: { name: string; minutes: number; resetUrl: string }) =>
    layout({
      subject: "Sign-in paused after failed attempts",
      preheader: `Sign-in is paused for ${input.minutes} minutes.`,
      heading: "We paused sign-in to your account",
      paragraphs: [
        `Hi ${firstName(input.name)}, there were several incorrect password attempts on your Presqio account, so sign-in is paused for ${input.minutes} minutes.`,
        "If this was you, wait and try again, or reset your password. If it wasn't, reset your password to be safe.",
      ],
      action: { label: "Reset password", url: input.resetUrl },
      footnote: "No one has signed in. Your data has not been changed.",
    }),
};
