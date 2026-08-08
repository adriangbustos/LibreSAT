// ─────────────────────────────────────────────────────────────────────────────
// localStorage Abstraction Layer
// All app persistence goes through this module
// ─────────────────────────────────────────────────────────────────────────────

import type {
  TestSession,
  QuestionDexState,
  QuestionDexEntry,
  InProgressExamState,
  QuestionStatus,
} from '@/app/types';

const KEYS = {
  SESSIONS: 'sat_sessions',
  QUESTIONDEX: 'sat_questiondex',
  IN_PROGRESS: 'sat_in_progress',
  COMPLETED_STATIC: 'sat_completed_static', // Set of static exam_ids completed
  AI_CONFIG: 'sat_ai_config',
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

export interface AIConfig {
  provider: 'openai' | 'gemini' | 'anthropic';
  apiKey: string;
}

export function getAIConfig(): AIConfig | null {
  return safeGet<AIConfig>(KEYS.AI_CONFIG);
}

export function setAIConfig(config: AIConfig | null): void {
  safeSet(KEYS.AI_CONFIG, config);
}

export function getTestSessions(): TestSession[] {
  return safeGet<TestSession[]>(KEYS.SESSIONS) ?? [];
}

export function getTestSession(sessionId: string): TestSession | null {
  const sessions = getTestSessions();
  return sessions.find(s => s.session_id === sessionId) ?? null;
}

export function saveTestSession(session: TestSession): void {
  const sessions = getTestSessions();
  const idx = sessions.findIndex(s => s.session_id === session.session_id);
  if (idx >= 0) {
    sessions[idx] = session;
  } else {
    sessions.unshift(session); // newest first
  }
  safeSet(KEYS.SESSIONS, sessions);

  // Mark static exam as completed
  if (!session.exam_id.startsWith('randomized_') && !session.exam_id.startsWith('custom_')) {
    const completed = getCompletedStaticExams();
    completed.add(session.exam_id);
    safeSet(KEYS.COMPLETED_STATIC, [...completed]);
  }
}

export function getCompletedStaticExams(): Set<string> {
  const arr = safeGet<string[]>(KEYS.COMPLETED_STATIC) ?? [];
  return new Set(arr);
}

export function deleteTestSession(sessionId: string): void {
  const sessions = getTestSessions().filter(s => s.session_id !== sessionId);
  safeSet(KEYS.SESSIONS, sessions);
}

// ─── In-Progress Exam State ────────────────────────────────────────────────────

export function getInProgressExam(): InProgressExamState | null {
  return safeGet<InProgressExamState>(KEYS.IN_PROGRESS);
}

export function saveInProgressExam(state: InProgressExamState): void {
  safeSet(KEYS.IN_PROGRESS, state);
}

export function clearInProgressExam(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEYS.IN_PROGRESS);
}

// ─── QuestionDex ──────────────────────────────────────────────────────────────

const DEFAULT_QUESTIONDEX: QuestionDexState = {
  entries: {},
  last_updated: new Date().toISOString(),
};

export function getQuestionDex(): QuestionDexState {
  return safeGet<QuestionDexState>(KEYS.QUESTIONDEX) ?? DEFAULT_QUESTIONDEX;
}

export function getQuestionDexEntry(questionId: string): QuestionDexEntry | null {
  const dex = getQuestionDex();
  return dex.entries[questionId] ?? null;
}

export function updateQuestionDexEntry(
  questionId: string,
  status: QuestionStatus,
  timeSpent: number
): void {
  const dex = getQuestionDex();
  const existing = dex.entries[questionId];
  dex.entries[questionId] = {
    question_id: questionId,
    status,
    last_seen_at: new Date().toISOString(),
    time_spent_seconds: timeSpent,
    attempt_count: (existing?.attempt_count ?? 0) + 1,
  };
  dex.last_updated = new Date().toISOString();
  safeSet(KEYS.QUESTIONDEX, dex);
}

export function bulkUpdateQuestionDex(
  results: Array<{ question_id: string; is_correct: boolean; time_spent: number }>
): void {
  const dex = getQuestionDex();
  for (const r of results) {
    const existing = dex.entries[r.question_id];
    const newStatus: QuestionStatus = r.is_correct ? 'correct' : 'incorrect';
    dex.entries[r.question_id] = {
      question_id: r.question_id,
      status: newStatus,
      last_seen_at: new Date().toISOString(),
      time_spent_seconds: r.time_spent,
      attempt_count: (existing?.attempt_count ?? 0) + 1,
    };
  }
  dex.last_updated = new Date().toISOString();
  safeSet(KEYS.QUESTIONDEX, dex);
}

export function getQuestionDexStats(allQuestionIds: string[]): {
  total: number;
  seen: number;
  unseen: number;
  correct: number;
  incorrect: number;
  seenPercent: number;
} {
  const dex = getQuestionDex();
  const total = allQuestionIds.length;
  let seen = 0, correct = 0, incorrect = 0;
  for (const id of allQuestionIds) {
    const e = dex.entries[id];
    if (e && e.status !== 'unseen') {
      seen++;
      if (e.status === 'correct') correct++;
      else incorrect++;
    }
  }
  return {
    total,
    seen,
    unseen: total - seen,
    correct,
    incorrect,
    seenPercent: total > 0 ? Math.round((seen / total) * 100) : 0,
  };
}

// ─── Export/Import Data ────────────────────────────────────────────────────────

export function exportData(): string {
  const data: Record<string, any> = {};
  for (const key of Object.values(KEYS)) {
    data[key] = safeGet(key);
  }
  return JSON.stringify(data);
}

export function importData(jsonData: string): boolean {
  try {
    const data = JSON.parse(jsonData);
    for (const key of Object.values(KEYS)) {
      if (data[key] !== undefined) {
        safeSet(key, data[key]);
      }
    }
    return true;
  } catch (e) {
    console.error("Failed to import data:", e);
    return false;
  }
}
