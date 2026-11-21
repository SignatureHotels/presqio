import { test } from "node:test";
import assert from "node:assert/strict";
import { HOME, industryPage, renderPage } from "../scripts/prerender";
import { INDUSTRIES } from "../src/app/public/industries";

const SHELL = '<!doctype html><html lang="en"><head><meta charset="UTF-8"/><title>Presqio · Attendance</title></head><body><div id="root"></div><script type="module" src="/assets/index.js"></script></body></html>';

test("each industry page gets its own title, description, canonical URL and readable text", () => {
  const page = industryPage(INDUSTRIES.find((i) => i.slug === "factories")!);
  const html = renderPage(SHELL, page);
  assert.match(html, /<title>Attendance for plants, godowns and workshops · Presqio<\/title>/);
  assert.match(html, /<meta name="description" content="Three shifts, a kiosk at the gate/);
  assert.match(html, /<link rel="canonical" href="https:\/\/presqio\.pages\.dev\/for\/factories"\/>/);
  assert.match(html, /<meta property="og:title" content="Attendance for plants/);
  assert.match(html, /<h1>Attendance for plants, godowns and workshops<\/h1>/);
  assert.match(html, /Shift A shift, 06:00–14:00/);
  assert.match(html, /href="\/register\?type=factory"/);
  assert.match(html, /<script type="module" src="\/assets\/index.js"><\/script>/, "the app still loads");
  assert.equal((html.match(/<title>/g) ?? []).length, 1);
});

test("text is escaped, and the shared index.html hides its text on app routes", () => {
  const html = renderPage(SHELL, { ...HOME, title: 'A & B <"x">', body: "<p>hi</p>" }, { onlyAtPath: "/" });
  assert.match(html, /<title>A &amp; B &lt;&quot;x&quot;&gt;<\/title>/);
  assert.match(html, /<script src="\/app-route\.js" data-path="\/"><\/script>/);
  assert.doesNotMatch(html, /<script>/, "no inline script: the CSP blocks them");
  assert.match(html, /\.app-route #root>\.prerendered\{display:none\}/);
  assert.throws(() => renderPage("<html><body></body></html>", HOME), /changed shape/);
});
