import { supabase, LEADERBOARD_TABLE } from './supabase-config.js';

const MAX_TEAM_NAME_LENGTH = 80;

function normalizeEntry(entry) {
  const now = Date.now();
  return {
    teamName: (entry.teamName || '').trim().slice(0, MAX_TEAM_NAME_LENGTH) || '未命名隊伍',
    score: Number.isFinite(entry.score) ? Math.max(0, Math.round(entry.score)) : 0,
    correct: Number.isFinite(entry.correct) ? Math.max(0, Math.round(entry.correct)) : 0,
    total: Number.isFinite(entry.total) ? Math.max(0, Math.round(entry.total)) : 0,
    durationSeconds: Number.isFinite(entry.durationSeconds) ? Math.max(0, Math.round(entry.durationSeconds)) : null,
    playedAt: entry.playedAt || now,
    attempts: Number.isFinite(entry.attempts) ? Math.max(1, Math.round(entry.attempts)) : 1,
  };
}

function mapRowToEntry(row) {
  return {
    teamName: row.team_name,
    score: row.score ?? 0,
    correct: row.correct ?? 0,
    total: row.total ?? 0,
    durationSeconds: row.duration_seconds ?? null,
    playedAt: row.played_at ? new Date(row.played_at).getTime() : Date.now(),
    attempts: row.attempts ?? 1,
  };
}

function buildRowPayload(entry, attempts) {
  return {
    team_name: entry.teamName,
    score: entry.score,
    correct: entry.correct,
    total: entry.total,
    duration_seconds: entry.durationSeconds,
    attempts: attempts,
    played_at: new Date(entry.playedAt).toISOString(),
  };
}

export async function getLeaderboardEntries(limit = 50) {
  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .select('*')
    .order('score', { ascending: false })
    .order('played_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Top Fun 3.0] 讀取排行榜失敗', error);
    throw error;
  }

  return (data || []).map(mapRowToEntry);
}

export async function saveLeaderboardEntry(entry) {
  const sanitized = normalizeEntry(entry);

  const { data: existing, error: lookupError } = await supabase
    .from(LEADERBOARD_TABLE)
    .select('attempts')
    .eq('team_name', sanitized.teamName)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') {
    console.error('[Top Fun 3.0] 查詢既有隊伍失敗', lookupError);
    throw lookupError;
  }

  const attempts = (existing?.attempts || 0) + 1;
  const payload = buildRowPayload(sanitized, attempts);

  if (existing) {
    const { error: updateError } = await supabase
      .from(LEADERBOARD_TABLE)
      .update(payload)
      .eq('team_name', sanitized.teamName);

    if (updateError) {
      console.error('[Top Fun 3.0] 更新排行榜失敗', updateError);
      throw updateError;
    }
  } else {
    const { error: insertError } = await supabase
      .from(LEADERBOARD_TABLE)
      .insert(payload);

    if (insertError) {
      console.error('[Top Fun 3.0] 寫入排行榜失敗', insertError);
      throw insertError;
    }
  }

  return getLeaderboardEntries();
}

export async function clearLeaderboard() {
  const { error } = await supabase.from(LEADERBOARD_TABLE).delete().neq('team_name', '');
  if (error) {
    console.error('[Top Fun 3.0] 清除排行榜失敗', error);
    throw error;
  }
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return '';
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) {
    return `${secs} 秒`;
  }
  return `${mins} 分 ${secs} 秒`;
}
