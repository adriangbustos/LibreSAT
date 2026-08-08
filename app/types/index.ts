// ─────────────────────────────────────────────────────────────────────────────
// Core Domain Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Question {
  question_id: string;
  section: 'Reading and Writing' | 'Math';
  domain: string;
  skill: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  is_open_ended: boolean;
  stimulus: string;
  question_text: string;
  options: { A: string; B: string; C: string; D: string } | null;
  correct_answer: string;
  explanation: string;
  image_url?: string;
  table_data?: { headers: string[]; rows: string[][] };
  irt_parameters?: {
    a: number;
    b: number;
    c: number;
  };
  is_experimental?: boolean;
  stage_eligibility?: ('Module1' | 'Module2_Standard' | 'Module2_Advanced')[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Exam Suite Types (from exam_suites.json)
// ─────────────────────────────────────────────────────────────────────────────

export interface ExamModule {
  module_num: number;
  section: 'Reading and Writing' | 'Math';
  time_minutes: number;
  question_ids: string[];
}

export interface StaticExam {
  exam_id: string;
  label: string;
  type: 'full' | 'rw' | 'math';
  modules: ExamModule[];
  is_golden?: boolean;
}

export interface ExamSuites {
  generated_at: string;
  full_length: StaticExam[];
  rw_diagnostic: StaticExam[];
  math_diagnostic: StaticExam[];
  stats: {
    full_length_count: number;
    rw_diagnostic_count: number;
    math_diagnostic_count: number;
    total_questions: number;
    rw_questions: number;
    math_questions: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Session / Test Execution Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExamType = 'full' | 'rw' | 'math' | 'custom';

export interface SessionModule {
  module_num: number;
  section: 'Reading and Writing' | 'Math';
  time_minutes: number;
  question_ids: string[];
}

export interface QuestionResult {
  question_id: string;
  user_answer: string | null;
  correct_answer: string;
  is_correct: boolean;
  time_spent_seconds: number;
  question_number: number; // within module
  irt_parameters?: { a: number; b: number; c: number };
}

export interface ModuleResult {
  module_num: number;
  section: 'Reading and Writing' | 'Math';
  results: QuestionResult[];
  raw_correct: number;
  raw_total: number;
  scaled_score: number; // 200–800
}

export interface TestSession {
  session_id: string;
  exam_id: string; // static exam id or 'randomized' or 'custom'
  exam_type: ExamType;
  label: string;
  started_at: string; // ISO date
  completed_at: string;
  modules: SessionModule[];
  module_results: ModuleResult[];
  total_score: number; // 400–1600 (full) or 200–800 (diagnostic)
  rw_score?: number;
  math_score?: number;
  status: 'in_progress' | 'completed';
  custom_filters?: CustomTestFilters;
  ai_feedback?: string;
}

export interface CustomTestFilters {
  sections: string[];
  domains: string[];
  skills: string[];
  difficulties: string[];
  question_count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// QuestionDex Types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionStatus = 'unseen' | 'correct' | 'incorrect';

export interface QuestionDexEntry {
  question_id: string;
  status: QuestionStatus;
  last_seen_at: string | null;
  time_spent_seconds: number | null;
  attempt_count: number;
}

export interface QuestionDexState {
  entries: Record<string, QuestionDexEntry>;
  last_updated: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics / Filtering Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DomainStats {
  domain: string;
  section: string;
  total: number;
  correct: number;
  incorrect: number;
  skills: Record<string, { total: number; correct: number; incorrect: number }>;
}

export interface DifficultyStats {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  total: number;
  correct: number;
}

export interface QuestionFilter {
  status?: QuestionStatus | 'all';
  section?: string;
  domain?: string;
  skill?: string;
  difficulty?: string;
  search?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Progress Exam State (ephemeral, stored in localStorage)
// ─────────────────────────────────────────────────────────────────────────────

export interface InProgressExamState {
  session_id: string;
  exam_id: string;
  exam_type: ExamType;
  label: string;
  started_at: string;
  modules: SessionModule[];
  current_module_index: number;
  answers: Record<string, string | null>; // question_id → answer
  time_per_question: Record<string, number>; // question_id → seconds
  module_started_at?: number; // timestamp when current module started
  module_time_elapsed_ms?: number; // accumulated time from previous sessions (for pausing)
  completed_modules: ModuleResult[];
  custom_filters?: CustomTestFilters;
  highlights?: Record<string, {start: number; end: number}[]>;
  eliminated_choices?: Record<string, string[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Vocabulary Types
// ─────────────────────────────────────────────────────────────────────────────

export interface VocabWord {
  word: string;
  meaning: string;
}

export interface VocabTestSession {
  session_id: string;
  set_id: string; // e.g., '1', '2'
  started_at: string;
  completed_at: string;
  total_questions: number;
  correct_count: number;
  incorrect_count: number;
}

export interface VocabDexState {
  seen_words: Record<string, boolean>; // word -> true
  last_updated: string;
}
