ALTER TABLE posts ADD COLUMN week_slug TEXT NOT NULL DEFAULT 'week-1-festivals';

UPDATE posts
SET week_slug = COALESCE(
  (
    SELECT a.slug
    FROM post_photos pp
    JOIN album_photos ap ON ap.photo_id = pp.photo_id
    JOIN albums a ON a.id = ap.album_id
    WHERE pp.post_id = posts.id
      AND a.slug IN ('week-1-festivals', 'week-2-ocean', 'week-3-adventure')
    LIMIT 1
  ),
  week_slug
)
WHERE group_key = 'summer-2026';

CREATE INDEX IF NOT EXISTS posts_week_date_idx
ON posts(group_key, week_slug, post_date DESC);
