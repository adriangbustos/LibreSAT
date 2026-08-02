import type { VocabTestSession, VocabDexState } from '@/app/types';

const KEYS = {
  VOCAB_SESSIONS: 'sat_vocab_sessions',
  VOCAB_DEX: 'sat_vocab_dex',
} as const;

function safeGet<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('localStorage write failed:', e);
  }
}

// ─── Test Sessions ────────────────────────────────────────────────────────────

export function getVocabTestSessions(): VocabTestSession[] {
  return safeGet<VocabTestSession[]>(KEYS.VOCAB_SESSIONS) ?? [];
}

export function saveVocabTestSession(session: VocabTestSession): void {
  const sessions = getVocabTestSessions();
  sessions.unshift(session); // newest first
  safeSet(KEYS.VOCAB_SESSIONS, sessions);
}

// ─── VocabDex ─────────────────────────────────────────────────────────────────

const DEFAULT_VOCAB_DEX: VocabDexState = {
  seen_words: {},
  last_updated: new Date().toISOString(),
};

export function getVocabDex(): VocabDexState {
  return safeGet<VocabDexState>(KEYS.VOCAB_DEX) ?? DEFAULT_VOCAB_DEX;
}

export function bulkUpdateVocabDex(words: string[]): void {
  const dex = getVocabDex();
  let changed = false;
  for (const word of words) {
    if (!dex.seen_words[word]) {
      dex.seen_words[word] = true;
      changed = true;
    }
  }
  if (changed) {
    dex.last_updated = new Date().toISOString();
    safeSet(KEYS.VOCAB_DEX, dex);
  }
}

export function getVocabDexStats(totalWordsInDb: number): { seen: number; total: number; percentage: number } {
  const dex = getVocabDex();
  const seen = Object.keys(dex.seen_words).length;
  return {
    seen,
    total: totalWordsInDb,
    percentage: totalWordsInDb > 0 ? Math.round((seen / totalWordsInDb) * 100) : 0
  };
}
