-- ============================================================
--  Writers Portal — Migration 009: Posts / Updates Table
--  File: supabase/migrations/009_posts_table.sql
--
--  HOW TO RUN:
--    Supabase Dashboard → SQL Editor → New Query → paste → Run
--    (Run AFTER 008_get_submissions_full_name.sql has already been applied)
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text        NOT NULL,
  content          text        NOT NULL,
  slug             text        UNIQUE NOT NULL,
  published        boolean     NOT NULL DEFAULT true,
  meta_title       text,
  meta_description text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- 1. Anyone can read published posts
CREATE POLICY "Public can view published posts"
ON posts
FOR SELECT
TO public
USING (published = true);

-- 2. Authenticated users (admins) have full access
CREATE POLICY "Admins have full access to posts"
ON posts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed Data: The first post!
INSERT INTO posts (title, slug, content, published, meta_title, meta_description)
VALUES (
  'سوشل میڈیا لنک — کیوں ضروری ہے؟',
  'social-media-link-importance',
  'السلام علیکم پیارے لکھاریو! 🌸

آپ نے دیکھا ہوگا کہ سبمیشن فارم میں ہم نے ایک نیا اختیاری خانہ شامل کیا ہے — سوشل میڈیا لنک۔ سوچا آپ کو بتا دیں کہ یہ کیوں رکھا گیا ہے۔ 🤍

جب آپ کا ناول شائع ہوتا ہے، تو بہت سے قارئین چاہتے ہیں کہ وہ لکھاری کو جانیں، اُن سے جُڑیں، اُن کا کام مزید پڑھیں۔ لیکن اکثر ایسا ہوتا ہے کہ ایک اچھا ناول پڑھنے کے بعد بھی قاری کو یہ پتا نہیں ہوتا کہ لکھاری تک کیسے پہنچا جائے۔

اسی لیے اگر آپ اپنا فیس بک، انسٹاگرام یا کوئی اور سوشل میڈیا پروفائل شیئر کریں گے، تو:

✨ آپ کے قارئین آسانی سے آپ سے رابطہ کر سکیں گے
✨ آپ کی پہچان اور آپ کا اپنا حلقہ بنے گا
✨ آپ کا پروفائل آپ کے کام کی تصدیق کا ذریعہ بھی بنتا ہے — کہ یہ واقعی آپ کی اپنی تخلیق ہے
✨ مستقبل میں کوئی اور لکھاری، پبلشر، یا قاری آپ سے جُڑنا چاہے، تو رستہ آسان ہو

اور ہاں — یہ بالکل اختیاری ہے۔ 😊 نہ دینا چاہیں تو کوئی مسئلہ نہیں، فارم بغیر اس کے بھی مکمل ہو جائے گا۔ بس یہ ایک چھوٹا سا موقع ہے کہ اگر آپ چاہیں تو اپنے قارئین سے مزید قریب ہو سکیں۔

آپ کی تحریر آپ کی پہچان ہے — ہم بس چاہتے ہیں کہ وہ پہچان آپ تک صحیح معنوں میں پہنچے۔ 🌙',
  true,
  'سوشل میڈیا لنک — کیوں ضروری ہے؟ | Umera Ahmed Novel Bank',
  'جانیے کہ عمیرہ احمد ناول بینک (UNB) پر اپنا سوشل میڈیا لنک دینا کیوں ضروری ہے۔ یہ آپ کے قارئین سے جڑنے اور اپنی پہچان بنانے کا ایک بہترین ذریعہ ہے۔'
) ON CONFLICT (slug) DO NOTHING;
