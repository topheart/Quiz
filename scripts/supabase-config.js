import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.10?bundle&target=es2022';

const FALLBACK_URL = 'https://your-project.supabase.co';
const FALLBACK_KEY = 'public-anon-key';

const supabaseUrl = window?.SUPABASE_URL || FALLBACK_URL;
const supabaseKey = window?.SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!supabaseUrl || supabaseUrl === FALLBACK_URL || !supabaseKey || supabaseKey === FALLBACK_KEY) {
	console.warn('[Top Fun 3.0] Supabase 金鑰尚未設定，請在 scripts/supabase-config.js 中填入正式專案 URL 與公開金鑰。');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
	auth: { persistSession: false },
});

export const LEADERBOARD_TABLE = 'quiz_leaderboard';
