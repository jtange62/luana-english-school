import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
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

test("program pages have only one fixed-header navigation element", async () => {
  for (const page of ["preschool.html", "kinder.html", "afterschool.html"]) {
    const html = await source(page);
    assert.equal((html.match(/<nav(?:\s|>)/g) || []).length, 1, `${page} has a competing nav element`);
    assert.match(html, /role="navigation" aria-label="その他のクラス"/);
  }
});

test("program Back buttons restore the visitor's prior page and scroll position", async () => {
  for (const page of ["preschool.html", "kinder.html", "afterschool.html"]) {
    const html = await source(page);
    assert.match(html, /<a href="\/#classes" class="back-btn" data-history-back>← Back<\/a>/);
  }

  const script = await source("site.js");
  assert.match(script, /document\.querySelectorAll\('\[data-history-back\]'\)/);
  assert.match(script, /previousPage\.origin !== window\.location\.origin/);
  assert.match(script, /history\.length <= 1/);
  assert.match(script, /history\.back\(\)/);
});

test("every public page promotes autumn trial lessons", async () => {
  for (const page of publicPages) {
    const html = await source(page);
    assert.match(html, /id="seasonal-banner"/, `${page} is missing the autumn banner`);
    assert.match(html, /href="\/#trial"/, `${page} is missing the trial link`);
    assert.match(html, /秋の入会受付中/, `${page} is missing the autumn enrollment message`);
  }
});

test("the Summer School page remains canonical and indexed", async () => {
  const html = await source("summer.html");
  assert.match(html, /<link rel="canonical" href="https:\/\/luanaenglishschool\.jp\/summer">/);
  assert.doesNotMatch(html, /<meta name="robots" content="noindex/);
  assert.doesNotMatch(html, /"@type": "Event"/);

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
  assert.match(staff, /id="upload-progress-bar"/);
  assert.match(staff, /id="upload-progress-label"/);
  assert.match(staff, /id="upload-retry"/);
  assert.match(staff, /id="upload-cancel"/);
  assert.match(staff, /id="album-select-all"/);
  assert.doesNotMatch(staff, /name="title"/);
  assert.doesNotMatch(staff, /name="body"/);
  assert.doesNotMatch(staff, /name="activities"/);
  assert.match(portal, /写真をすべて見る/);
  assert.match(portal, /IntersectionObserver/);
  assert.match(portal, /touchstart/);
  assert.match(portal, /touchend/);
  assert.match(portal, /ALBUM_BATCH_SIZE/);
  assert.match(portal, /Uploading \$\{processed\} of \$\{items\.length\}/);
  assert.match(portal, /form\.set\("upload_id", uploadId\)/);
  assert.match(portal, /Math\.round\(\(processed \/ items\.length\) \* 100\)/);
  assert.match(portal, /navigator\.wakeLock\.request\("screen"\)/);
  assert.match(portal, /validUploadPhoto/);
  assert.match(portal, /retainedUploadItems/);
  assert.match(portal, /failed\[0\]\?\.error\?\.message/);
  assert.match(portal, /UPLOAD_QUEUE_CONCURRENCY = 1/);
  assert.match(portal, /Promise\.all\(Array\.from/);
  assert.match(portal, /files\.slice\(0, 4\)/);
  assert.match(portal, /Add more photos/);
  assert.match(portal, /Delete photos/);
  assert.match(portal, /deleteSelectedPhotos/);
  assert.match(portal, /new Set\(lightboxPhotos\.map/);
  assert.match(portal, /createStoredZip/);
  assert.match(portal, /luana-album-photos\.zip/);
  assert.match(portal, /photos for one ZIP/);
  assert.match(portal, /link\.href = objectUrl/);
  assert.match(portal, /albumActionMode === "delete"\) setAlbumSelectionMode\(true\)/);
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
  assert.match(portal, /URL\.createObjectURL/);
  assert.match(portal, /Downloads started/);
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

test("homepage exposes local business and website identity to search engines", async () => {
  const html = await source("index.html");
  assert.match(html, /"@type": \["EducationalOrganization", "LocalBusiness"\]/);
  assert.match(html, /"@type": "WebSite"/);
  assert.match(html, /"@id": "https:\/\/luanaenglishschool\.jp\/#school"/);
  assert.match(html, /https:\/\/www\.instagram\.com\/luana\.english\.school\//);
  assert.doesNotMatch(html, /<meta name="keywords"/);
});

test("Worker permanently redirects the www hostname to the canonical domain", async () => {
  const worker = await source("worker.js");
  assert.match(worker, /url\.hostname === "www\.luanaenglishschool\.jp"/);
  assert.match(worker, /url\.hostname = "luanaenglishschool\.jp"/);
  assert.match(worker, /Response\.redirect\(url\.toString\(\), 301\)/);
});

test("the Summer School page presents summer as an extension of year-round learning", async () => {
  const html = await source("summer.html");
  const yearRoundPosition = html.indexOf('id="year-round"');
  const summerStoryPosition = html.indexOf('id="summer-story"');

  assert.ok(yearRoundPosition > -1, "summer.html is missing the year-round bridge");
  assert.ok(summerStoryPosition > yearRoundPosition, "year-round programs must appear before the summer retrospective");
  assert.match(html, /href="#year-round">通常クラスを見る<\/a>/);
  assert.match(html, /href="\/preschool"/);
  assert.match(html, /href="\/kinder"/);
  assert.match(html, /href="\/afterschool"/);
  assert.match(html, /Luanaの中心は年間を通した通常クラスです/);
  assert.match(html, /class="mobile-signup-bar"[^>]*>[\s\S]*?href="\/#trial"[^>]*>通常クラスを体験する<\/a>/);
  assert.equal((html.match(/class="story-photo(?: featured| wide)?"/g) || []).length, 18);
  assert.match(html, /nav\{position:fixed;z-index:190/);
  assert.match(html, /\.nav-links\{display:flex;align-items:center/);
  assert.match(html, /\.hamburger\{display:none;position:absolute/);
});

test("the Summer School page presents four accessible, click-to-play recap videos", async () => {
  const html = await source("summer.html");
  const videos = html.match(/<video[\s\S]*?<\/video>/g) || [];
  assert.equal(videos.length, 4);

  for (const name of [
    "week-1-songkran",
    "week-2-oceans",
    "week-3-adventure",
    "week-3-bouldering"
  ]) {
    const video = videos.find(block => block.includes(`${name}.mp4`));
    assert.ok(video, `Summer page is missing ${name}`);
    assert.match(video, / controls/);
    assert.match(video, / playsinline/);
    assert.match(video, / preload="metadata"/);
    assert.match(video, new RegExp(`poster="videos/summer-2026/${name}-poster\\.webp"`));
    assert.match(video, / aria-label="[^"]+"/);
    assert.doesNotMatch(video, / autoplay/);

    for (const extension of ["mp4", "webp"]) {
      const suffix = extension === "mp4" ? "" : "-poster";
      const asset = new URL(`../videos/summer-2026/${name}${suffix}.${extension}`, import.meta.url);
      assert.ok((await stat(asset)).size > 0, `${name} ${extension} asset is empty`);
    }
  }
});

test("the September newsletter is the latest downloadable issue", async () => {
  const html = await source("newsletter.html");
  const pdf = await readFile(new URL("../pdfs/newsletters/2026-09.pdf", import.meta.url));
  const preview = await readFile(new URL("../pdfs/newsletters/2026-09.webp", import.meta.url));
  assert.match(html, /href="pdfs\/newsletters\/2026-09\.pdf"/);
  assert.match(html, /src="pdfs\/newsletters\/2026-09\.webp"/);
  assert.match(html, /September 2026/);
  assert.ok(html.indexOf("September 2026") < html.indexOf("August 2026"));
  assert.equal((html.match(/class="new-badge">NEW/g) || []).length, 2);
  assert.equal(pdf.subarray(0, 4).toString(), "%PDF");
  assert.equal(preview.subarray(0, 4).toString(), "RIFF");
});

test("the parent portal explains availability and photo saving without flashing the login form", async () => {
  const parents = await source("parents.html");
  const portal = await source("portal.js");
  const styles = await source("portal.css");
  assert.match(parents, /id="parent-session-check" role="status"/);
  assert.match(parents, /id="parent-login" hidden/);
  assert.match(parents, /2026年10月31日まで/);
  assert.match(parents, /写真をまとめて保存/);
  assert.match(parents, /1回につき10枚まで/);
  assert.match(portal, /sessionCheck\.hidden = true/);
  assert.match(styles, /\.portal-availability-notice/);
  assert.match(styles, /\.portal-download-guide/);
});

test("production request failures are logged without exposing request data", async () => {
  const worker = await source("worker.js");
  assert.match(worker, /console\.error\("Request failed"/);
  assert.match(worker, /pathname: url\.pathname/);
});
