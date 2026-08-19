import type { AIConfig } from './storage';
import type { Question } from '@/app/types';
import { getRAGContext, getRAGContextBatch, type Target } from './rag';

/**
 * Post-processor to fix a common LLM mistake where the word immediately 
 * preceding the blank is also included in the options (e.g. testing punctuation).
 */
function cleanRepetitiveBlanks(q: Question) {
  if (!q.stimulus || !q.options || q.is_open_ended) return;
  const blankIndex = q.stimulus.indexOf('______');
  if (blankIndex === -1) return;

  const textBeforeBlank = q.stimulus.substring(0, blankIndex).trimEnd();
  const match = textBeforeBlank.match(/([a-zA-Z]+)$/);
  if (!match) return;
  
  const prevWord = match[1].toLowerCase();
  const options = Object.values(q.options);
  if (options.length === 0) return;

  const getFirstWord = (str: string) => {
    const m = str.match(/^[^\w]*([a-zA-Z]+)/);
    return m ? m[1].toLowerCase() : '';
  };

  const isRepetitive = options.every(opt => {
    const optWord = getFirstWord(opt);
    if (!optWord) return false;
    return optWord.startsWith(prevWord) || prevWord.startsWith(optWord);
  });

  if (isRepetitive) {
    const regex = new RegExp(match[1] + '\\s*$');
    const newTextBefore = textBeforeBlank.replace(regex, '');
    const textAfter = q.stimulus.substring(blankIndex + 6);
    q.stimulus = newTextBefore + '______' + textAfter;
  }
}

export async function generateAIFeedback(config: AIConfig, prompt: string, modelId?: string): Promise<string> {
  const { provider, apiKey } = config;

  if (!apiKey) {
    throw new Error('API key is missing.');
  }

  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, prompt, modelId || 'gemini-3.7-flash');
    } else if (provider === 'openai') {
      return await callOpenAI(apiKey, prompt);
    } else if (provider === 'anthropic') {
      return await callAnthropic(apiKey, prompt);
    }
    throw new Error('Invalid provider');
  } catch (error: any) {
    console.error('AI Error:', error);
    throw new Error(error.message || 'Failed to generate AI feedback.');
  }
}

async function callGemini(apiKey: string, prompt: string, modelId: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
}

async function callOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response generated.';
}

async function callAnthropic(apiKey: string, prompt: string): Promise<string> {
  // Note: Anthropic API typically blocks direct browser requests due to CORS.
  // This might require a proxy in a real production environment.
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || 'No response generated.';
}

export async function generateAIExamQuestion(
  config: AIConfig,
  domain: string,
  skill: string,
  allQuestions: Question[]
): Promise<Question> {
  // 1. Get Context from RAG
  const context = await getRAGContext(domain, skill, allQuestions);
  
  // 2. Build the final prompt combining Context, Examples, and Theory
  let finalPrompt = context.systemPrompt;
  
  if (context.theory) {
    finalPrompt += `\n\n=== THEORY RULES ===\n${context.theory}\n`;
  }
  
  if (context.examples && context.examples.length > 0) {
    finalPrompt += `\n\n=== EXAMPLES (FEW-SHOT) ===\n`;
    context.examples.forEach((ex, i) => {
      finalPrompt += `\nExample ${i + 1}:\n${JSON.stringify(ex, null, 2)}\n`;
    });
  }
  
  finalPrompt += `\n\nNow, generate 1 new question for Domain: "${domain}", Skill: "${skill}". Output raw JSON only.`;

  // 3. Call AI using 3.5 Flash Lite to save quota
  const responseText = await generateAIFeedback(config, finalPrompt, 'gemini-3.5-flash-lite');
  
  // 4. Clean and parse JSON
  let cleaned = responseText.trim();
  if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.replace(/^\`\`\`json\n/, '');
  if (cleaned.startsWith('\`\`\`')) cleaned = cleaned.replace(/^\`\`\`\n/, '');
  if (cleaned.endsWith('\`\`\`')) cleaned = cleaned.replace(/\n\`\`\`$/, '');
  
  try {
    const question = JSON.parse(cleaned);
    
    // Fallback error handling if AI returned error keys
    if (question.error) {
       throw new Error(question.error);
    }
    
    cleanRepetitiveBlanks(question);
    
    return question as Question;
  } catch (err) {
    console.error('Failed to parse AI output', cleaned);
    throw new Error('AI returned malformed JSON.');
  }
}

export async function generateAIExamQuestionsBatch(
  config: AIConfig,
  targets: Target[],
  allQuestions: Question[]
): Promise<Question[]> {
  // 1. Get Context from RAG
  const context = await getRAGContextBatch(targets, allQuestions);
  
  // 2. Build the final prompt combining Context, Examples, and Theory
  let finalPrompt = context.systemPrompt;
  
  if (context.theory) {
    finalPrompt += `\n\n=== THEORY RULES ===\n${context.theory}\n`;
  }
  
  if (context.examples && context.examples.length > 0) {
    finalPrompt += `\n\n=== EXAMPLES (FEW-SHOT) ===\n`;
    context.examples.forEach((ex, i) => {
      finalPrompt += `\nExample ${i + 1}:\n${JSON.stringify(ex, null, 2)}\n`;
    });
  }
  
  finalPrompt += `\n\n=== TARGETED QUESTIONS ===\nGenerate an array of exactly ${targets.length} questions. Match the exact Domain, Skill, and Difficulty requested below in order:\n`;
  targets.forEach((t, i) => {
    finalPrompt += `${i + 1}. Domain: "${t.domain}", Skill: "${t.skill}", Target Difficulty: "${(t as any).difficulty || 'Medium'}"\n`;
  });
  finalPrompt += `\nOutput raw JSON ONLY as a valid array.`;

  // 3. Call AI using 3.5 Flash Lite to save quota
  const responseText = await generateAIFeedback(config, finalPrompt, 'gemini-3.5-flash-lite');
  
  // 4. Clean and parse JSON
  let cleaned = responseText.trim();
  if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.replace(/^\`\`\`json\n/, '');
  if (cleaned.startsWith('\`\`\`')) cleaned = cleaned.replace(/^\`\`\`\n/, '');
  if (cleaned.endsWith('\`\`\`')) cleaned = cleaned.replace(/\n\`\`\`$/, '');
  
  try {
    const questions = JSON.parse(cleaned);
    
    if (!Array.isArray(questions)) {
       throw new Error("AI did not return an array.");
    }
    
    questions.forEach(q => cleanRepetitiveBlanks(q));
    
    return questions as Question[];
  } catch (err) {
    console.error('Failed to parse AI batch output', cleaned);
    throw new Error('AI returned malformed JSON array.');
  }
}

export async function generateAIExamQuestionsInChunks(
  config: AIConfig,
  targets: Target[],
  allQuestions: Question[],
  chunkSize = 12,
  onProgress?: (current: number, total: number) => void
): Promise<Question[]> {
  const results: Question[] = [];
  for (let i = 0; i < targets.length; i += chunkSize) {
    const chunk = targets.slice(i, i + chunkSize);
    const chunkQuestions = await generateAIExamQuestionsBatch(config, chunk, allQuestions);
    results.push(...chunkQuestions);
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, targets.length), targets.length);
    }
  }
  return results;
}
