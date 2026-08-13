import type { Question } from '@/app/types';

export interface ExamGenerationConfig {
  section: 'Reading and Writing' | 'Math';
  stage: 'Module1' | 'Module2_Standard' | 'Module2_Advanced';
}

const RW_MODULE1_DISTRIBUTION = {
  'Craft and Structure': 8,
  'Information and Ideas': 7,
  'Standard English Conventions': 5,
  'Expression of Ideas': 7,
};

const RW_MODULE2_DISTRIBUTION = {
  'Craft and Structure': 6,
  'Information and Ideas': 8,
  'Standard English Conventions': 7,
  'Expression of Ideas': 6,
};

const MATH_MODULE1_ORDER = [
  'Advanced Math',
  'Algebra',
  'Advanced Math',
  'Advanced Math',
  'Problem-Solving and Data Analysis',
  'Algebra',
  'Problem-Solving and Data Analysis',
  'Algebra',
  'Problem-Solving and Data Analysis',
  'Geometry and Trigonometry',
  'Algebra',
  'Geometry and Trigonometry',
  'Algebra',
  'Algebra',
  'Advanced Math',
  'Advanced Math',
  'Algebra',
  'Advanced Math',
  'Problem-Solving and Data Analysis',
  'Advanced Math',
  'Geometry and Trigonometry',
  'Advanced Math',
];

const MATH_MODULE1_DISTRIBUTION = {
  'Algebra': 7,
  'Advanced Math': 8,
  'Problem-Solving and Data Analysis': 4,
  'Geometry and Trigonometry': 3,
};

const MATH_MODULE2_ORDER = [
  'Problem-Solving and Data Analysis',
  'Geometry and Trigonometry',
  'Advanced Math',
  'Algebra',
  'Advanced Math',
  'Algebra',
  'Advanced Math',
  'Geometry and Trigonometry',
  'Geometry and Trigonometry',
  'Algebra',
  'Geometry and Trigonometry',
  'Problem-Solving and Data Analysis',
  'Problem-Solving and Data Analysis',
  'Algebra',
  'Algebra',
  'Algebra',
  'Advanced Math',
  'Algebra',
  'Advanced Math',
  'Advanced Math',
  'Problem-Solving and Data Analysis',
  'Algebra',
];

const MATH_MODULE2_DISTRIBUTION = {
  'Algebra': 8,
  'Advanced Math': 6,
  'Problem-Solving and Data Analysis': 4,
  'Geometry and Trigonometry': 4,
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
  const distribution = config.section === 'Reading and Writing' 
    ? (config.stage === 'Module1' ? RW_MODULE1_DISTRIBUTION : RW_MODULE2_DISTRIBUTION) 
    : (config.stage === 'Module1' ? MATH_MODULE1_DISTRIBUTION : MATH_MODULE2_DISTRIBUTION);
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

  let finalModule: Question[] = [];

  if (config.section === 'Math') {
    // Exact domain ordering for Math Modules
    const domainsBuckets: Record<string, Question[]> = {};
    for (const q of moduleQuestions) {
      if (!domainsBuckets[q.domain]) domainsBuckets[q.domain] = [];
      domainsBuckets[q.domain].push(q);
    }
    
    // Sort each bucket by difficulty
    for (const domain in domainsBuckets) {
      domainsBuckets[domain].sort((a, b) => {
        const bA = a.irt_parameters?.b ?? 0;
        const bB = b.irt_parameters?.b ?? 0;
        return bA - bB;
      });
    }

    const order = config.stage === 'Module1' ? MATH_MODULE1_ORDER : MATH_MODULE2_ORDER;
    for (const domain of order) {
      const q = domainsBuckets[domain]?.shift();
      if (q) finalModule.push(q);
    }
  } else {
    // For Reading and Writing, the domain order must be strictly preserved.
    finalModule = moduleQuestions;
  }

  // Mark 2 random questions as experimental
  const experimentalIndices = new Set<number>();
  while (experimentalIndices.size < 2 && finalModule.length > 0) {
    experimentalIndices.add(Math.floor(Math.random() * finalModule.length));
  }

  finalModule.forEach((q, index) => {
    q.is_experimental = experimentalIndices.has(index);
  });

  return finalModule;
}
