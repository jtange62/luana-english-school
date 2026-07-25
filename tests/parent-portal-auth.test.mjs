import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workerSource = await readFile(new URL("../worker.js", import.meta.url), "utf8");
const workerModule = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString("base64")}`);
const worker = workerModule.default;

const posts = [
  {
    id: "post-week-1",
    post_date: "2026-07-20",
    title: "Week one",
    body: "",
    activities: "Music, Dancing",
    group_key: "summer-2026",
    week_slug: "week-1-festivals",
    created_at: "2026-07-20T00:00:00.000Z"
  },
  {
    id: "post-week-2",
    post_date: "2026-07-27",
    title: "Week two",
    body: "",
    activities: "",
    group_key: "summer-2026",
    week_slug: "week-2-ocean",
    created_at: "2026-07-27T00:00:00.000Z"
  }
];

const photos = new Map([
  ["photo-week-1", { r2_key: "week-1.jpg", content_type: "image/jpeg", week: "week-1-festivals" }],
  ["photo-week-2", { r2_key: "week-2.jpg", content_type: "image/jpeg", week: "week-2-ocean" }]
]);

function mockDb() {
  return {
    prepare(sql) {
      return {
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async all() {
          const allowedWeeks = new Set(this.args.filter(value => String(value).startsWith("week-")));
          if (sql.includes("FROM posts p")) {
            return { results: posts.filter(post => allowedWeeks.has(post.week_slug)) };
          }
          if (sql.includes("FROM albums a")) return { results: [] };
          if (sql.includes("FROM post_photos pp")) return { results: [] };
          return { results: [] };
        },
        async first() {
          if (!sql.includes("FROM photos ph")) return null;
          const photo = photos.get(this.args[0]);
          if (!photo || !this.args.includes(photo.week)) return null;
          return photo;
        }
      };
    }
  };
}

function environment() {
  return {
    DB: mockDb(),
    PHOTOS: {
      async get(key) {
        return { body: new TextEncoder().encode(key), httpMetadata: { contentType: "image/jpeg" } };
      }
    },
    SESSION_SECRET: "test-session-secret",
    SUMMER_WEEK_1_CODE: "sunny-one",
    SUMMER_WEEK_2_CODE: "ocean-two",
    SUMMER_WEEK_3_CODE: "camp-three"
  };
}

function apiRequest(path, init = {}) {
  return new Request(`https://example.test${path}`, init);
}

async function login(env, code, cookie = "") {
  const response = await worker.fetch(apiRequest("/api/auth/password", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {})
    },
    body: JSON.stringify({ audience: "parent", password: code })
  }), env);
  return {
    response,
    cookie: response.headers.get("set-cookie")?.split(";")[0] || ""
  };
}

test("parent week codes filter feeds and direct photo access", async () => {
  const env = environment();

  const signedOut = await worker.fetch(apiRequest("/api/parent/feed"), env);
  assert.equal(signedOut.status, 401);
  assert.deepEqual(await signedOut.json(), { error: "Sign in required", setupRequired: false });

  const weekOneLogin = await login(env, "sunny-one");
  assert.equal(weekOneLogin.response.status, 200);
  assert.ok(weekOneLogin.cookie.startsWith("luana_portal="));

  const weekOneFeed = await worker.fetch(apiRequest("/api/parent/feed", {
    headers: { cookie: weekOneLogin.cookie }
  }), env);
  assert.equal(weekOneFeed.status, 200);
  const weekOneData = await weekOneFeed.json();
  assert.deepEqual(weekOneData.weeks, ["week-1-festivals"]);
  assert.deepEqual(weekOneData.posts.map(post => post.title), ["Week one"]);
  assert.deepEqual(weekOneData.posts[0].activities, ["Music", "Dancing"]);

  const blockedPhoto = await worker.fetch(apiRequest("/api/photos/photo-week-2", {
    headers: { cookie: weekOneLogin.cookie }
  }), env);
  assert.equal(blockedPhoto.status, 404);

  const weekTwoLogin = await login(env, "ocean-two", weekOneLogin.cookie);
  assert.equal(weekTwoLogin.response.status, 200);

  const combinedFeed = await worker.fetch(apiRequest("/api/parent/feed", {
    headers: { cookie: weekTwoLogin.cookie }
  }), env);
  const combinedData = await combinedFeed.json();
  assert.deepEqual(combinedData.weeks, ["week-1-festivals", "week-2-ocean"]);
  assert.deepEqual(combinedData.posts.map(post => post.title), ["Week one", "Week two"]);

  const allowedPhoto = await worker.fetch(apiRequest("/api/photos/photo-week-2", {
    headers: { cookie: weekTwoLogin.cookie }
  }), env);
  assert.equal(allowedPhoto.status, 200);
});

test("incorrect week codes are rejected", async () => {
  const result = await login(environment(), "wrong-code");
  assert.equal(result.response.status, 401);
  assert.deepEqual(await result.response.json(), { error: "Incorrect access code" });
});
