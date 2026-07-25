import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const publicPages = [
  "index.html",
  "afterschool.html",
  "fees.html",
  "gallery.html",
  "kinder.html",
  "newsletter.html",
  "preschool.html",
  "summer.html"
];

const privatePages = ["parents.html", "staff.html"];

async function source(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("every public header links to the Japanese Summer School page", async () => {
  for (const page of publicPages) {
    const html = await source(page);
    const navigation = html.match(/<ul class="nav-links">[\s\S]*?<\/ul>/)?.[0] || "";
    assert.match(
      navigation,
      /<a href="\/summer">サマースクール<\/a>/,
      `${page} is missing the Summer School navigation link`
    );
  }
});

test("the Summer School page remains canonical and indexed", async () => {
  const html = await source("summer.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/luanaenglishschool\.jp\/summer">/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex/);

  const sitemap = await source("sitemap.xml");
  assert.match(sitemap, /<loc>https:\/\/luanaenglishschool\.jp\/summer<\/loc>/);
});

test("portal pages remain excluded from search engines", async () => {
  for (const page of privatePages) {
    const html = await source(page);
    assert.match(
      html,
      /<meta name="robots" content="noindex,nofollow">/,
      `${page} must remain noindex,nofollow`
    );
  }
});

test("the parent landing page clearly uses Japanese access-code wording", async () => {
  const html = await source("parents.html");
  assert.match(html, /<h1>サマースクール<br>ご家族専用ページ<\/h1>/);
  assert.match(html, /<h2>アクセスコードを入力<\/h2>/);
  assert.match(html, /ご家族や祖父母の方とも共有していただけます。/);
  assert.doesNotMatch(html, />\s*Week code\s*</);
});

test("parent weekly themes match the English Summer School campaign", async () => {
  const portal = await source("portal.js");
  for (const [dates, theme] of [
    ["7/27 – 7/31", "Festivals of the World"],
    ["8/3 – 8/7", "Ocean Explorers"],
    ["8/17 – 8/21", "Adventure Survival"]
  ]) {
    assert.ok(portal.includes(dates), `Parent portal is missing ${dates}`);
    assert.ok(portal.includes(theme), `Parent portal is missing ${theme}`);
  }
});

test("daily stories keep parent navigation and staff context fields", async () => {
  const parents = await source("parents.html");
  const staff = await source("staff.html");
  const portal = await source("portal.js");
  assert.match(parents, /id="day-tabs"/);
  assert.match(staff, /name="activities"/);
  assert.match(staff, /Parent summary/);
  assert.match(portal, /写真をすべて見る/);
});

test("private implementation files cannot become static assets", async () => {
  const ignored = new Set(
    (await source(".assetsignore"))
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
  );

  for (const path of [
    ".git",
    ".github",
    ".wrangler",
    ".claude",
    "docs",
    "migrations",
    "scripts",
    "tests",
    "worker.js",
    "wrangler.jsonc"
  ]) {
    assert.ok(ignored.has(path), `${path} must be listed in .assetsignore`);
  }
});

test("Worker configuration keeps required bindings and secrets", async () => {
  const config = JSON.parse(await source("wrangler.jsonc"));
  assert.equal(config.assets.binding, "ASSETS");
  assert.equal(config.d1_databases?.[0]?.binding, "DB");
  assert.equal(config.r2_buckets?.[0]?.binding, "PHOTOS");

  const requiredSecrets = new Set(config.secrets?.required || []);
  for (const secret of [
    "SESSION_SECRET",
    "STAFF_PORTAL_PASSWORD",
    "SUMMER_WEEK_1_CODE",
    "SUMMER_WEEK_2_CODE",
    "SUMMER_WEEK_3_CODE"
  ]) {
    assert.ok(requiredSecrets.has(secret), `${secret} must remain required`);
  }
});
