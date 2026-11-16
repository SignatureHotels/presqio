/**
 * After `vite build`: real HTML for the public pages, so search engines and link previews see each
 * page's title, description and text without running JavaScript. The app replaces the text when it
 * loads. Also writes sitemap.xml and robots.txt.
 *
 *   tsx scripts/prerender.ts [dist] [site-url]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { INDUSTRIES, type Industry } from "../src/app/public/industries";
import { businessPreset } from "../src/utils/business-types";

const DIST = process.argv[2] ?? "dist";
const SITE = (process.argv[3] ?? process.env.SITE_URL ?? "https://presqio.pages.dev").replace(/\/$/, "");

const esc = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export interface PageMeta { path: string; title: string; description: string; body: string }

/** The built index.html with this page's head tags and text. */
export function renderPage(shell: string, page: PageMeta, opts: { onlyAtPath?: string } = {}): string {
  const url = `${SITE}${page.path}`;
  const head = [
    `<title>${esc(page.title)}</title>`,
    `<meta name="description" content="${esc(page.description)}"/>`,
    `<link rel="canonical" href="${esc(url)}"/>`,
    `<meta property="og:type" content="website"/>`,
    `<meta property="og:site_name" content="Presqio"/>`,
    `<meta property="og:title" content="${esc(page.title)}"/>`,
    `<meta property="og:description" content="${esc(page.description)}"/>`,
    `<meta property="og:url" content="${esc(url)}"/>`,
    `<meta property="og:image" content="${esc(`${SITE}/logo.png`)}"/>`,
    `<meta name="twitter:card" content="summary"/>`,
    // index.html also opens /admin, /employee, /kiosk...: show its text only on its own page
    ...(opts.onlyAtPath ? [`<script>if(location.pathname!==${JSON.stringify(opts.onlyAtPath)})document.documentElement.className+=" app-route"</script>`,
      `<style>.app-route #root>.prerendered{display:none}</style>`] : []),
  ].join("");
  if (!/<title>[^<]*<\/title>/.test(shell) || !shell.includes('<div id="root"></div>'))
    throw new Error("index.html has changed shape: expected a <title> and an empty #root");
  return shell
    .replace(/<title>[^<]*<\/title>/, head)
    .replace('<div id="root"></div>', `<div id="root"><div class="prerendered">${page.body}</div></div>`);
}

const list = (items: string[]) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;

export function industryPage(industry: Industry): PageMeta {
  const preset = businessPreset(industry.type);
  const body = [
    `<main>`,
    `<p>Presqio for ${esc(industry.name.toLowerCase())}</p>`,
    `<h1>${esc(industry.headline)}</h1>`,
    `<p>${esc(industry.lead)}</p>`,
    `<p><a href="/register?type=${industry.type}">Start 14-day free trial</a></p>`,
    `<h2>What gets easier</h2>`,
    list(industry.pains.map((p) => `<s>${esc(p.problem)}</s>: ${esc(p.fix)}`)),
    `<h2>The parts you'll use every day</h2>`,
    list(industry.highlights.map((h) => `<strong>${esc(h.title)}</strong>: ${esc(h.text)}`)),
    `<h2>Your workspace starts with</h2>`,
    list(preset.shifts.map((s) => `${esc(s.name)} shift, ${s.start}–${s.end}`)),
    list(preset.leaveTypes.map((l) => esc(l.name))),
    `<h2>Questions</h2>`,
    ...industry.faqs.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`),
    `<p><a href="/">Presqio home</a> · ${INDUSTRIES.map((i) => `<a href="/for/${i.slug}">${esc(i.name)}</a>`).join(" · ")}</p>`,
    `</main>`,
  ].join("");
  return { path: `/for/${industry.slug}`, title: `${industry.headline} · Presqio`, description: industry.lead, body };
}

export const HOME: PageMeta = {
  path: "/",
  title: "Presqio · Selfie and GPS attendance, rosters and payroll for every kind of business",
  description: "Staff check in with a live selfie and a GPS check at the workplace. Rosters, leave and payroll follow from it, for shops, restaurants, clinics, factories, sites and field teams.",
  body: `<main><h1>Know who's at work, wherever they work.</h1><p>Shops, restaurants, clinics, factories, sites and field teams: every check-in has a live selfie and a GPS check at the workplace. Rosters, leave and payroll follow from it.</p><p><a href="/register">Start 14-day free trial</a></p><p>${INDUSTRIES.map((i) => `<a href="/for/${i.slug}">${esc(i.name)}</a>`).join(" · ")}</p></main>`,
};

function main() {
  const shell = readFileSync(join(DIST, "index.html"), "utf8");
  // The home page keeps serving as the app's fallback for every other route, so its text is generic.
  writeFileSync(join(DIST, "index.html"), renderPage(shell, HOME, { onlyAtPath: "/" }));
  // for/<slug>.html: Cloudflare Pages serves it at /for/<slug> with no trailing-slash redirect
  // (nginx: try_files $uri.html).
  mkdirSync(join(DIST, "for"), { recursive: true });
  for (const industry of INDUSTRIES)
    writeFileSync(join(DIST, "for", `${industry.slug}.html`), renderPage(shell, industryPage(industry)));
  const urls = ["/", ...INDUSTRIES.map((i) => `/for/${i.slug}`), "/register", "/login"];
  writeFileSync(join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
  writeFileSync(join(DIST, "robots.txt"),
    `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /employee\nDisallow: /owner\nDisallow: /kiosk\nDisallow: /invite\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`Prerendered ${INDUSTRIES.length + 1} pages, sitemap.xml and robots.txt for ${SITE}`);
}

if (process.argv[1]?.endsWith("prerender.ts")) main();
