import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import type { RenderedMail } from "./mail-templates";

/**
 * Sends email over SMTP (SMTP_HOST/PORT/USER/PASS).
 * Without SMTP: outside production the message, including its link, is logged so flows can be
 * tested locally; in production nothing is sent and a warning is logged.
 */
@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger("Mail");
  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>("SMTP_HOST");
    const port = config.getOrThrow<number>("SMTP_PORT");
    const user = config.get<string>("SMTP_USER");
    this.from = config.get<string>("MAIL_FROM") ?? (user ? `Presqio <${user}>` : "Presqio");
    this.transport = host
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

  /** Checks the SMTP login at startup without sending anything. */
  async onModuleInit() {
    if (!this.transport) {
      this.logger.warn("SMTP is not configured; emails will not be delivered.");
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
    if (!this.transport) {
      if (this.config.get("NODE_ENV") === "production")
        this.logger.warn(`No SMTP configured; "${mail.subject}" not sent`);
      else this.logger.log(`To: ${to}\nSubject: ${mail.subject}\n${mail.text}`);
      return;
    }
    await this.transport.sendMail({ from: this.from, to, subject: mail.subject, html: mail.html, text: mail.text });
  }

  /**
   * Sends in the background. Callers never wait on SMTP, so slow delivery cannot delay a
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
