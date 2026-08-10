import type { Question } from '@/app/types';

export interface ExamGenerationConfig {
  section: 'Reading and Writing' | 'Math';
  stage: 'Module1' | 'Module2_Standard' | 'Module2_Advanced';
}

const RW_DISTRIBUTION = {
  'Craft and Structure': 7,
  'Information and Ideas': 7,
  'Standard English Conventions': 7,
  'Expression of Ideas': 6,
};

const MATH_DISTRIBUTION = {
  'Algebra': 8,
  'Advanced Math': 8,
  'Problem-Solving and Data Analysis': 3,
  'Geometry and Trigonometry': 3,
};

function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function generateModule(
  allQuestions: Question[],
  config: ExamGenerationConfig,
  usedQuestionIds: Set<string> = new Set(),
  seenQuestionIds: Set<string> = new Set()
): Question[] {
  const distribution = config.section === 'Reading and Writing' ? RW_DISTRIBUTION : MATH_DISTRIBUTION;
  const moduleQuestions: Question[] = [];

  for (const [domain, count] of Object.entries(distribution)) {
    // Filter by section, domain, and stage eligibility
    let pool = allQuestions.filter(q => 
      q.section === config.section &&
      q.domain === domain &&
      !usedQuestionIds.has(q.question_id) &&
      (q.stage_eligibility ? q.stage_eligibility.includes(config.stage) : true)
    );

    // Shuffle pool to ensure randomness
    pool = shuffleArray(pool);

    // Separate unseen and seen questions
    const unseenPool = pool.filter(q => !seenQuestionIds.has(q.question_id));
    const seenPool = pool.filter(q => seenQuestionIds.has(q.question_id));

    // Prefer unseen questions
    const selected = [...unseenPool, ...seenPool].slice(0, count);

    // Select the required number of questions
    if (selected.length < count) {
      console.warn(`Not enough questions for ${domain} in ${config.stage}. Needed ${count}, found ${selected.length}.`);
    }
    
    moduleQuestions.push(...selected);
  }

  // Shuffle final module so domains are mixed
  const finalModule = shuffleArray(moduleQuestions);

  // Mark 2 random questions as experimental
  let experimentalCount = 0;
  for (const q of finalModule) {
    if (experimentalCount < 2) {
      q.is_experimental = true;
      experimentalCount++;
    } else {
      q.is_experimental = false;
    }
  }

  // Final module ordering (e.g., sort by difficulty loosely if we wanted to, but random is fine for SAT M1)
  // Bluebook usually loosely orders Math by difficulty.
  if (config.section === 'Math') {
    finalModule.sort((a, b) => {
      const bA = a.irt_parameters?.b ?? 0;
      const bB = b.irt_parameters?.b ?? 0;
      return bA - bB;
    });
  }

  return finalModule;
}
