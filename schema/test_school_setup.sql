-- テスト用の学校データを作成
-- Supabaseのダッシュボード > SQL Editor で実行してください

-- テスト学校の作成
INSERT INTO public.schools (name, school_code) 
VALUES ('テスト学校', 'TEST2025')
ON CONFLICT (school_code) DO NOTHING;

-- 作成した学校の確認
SELECT * FROM public.schools WHERE school_code = 'TEST2025';