const COOKIE_NAME = "luana_portal";
const SESSION_DAYS = 30;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (
        url.pathname === "/worker.js" ||
        url.pathname === "/wrangler.jsonc" ||
        url.pathname.startsWith("/migrations/") ||
        url.pathname.startsWith("/docs/")
      ) return text("Not found", 404);
      if (url.pathname === "/parents") return asset(request, env, "/parents.html");
      if (url.pathname === "/staff") return asset(request, env, "/staff.html");
      if (url.pathname.startsWith("/api/")) return handleApi(request, env, url);
      return asset(request, env);
    } catch (error) {
      return json({
        error: error.message || "Something went wrong",
        setupRequired: Boolean(error.setupRequired)
      }, error.status || 500);
    }
  }
};

async function handleApi(request, env, url) {
  if (url.pathname === "/api/auth/password" && request.method === "POST") return passwordLogin(request, env);
  if (url.pathname === "/api/auth/request" && request.method === "POST") return requestLogin(request, env);
  if (url.pathname === "/api/auth/verify" && request.method === "GET") return verifyLogin(request, env, url);
  if (url.pathname === "/api/auth/signout" && request.method === "POST") return signout();
  if (url.pathname === "/api/parent/feed" && request.method === "GET") return parentFeed(request, env);
  if (url.pathname === "/api/staff/me" && request.method === "GET") return staffMe(request, env);
  if (url.pathname === "/api/staff/posts" && request.method === "GET") return listStaffPosts(request, env);
  if (url.pathname === "/api/staff/posts" && request.method === "POST") return createStaffPost(request, env);
  if (url.pathname.startsWith("/api/staff/posts/") && request.method === "PATCH") return updateStaffPost(request, env, url);
  if (url.pathname.startsWith("/api/staff/posts/") && request.method === "DELETE") return deleteStaffPost(request, env, url);
  if (url.pathname.startsWith("/api/photos/") && request.method === "GET") return getPhoto(request, env, url);
  return json({ error: "Not found" }, 404);
}

async function passwordLogin(request, env) {
  requireSetup(env, ["SESSION_SECRET"]);
  const body = await request.json();
  const audience = body.audience === "staff" ? "staff" : "parent";
  const password = String(body.password || "");
  const expected = audience === "staff" ? env.STAFF_PORTAL_PASSWORD : env.PARENT_PORTAL_PASSWORD;

  if (!expected) {
    const error = new Error(`${audience === "staff" ? "Staff" : "Parent"} password is not configured yet`);
    error.status = 503;
    error.setupRequired = true;
    throw error;
  }

  if (!password || !(await constantEqual(password, expected))) {
    return json({ error: "Incorrect password" }, 401);
  }

  const session = await signSession(env, {
    role: audience,
    subject: `${audience}-password`,
    groups: audience === "parent" ? parentPortalGroups(env) : [],
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400
  });

  return json({ ok: true }, 200, {
    "set-cookie": `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
  });
}

async function requestLogin(request, env) {
  requireSetup(env, ["DB"]);
  const body = await request.json();
  const email = normalizeEmail(body.email);
  const audience = body.audience === "staff" ? "staff" : "parent";
  if (!email) return json({ error: "Email is required" }, 400);

  const actor = audience === "staff"
    ? await findStaff(env, email)
    : await findParent(env, email);
  if (!actor) {
    return json({ ok: true });
  }

  const token = crypto.randomUUID().replaceAll("-", "");
  const tokenHash = await sha256(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await env.DB.prepare(
    "INSERT INTO login_tokens (token_hash, email, role, expires_at, used_at, created_at) VALUES (?1, ?2, ?3, ?4, NULL, ?5)"
  ).bind(tokenHash, email, audience, expiresAt, new Date().toISOString()).run();

  const origin = new URL(request.url).origin;
  const returnTo = audience === "staff" ? "/staff" : "/parents";
  const link = `${origin}/api/auth/verify?token=${token}&return_to=${encodeURIComponent(returnTo)}`;

  if (env.RESEND_API_KEY && env.LOGIN_FROM_EMAIL) {
    await sendEmail(env, email, "Your Luana login link", `Open this one-time link to sign in:\n\n${link}\n\nThis link expires in 15 minutes.`);
    return json({ ok: true });
  }

  if (env.ALLOW_DEBUG_LOGIN !== "true") {
    const error = new Error("Email delivery is not configured yet");
    error.status = 503;
    error.setupRequired = true;
    throw error;
  }

  return json({ ok: true, debugLink: link });
}

async function verifyLogin(request, env, url) {
  requireSetup(env, ["DB", "SESSION_SECRET"]);
  const token = url.searchParams.get("token") || "";
  const returnTo = cleanReturnTo(url.searchParams.get("return_to"));
  if (!token) return text("Missing token", 400);

  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    "SELECT email, role, expires_at, used_at FROM login_tokens WHERE token_hash = ?1"
  ).bind(tokenHash).first();

  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
    return text("This login link is expired or already used.", 401);
  }

  await env.DB.prepare(
    "UPDATE login_tokens SET used_at = ?1 WHERE token_hash = ?2"
  ).bind(new Date().toISOString(), tokenHash).run();

  const session = await signSession(env, {
    email: row.email,
    role: row.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400
  });

  return new Response(null, {
    status: 302,
    headers: {
      "location": returnTo,
      "set-cookie": `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
    }
  });
}

function signout() {
  return json({ ok: true }, 200, {
    "set-cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`
  });
}

async function parentFeed(request, env) {
  requireSetup(env, ["DB"]);
  const session = await requireSession(request, env, "parent");
  const groups = session.subject === "parent-password" ? parentPortalGroups(env) : session.groups?.length ? session.groups : await parentGroups(env, session.email);
  if (!groups.length) return json({ posts: [], albums: [] });

  const placeholders = groups.map((_, index) => `?${index + 1}`).join(",");
  const posts = await env.DB.prepare(
    `SELECT p.id, p.post_date, p.title, p.body, p.group_key, p.week_slug
     FROM posts p
     WHERE p.status = 'published' AND p.group_key IN (${placeholders})
     ORDER BY p.post_date DESC, p.created_at DESC
     LIMIT 80`
  ).bind(...groups).all();

  const postIds = posts.results.map(post => post.id);
  const photos = postIds.length ? await photosForPosts(env, postIds) : new Map();

  const albums = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.slug, a.title, a.description, a.cover_photo_id
     FROM albums a
     JOIN album_groups ag ON ag.album_id = a.id
     WHERE ag.group_key IN (${placeholders})
     ORDER BY a.created_at DESC`
  ).bind(...groups).all();

  const albumList = await Promise.all(albums.results.map(async album => ({
    id: album.slug,
    title: album.title,
    description: album.description,
    coverUrl: album.cover_photo_id ? `/api/photos/${album.cover_photo_id}` : ""
  })));

  return json({
    posts: posts.results.map(post => ({
      id: `post-${post.id}`,
      date: post.post_date,
      title: post.title,
      body: post.body,
      group: post.group_key,
      week: validSummerWeek(post.week_slug),
      photos: photos.get(post.id) || []
    })),
    albums: albumList
  });
}

async function staffMe(request, env) {
  requireSetup(env, ["DB"]);
  const session = await requireSession(request, env, "staff");
  return json({ subject: session.subject || session.email || "staff" });
}

async function listStaffPosts(request, env) {
  requireSetup(env, ["DB"]);
  await requireSession(request, env, "staff");
  const rows = await env.DB.prepare(
    `SELECT p.id, p.group_key, p.week_slug, p.post_date, p.title, p.body, p.status, p.created_at,
      COUNT(pp.photo_id) AS photo_count
     FROM posts p
     LEFT JOIN post_photos pp ON pp.post_id = p.id
     WHERE p.group_key = 'summer-2026'
     GROUP BY p.id
     ORDER BY p.post_date DESC, p.created_at DESC
     LIMIT 60`
  ).all();

  const postIds = rows.results.map(post => post.id);
  const photos = postIds.length ? await photosForPosts(env, postIds) : new Map();
  const albums = await staffAlbums(env);

  return json({
    posts: rows.results.map(post => ({
      id: post.id,
      group: post.group_key,
      week: validSummerWeek(post.week_slug),
      date: post.post_date,
      title: post.title,
      body: post.body,
      status: post.status,
      photoCount: post.photo_count || 0,
      photos: photos.get(post.id) || []
    })),
    albums
  });
}

async function staffAlbums(env) {
  const rows = await env.DB.prepare(
    `SELECT a.id, a.slug, a.title, a.description, a.cover_photo_id, COUNT(ap.photo_id) AS photo_count
     FROM albums a
     JOIN album_groups ag ON ag.album_id = a.id AND ag.group_key = 'summer-2026'
     LEFT JOIN album_photos ap ON ap.album_id = a.id
     GROUP BY a.id
     ORDER BY
       CASE a.slug
         WHEN 'week-1-festivals' THEN 1
         WHEN 'week-2-ocean' THEN 2
         WHEN 'week-3-adventure' THEN 3
         ELSE 9
       END,
       a.created_at DESC`
  ).all();

  return rows.results.map(album => ({
    id: album.slug,
    title: album.title,
    description: album.description,
    photoCount: album.photo_count || 0,
    coverUrl: album.cover_photo_id ? `/api/photos/${album.cover_photo_id}` : ""
  }));
}

async function createStaffPost(request, env) {
  requireSetup(env, ["DB", "PHOTOS"]);
  const session = await requireSession(request, env, "staff");
  const form = await request.formData();
  const group = String(form.get("group") || "").trim();
  const date = String(form.get("date") || "").trim();
  const title = String(form.get("title") || "Luana day").trim();
  const body = String(form.get("body") || "").trim();
  const status = form.get("status") === "published" ? "published" : "draft";
  const weekSlug = validSummerWeek(String(form.get("week") || form.get("album") || "").trim());
  const albumSlug = weekSlug;
  const files = form.getAll("photos").filter(value => value && typeof value === "object" && value.size);

  if (!group || !date || !title) return json({ error: "Week, date, and activity title are required" }, 400);

  const postId = crypto.randomUUID();
  const now = new Date().toISOString();
  await env.DB.prepare(
    "INSERT INTO posts (id, group_key, week_slug, post_date, title, body, status, created_by, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)"
  ).bind(postId, group, weekSlug, date, title, body, status, session.email || session.subject || "staff", now, now).run();

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const photoId = crypto.randomUUID();
    const ext = extensionFor(file.type, file.name);
    const key = `portal/${group}/${date}/${photoId}${ext}`;
    await env.PHOTOS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" }
    });
    await env.DB.prepare(
      "INSERT INTO photos (id, r2_key, filename, content_type, size_bytes, uploaded_by, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
    ).bind(photoId, key, file.name || `${photoId}${ext}`, file.type || "", file.size || 0, session.email || session.subject || "staff", now).run();
    await env.DB.prepare(
      "INSERT INTO post_photos (post_id, photo_id, sort_order) VALUES (?1, ?2, ?3)"
    ).bind(postId, photoId, index).run();
    if (albumSlug) await attachPhotoToAlbum(env, albumSlug, group, photoId, index, now);
  }

  return json({ ok: true, postId });
}

async function updateStaffPost(request, env, url) {
  requireSetup(env, ["DB"]);
  await requireSession(request, env, "staff");
  const postId = postIdFromUrl(url);
  const body = await request.json();
  const group = String(body.group || "").trim();
  const date = String(body.date || "").trim();
  const title = String(body.title || "Luana day").trim();
  const note = String(body.body || "").trim();
  const status = body.status === "published" ? "published" : "draft";
  const weekSlug = validSummerWeek(String(body.week || "").trim());

  if (!postId) return json({ error: "Post not found" }, 404);
  if (!group || !date || !title) return json({ error: "Week, date, and activity title are required" }, 400);

  const existing = await env.DB.prepare("SELECT id, week_slug FROM posts WHERE id = ?1").bind(postId).first();
  if (!existing) return json({ error: "Post not found" }, 404);

  await env.DB.prepare(
    "UPDATE posts SET group_key = ?1, week_slug = ?2, post_date = ?3, title = ?4, body = ?5, status = ?6, updated_at = ?7 WHERE id = ?8"
  ).bind(group, weekSlug, date, title, note, status, new Date().toISOString(), postId).run();

  if (existing.week_slug !== weekSlug) {
    await movePostPhotosToWeek(env, postId, group, weekSlug);
  }

  return json({ ok: true });
}

async function deleteStaffPost(request, env, url) {
  requireSetup(env, ["DB", "PHOTOS"]);
  await requireSession(request, env, "staff");
  const postId = postIdFromUrl(url);
  if (!postId) return json({ error: "Post not found" }, 404);

  const photos = await env.DB.prepare(
    `SELECT ph.id, ph.r2_key
     FROM photos ph
     JOIN post_photos pp ON pp.photo_id = ph.id
     WHERE pp.post_id = ?1`
  ).bind(postId).all();

  for (const photo of photos.results) {
    await env.PHOTOS.delete(photo.r2_key);
  }

  await env.DB.batch([
    env.DB.prepare("DELETE FROM album_photos WHERE photo_id IN (SELECT photo_id FROM post_photos WHERE post_id = ?1)").bind(postId),
    env.DB.prepare("DELETE FROM post_photos WHERE post_id = ?1").bind(postId)
  ]);

  for (const photo of photos.results) {
    await env.DB.prepare("DELETE FROM photos WHERE id = ?1").bind(photo.id).run();
  }

  await env.DB.prepare("DELETE FROM posts WHERE id = ?1").bind(postId).run();
  return json({ ok: true });
}

async function getPhoto(request, env, url) {
  requireSetup(env, ["DB", "PHOTOS"]);
  const session = await requireSession(request, env);
  const photoId = decodeURIComponent(url.pathname.replace("/api/photos/", ""));
  if (!photoId) return json({ error: "Photo not found" }, 404);

  let photo = null;
  if (session.role === "staff") {
    photo = await env.DB.prepare("SELECT r2_key, content_type FROM photos WHERE id = ?1").bind(photoId).first();
  } else {
    const groups = session.subject === "parent-password" ? parentPortalGroups(env) : session.groups?.length ? session.groups : await parentGroups(env, session.email);
    if (!groups.length) return json({ error: "Photo not found" }, 404);
    const placeholders = groups.map((_, index) => `?${index + 2}`).join(",");
    photo = await env.DB.prepare(
      `SELECT DISTINCT ph.r2_key, ph.content_type
       FROM photos ph
       JOIN post_photos pp ON pp.photo_id = ph.id
       JOIN posts p ON p.id = pp.post_id
       WHERE ph.id = ?1 AND p.status = 'published' AND p.group_key IN (${placeholders})`
    ).bind(photoId, ...groups).first();
  }

  if (!photo) return json({ error: "Photo not found" }, 404);
  const object = await env.PHOTOS.get(photo.r2_key);
  if (!object) return json({ error: "Photo not found" }, 404);

  return new Response(object.body, {
    headers: {
      "content-type": photo.content_type || object.httpMetadata?.contentType || "application/octet-stream",
      "cache-control": "private, max-age=300"
    }
  });
}

async function attachPhotoToAlbum(env, albumSlug, group, photoId, sortOrder, now) {
  let album = await env.DB.prepare("SELECT id FROM albums WHERE slug = ?1").bind(albumSlug).first();
  if (!album) {
    const albumId = crypto.randomUUID();
    const theme = summerAlbumTheme(albumSlug);
    const title = theme.title;
    await env.DB.prepare(
      "INSERT INTO albums (id, slug, title, description, cover_photo_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)"
    ).bind(albumId, albumSlug, title, theme.description, photoId, now).run();
    await env.DB.prepare(
      "INSERT INTO album_groups (album_id, group_key) VALUES (?1, ?2)"
    ).bind(albumId, group).run();
    album = { id: albumId };
  }
  await env.DB.prepare(
    "INSERT INTO album_photos (album_id, photo_id, sort_order) VALUES (?1, ?2, ?3)"
  ).bind(album.id, photoId, sortOrder).run();
}

async function movePostPhotosToWeek(env, postId, group, weekSlug) {
  const rows = await env.DB.prepare(
    `SELECT pp.photo_id, pp.sort_order
     FROM post_photos pp
     WHERE pp.post_id = ?1
     ORDER BY pp.sort_order`
  ).bind(postId).all();

  await env.DB.prepare(
    `DELETE FROM album_photos
     WHERE photo_id IN (SELECT photo_id FROM post_photos WHERE post_id = ?1)
       AND album_id IN (
         SELECT id FROM albums
         WHERE slug IN ('week-1-festivals', 'week-2-ocean', 'week-3-adventure')
       )`
  ).bind(postId).run();

  const now = new Date().toISOString();
  for (const row of rows.results) {
    await attachPhotoToAlbum(env, weekSlug, group, row.photo_id, row.sort_order, now);
  }

  await env.DB.prepare(
    `UPDATE albums
     SET cover_photo_id = (
       SELECT ap.photo_id
       FROM album_photos ap
       JOIN photos ph ON ph.id = ap.photo_id
       WHERE ap.album_id = albums.id
       ORDER BY ph.created_at DESC, ap.sort_order
       LIMIT 1
     )
     WHERE slug IN ('week-1-festivals', 'week-2-ocean', 'week-3-adventure')`
  ).run();
}

function validSummerWeek(value) {
  const weeks = new Set([
    "week-1-festivals",
    "week-2-ocean",
    "week-3-adventure"
  ]);
  return weeks.has(value) ? value : "week-1-festivals";
}

function summerAlbumTheme(slug) {
  const themes = {
    "week-1-festivals": {
      title: "Week 1: Festivals of the World",
      description: "Photos and moments from our first summer theme week."
    },
    "week-2-ocean": {
      title: "Week 2: Ocean Explorers",
      description: "Ocean activities, crafts, games, and discoveries."
    },
    "week-3-adventure": {
      title: "Week 3: Adventure & Survival",
      description: "Adventure skills, survival challenges, and teamwork."
    }
  };
  return themes[slug] || {
    title: slug.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
    description: ""
  };
}

async function photosForPosts(env, postIds) {
  const placeholders = postIds.map((_, index) => `?${index + 1}`).join(",");
  const rows = await env.DB.prepare(
    `SELECT pp.post_id, ph.id, ph.filename
     FROM post_photos pp
     JOIN photos ph ON ph.id = pp.photo_id
     WHERE pp.post_id IN (${placeholders})
     ORDER BY pp.sort_order ASC`
  ).bind(...postIds).all();
  const map = new Map();
  rows.results.forEach(row => {
    if (!map.has(row.post_id)) map.set(row.post_id, []);
    map.get(row.post_id).push({
      url: `/api/photos/${row.id}`,
      alt: row.filename || "Luana photo"
    });
  });
  return map;
}

async function parentGroups(env, email) {
  if (!email) return parentPortalGroups(env);
  const rows = await env.DB.prepare(
    `SELECT DISTINCT c.group_key
     FROM parents p
     JOIN children c ON c.parent_id = p.id
     WHERE lower(p.email) = ?1 AND p.status = 'active'`
  ).bind(email).all();
  return rows.results.map(row => row.group_key);
}

function parentPortalGroups(env) {
  return String(env.PARENT_PORTAL_GROUPS || "summer-2026")
    .split(",")
    .map(group => group.trim())
    .filter(Boolean);
}

async function findParent(env, email) {
  return env.DB.prepare("SELECT id, email FROM parents WHERE lower(email) = ?1 AND status = 'active'").bind(email).first();
}

async function findStaff(env, email) {
  return env.DB.prepare("SELECT email FROM staff WHERE lower(email) = ?1 AND status = 'active'").bind(email).first();
}

async function sendEmail(env, to, subject, textBody) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.LOGIN_FROM_EMAIL,
      to,
      subject,
      text: textBody
    })
  });
  if (!response.ok) {
    console.error("Resend send failed", response.status, await response.text());
    throw new Error("Email could not be sent");
  }
}

async function requireSession(request, env, role) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) throw authError();
  const session = await verifySession(env, match[1]);
  if (!session || session.exp < Math.floor(Date.now() / 1000)) throw authError();
  if (role && session.role !== role) throw authError();
  return session;
}

function authError() {
  const error = new Error("Sign in required");
  error.status = 401;
  return error;
}

async function signSession(env, payload) {
  const encoded = base64url(JSON.stringify(payload));
  const signature = await hmac(env.SESSION_SECRET, encoded);
  return `${encoded}.${signature}`;
}

async function verifySession(env, value) {
  requireSetup(env, ["SESSION_SECRET"]);
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return null;
  const expected = await hmac(env.SESSION_SECRET, encoded);
  if (expected !== signature) return null;
  return JSON.parse(atobUrl(encoded));
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return base64urlBytes(new Uint8Array(bytes));
}

async function sha256(value) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return base64urlBytes(new Uint8Array(bytes));
}

async function constantEqual(left, right) {
  const leftHash = await sha256(left);
  const rightHash = await sha256(right);
  if (leftHash.length !== rightHash.length) return false;
  let diff = 0;
  for (let index = 0; index < leftHash.length; index += 1) {
    diff |= leftHash.charCodeAt(index) ^ rightHash.charCodeAt(index);
  }
  return diff === 0;
}

function base64url(value) {
  return btoa(unescape(encodeURIComponent(value))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function atobUrl(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return decodeURIComponent(escape(atob(padded)));
}

function base64urlBytes(bytes) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function requireSetup(env, bindings) {
  const missing = bindings.filter(binding => !env[binding]);
  if (missing.length) {
    const error = new Error(`Missing backend setup: ${missing.join(", ")}`);
    error.status = 503;
    error.setupRequired = true;
    throw error;
  }
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanReturnTo(returnTo) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) return "/parents";
  return returnTo;
}

function extensionFor(type, name) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  const match = String(name || "").match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : "";
}

function postIdFromUrl(url) {
  return decodeURIComponent(url.pathname.replace("/api/staff/posts/", "")).trim();
}

async function asset(request, env, pathname) {
  const target = pathname ? new Request(new URL(pathname, request.url), request) : request;
  return env.ASSETS.fetch(target);
}

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function text(body, status = 200) {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
