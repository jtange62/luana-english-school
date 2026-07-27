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

test("the parent portal gently links to regular programs without changing portal separation", async () => {
  const parents = await source("parents.html");
  const portal = await source("portal.js");
  const staff = await source("staff.html");
  assert.match(parents, /id="main-site-invitation"/);
  assert.match(parents, /夏の思い出の、その先も。/);
  assert.match(parents, /Luanaでは通常クラスも開講しています。/);
  assert.match(parents, /href="\/" target="_blank" rel="noopener"/);
  assert.match(parents, /luanaenglishschool\.jp/);
  assert.doesNotMatch(parents, /通常クラスを見る/);
  assert.doesNotMatch(parents, /id="main-site-invitation"[^>]*hidden/);
  assert.doesNotMatch(portal, /main-site-invitation"\)\.hidden/);
  assert.doesNotMatch(staff, /夏の思い出の、その先も。/);
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

test("daily photo collections keep parent navigation and a simple staff upload flow", async () => {
  const parents = await source("parents.html");
  const staff = await source("staff.html");
  const portal = await source("portal.js");
  assert.match(parents, /id="day-tabs"/);
  assert.match(staff, /id="staff-day-tabs"/);
  assert.match(staff, />Add photos</);
  assert.match(staff, /id="staff-day-select"/);
  assert.match(staff, /name="photos"[^>]*required/);
  assert.match(staff, />Upload photos</);
  assert.doesNotMatch(staff, /name="title"/);
  assert.doesNotMatch(staff, /name="body"/);
  assert.doesNotMatch(staff, /name="activities"/);
  assert.match(portal, /写真をすべて見る/);
  assert.match(portal, /IntersectionObserver/);
  assert.match(portal, /touchstart/);
  assert.match(portal, /touchend/);
  assert.match(portal, /ALBUM_BATCH_SIZE/);
  assert.match(portal, /MAX_DAILY_UPLOAD|files\.length > 10/);
  assert.match(portal, /Add more photos/);
  assert.match(portal, /daily-photo-manage-card/);
  assert.doesNotMatch(portal, /class="daily-photo-cover"/);
  assert.match(portal, /isParentPresentation/);
  assert.match(portal, /renderDailyCollections/);
  assert.match(portal, /groupPostsByDate/);
});

test("parent photo albums include persistent privacy guidance", async () => {
  const parents = await source("parents.html");
  const styles = await source("portal.css");
  assert.match(parents, /写真・動画のお取り扱いについて/);
  assert.match(parents, /SNSなどへの投稿・共有の際は、プライバシーに十分ご配慮ください/);
  assert.match(parents, /lightbox-privacy-note/);
  assert.match(styles, /\.photo-privacy-notice/);
});

test("photo viewer offers a mobile-friendly authenticated save action", async () => {
  const parents = await source("parents.html");
  const portal = await source("portal.js");
  const worker = await source("worker.js");
  const styles = await source("portal.css");
  assert.match(parents, /id="photo-download"[^>]+download[^>]*>写真を保存/);
  assert.match(portal, /download=1/);
  assert.match(worker, /content-disposition/);
  assert.match(worker, /photoDownloadDisposition/);
  assert.match(styles, /\.photo-download/);
});

test("album browser supports selecting and sharing up to ten photos", async () => {
  const parents = await source("parents.html");
  const portal = await source("portal.js");
  const worker = await source("worker.js");
  assert.match(parents, /写真をまとめて保存/);
  assert.match(parents, /選んだ写真を保存/);
  assert.match(portal, /画像を保存/);
  assert.match(portal, /MAX_SELECTED_PHOTOS = 10/);
  assert.match(portal, /navigator\.share/);
  assert.match(portal, /navigator\.canShare/);
  assert.match(portal, /share=1/);
  assert.match(worker, /shareRequested/);
});

test("parent access codes remain visible while being entered", async () => {
  const parents = await source("parents.html");
  const worker = await source("worker.js");
  const accessCodeFields = parents.match(/<input name="password"[^>]+>/g) || [];
  assert.equal(accessCodeFields.length, 2);
  for (const field of accessCodeFields) {
    assert.match(field, /type="text"/);
    assert.match(field, /autocomplete="one-time-code"/);
    assert.doesNotMatch(field, /type="password"/);
  }
  assert.match(worker, /parents\.html\?v=20260727-visible-code1/);
});

test("each summer week has a distinct lightweight collection theme", async () => {
  const portal = await source("portal.js");
  const styles = await source("portal.css");
  for (const day of [
    'date: "2026-07-27", title: "Thailand — Songkran"',
    'date: "2026-07-28", title: "Brazil — Carnival"',
    'date: "2026-07-29", title: "India — Holi"',
    'date: "2026-07-30", title: "Japan — Matsuri"'
  ]) {
    assert.ok(portal.includes(day), `Week 1 schedule is missing ${day}`);
  }
  for (const theme of ["festivals", "ocean", "adventure"]) {
    assert.match(portal, new RegExp(`theme: "${theme}"`));
    assert.match(styles, new RegExp(`data-week-theme="${theme}"`));
  }
  for (const motif of [
    "Carnival",
    "Holi",
    "Songkran",
    "Matsuri",
    "Field Trip: teamLab",
    "Ocean Life",
    "Coral Reef",
    "Tides & Waves",
    "Conservation & Climate",
    "Field Trip: Enoshima Aquarium",
    "Survival Priorities",
    "Preparation & Teamwork",
    "Navigation",
    "Resource Management",
    "Field Trip: Hug-Hug & Westrock Bouldering"
  ]) {
    assert.ok(portal.includes(motif), `Parent portal is missing the ${motif} motif`);
  }
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
