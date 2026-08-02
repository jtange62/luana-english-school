const COOKIE_NAME = "luana_portal";
const SESSION_DAYS = 30;
const SUMMER_WEEKS = [
  { slug: "week-1-festivals", secret: "SUMMER_WEEK_1_CODE" },
  { slug: "week-2-ocean", secret: "SUMMER_WEEK_2_CODE" },
  { slug: "week-3-adventure", secret: "SUMMER_WEEK_3_CODE" }
];
const SUMMER_DAYS = [
  { date: "2026-07-27", week: "week-1-festivals", title: "Thailand — Songkran" },
  { date: "2026-07-28", week: "week-1-festivals", title: "Brazil — Carnival" },
  { date: "2026-07-29", week: "week-1-festivals", title: "India — Holi" },
  { date: "2026-07-30", week: "week-1-festivals", title: "Japan — Matsuri" },
  { date: "2026-07-31", week: "week-1-festivals", title: "Field Trip — teamLab" },
  { date: "2026-08-03", week: "week-2-ocean", title: "Ocean Life" },
  { date: "2026-08-04", week: "week-2-ocean", title: "Coral Reef" },
  { date: "2026-08-05", week: "week-2-ocean", title: "Tides & Waves" },
  { date: "2026-08-06", week: "week-2-ocean", title: "Conservation & Climate" },
  { date: "2026-08-07", week: "week-2-ocean", title: "Field Trip — Enoshima Aquarium" },
  { date: "2026-08-17", week: "week-3-adventure", title: "Survival Priorities" },
  { date: "2026-08-18", week: "week-3-adventure", title: "Preparation & Teamwork" },
  { date: "2026-08-19", week: "week-3-adventure", title: "Navigation" },
  { date: "2026-08-20", week: "week-3-adventure", title: "Resource Management" },
  { date: "2026-08-21", week: "week-3-adventure", title: "Field Trip — Hug-Hug & Westrock Bouldering" }
];
const MAX_DAILY_UPLOAD = 10;
const UPLOAD_CONCURRENCY = 4;
const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
const PHOTO_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PHOTO_WIDTH = 1600;
const THUMBNAIL_WIDTH = 480;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.hostname === "www.luanaenglishschool.jp") {
        url.protocol = "https:";
        url.hostname = "luanaenglishschool.jp";
        return Response.redirect(url.toString(), 301);
      }
      if (
        url.pathname === "/worker.js" ||
        url.pathname === "/wrangler.jsonc" ||
        url.pathname.startsWith("/migrations/") ||
        url.pathname.startsWith("/docs/")
      ) return text("Not found", 404);
      if (url.pathname === "/parents") return asset(request, env, "/parents.html?v=20260727-visible-code1");
      if (url.pathname === "/staff") return asset(request, env, "/staff.html");
      if (url.pathname.startsWith("/api/")) return await handleApi(request, env, url);
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
  if (url.pathname.startsWith("/api/staff/photos/") && request.method === "DELETE") return deleteStaffPhoto(request, env, url);
  if (url.pathname.startsWith("/api/photos/") && request.method === "GET") return getPhoto(request, env, url);
  return json({ error: "Not found" }, 404);
}

async function passwordLogin(request, env) {
  requireSetup(env, ["SESSION_SECRET"]);
  const body = await request.json();
  const audience = body.audience === "staff" ? "staff" : "parent";
  const password = String(body.password || "");

  if (audience === "staff") {
    if (!env.STAFF_PORTAL_PASSWORD) throw setupError("Staff password is not configured yet");
    if (!password || !(await constantEqual(password, env.STAFF_PORTAL_PASSWORD))) {
      return json({ error: "Incorrect password" }, 401);
    }

    const session = await signSession(env, {
      role: "staff",
      subject: "staff-password",
      exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400
    });
    return sessionResponse(session);
  }

  const configuredWeeks = SUMMER_WEEKS.filter(week => env[week.secret]);
  if (!configuredWeeks.length) throw setupError("Summer access codes are not configured yet");

  const matchedWeeks = [];
  for (const week of configuredWeeks) {
    if (password && await constantEqual(password, env[week.secret])) matchedWeeks.push(week.slug);
  }
  if (!matchedWeeks.length) return json({ error: "Incorrect access code" }, 401);

  const existing = await optionalSession(request, env, "parent");
  const weeks = validSessionWeeks([...(existing?.weeks || []), ...matchedWeeks]);
  const session = await signSession(env, {
    role: "parent",
    subject: "parent-week-code",
    groups: parentPortalGroups(env),
    weeks,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400
  });

  return sessionResponse(session, { weeks });
}

function sessionResponse(session, body = {}) {
  return json({ ok: true, ...body }, 200, {
    "set-cookie": `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}`
  });
}

function setupError(message) {
  const error = new Error(message);
  error.status = 503;
  error.setupRequired = true;
  return error;
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
  const groups = session.groups?.length ? session.groups : await parentGroups(env, session.email);
  const weeks = parentSessionWeeks(session);
  if (!groups.length || !weeks.length) return json({ posts: [], albums: [], weeks });

  const groupPlaceholders = groups.map(() => "?").join(",");
  const weekPlaceholders = weeks.map(() => "?").join(",");
  const posts = await env.DB.prepare(
    `SELECT p.id, p.post_date, p.title, p.body, p.activities, p.group_key, p.week_slug
     FROM posts p
     WHERE p.status = 'published'
       AND p.group_key IN (${groupPlaceholders})
       AND p.week_slug IN (${weekPlaceholders})
     ORDER BY p.post_date DESC, p.created_at DESC
     LIMIT 80`
  ).bind(...groups, ...weeks).all();

  const postIds = posts.results.map(post => post.id);
  const photos = postIds.length ? await photosForPosts(env, postIds) : new Map();

  const albums = await env.DB.prepare(
    `SELECT DISTINCT a.id, a.slug, a.title, a.description, a.cover_photo_id
     FROM albums a
     JOIN album_groups ag ON ag.album_id = a.id
     WHERE ag.group_key IN (${groupPlaceholders})
       AND a.slug IN (${weekPlaceholders})
     ORDER BY a.created_at DESC`
  ).bind(...groups, ...weeks).all();

  const albumList = await Promise.all(albums.results.map(async album => ({
    id: album.slug,
    title: album.title,
    description: album.description,
    coverUrl: album.cover_photo_id ? `/api/photos/${album.cover_photo_id}?variant=thumbnail` : ""
  })));

  return json({
    posts: posts.results.map(post => ({
      id: `post-${post.id}`,
      date: post.post_date,
      title: post.title,
      body: post.body,
      activities: parseActivities(post.activities),
      group: post.group_key,
      week: validSummerWeek(post.week_slug),
      photos: photos.get(post.id) || []
    })),
    albums: albumList,
    weeks
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
    `SELECT p.id, p.group_key, p.week_slug, p.post_date, p.title, p.body, p.activities, p.status, p.created_at,
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
      activities: parseActivities(post.activities),
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
    coverUrl: album.cover_photo_id ? `/api/photos/${album.cover_photo_id}?variant=thumbnail` : ""
  }));
}

async function createStaffPost(request, env) {
  requireSetup(env, ["DB", "PHOTOS"]);
  const session = await requireSession(request, env, "staff");
  const form = await request.formData();
  const date = String(form.get("date") || "").trim();
  const day = summerDay(date);
  const files = form.getAll("photos").filter(value => value && typeof value === "object" && value.size);

  if (!day) return json({ error: "Choose a scheduled Summer School day" }, 400);
  if (!files.length) return json({ error: "Add at least one photo" }, 400);
  if (files.length > MAX_DAILY_UPLOAD) {
    return json({ error: `Upload up to ${MAX_DAILY_UPLOAD} photos at a time` }, 400);
  }
  const invalidFile = files.find(file => !PHOTO_CONTENT_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES);
  if (invalidFile) {
    return json({ error: "Photos must be JPEG, PNG, or WebP files no larger than 20 MB each" }, 400);
  }

  const now = new Date().toISOString();
  const createdBy = session.email || session.subject || "staff";
  let dailyPost = await env.DB.prepare(
    "SELECT id FROM posts WHERE group_key = 'summer-2026' AND post_date = ?1 ORDER BY created_at ASC LIMIT 1"
  ).bind(day.date).first();
  if (!dailyPost) {
    const dailyPostId = `summer-2026-${day.date}`;
    await env.DB.prepare(
      "INSERT OR IGNORE INTO posts (id, group_key, week_slug, post_date, title, body, activities, status, created_by, created_at, updated_at) VALUES (?1, 'summer-2026', ?2, ?3, ?4, '', '', 'published', ?5, ?6, ?7)"
    ).bind(dailyPostId, day.week, day.date, day.title, createdBy, now, now).run();
    dailyPost = await env.DB.prepare(
      "SELECT id FROM posts WHERE group_key = 'summer-2026' AND post_date = ?1 ORDER BY created_at ASC LIMIT 1"
    ).bind(day.date).first();
  }
  if (!dailyPost) return json({ error: "Could not prepare the daily photo collection" }, 500);

  const postId = dailyPost.id;
  await env.DB.prepare(
    "UPDATE posts SET week_slug = ?1, title = ?2, status = 'published', updated_at = ?3 WHERE id = ?4"
  ).bind(day.week, day.title, now, postId).run();
  const orderRow = await env.DB.prepare(
    "SELECT COALESCE(MAX(sort_order), -1) AS last_order FROM post_photos WHERE post_id = ?1"
  ).bind(postId).first();
  const firstSortOrder = Number(orderRow?.last_order ?? -1) + 1;

  const storePhoto = async (file, index) => {
    const photoId = crypto.randomUUID();
    const source = await file.arrayBuffer();
    const [optimized, thumbnail] = await Promise.all([
      optimizePhoto(env, source, PHOTO_WIDTH, 82),
      optimizePhoto(env, source, THUMBNAIL_WIDTH, 76)
    ]);
    const key = `portal/summer-2026/${date}/${photoId}.webp`;
    const thumbnailKey = `portal/summer-2026/${date}/${photoId}-thumb.webp`;
    let fullStored = false;
    let thumbnailStored = false;
    let photoRowStored = false;
    try {
      await env.PHOTOS.put(key, optimized, {
        httpMetadata: { contentType: "image/webp" }
      });
      fullStored = true;
      await env.PHOTOS.put(thumbnailKey, thumbnail, {
        httpMetadata: { contentType: "image/webp" }
      });
      thumbnailStored = true;
      await env.DB.prepare(
        "INSERT INTO photos (id, r2_key, thumbnail_r2_key, filename, content_type, size_bytes, uploaded_by, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)"
      ).bind(
        photoId,
        key,
        thumbnailKey,
        file.name || `${photoId}.webp`,
        "image/webp",
        optimized.byteLength + thumbnail.byteLength,
        session.email || session.subject || "staff",
        now
      ).run();
      photoRowStored = true;
      await env.DB.prepare(
        "INSERT INTO post_photos (post_id, photo_id, sort_order) VALUES (?1, ?2, ?3)"
      ).bind(postId, photoId, firstSortOrder + index).run();
    } catch (error) {
      if (photoRowStored) await env.DB.prepare("DELETE FROM photos WHERE id = ?1").bind(photoId).run();
      if (thumbnailStored) await env.PHOTOS.delete(thumbnailKey);
      if (fullStored) await env.PHOTOS.delete(key);
      throw error;
    }
  };

  for (let start = 0; start < files.length; start += UPLOAD_CONCURRENCY) {
    await Promise.all(
      files.slice(start, start + UPLOAD_CONCURRENCY).map((file, offset) => storePhoto(file, start + offset))
    );
  }

  return json({ ok: true, postId, added: files.length, date: day.date });
}

async function optimizePhoto(env, source, width, quality) {
  const output = await env.IMAGES
    .input(source)
    .transform({ width, fit: "scale-down" })
    .output({ format: "image/webp", quality });
  const response = output.response();
  if (!response.ok) throw new Error("Could not optimize an uploaded photo");
  return response.arrayBuffer();
}

async function updateStaffPost(request, env, url) {
  requireSetup(env, ["DB"]);
  await requireSession(request, env, "staff");
  const postId = postIdFromUrl(url);
  const body = await request.json();
  const group = String(body.group || "").trim();
  const date = String(body.date || "").trim();
  const title = String(body.title || "").trim();
  const note = String(body.body || "").trim();
  const status = body.status === "published" ? "published" : "draft";
  const weekSlug = validSummerWeek(String(body.week || "").trim());

  if (!postId) return json({ error: "Post not found" }, 404);
  if (!group || !date) return json({ error: "Week and date are required" }, 400);

  const existing = await env.DB.prepare("SELECT id, week_slug, activities FROM posts WHERE id = ?1").bind(postId).first();
  if (!existing) return json({ error: "Post not found" }, 404);
  const activities = body.activities === undefined
    ? String(existing.activities || "")
    : normalizeActivities(body.activities);

  await env.DB.prepare(
    "UPDATE posts SET group_key = ?1, week_slug = ?2, post_date = ?3, title = ?4, body = ?5, activities = ?6, status = ?7, updated_at = ?8 WHERE id = ?9"
  ).bind(group, weekSlug, date, title, note, activities, status, new Date().toISOString(), postId).run();

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
    `SELECT ph.id, ph.r2_key, ph.thumbnail_r2_key
     FROM photos ph
     JOIN post_photos pp ON pp.photo_id = ph.id
     WHERE pp.post_id = ?1`
  ).bind(postId).all();

  const objectKeys = photos.results.flatMap(photo =>
    [photo.r2_key, photo.thumbnail_r2_key].filter(Boolean)
  );
  if (objectKeys.length) await env.PHOTOS.delete(objectKeys);

  await env.DB.batch([
    env.DB.prepare("DELETE FROM album_photos WHERE photo_id IN (SELECT photo_id FROM post_photos WHERE post_id = ?1)").bind(postId),
    env.DB.prepare("DELETE FROM post_photos WHERE post_id = ?1").bind(postId),
    ...photos.results.map(photo => env.DB.prepare("DELETE FROM photos WHERE id = ?1").bind(photo.id)),
    env.DB.prepare("DELETE FROM posts WHERE id = ?1").bind(postId)
  ]);

  return json({ ok: true });
}

async function deleteStaffPhoto(request, env, url) {
  requireSetup(env, ["DB", "PHOTOS"]);
  await requireSession(request, env, "staff");
  const photoId = decodeURIComponent(url.pathname.replace("/api/staff/photos/", "")).trim();
  if (!photoId) return json({ error: "Photo not found" }, 404);

  const photo = await env.DB.prepare(
    `SELECT ph.r2_key, pp.post_id
     FROM photos ph
     JOIN post_photos pp ON pp.photo_id = ph.id
     WHERE ph.id = ?1`
  ).bind(photoId).first();
  if (!photo) return json({ error: "Photo not found" }, 404);

  await env.PHOTOS.delete(photo.r2_key);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM album_photos WHERE photo_id = ?1").bind(photoId),
    env.DB.prepare("DELETE FROM post_photos WHERE photo_id = ?1").bind(photoId),
    env.DB.prepare("DELETE FROM photos WHERE id = ?1").bind(photoId)
  ]);

  const remaining = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM post_photos WHERE post_id = ?1"
  ).bind(photo.post_id).first();
  if (!Number(remaining?.count || 0)) {
    await env.DB.prepare("DELETE FROM posts WHERE id = ?1").bind(photo.post_id).run();
  }

  return json({ ok: true });
}

async function getPhoto(request, env, url) {
  requireSetup(env, ["DB", "PHOTOS"]);
  const session = await requireSession(request, env);
  const photoId = decodeURIComponent(url.pathname.replace("/api/photos/", ""));
  if (!photoId) return json({ error: "Photo not found" }, 404);

  let photo = null;
  if (session.role === "staff") {
    photo = await env.DB.prepare("SELECT r2_key, thumbnail_r2_key, content_type, filename FROM photos WHERE id = ?1").bind(photoId).first();
  } else {
    const groups = session.groups?.length ? session.groups : await parentGroups(env, session.email);
    const weeks = parentSessionWeeks(session);
    if (!groups.length || !weeks.length) return json({ error: "Photo not found" }, 404);
    const groupPlaceholders = groups.map(() => "?").join(",");
    const weekPlaceholders = weeks.map(() => "?").join(",");
    photo = await env.DB.prepare(
      `SELECT DISTINCT ph.r2_key, ph.thumbnail_r2_key, ph.content_type, ph.filename
       FROM photos ph
       JOIN post_photos pp ON pp.photo_id = ph.id
       JOIN posts p ON p.id = pp.post_id
       WHERE ph.id = ?
         AND p.status = 'published'
         AND p.group_key IN (${groupPlaceholders})
         AND p.week_slug IN (${weekPlaceholders})`
    ).bind(photoId, ...groups, ...weeks).first();
  }

  if (!photo) return json({ error: "Photo not found" }, 404);
  const thumbnailRequested = url.searchParams.get("variant") === "thumbnail";
  const shareRequested = url.searchParams.get("share") === "1";
  const objectKey = thumbnailRequested && photo.thumbnail_r2_key ? photo.thumbnail_r2_key : photo.r2_key;
  const object = await env.PHOTOS.get(objectKey);
  if (!object) return json({ error: "Photo not found" }, 404);

  if (shareRequested) {
    const output = await env.IMAGES
      .input(object.body)
      .transform({ width: PHOTO_WIDTH, fit: "scale-down" })
      .output({ format: "image/jpeg", quality: 85 });
    const response = output.response();
    if (!response.ok) throw new Error("Could not prepare photo for saving");
    return new Response(response.body, {
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "private, max-age=31536000, immutable"
      }
    });
  }

  const headers = {
    "content-type": thumbnailRequested && photo.thumbnail_r2_key
      ? "image/webp"
      : photo.content_type || object.httpMetadata?.contentType || "application/octet-stream",
    "cache-control": "private, max-age=31536000, immutable"
  };
  if (url.searchParams.get("download") === "1" && !thumbnailRequested) {
    headers["content-disposition"] = photoDownloadDisposition(photo.filename, photoId);
  }
  return new Response(object.body, { headers });
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

function parseActivities(value) {
  return String(value || "")
    .split(/[,、\n•]+/)
    .map(activity => activity.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function normalizeActivities(value) {
  return parseActivities(value)
    .map(activity => activity.slice(0, 40))
    .join(", ");
}

function validSummerWeek(value) {
  const weeks = new Set(SUMMER_WEEKS.map(week => week.slug));
  return weeks.has(value) ? value : "week-1-festivals";
}

function summerDay(date) {
  return SUMMER_DAYS.find(day => day.date === date) || null;
}

function validSessionWeeks(values) {
  const allowed = new Set(SUMMER_WEEKS.map(week => week.slug));
  return [...new Set(values)].filter(value => allowed.has(value));
}

function parentSessionWeeks(session) {
  if (Array.isArray(session.weeks)) return validSessionWeeks(session.weeks);
  return [];
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
      id: row.id,
      url: `/api/photos/${row.id}`,
      thumbnailUrl: `/api/photos/${row.id}?variant=thumbnail`,
      filename: row.filename || "",
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
  const session = await optionalSession(request, env, role);
  if (!session) throw authError();
  return session;
}

async function optionalSession(request, env, role) {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  let session = null;
  try {
    session = await verifySession(env, match[1]);
  } catch {
    return null;
  }
  if (!session || session.exp < Math.floor(Date.now() / 1000)) return null;
  if (role && session.role !== role) return null;
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
  if (!(await constantEqual(expected, signature))) return null;
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
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right))
  ]);
  if (typeof crypto.subtle.timingSafeEqual === "function") {
    return crypto.subtle.timingSafeEqual(leftHash, rightHash);
  }
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let diff = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    diff |= leftBytes[index] ^ rightBytes[index];
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

function photoDownloadDisposition(filename, photoId) {
  const base = String(filename || "luana-photo")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\.[^.]+$/, "")
    .trim()
    .slice(0, 100) || "luana-photo";
  const unicodeName = `${base}.webp`;
  const encodedName = encodeURIComponent(unicodeName)
    .replaceAll("'", "%27")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");
  return `attachment; filename="luana-photo-${photoId}.webp"; filename*=UTF-8''${encodedName}`;
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
