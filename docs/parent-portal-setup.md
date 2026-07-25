# Parent Portal Setup

This is the intended production setup for the Luana parent photo portal.

## Access model

- Parents log in with the shared parent portal password.
- Staff log in with a separate staff password.
- Login creates a signed 30-day session cookie.
- Parent password access shows published posts for the configured parent groups.

## Cloudflare resources

Create these resources before production use:

- D1 database: `luana_parent_portal`
- R2 bucket: `luana-parent-photos`
- Worker secret: `SESSION_SECRET`
- Worker secret: `PARENT_PORTAL_PASSWORD`
- Worker secret: `STAFF_PORTAL_PASSWORD`
- Optional Worker variable: `PARENT_PORTAL_GROUPS`

Bind them in `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "luana_parent_portal",
    "database_id": "replace-with-cloudflare-d1-id"
  }
],
"r2_buckets": [
  {
    "binding": "PHOTOS",
    "bucket_name": "luana-parent-photos"
  }
]
```

Then apply the schema in `migrations/001_parent_portal.sql`.

## Seed records

Add staff first:

```sql
INSERT INTO staff (id, email, display_name, status)
VALUES ('staff-1', 'teacher@example.com', 'Teacher', 'active');
```

Add a parent and child:

```sql
INSERT INTO parents (id, email, parent_name, status)
VALUES ('parent-1', 'parent@example.com', 'Parent Name', 'active');

INSERT INTO children (id, parent_id, child_name, group_key)
VALUES ('child-1', 'parent-1', 'Child Name', 'kinder');
```

Useful group keys for v1:

- `preschool`
- `kinder`
- `afterschool`
- `summer-2026`

## Pages

- `/parents` is the parent portal.
- `/staff` is the staff dashboard.

Both pages are marked `noindex` and should stay out of `sitemap.xml`.

Password login is the active portal flow. Magic-link code is retained as a
fallback, but the UI does not use it.
