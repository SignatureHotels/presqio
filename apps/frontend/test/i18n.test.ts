import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { en } from "../src/i18n/en";
import { hi } from "../src/i18n/hi";
import { te } from "../src/i18n/te";
import { durationText, rejectionText, serverText, setLang, t } from "../src/i18n";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("Hindi and Telugu translate every message with the same placeholders", () => {
  for (const [name, dictionary] of [["hi", hi], ["te", te]] as const) {
    assert.deepEqual(Object.keys(dictionary).sort(), Object.keys(en).sort(), `${name} has exactly the English keys`);
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      assert.ok(dictionary[key].trim(), `${name} ${key} is empty`);
      assert.deepEqual(placeholders(dictionary[key]), placeholders(en[key]), `${name} ${key} placeholders`);
    }
  }
});

test("switching language changes messages, fills placeholders and formats durations", () => {
  setLang("hi");
  assert.equal(t("action.checkIn"), "चेक इन");
  assert.equal(t("kiosk.hi", { name: "Asha" }), "नमस्ते Asha");
  assert.equal(durationText(90), "1 घंटे 30 मिनट");
  setLang("te");
  assert.equal(t("tab.leave"), "సెలవు");
  assert.equal(durationText(45), "45 ని.");
  setLang("en");
  assert.equal(t("home.checkedInAt", { time: "09:02" }), "Checked in 09:02");
  assert.equal(durationText(125), "2h 05m");
});

test("server messages and check-in rejections are shown in the chosen language", () => {
  setLang("hi");
  assert.equal(serverText("You're already checked in."), hi["err.alreadyIn"]);
  assert.equal(serverText("Some message we don't know"), "Some message we don't know");
  assert.match(rejectionText({ reason: "OUTSIDE_GEOFENCE", message: "You're 240 m from the branch.", distance: 240, accuracy: 12 }), /240 मीटर/);
  setLang("en");
  assert.equal(rejectionText({ reason: "OUTSIDE_GEOFENCE", message: "You're 240 m from the branch.", distance: 240, accuracy: 12 }), "You're 240 m from the branch.",
    "English keeps the server's detailed message");
});

test("every server message the app translates is one the backend really sends", () => {
  const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
    const path = join(dir, f);
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".ts") ? [path] : [];
  });
  const backend = [...files("../backend/src"), "src/api/client.ts", "src/api/request.ts"].map((f) => readFileSync(f, "utf8")).join("\n");
  const index = readFileSync("src/i18n/index.ts", "utf8");
  const table = index.slice(index.indexOf("const SERVER"), index.indexOf("};", index.indexOf("const SERVER")));
  const messages = [...table.matchAll(/^\s+"(.+)": "/gm)].map((m) => m[1]);
  assert.ok(messages.length >= 10);
  for (const message of messages) assert.ok(backend.includes(message), `not sent by the server: ${message}`);
});
