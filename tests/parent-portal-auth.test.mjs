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
    IMAGES: mockImages(),
    SESSION_SECRET: "test-session-secret",
    STAFF_PORTAL_PASSWORD: "staff-test-password",
    SUMMER_WEEK_1_CODE: "sunny-one",
    SUMMER_WEEK_2_CODE: "ocean-two",
    SUMMER_WEEK_3_CODE: "camp-three"
  };
}

function mockImages() {
  return {
    input(source) {
      return {
        transform() {
          return this;
        },
        async output() {
          return {
            response() {
              return new Response(source, {
                headers: { "content-type": "image/webp" }
              });
            }
          };
        }
      };
    }
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

  const downloadedPhoto = await worker.fetch(apiRequest("/api/photos/photo-week-2?download=1", {
    headers: { cookie: weekTwoLogin.cookie }
  }), env);
  assert.equal(downloadedPhoto.status, 200);
  assert.match(downloadedPhoto.headers.get("content-disposition"), /^attachment;/);
  assert.match(downloadedPhoto.headers.get("content-disposition"), /\.webp/);

  const sharedPhoto = await worker.fetch(apiRequest("/api/photos/photo-week-2?share=1", {
    headers: { cookie: weekTwoLogin.cookie }
  }), env);
  assert.equal(sharedPhoto.status, 200);
  assert.equal(sharedPhoto.headers.get("content-type"), "image/jpeg");
});

test("incorrect week codes are rejected", async () => {
  const result = await login(environment(), "wrong-code");
  assert.equal(result.response.status, 401);
  assert.deepEqual(await result.response.json(), { error: "Incorrect access code" });
});

test("staff daily uploads require at least one picture", async () => {
  const env = environment();
  const loginResponse = await worker.fetch(apiRequest("/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audience: "staff", password: "staff-test-password" })
  }), env);
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";
  const form = new FormData();
  form.set("group", "summer-2026");
  form.set("week", "week-1-festivals");
  form.set("date", "2026-07-27");
  form.set("status", "published");

  const response = await worker.fetch(apiRequest("/api/staff/posts", {
    method: "POST",
    headers: { cookie },
    body: form
  }), env);

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    error: "Add at least one photo"
  });
});

test("staff uploads append photos to the existing scheduled day", async () => {
  const writes = [];
  const uploads = [];
  const env = {
    ...environment(),
    DB: {
      prepare(sql) {
        return {
          args: [],
          bind(...args) {
            this.args = args;
            return this;
          },
          async first() {
            if (sql.includes("SELECT id FROM posts")) return { id: "existing-songkran-day" };
            if (sql.includes("MAX(sort_order)")) return { last_order: 68 };
            return null;
          },
          async run() {
            writes.push({ sql, args: this.args });
            return { success: true };
          }
        };
      },
      async batch(statements) {
        return Promise.all(statements.map(statement => statement.run()));
      }
    },
    PHOTOS: {
      async put(key) {
        uploads.push(key);
      }
    },
    IMAGES: mockImages()
  };
  const loginResponse = await worker.fetch(apiRequest("/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audience: "staff", password: "staff-test-password" })
  }), env);
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";
  const form = new FormData();
  form.set("date", "2026-07-27");
  form.append("photos", new Blob(["new photo"], { type: "image/jpeg" }), "songkran.jpg");

  const response = await worker.fetch(apiRequest("/api/staff/posts", {
    method: "POST",
    headers: { cookie },
    body: form
  }), env);
  const data = await response.json();

  assert.equal(response.status, 200, JSON.stringify(data));
  assert.equal(data.postId, "existing-songkran-day");
  assert.equal(data.added, 1);
  assert.equal(uploads.length, 2);
  assert.ok(uploads.some(key => key.endsWith("-thumb.webp")));
  assert.match(workerSource, /const storageResults = await Promise\.allSettled/);
  assert.match(workerSource, /await env\.DB\.batch\(\[/);
  assert.ok(writes.some(write =>
    write.sql.includes("INSERT INTO post_photos") &&
    write.args[0] === "existing-songkran-day" &&
    write.args[2] === 69
  ));
  assert.ok(!writes.some(write => write.sql.includes("INSERT OR IGNORE INTO posts")));
});

test("staff uploads accept iPhone HEIC photos", async () => {
  const uploads = [];
  const env = {
    ...environment(),
    DB: {
      prepare(sql) {
        return {
          args: [],
          bind(...args) {
            this.args = args;
            return this;
          },
          async first() {
            if (sql.includes("SELECT id FROM posts")) return { id: "iphone-photo-day" };
            if (sql.includes("MAX(sort_order)")) return { last_order: 0 };
            return null;
          },
          async run() {
            return { success: true };
          }
        };
      },
      async batch(statements) {
        return Promise.all(statements.map(statement => statement.run()));
      }
    },
    PHOTOS: {
      async put(key) {
        uploads.push(key);
      }
    },
    IMAGES: mockImages()
  };
  const loginResponse = await worker.fetch(apiRequest("/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audience: "staff", password: "staff-test-password" })
  }), env);
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";
  const form = new FormData();
  form.set("date", "2026-08-03");
  form.append("photos", new Blob(["iphone photo"], { type: "image/heic" }), "IMG_1234.HEIC");

  const response = await worker.fetch(apiRequest("/api/staff/posts", {
    method: "POST",
    headers: { cookie },
    body: form
  }), env);

  assert.equal(response.status, 200);
  assert.equal(uploads.length, 2);
});

test("staff upload retries do not duplicate an already stored photo", async () => {
  const writes = [];
  const uploads = [];
  const env = {
    ...environment(),
    DB: {
      prepare(sql) {
        return {
          args: [],
          bind(...args) {
            this.args = args;
            return this;
          },
          async first() {
            if (sql.includes("SELECT id FROM posts")) return { id: "existing-ocean-day" };
            if (sql.includes("SELECT id FROM photos")) return { id: "retry-upload-123456" };
            return null;
          },
          async run() {
            writes.push({ sql, args: this.args });
            return { success: true };
          }
        };
      }
    },
    PHOTOS: {
      async put(key) {
        uploads.push(key);
      }
    },
    IMAGES: mockImages()
  };
  const loginResponse = await worker.fetch(apiRequest("/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audience: "staff", password: "staff-test-password" })
  }), env);
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";
  const form = new FormData();
  form.set("date", "2026-08-03");
  form.set("upload_id", "retry-upload-123456");
  form.append("photos", new Blob(["same photo"], { type: "image/jpeg" }), "ocean.jpg");

  const response = await worker.fetch(apiRequest("/api/staff/posts", {
    method: "POST",
    headers: { cookie },
    body: form
  }), env);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.equal(data.added, 0);
  assert.equal(data.duplicate, true);
  assert.equal(uploads.length, 0);
  assert.ok(!writes.some(write => write.sql.includes("INSERT INTO photos")));
});

test("staff photo deletion removes the full image and thumbnail", async () => {
  const deletedObjects = [];
  const batches = [];
  const env = {
    ...environment(),
    DB: {
      prepare(sql) {
        return {
          sql,
          args: [],
          bind(...args) {
            this.args = args;
            return this;
          },
          async first() {
            if (sql.includes("JOIN post_photos")) {
              return {
                r2_key: "portal/day/photo.webp",
                thumbnail_r2_key: "portal/day/photo-thumb.webp",
                post_id: "post-with-photos"
              };
            }
            if (sql.includes("COUNT(*)")) return { count: 2 };
            return null;
          },
          async run() {
            return { success: true };
          }
        };
      },
      async batch(statements) {
        batches.push(statements);
        return statements.map(() => ({ success: true }));
      }
    },
    PHOTOS: {
      async delete(keys) {
        deletedObjects.push(...(Array.isArray(keys) ? keys : [keys]));
      }
    }
  };
  const loginResponse = await worker.fetch(apiRequest("/api/auth/password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ audience: "staff", password: "staff-test-password" })
  }), env);
  const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] || "";

  const response = await worker.fetch(apiRequest("/api/staff/photos/photo-to-delete", {
    method: "DELETE",
    headers: { cookie }
  }), env);

  assert.equal(response.status, 200);
  assert.deepEqual(deletedObjects, ["portal/day/photo.webp", "portal/day/photo-thumb.webp"]);
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 3);
});
