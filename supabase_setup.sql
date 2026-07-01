-- ==========================================
-- MyExpense - Supabase Table Setup
-- ==========================================
-- Cara guna:
-- 1. Log in ke https://supabase.com
-- 2. Masuk project "tgctymbcdhvnyvncryqx"
-- 3. Pergi ke SQL Editor
-- 4. Paste SQL ini dan RUN
-- ==========================================

-- Jadual utama untuk semua rekod perbelanjaan dari aplikasi
CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  user_key TEXT,
  category TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date DATE NOT NULL,
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah column login sync kalau project pernah guna setup lama
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS user_key TEXT;

-- Pastikan rekod lama masih boleh digunakan
UPDATE public.expenses
SET user_key = device_id
WHERE user_key IS NULL;

ALTER TABLE public.expenses
  ALTER COLUMN user_key SET NOT NULL;

-- Index untuk carian/sync lebih laju
CREATE INDEX IF NOT EXISTS idx_expenses_device_date ON public.expenses (device_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses (user_key, date);

-- Benarkan akses REST menggunakan anon key aplikasi
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO anon, authenticated;

-- Polisi RLS untuk PWA ini.
-- Aplikasi guna Supabase anon REST terus, jadi anon perlu dibenarkan sync.
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon select expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow anon insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow anon update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Allow anon delete expenses" ON public.expenses;

CREATE POLICY "Allow anon select expenses"
  ON public.expenses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon insert expenses"
  ON public.expenses FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon update expenses"
  ON public.expenses FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete expenses"
  ON public.expenses FOR DELETE
  TO anon, authenticated
  USING (true);

-- Sahkan jadual berjaya dibuat.
-- Jika table tidak wujud, block ini akan keluarkan error.
DO $$
BEGIN
  IF to_regclass('public.expenses') IS NULL THEN
    RAISE EXCEPTION 'Table public.expenses tidak berjaya dibuat. Semak error di SQL Editor.';
  END IF;
END $$;

-- Paparkan table dan column yang Supabase telah cipta
SELECT
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'expenses';

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'expenses'
ORDER BY ordinal_position;

SELECT 'MyExpense table public.expenses ready' AS status;
