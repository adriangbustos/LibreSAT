// ─────────────────────────────────────────────────────────────────────────────
// Database Loader & Question Utilities
// Fetches /questions_database.json and /exam_suites.json from public/
// Caches in module scope to avoid repeated fetches
// ─────────────────────────────────────────────────────────────────────────────

import type { Question, ExamSuites, StaticExam, ExamModule, CustomTestFilters } from '@/app/types';
import { generateModule } from './examGenerator';

let _questionsCache: Question[] | null = null;
let _questionsMapCache: Map<string, Question> | null = null;
let _examSuitesCache: ExamSuites | null = null;

// ─── Loaders ─────────────────────────────────────────────────────────────────

function getBase(): string {
  // Always use window.location.origin in the browser.
  // This prevents Next.js SSR/pre-render from attempting a fetch with no base.
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for any server-side path (should not normally be hit
  // since all callers are inside 'use client' useEffect hooks).
  return 'http://localhost:3000';
}

export async function loadQuestions(): Promise<Question[]> {
  if (_questionsCache) return _questionsCache;
  const res = await fetch(`${getBase()}/questions_database.json`);
  if (!res.ok) throw new Error(`Failed to load questions database (${res.status})`);
  _questionsCache = await res.json();
  return _questionsCache!;
}

export async function loadQuestionsMap(): Promise<Map<string, Question>> {
  if (_questionsMapCache) return _questionsMapCache;
  const questions = await loadQuestions();
  _questionsMapCache = new Map(questions.map(q => [q.question_id, q]));
  return _questionsMapCache;
}

export async function loadExamSuites(): Promise<ExamSuites> {
  if (_examSuitesCache) return _examSuitesCache;
  const res = await fetch(`${getBase()}/exam_suites.json`);
  if (!res.ok) throw new Error(`Failed to load exam suites (${res.status})`);
  _examSuitesCache = await res.json();
  return _examSuitesCache!;
}


export function getQuestionById(id: string, map: Map<string, Question>): Question | undefined {
  return map.get(id);
}

export function getQuestionsByIds(ids: string[], map: Map<string, Question>): Question[] {
  return ids.map(id => map.get(id)).filter(Boolean) as Question[];
}

// ─── Filtering Helpers ────────────────────────────────────────────────────────

export function filterQuestions(
  questions: Question[],
  filters: Partial<{
    section: string;
    domain: string;
    skill: string;
    difficulty: string;
    search: string;
    status_ids?: Set<string>; // for QuestionDex filtering
  }>
): Question[] {
  return questions.filter(q => {
    if (filters.section && q.section !== filters.section) return false;
    if (filters.domain && q.domain !== filters.domain) return false;
    if (filters.skill && q.skill !== filters.skill) return false;
    if (filters.difficulty && q.difficulty !== filters.difficulty) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!q.question_id.toLowerCase().includes(s) &&
          !q.question_text.toLowerCase().includes(s) &&
          !q.domain.toLowerCase().includes(s) &&
          !q.skill.toLowerCase().includes(s)) return false;
    }
    return true;
  });
}

// ─── Randomized Exam Generator ────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleModule(
  pool: Question[],
  easyCount: number,
  medCount: number,
  hardCount: number,
  excludeIds: Set<string>
): string[] {
  const available = pool.filter(q => !excludeIds.has(q.question_id));
  const easy = shuffle(available.filter(q => q.difficulty === 'Easy'));
  const med = shuffle(available.filter(q => q.difficulty === 'Medium'));
  const hard = shuffle(available.filter(q => q.difficulty === 'Hard'));

  let selected: Question[] = [];
  selected = [...easy.slice(0, easyCount), ...med.slice(0, medCount), ...hard.slice(0, hardCount)];

  // Fallback: fill from remainder if not enough
  if (selected.length < easyCount + medCount + hardCount) {
    const selectedIds = new Set(selected.map(q => q.question_id));
    const remainder = shuffle(available.filter(q => !selectedIds.has(q.question_id)));
    selected = [...selected, ...remainder.slice(0, easyCount + medCount + hardCount - selected.length)];
  }

  // Shuffle final order for realistic presentation
  return shuffle(selected).map(q => q.question_id);
}

export function generateRandomizedExam(
  questions: Question[],
  type: 'full' | 'rw' | 'math'
): StaticExam {
  const usedIds = new Set<string>();
  const modules: ExamModule[] = [];

  if (type === 'full' || type === 'rw') {
    const rwM1 = generateModule(questions, { section: 'Reading and Writing', stage: 'Module1' }, usedIds);
    rwM1.forEach(q => usedIds.add(q.question_id));
    modules.push({ module_num: 1, section: 'Reading and Writing', time_minutes: 32, question_ids: rwM1.map(q => q.question_id) });

    // Since we don't know the user's theta yet, we can't dynamically route.
    // For a static generated test, we typically generate an advanced module or a standard one.
    // Let's generate an advanced one by default for the generated test payload, or we can just call it Module 2.
    // For full simulation, maybe we should generate both and the test runner picks?
    // The current TestSession only supports a linear list of modules.
    // We'll generate a Module2_Advanced to keep the 800 ceiling available.
    const rwM2 = generateModule(questions, { section: 'Reading and Writing', stage: 'Module2_Advanced' }, usedIds);
    rwM2.forEach(q => usedIds.add(q.question_id));
    modules.push({ module_num: 2, section: 'Reading and Writing', time_minutes: 32, question_ids: rwM2.map(q => q.question_id) });
  }

  if (type === 'full' || type === 'math') {
    const mNum = type === 'full' ? 3 : 1;
    const mathM1 = generateModule(questions, { section: 'Math', stage: 'Module1' }, usedIds);
    mathM1.forEach(q => usedIds.add(q.question_id));
    modules.push({ module_num: mNum, section: 'Math', time_minutes: 35, question_ids: mathM1.map(q => q.question_id) });

    const mathM2 = generateModule(questions, { section: 'Math', stage: 'Module2_Advanced' }, usedIds);
    mathM2.forEach(q => usedIds.add(q.question_id));
    modules.push({ module_num: mNum + 1, section: 'Math', time_minutes: 35, question_ids: mathM2.map(q => q.question_id) });
  }

  const typeLabel = type === 'full' ? 'Full-Length' : type === 'rw' ? 'Reading & Writing' : 'Math';
  return {
    exam_id: `randomized_${type}_${Date.now()}`,
    label: `Randomized ${typeLabel} Exam`,
    type,
    modules,
  };
}

// ─── Custom Test Builder ──────────────────────────────────────────────────────

export function buildCustomExam(
  questions: Question[],
  filters: CustomTestFilters
): StaticExam {
  let pool = questions;

  if (filters.sections.length > 0) {
    pool = pool.filter(q => filters.sections.includes(q.section));
  }
  if (filters.domains.length > 0) {
    pool = pool.filter(q => filters.domains.includes(q.domain));
  }
  if (filters.skills.length > 0) {
    pool = pool.filter(q => filters.skills.includes(q.skill));
  }
  if (filters.difficulties.length > 0) {
    pool = pool.filter(q => filters.difficulties.includes(q.difficulty));
  }

  const sampled = shuffle(pool).slice(0, filters.question_count);

  // Determine section composition for time estimate
  const hasMath = sampled.some(q => q.section === 'Math');
  const hasRW = sampled.some(q => q.section === 'Reading and Writing');
  const timeMinutes = Math.max(10, Math.ceil(sampled.length * 1.5));

  const sectionType: 'full' | 'rw' | 'math' | 'custom' =
    hasMath && hasRW ? 'full' : hasRW ? 'rw' : hasMath ? 'math' : 'full';

  return {
    exam_id: `custom_${Date.now()}`,
    label: `Custom Practice Set (${sampled.length} questions)`,
    type: sectionType as 'full' | 'rw' | 'math',
    modules: [{
      module_num: 1,
      section: hasMath ? 'Math' : 'Reading and Writing',
      time_minutes: timeMinutes,
      question_ids: sampled.map(q => q.question_id),
    }],
  };
}

// ─── Utility: Get unique domain/skill lists ───────────────────────────────────

export function getUniqueDomains(questions: Question[]): string[] {
  return [...new Set(questions.map(q => q.domain))].sort();
}

export function getUniqueSkills(questions: Question[], domain?: string): string[] {
  const filtered = domain ? questions.filter(q => q.domain === domain) : questions;
  return [...new Set(filtered.map(q => q.skill))].sort();
}
