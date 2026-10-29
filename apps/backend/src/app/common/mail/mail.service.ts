import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import type { RenderedMail } from "./mail-templates";

interface GmailCredentials {
  user: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * Sends through the Gmail API (HTTPS) when the GMAIL_* settings are present, else the Resend HTTPS API
 * when RESEND_API_KEY is set, otherwise SMTP. Gmail needs no domain of its own; Resend delivers to
 * other people only from a verified domain. Both HTTPS transports work on Render Free, where SMTP is
 * blocked.
 * Without a transport: outside production the message, including its link, is logged so flows can be
 * tested locally; in production nothing is sent and a warning is logged.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger("Mail");
  private readonly transport: Transporter | null;
  private readonly from: string;
  private readonly resendKey: string | undefined;
  private readonly gmail: GmailCredentials | null;
  private gmailToken: { value: string; expires: number } | null = null;

  constructor(private readonly config: ConfigService) {
    const gmailUser = config.get<string>("GMAIL_USER");
    this.gmail = gmailUser
      ? {
          user: gmailUser,
          clientId: config.getOrThrow<string>("GMAIL_CLIENT_ID"),
          clientSecret: config.getOrThrow<string>("GMAIL_CLIENT_SECRET"),
          refreshToken: config.getOrThrow<string>("GMAIL_REFRESH_TOKEN"),
        }
      : null;
    this.resendKey = this.gmail ? undefined : config.get<string>("RESEND_API_KEY");
    const host = config.get<string>("SMTP_HOST");
    const port = config.getOrThrow<number>("SMTP_PORT");
    const user = config.get<string>("SMTP_USER");
    // Gmail sends only as the signed-in account, so the sender is that address with Presqio's name.
    this.from = this.gmail
      ? `Presqio <${this.gmail.user}>`
      : config.get<string>("MAIL_FROM") ?? (user ? `Presqio <${user}>` : "Presqio");
    this.transport = !this.gmail && !this.resendKey && host
      ? createTransport({
          host,
          port,
          secure: port === 465,
          // Port 587 starts plain and must upgrade; refuse to send credentials without TLS.
          requireTLS: port !== 465,
          auth: { user, pass: config.get<string>("SMTP_PASS") },
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 20_000,
        })
      : null;
  }

  /** SMTP can verify its login; Gmail and Resend credentials are checked when a message is sent. */
  async onModuleInit() {
    if (this.gmail) {
      this.logger.log(`Gmail API email transport configured (${this.gmail.user}).`);
      return;
    }
    if (this.resendKey) {
      this.logger.log("Resend HTTPS email transport configured.");
      return;
    }
    if (!this.transport) {
      this.logger.warn("No email transport configured; emails will not be delivered.");
      return;
    }
    try {
      await this.transport.verify();
      this.logger.log("SMTP connection verified.");
    } catch (error) {
      this.logger.error(`SMTP verification failed: ${(error as Error).message}`);
    }
  }

  async send(to: string, mail: RenderedMail) {
    if (this.gmail) return this.sendWithGmail(this.gmail, to, mail);
    if (this.resendKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ from: this.from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
        signal: AbortSignal.timeout(15_000),
      });
      const result = await response.json().catch(() => null) as { id?: unknown; message?: string } | null;
      if (!response.ok)
        throw new Error(`Resend rejected email (HTTP ${response.status}): ${result?.message ?? "Request failed"}`);
      if (typeof result?.id !== "string") throw new Error("Resend returned no email ID");
      return result.id;
    }
    if (!this.transport) {
      if (this.config.get("NODE_ENV") === "production")
        this.logger.warn(`No email transport configured; "${mail.subject}" not sent`);
      else this.logger.log(`To: ${to}\nSubject: ${mail.subject}\n${mail.text}`);
      return;
    }
    await this.transport.sendMail({ from: this.from, to, subject: mail.subject, html: mail.html, text: mail.text });
  }

  /** The same multipart (HTML + text) message SMTP would send, posted to the Gmail API as raw MIME. */
  private async sendWithGmail(gmail: GmailCredentials, to: string, mail: RenderedMail) {
    const raw = await new MailComposer({ from: this.from, to, subject: mail.subject, html: mail.html, text: mail.text })
      .compile()
      .build();
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        authorization: `Bearer ${await this.gmailAccessToken(gmail)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ raw: raw.toString("base64url") }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null) as { id?: unknown; error?: { message?: string } } | null;
    if (!response.ok)
      throw new Error(`Gmail rejected email (HTTP ${response.status}): ${result?.error?.message ?? "Request failed"}`);
    if (typeof result?.id !== "string") throw new Error("Gmail returned no message ID");
    return result.id;
  }

  /** Access tokens last about an hour; reuse one until a minute before it expires. */
  private async gmailAccessToken(gmail: GmailCredentials) {
    if (this.gmailToken && this.gmailToken.expires > Date.now() + 60_000) return this.gmailToken.value;
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      body: new URLSearchParams({
        client_id: gmail.clientId,
        client_secret: gmail.clientSecret,
        refresh_token: gmail.refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => null) as
      { access_token?: unknown; expires_in?: number; error_description?: string } | null;
    if (!response.ok || typeof result?.access_token !== "string")
      throw new Error(`Gmail sign-in failed (HTTP ${response.status}): ${result?.error_description ?? "no access token"}`);
    this.gmailToken = { value: result.access_token, expires: Date.now() + (result.expires_in ?? 3600) * 1000 };
    return this.gmailToken.value;
  }

  /**
   * Sends in the background. Callers never wait on the mail provider, so slow delivery cannot delay a
   * response or reveal (through timing) whether an account exists.
   */
  queue(to: string, mail: RenderedMail) {
    void this.send(to, mail).catch((error: Error) =>
      this.logger.error(`Failed to send "${mail.subject}": ${error.message}`),
    );
  }

  link(path: string, token?: string) {
    const url = new URL(path, this.config.getOrThrow<string>("APP_URL"));
    if (token) url.searchParams.set("token", token);
    return url.toString();
  }
}
