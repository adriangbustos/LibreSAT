'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Loader2, Clock, Target, AlertTriangle, BrainCircuit, Lightbulb, Zap, ChevronDown, ChevronRight, Trophy } from 'lucide-react';
import { getTestSession, saveTestSession, getAIConfig, type AIConfig } from '@/app/lib/storage';
import { loadQuestionsMap } from '@/app/lib/db';
import { generateAIFeedback } from '@/app/lib/ai';
import { MathText } from '@/app/components/ui/MathRenderer';
import { Button } from '@/app/components/ui/Button';
import type { TestSession, Question } from '@/app/types';

// JSON Types
interface AIAnalysis {
  time_management: {
    summary: string;
    key_takeaways: string[];
  };
  topics_to_practice: {
    topic: string;
    reason: string;
    priority: "High" | "Medium" | "Low";
  }[];
  incorrect_answers: {
    question_id: string;
    inferred_thought_process: string;
    why_wrong: string;
    why_correct_is_right: string;
  }[];
  overall_advice: {
    current_level: string;
    advice: string;
  };
}

function formatSeconds(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function parseAIResponse(raw: string): AIAnalysis | null {
  try {
    const cleanRaw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanRaw) as AIAnalysis;
  } catch (e) {
    console.error("Failed to parse AI JSON:", e);
    return null;
  }
}

function CollapsibleQuestion({ item, questionInfo }: { item: any, questionInfo: any }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-black/5 transition-colors text-left"
      >
        <span className="text-[var(--text-muted)] flex-shrink-0">
          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        <span className="font-semibold text-[var(--text-primary)] text-sm flex-1 whitespace-nowrap overflow-hidden text-ellipsis">
          Question ID: {item.question_id}
        </span>
        
        {/* Metadata Badges */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
           <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-600 border border-slate-500/20 whitespace-nowrap hidden sm:inline-flex">
             Module {questionInfo.module_num}
           </span>
           <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 whitespace-nowrap">
             {questionInfo.domain}
           </span>
           <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 whitespace-nowrap flex items-center gap-1">
             <Clock size={10} /> {questionInfo.time_spent}s
           </span>
        </div>
      </button>

      {isOpen && (
        <div className="p-5 border-t border-[var(--border)] animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1 block">Your Thought Process</span>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed"><MathText text={item.inferred_thought_process} /></p>
              </div>
              <div className="bg-rose-500/5 p-3 rounded-lg border border-rose-500/10">
                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider mb-1 block">Why it's wrong</span>
                <p className="text-sm text-rose-800/80 leading-relaxed"><MathText text={item.why_wrong} /></p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10 h-full">
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Lightbulb size={12} /> The Correct Approach
                </span>
                <p className="text-sm text-emerald-800/80 leading-relaxed"><MathText text={item.why_correct_is_right} /></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedbackPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  
  const [session, setSession] = useState<TestSession | null>(null);
  const [aiConfig, setAiConfig] = useState<AIConfig | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question>>(new Map());
  
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiError, setAiError] = useState<string>('');

  useEffect(() => {
    const s = getTestSession(sessionId);
    if (!s) { router.replace('/'); return; }
    setSession(s);
    setAiConfig(getAIConfig());
    loadQuestionsMap().then(map => setQuestionsMap(map));
  }, [sessionId, router]);

  const handleGenerateAiFeedback = async () => {
    if (!aiConfig || !session) return;
    setIsGeneratingAi(true);
    setAiError('');

    try {
      let prompt = `Analyze my SAT practice exam performance.\n`;
      prompt += `Total Score: ${session.total_score}\n`;
      if (session.math_score != null) prompt += `Math Score: ${session.math_score}\n`;
      if (session.rw_score != null) prompt += `Reading & Writing Score: ${session.rw_score}\n\n`;

      session.module_results.forEach(m => {
        prompt += `Module: ${m.section}\n`;
        prompt += `Score: ${m.scaled_score}\n`;
        prompt += `Accuracy: ${m.raw_correct} / ${m.raw_total}\n`;
        prompt += `Time taken: ${formatSeconds(m.results.reduce((acc, r) => acc + r.time_spent_seconds, 0))}\n\n`;
        
        const incorrect = m.results.filter(r => !r.is_correct);
        if (incorrect.length > 0) {
          prompt += `Incorrect answers:\n`;
          incorrect.forEach(r => {
            const q = questionsMap.get(r.question_id);
            if (!q) return;
            prompt += `- Question ID: ${q.question_id}, Domain: ${q.domain}, Skill: ${q.skill}\n`;
            prompt += `  Question text: ${q.stimulus} ${q.question_text || ''}\n`;
            prompt += `  My answer: ${r.user_answer} (Correct: ${r.correct_answer})\n`;
            if (q.explanation) prompt += `  Explanation: ${q.explanation}\n`;
            prompt += `\n`;
          });
        }
      });

      prompt += `Based on this data, please analyze the student's performance and output ONLY a valid JSON object strictly matching this schema:
{
  "time_management": {
    "summary": "Overall evaluation of pacing",
    "key_takeaways": ["Takeaway 1", "Takeaway 2"]
  },
  "topics_to_practice": [
    { "topic": "string", "reason": "string", "priority": "High" | "Medium" | "Low" }
  ],
  "incorrect_answers": [
    { "question_id": "string", "inferred_thought_process": "string", "why_wrong": "string", "why_correct_is_right": "string" }
  ],
  "overall_advice": {
    "current_level": "Thoughts on the student's current proficiency level",
    "advice": "A short, encouraging paragraph summarizing how to improve."
  }
}

CRITICAL: Do not include any conversational text, greetings, or markdown code blocks (like \`\`\`json) outside the JSON. Output the raw JSON object and nothing else. You may use markdown bolding (**) or LaTeX math formatting within the JSON strings where appropriate.`;

      const response = await generateAIFeedback(aiConfig, prompt);
      
      const updatedSession = { ...session, ai_feedback: response };
      setSession(updatedSession);
      saveTestSession(updatedSession);

    } catch (e: any) {
      setAiError(e.message || 'Failed to generate feedback.');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const strongAreas = useMemo(() => {
    if (!session || questionsMap.size === 0) return [];
    const stats: Record<string, { correct: number, total: number }> = {};
    
    session.module_results.forEach(m => {
      m.results.forEach(r => {
        const q = questionsMap.get(r.question_id);
        if (q) {
          if (!stats[q.domain]) stats[q.domain] = { correct: 0, total: 0 };
          stats[q.domain].total += 1;
          if (r.is_correct) stats[q.domain].correct += 1;
        }
      });
    });

    return Object.entries(stats)
      .filter(([_, data]) => data.correct > 0)
      .sort((a, b) => {
        const accA = a[1].correct / a[1].total;
        const accB = b[1].correct / b[1].total;
        if (accA === accB) return b[1].correct - a[1].correct; 
        return accB - accA;
      })
      .slice(0, 3);
  }, [session, questionsMap]);

  if (!session) return null;

  const analysis = session.ai_feedback ? parseAIResponse(session.ai_feedback) : null;
  const isParsingError = session.ai_feedback && !analysis;

  // Process and group incorrect answers
  let groupedIncorrect: Record<string, any[]> = {};
  if (analysis && questionsMap.size > 0) {
    const enriched = analysis.incorrect_answers.map(item => {
      const q = questionsMap.get(item.question_id);
      let module_num = 1;
      let time_spent = 0;
      
      session.module_results.forEach(m => {
        const res = m.results.find(r => r.question_id === item.question_id);
        if (res) {
          module_num = m.module_num;
          time_spent = res.time_spent_seconds;
        }
      });
    
      return {
        item,
        info: {
          section: q?.section || 'Unknown',
          domain: q?.domain || 'Unknown',
          module_num,
          time_spent
        }
      };
    });

    if (session.exam_type === 'full') {
      groupedIncorrect['Reading & Writing'] = enriched.filter(e => e.info.section === 'Reading and Writing');
      groupedIncorrect['Math'] = enriched.filter(e => e.info.section === 'Math');
    } else {
      groupedIncorrect['Incorrect Questions'] = enriched;
    }
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1000px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/review" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={14} /> Test History
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-medium">AI Diagnostic</span>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">AI Diagnostic Analysis</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {session.label} • {new Date(session.completed_at).toLocaleDateString()}
            </p>
          </div>
          {session.ai_feedback && (
            <Button variant="secondary" size="sm" onClick={handleGenerateAiFeedback} disabled={isGeneratingAi}>
              Regenerate
            </Button>
          )}
        </div>

        <div className="min-h-[50vh]">
          {!aiConfig ? (
            <div className="glass-card p-6 text-center py-12">
              <p className="text-[var(--text-secondary)] mb-4">Please configure an AI provider in the dashboard settings first.</p>
              <Link href="/">
                <Button variant="primary">Go to Dashboard</Button>
              </Link>
            </div>
          ) : isGeneratingAi ? (
            <div className="glass-card p-6 py-20 flex flex-col items-center justify-center text-[var(--text-muted)] space-y-4">
              <Loader2 size={40} className="animate-spin text-[var(--accent-indigo)]" />
              <p className="text-sm">Analyzing your performance... this may take a moment.</p>
            </div>
          ) : aiError || isParsingError ? (
            <div className="glass-card p-6 border-rose-500/20 text-rose-500 text-sm">
              <p className="font-bold mb-2">Error Generating Analysis:</p>
              {aiError || "The AI generated an improperly formatted response."}
              <div className="mt-4">
                <Button variant="primary" size="sm" onClick={handleGenerateAiFeedback}>Try Again</Button>
              </div>
            </div>
          ) : !analysis ? (
            <div className="glass-card p-6 py-20 text-center">
              <Sparkles size={48} className="text-[var(--accent-indigo)] mx-auto mb-6 opacity-80" />
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Generate AI Diagnostic</h2>
              <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto text-sm">
                Get personalized, highly structured feedback on your performance, timing, and incorrect answers.
              </p>
              <Button variant="primary" onClick={handleGenerateAiFeedback}>
                Generate Analysis
              </Button>
            </div>
          ) : (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Overall Advice Card */}
              <div className="glass-card p-6 border-l-4 border-l-[var(--accent-indigo)]">
                <div className="flex items-center gap-2 mb-4">
                  <BrainCircuit className="text-[var(--accent-indigo)]" size={24} />
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Overall Assessment</h2>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Current Level</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed"><MathText text={analysis.overall_advice.current_level} /></p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">Actionable Advice</h3>
                    <p className="text-sm text-[var(--text-secondary)] leading-relaxed"><MathText text={analysis.overall_advice.advice} /></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="flex flex-col space-y-6">
                  {/* Time Management */}
                  <div className="glass-card p-6 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="text-amber-500" size={20} />
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">Time Management</h2>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-4"><MathText text={analysis.time_management.summary} /></p>
                    <ul className="space-y-2">
                      {analysis.time_management.key_takeaways.map((takeaway, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                          <Zap size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
                          <span><MathText text={takeaway} /></span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Strong Areas */}
                  <div className="glass-card p-6 flex-1">
                    <div className="flex items-center gap-2 mb-4">
                      <Trophy className="text-[var(--accent-indigo)]" size={20} />
                      <h2 className="text-lg font-bold text-[var(--text-primary)]">Strong Areas</h2>
                    </div>
                    {strongAreas.length > 0 ? (
                      <div className="grid grid-cols-2 gap-3">
                        {strongAreas.map(([domain, stats], i) => (
                          <div key={i} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-4 flex flex-col items-center justify-center text-center">
                            <h3 className="font-semibold text-sm text-[var(--text-primary)] mb-2"><MathText text={domain} /></h3>
                            <div className="text-2xl font-bold text-emerald-600">
                              {stats.correct}<span className="text-sm text-emerald-600/50">/{stats.total}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-24 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-muted)] text-center px-4">
                        Answer more questions correctly to see your strongest domains here!
                      </div>
                    )}
                  </div>
                </div>

                {/* Topics to Practice */}
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="text-emerald-500" size={20} />
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Focus Areas</h2>
                  </div>
                  <div className="space-y-3">
                    {analysis.topics_to_practice.map((topic, i) => (
                      <div key={i} className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg p-3">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <h3 className="font-semibold text-sm text-[var(--text-primary)] leading-snug"><MathText text={topic.topic} /></h3>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap ${
                            topic.priority === 'High' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' : 
                            topic.priority === 'Medium' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 
                            'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}>
                            {topic.priority} Priority
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]"><MathText text={topic.reason} /></p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Incorrect Answers */}
              {analysis.incorrect_answers.length > 0 && (
                <div className="glass-card p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <AlertTriangle className="text-rose-500" size={20} />
                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Incorrect Answers Deep Dive</h2>
                  </div>
                  
                  <div className="space-y-8">
                    {Object.entries(groupedIncorrect).map(([title, items]) => {
                      if (items.length === 0) return null;
                      return (
                        <div key={title}>
                          <h3 className="text-md font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border)] pb-2">{title}</h3>
                          <div className="space-y-3">
                            {items.map((d, i) => (
                              <CollapsibleQuestion key={i} item={d.item} questionInfo={d.info} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
