import "reflect-metadata";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ConfigService } from "@nestjs/config";
import { NotFoundException, type ExecutionContext } from "@nestjs/common";
import { subscriptionProblem } from "../src/app/common/billing/subscription";
import { PlatformOwnerGuard } from "../src/app/common/auth/platform-owner.guard";
import { clientState } from "../src/app/features/owner/owner.service";
import { AuthService } from "../src/app/features/auth/auth.service";
import { validateEnvironment } from "../src/app/common/config/environment";
import type { DatabaseService } from "../src/app/common/database/database.service";

const DAY = 86_400_000;
const now = new Date("2026-10-29T10:00:00Z");
const at = (days: number) => new Date(now.getTime() + days * DAY);

test("an ended trial or paid period stops growth; open-ended subscriptions keep working", () => {
  assert.match(subscriptionProblem(undefined, now)!, /no active subscription/);
  assert.match(subscriptionProblem({ status: "CANCELED", trial_ends_at: null, current_period_end: null }, now)!, /no active subscription/);
  assert.match(subscriptionProblem({ status: "TRIALING", trial_ends_at: at(-1), current_period_end: null }, now)!, /trial has ended/);
  assert.equal(subscriptionProblem({ status: "TRIALING", trial_ends_at: at(5), current_period_end: null }, now), null);
  assert.match(subscriptionProblem({ status: "ACTIVE", trial_ends_at: null, current_period_end: at(-1) }, now)!, /expired/);
  assert.equal(subscriptionProblem({ status: "ACTIVE", trial_ends_at: at(-30), current_period_end: at(20) }, now), null);
  // subscriptions from before dates were tracked have no end and must not lock anyone out
  assert.equal(subscriptionProblem({ status: "TRIALING", trial_ends_at: null, current_period_end: null }, now), null);
  assert.equal(subscriptionProblem({ status: "ACTIVE", trial_ends_at: null, current_period_end: null }, now), null);
});

test("client states cover trial, ending, expired, paying, due, canceled and suspended", () => {
  const sub = (status: string, trial: Date | null, paid: Date | null) =>
    ({ status, trial_ends_at: trial, current_period_end: paid }) as never;
  const state = (status: string, s: unknown) => clientState({ status, subscription: s as never }, now);
  assert.equal(state("ACTIVE", sub("TRIALING", at(10), null)), "TRIAL");
  assert.equal(state("ACTIVE", sub("TRIALING", at(2), null)), "TRIAL_ENDING");
  assert.equal(state("ACTIVE", sub("TRIALING", at(-1), null)), "TRIAL_EXPIRED");
  assert.equal(state("ACTIVE", sub("ACTIVE", null, at(30))), "PAYING");
  assert.equal(state("ACTIVE", sub("ACTIVE", null, at(-1))), "PAYMENT_DUE");
  assert.equal(state("ACTIVE", sub("PAST_DUE", null, null)), "PAYMENT_DUE");
  assert.equal(state("ACTIVE", sub("CANCELED", null, null)), "CANCELED");
  assert.equal(state("ACTIVE", null), "CANCELED");
  assert.equal(state("DISABLED", sub("ACTIVE", null, at(30))), "SUSPENDED");
});

test("only verified, listed Presqio staff open the owner console; everyone else sees 404", async () => {
  const env = validateEnvironment({ GMAIL_USER: "presqio.team@gmail.com", GMAIL_CLIENT_ID: "x", GMAIL_CLIENT_SECRET: "x", GMAIL_REFRESH_TOKEN: "x" });
  assert.equal(env.PLATFORM_OWNER_EMAILS, "presqio.team@gmail.com");
  const users: Record<string, { email: string | null; email_verified_at: Date | null; status: string }> = {
    owner: { email: "presqio.team@gmail.com", email_verified_at: now, status: "ACTIVE" },
    unverified: { email: "presqio.team@gmail.com", email_verified_at: null, status: "ACTIVE" },
    client: { email: "asha@example.com", email_verified_at: now, status: "ACTIVE" },
    disabled: { email: "presqio.team@gmail.com", email_verified_at: now, status: "DISABLED" },
  };
  const db = { users: { findUnique: async ({ where }: { where: { id: string } }) => users[where.id] ?? null } };
  const guard = new PlatformOwnerGuard(db as unknown as DatabaseService, new ConfigService(env));
  const context = (user: unknown) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) }) as unknown as ExecutionContext;
  assert.equal(await guard.canActivate(context({ userId: "owner", kind: "ADMIN" })), true);
  for (const user of [
    { userId: "unverified", kind: "ADMIN" },
    { userId: "client", kind: "ADMIN" },
    { userId: "disabled", kind: "ADMIN" },
    { userId: "owner", kind: "EMPLOYEE" },
    undefined,
  ])
    await assert.rejects(guard.canActivate(context(user)), NotFoundException);
});

test("owner sign-in links go only to listed owners, creating the account on first use", async () => {
  const created: { email: string }[] = [];
  const sent: { to: string; text: string }[] = [];
  const db = {
    users: {
      findUnique: async () => null,
      create: async ({ data }: { data: { email: string; display_name: string } }) => {
        created.push(data);
        return { id: "u1", status: "ACTIVE", ...data };
      },
    },
    auth_tokens: { count: async () => 0, updateMany: () => ({}), create: () => ({}) },
    $transaction: async (ops: unknown[]) => ops,
  };
  const mail = {
    queue: (to: string, mail: { text: string }) => sent.push({ to, text: mail.text }),
    link: (path: string, token: string) => `https://presqio.pages.dev${path}?token=${token}`,
  };
  const config = { get: (key: string) => (key === "PLATFORM_OWNER_EMAILS" ? "presqio.team@gmail.com" : undefined) };
  const auth = new AuthService(db as never, {} as never, {} as never, mail as never, {} as never, config as never);

  await auth.ownerSignInLink("someone@hotel.in");
  assert.equal(created.length, 0);
  assert.equal(sent.length, 0);

  await auth.ownerSignInLink(" Presqio.Team@gmail.com ");
  assert.equal(created[0].email, "presqio.team@gmail.com");
  assert.equal(sent[0].to, "presqio.team@gmail.com");
  assert.match(sent[0].text, /presqio\.pages\.dev\/owner\?token=/);
});
