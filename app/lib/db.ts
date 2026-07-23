// ─────────────────────────────────────────────────────────────────────────────
// Database Loader & Question Utilities
// Fetches /questions_database.json and /exam_suites.json from public/
// Caches in module scope to avoid repeated fetches
// ─────────────────────────────────────────────────────────────────────────────

import type { Question, ExamSuites, StaticExam, ExamModule, CustomTestFilters } from '@/app/types';

let _questionsCache: Question[] | null = null;
let _questionsMapCache: Map<string, Question> | null = null;
let _examSuitesCache: ExamSuites | null = null;

// ─── Loaders ─────────────────────────────────────────────────────────────────

export async function loadQuestions(): Promise<Question[]> {
  if (_questionsCache) return _questionsCache;
  const res = await fetch('/questions_database.json');
  if (!res.ok) throw new Error('Failed to load questions database');
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
  const res = await fetch('/exam_suites.json');
  if (!res.ok) throw new Error('Failed to load exam suites');
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
  const rw = questions.filter(q => q.section === 'Reading and Writing');
  const math = questions.filter(q => q.section === 'Math');

  const usedIds = new Set<string>();

  const modules: ExamModule[] = [];

  if (type === 'full' || type === 'rw') {
    // R&W Module 1: 30% Easy, 50% Med, 20% Hard  → 8, 14, 5 of 27
    const rwM1 = sampleModule(rw, 8, 14, 5, usedIds);
    rwM1.forEach(id => usedIds.add(id));
    modules.push({ module_num: 1, section: 'Reading and Writing', time_minutes: 32, question_ids: rwM1 });

    // R&W Module 2: 10% Easy, 30% Med, 60% Hard → 3, 8, 16 of 27
    const rwM2 = sampleModule(rw, 3, 8, 16, usedIds);
    rwM2.forEach(id => usedIds.add(id));
    modules.push({ module_num: 2, section: 'Reading and Writing', time_minutes: 32, question_ids: rwM2 });
  }

  if (type === 'full' || type === 'math') {
    const mNum = type === 'full' ? 3 : 1;
    // Math Module 1: 30% Easy, 50% Med, 20% Hard → 7, 11, 4 of 22
    const mathM1 = sampleModule(math, 7, 11, 4, usedIds);
    mathM1.forEach(id => usedIds.add(id));
    modules.push({ module_num: mNum, section: 'Math', time_minutes: 35, question_ids: mathM1 });

    // Math Module 2: 10% Easy, 30% Med, 60% Hard → 2, 7, 13 of 22
    const mathM2 = sampleModule(math, 2, 7, 13, usedIds);
    mathM2.forEach(id => usedIds.add(id));
    modules.push({ module_num: mNum + 1, section: 'Math', time_minutes: 35, question_ids: mathM2 });
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
