import { createHash, randomBytes } from "node:crypto";

/** Opaque random token for cookies and emailed links. Only its hash is stored. */
export const createOpaqueToken = () => randomBytes(32).toString("base64url");

export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/** Lower-case, hyphen-separated slug matching the DB slug CHECK constraints. */
export const slugify = (value: string, maxLength = 40) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

/** Short random suffix used to make a slug or code unique. */
export const randomSuffix = (length = 4) =>
  randomBytes(length).toString("hex").slice(0, length);
