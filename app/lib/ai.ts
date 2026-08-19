import type { AIConfig } from './storage';
import type { Question } from '@/app/types';
import { getRAGContext } from './rag';

export async function generateAIFeedback(config: AIConfig, prompt: string): Promise<string> {
  const { provider, apiKey } = config;

  if (!apiKey) {
    throw new Error('API key is missing.');
  }

  try {
    if (provider === 'gemini') {
      return await callGemini(apiKey, prompt);
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

async function callGemini(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
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

  // 3. Call AI
  const responseText = await generateAIFeedback(config, finalPrompt);
  
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
    
    return question as Question;
  } catch (err) {
    console.error('Failed to parse AI output', cleaned);
    throw new Error('AI returned malformed JSON.');
  }
}
