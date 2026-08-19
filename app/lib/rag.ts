import type { Question } from '@/app/types';

export interface RAGContext {
  systemPrompt: string;
  examples: Question[];
  theory: string | null;
}

// Maps skills to specific keys in grammar_rules.json
const SKILL_TO_GRAMMAR_KEY: Record<string, string> = {
  'Boundaries': 'punctuation_equations_and_boundaries',
  'Form, Structure, and Sense': 'verbs_and_agreement', 
  // Add more mappings if needed
};

/**
 * Retrieves the RAG context (theory rules + few-shot examples) for a given domain and skill.
 */
export async function getRAGContext(
  domain: string,
  skill: string,
  allQuestions: Question[]
): Promise<RAGContext> {
  let theory: string | null = null;

  // 1. Retrieve Theory (Only for Standard English Conventions currently)
  if (domain === 'Standard English Conventions') {
    try {
      const res = await fetch('/data/grammar_rules.json');
      if (res.ok) {
        const rules = await res.json();
        const ruleKey = SKILL_TO_GRAMMAR_KEY[skill] || 'clauses_and_sentence_structure';
        const specificRules = rules[ruleKey];
        if (specificRules) {
          theory = JSON.stringify(specificRules, null, 2);
        } else {
          // fallback to all rules if specific mapping not found
          theory = JSON.stringify(rules, null, 2);
        }
      }
    } catch (e) {
      console.warn('Failed to load grammar_rules.json', e);
    }
  }

  // 2. Retrieve Few-Shot Examples from the Question Bank
  // Filter for exact domain and skill, then pick 3 random high-quality examples
  const matchingQuestions = allQuestions.filter(
    (q) => q.domain === domain && q.skill === skill && !q.is_open_ended
  );

  // Shuffle and pick up to 3
  const shuffled = [...matchingQuestions].sort(() => 0.5 - Math.random());
  const examples = shuffled.slice(0, 3);

  // 3. Construct System Prompt Context
  const systemPrompt = `You are an expert SAT curriculum designer and test-prep tutor.
Your task is to generate a new, highly accurate SAT question for the domain "${domain}" and skill "${skill}".

CRITICAL INSTRUCTIONS (FAILURE TO FOLLOW THESE WILL BREAK THE SYSTEM):
1. NO GRAPHS OR IMAGES: Do not generate any questions requiring a visual graph or image. If data is needed, represent it strictly as a Markdown table (e.g., | Col | Col |).
2. FIELD USAGE:
   - \`stimulus\`: Must contain the actual reading passage, scenario, or math problem context.
   - \`question_text\`: Must contain the exact question prompt (e.g., "Which choice completes the text so that it conforms to the conventions of Standard English?" or "What is the value of x?").
3. ANTI-REPETITION BLANK LOGIC: If the stimulus contains a fill-in-the-blank represented by 6 underscores (______), the options MUST represent the exact substitution for that blank. DO NOT duplicate the word immediately preceding the blank in your options. (e.g. If stimulus ends in "the universe ______", Option A should be "has expanded", NOT "universe has expanded").
4. MATH & FORMATTING COMPLIANCE:
   - For blanks, use exactly 6 underscores: \`______\`. Do not use LaTeX \`\\rule{}\`.
   - Wrap all math variables, expressions, and equations in LaTeX delimiters: \`$x = 5$\` for inline math, and \`$$x = 5$$\` for block math.
5. STRICT OUTPUT FORMAT: Your final output MUST be a valid JSON object matching this exact TypeScript interface:
{
  "question_id": "random_unique_id",
  "section": "Reading and Writing" | "Math",
  "domain": "${domain}",
  "skill": "${skill}",
  "difficulty": "Easy" | "Medium" | "Hard",
  "is_open_ended": false,
  "stimulus": "string",
  "question_text": "string",
  "options": { "A": "string", "B": "string", "C": "string", "D": "string" },
  "correct_answer": "A" | "B" | "C" | "D",
  "explanation": "string (Step by step explanation of why the answer is correct)"
}

Do not wrap the JSON in markdown code blocks. Output raw JSON only.
`;

  return {
    systemPrompt,
    examples,
    theory
  };
}
