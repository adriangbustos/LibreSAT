'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Eye, EyeOff, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Flag
} from 'lucide-react';
import { getTestSession } from '@/app/lib/storage';
import { loadQuestionsMap } from '@/app/lib/db';
import type { TestSession, Question, QuestionResult } from '@/app/types';
import { MathText } from '@/app/components/ui/MathRenderer';
import { DifficultyBadge, SectionBadge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';

export default function ReviewSessionPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [session, setSession] = useState<TestSession | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [showExplanations, setShowExplanations] = useState(true);
  const [currentModuleIdx, setCurrentModuleIdx] = useState(0);
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [blindAnswers, setBlindAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const s = getTestSession(sessionId);
    if (!s) { router.replace('/review'); return; }
    setSession(s);
    loadQuestionsMap().then(map => {
      setQuestionsMap(map);
      setIsLoading(false);
    });
  }, [sessionId, router]);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const moduleResult = session.module_results[currentModuleIdx];
  if (!moduleResult) return null;

  const results = moduleResult.results;
  const currentResult = results[currentQIdx];
  const question = currentResult ? questionsMap.get(currentResult.question_id) : null;
  const isLastQ = currentQIdx >= results.length - 1;
  const isLastModule = currentModuleIdx >= session.module_results.length - 1;

  const handleNext = () => {
    if (!isLastQ) setCurrentQIdx(i => i + 1);
    else if (!isLastModule) { setCurrentModuleIdx(m => m + 1); setCurrentQIdx(0); }
  };
  const handlePrev = () => {
    if (currentQIdx > 0) setCurrentQIdx(i => i - 1);
    else if (currentModuleIdx > 0) { setCurrentModuleIdx(m => m - 1); setCurrentQIdx(0); }
  };

  const isFirstQ = currentQIdx === 0 && currentModuleIdx === 0;

  // Blind re-attempt mode
  const blindAnswer = blindAnswers[currentResult?.question_id ?? ''];
  const handleBlindAnswer = (value: string) => {
    if (!currentResult) return;
    setBlindAnswers(prev => ({ ...prev, [currentResult.question_id]: value }));
  };

  const revealBlindResult = showExplanations || blindAnswers[currentResult?.question_id ?? ''] !== undefined;
  const userEffectiveAnswer = showExplanations
    ? currentResult?.user_answer
    : (blindAnswer ?? undefined);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Sticky Header with Toggle ─── */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="max-w-[900px] mx-auto px-4 py-2.5 flex items-center gap-3 flex-wrap">
          <Link href="/review" className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ArrowLeft size={14} /> History
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-secondary)] text-sm truncate max-w-[180px]">{session.label}</span>

          <div className="ml-auto flex items-center gap-2">
            {/* Explanation toggle */}
            <button
              onClick={() => setShowExplanations(v => !v)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${showExplanations
                  ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400'
                  : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)]'
                }`}
            >
              {showExplanations ? <Eye size={13} /> : <EyeOff size={13} />}
              {showExplanations ? 'Explanations: ON' : 'Explanations: OFF'}
            </button>

            {/* Progress */}
            <span className="text-xs text-[var(--text-muted)]">
              Mod {currentModuleIdx + 1} · Q{currentQIdx + 1}/{results.length}
            </span>
          </div>
        </div>

        {/* Module tabs */}
        {session.module_results.length > 1 && (
          <div className="border-t border-[var(--border)] px-4 py-1.5 flex gap-1 max-w-[900px] mx-auto">
            {session.module_results.map((m, i) => (
              <button
                key={m.module_num}
                onClick={() => { setCurrentModuleIdx(i); setCurrentQIdx(0); }}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${i === currentModuleIdx
                    ? 'bg-indigo-500/15 text-indigo-400'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                Module {m.module_num}
                <span className="ml-1.5 text-[var(--text-muted)]">
                  ({m.raw_correct}/{m.raw_total})
                </span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* ─── Q Navigator (sidebar-style mini list) ─── */}
      <main className={`flex-1 mx-auto w-full px-4 py-6 ${question?.section === 'Reading and Writing' ? 'max-w-[1200px]' : 'max-w-[900px]'}`}>
        {question && currentResult && (
          <div className={`animate-fadeIn ${question.section === 'Reading and Writing' ? 'flex gap-8' : ''}`}>
            <div className={question.section === 'Reading and Writing' ? 'flex-1 min-w-0 pr-4 border-r border-[var(--border)]' : ''}>
              {/* Question header */}
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-xs text-[var(--text-muted)]">Question {currentQIdx + 1} of {results.length}</span>
                <DifficultyBadge difficulty={question.difficulty} />
                <SectionBadge section={question.section} />
                <span className="text-xs text-[var(--text-muted)]">{question.domain}</span>
                <span className="text-xs text-[var(--text-muted)]">· {question.skill}</span>
                {showExplanations && (
                  <div className={`ml-auto flex items-center gap-1.5 text-xs font-semibold ${currentResult.is_correct ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                    {currentResult.is_correct
                      ? <><CheckCircle2 size={13} /> Correct</>
                      : <><XCircle size={13} /> Incorrect</>
                    }
                  </div>
                )}
              </div>

              {/* Stimulus */}
              {question.stimulus && (
                <div className="question-stimulus mb-5">
                  <MathText text={question.stimulus} />
                </div>
              )}

              {/* Visuals */}
              {question.image_url && (
                <img src={question.image_url} alt="Question Graphic" className={`w-full max-w-md max-h-64 object-contain mb-5 rounded-lg bg-white p-2 border border-[var(--border)] ${question.section !== 'Reading and Writing' ? 'mx-auto' : ''}`} />
              )}
              {question.table_data && (
                <div className="mb-5">
                  <DataTable data={question.table_data} />
                </div>
              )}
            </div>

            <div className={question.section === 'Reading and Writing' ? 'flex-1 min-w-0 pl-4' : ''}>
              {/* Question text */}
              <div className="question-text mb-6">
                <MathText text={question.question_text} />
              </div>

              {/* Options */}
              {(question.is_open_ended || !question.options) ? (
                <div className="space-y-3">
                  {showExplanations ? (
                    <div className="flex items-center gap-6 text-sm p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border)]">
                      <div>
                        <span className="text-xs text-[var(--text-muted)]">Your answer:</span>
                        <span className={`ml-2 font-mono font-bold ${currentResult.is_correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {currentResult.user_answer ?? '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-[var(--text-muted)]">Correct:</span>
                        <span className="ml-2 font-mono font-bold text-emerald-400">{question.correct_answer}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="text-sm text-[var(--text-secondary)]">Re-attempt:</label>
                      <input
                        type="text"
                        value={blindAnswer ?? ''}
                        onChange={e => handleBlindAnswer(e.target.value)}
                        placeholder="Enter your answer…"
                        className="mt-2 w-full max-w-xs px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-indigo)] transition-all"
                      />
                    </div>
                  )}
                </div>
              ) : (
                question.options && (
                  <div className="space-y-2.5">
                    {Object.entries(question.options).map(([letter, text]) => {
                      const isCorrectAnswer = question.correct_answer === letter;
                      const isOriginalChoice = currentResult.user_answer === letter;
                      const isBlindChoice = blindAnswer === letter;
                      const showResult = showExplanations;

                      let stateClass = '';
                      if (showResult) {
                        if (isCorrectAnswer) stateClass = 'correct';
                        else if (isOriginalChoice && !isCorrectAnswer) stateClass = 'incorrect';
                      } else {
                        if (isBlindChoice) stateClass = 'selected';
                      }

                      return (
                        <button
                          key={letter}
                          className={`option-btn ${stateClass}`}
                          onClick={() => !showExplanations && handleBlindAnswer(letter)}
                          disabled={showExplanations}
                        >
                          <span className={`option-letter ${stateClass}`}>{letter}</span>
                          <span className="flex-1">
                            <MathText text={text} />
                          </span>
                          {showResult && isCorrectAnswer && <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />}
                          {showResult && isOriginalChoice && !isCorrectAnswer && <XCircle size={14} className="text-rose-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )
              )}

              {/* Time spent */}
              {showExplanations && (
                <div className="mt-4 text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                  <Flag size={11} /> Time spent: {currentResult.time_spent_seconds}s
                </div>
              )}

              {/* Explanation */}
              {showExplanations && (
                <div className="mt-5 bg-[var(--bg-elevated)] rounded-xl p-5 border border-[var(--border)]">
                  <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                    Official Explanation
                  </h4>
                  <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                    <MathText text={question.explanation ? question.explanation.replace(/([.?!]["'”’\])]*)\s*(Choice [A-Z])/g, '$1\n\n$2') : ''} />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Navigation ─── */}
      <footer className="sticky bottom-0 bg-[var(--bg-surface)] border-t border-[var(--border)] px-4 py-3">
        <div className="max-w-[900px] mx-auto flex items-center justify-between">
          <Button
            variant="secondary"
            size="sm"
            disabled={isFirstQ}
            onClick={handlePrev}
          >
            <ChevronLeft size={14} /> Previous
          </Button>

          {/* Mini Q-list dots */}
          <div className="flex gap-1 overflow-x-auto max-w-[300px] pb-1">
            {results.map((r, i) => (
              <button
                key={r.question_id}
                onClick={() => setCurrentQIdx(i)}
                className={`flex-shrink-0 w-5 h-5 rounded-full text-[8px] font-bold transition-all ${i === currentQIdx
                    ? 'gradient-indigo text-white scale-110'
                    : showExplanations
                      ? r.is_correct
                        ? 'bg-emerald-500/25 text-emerald-400'
                        : 'bg-rose-500/25 text-rose-400'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <Button
            variant={isLastQ && isLastModule ? 'ghost' : 'primary'}
            size="sm"
            disabled={isLastQ && isLastModule}
            onClick={handleNext}
          >
            Next <ChevronRight size={14} />
          </Button>
        </div>
      </footer>
    </div>
  );
}
