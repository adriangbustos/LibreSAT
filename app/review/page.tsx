'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trophy, Clock, Calendar, ChevronRight, Trash2, RefreshCw } from 'lucide-react';
import { getTestSessions, deleteTestSession, saveTestSession } from '@/app/lib/storage';
import { scaleSingleSectionRW, scaleSingleSectionMath, scaleRWScore, scaleMathScore, calculateTotalScore, checkAnswer, calculateThetaMLE, scaleThetaToSAT, type IRTResponse } from '@/app/lib/scoring';
import type { TestSession } from '@/app/types';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';

const TYPE_LABELS: Record<string, string> = {
  full: 'Full-Length SAT',
  rw: 'R&W Diagnostic',
  math: 'Math Diagnostic',
  custom: 'Custom Set',
};

export default function ReviewPage() {
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(getTestSessions().filter(s => s.status === 'completed'));
  }, []);

  const handleDelete = (sessionId: string) => {
    setDeleteSessionId(sessionId);
  };

  const confirmDelete = () => {
    if (!deleteSessionId) return;
    deleteTestSession(deleteSessionId);
    setSessions(prev => prev.filter(s => s.session_id !== deleteSessionId));
    setDeleteSessionId(null);
  };

  const handleRecalculate = () => {
    setIsRecalculateModalOpen(true);
  };

  const confirmRecalculate = () => {
    setIsRecalculateModalOpen(false);
    const allSessions = getTestSessions();
    const updatedSessions = allSessions.map(session => {
      if (session.status !== 'completed') return session;

      const updatedModules = session.module_results.map(m => {
        let newRawCorrect = 0;
        const newResults = m.results.map(r => {
           const isCorrect = r.user_answer !== null && checkAnswer(r.user_answer, r.correct_answer);
           if (isCorrect) newRawCorrect++;
           return { ...r, is_correct: isCorrect };
        });

        let scaledScore = 200;
        if (m.section === 'Reading and Writing') {
          scaledScore = scaleSingleSectionRW(newRawCorrect, m.raw_total);
        } else {
          scaledScore = scaleSingleSectionMath(newRawCorrect, m.raw_total);
        }
        return { ...m, results: newResults, raw_correct: newRawCorrect, scaled_score: scaledScore };
      });

      const rwResults = updatedModules.filter(m => m.section === 'Reading and Writing');
      const mathResults = updatedModules.filter(m => m.section === 'Math');

      const rwRawCorrect = rwResults.reduce((s, m) => s + m.raw_correct, 0);
      const rwRawTotal = rwResults.reduce((s, m) => s + m.raw_total, 0);
      const mathRawCorrect = mathResults.reduce((s, m) => s + m.raw_correct, 0);
      const mathRawTotal = mathResults.reduce((s, m) => s + m.raw_total, 0);

      const calculateIRT = (results: typeof rwResults, fallbackScorer: (r: number) => number) => {
        const responses: IRTResponse[] = [];
        let rawCorrect = 0;
        let rawTotal = 0;
        let hasMissingIRT = false;
        
        results.forEach(m => {
          m.results.forEach(r => {
            rawTotal++;
            if (r.is_correct) rawCorrect++;
            if (r.irt_parameters) {
              responses.push({ ...r.irt_parameters, isCorrect: r.is_correct });
            } else {
              hasMissingIRT = true;
            }
          });
        });
        
        if (rawTotal === 0) return 0;
        if (!hasMissingIRT && responses.length === rawTotal) {
          return scaleThetaToSAT(calculateThetaMLE(responses));
        }
        return fallbackScorer(rawCorrect);
      };

      const rwScore = calculateIRT(rwResults, scaleRWScore);
      const mathScore = calculateIRT(mathResults, scaleMathScore);
      const totalScore = rwRawTotal > 0 && mathRawTotal > 0
        ? calculateTotalScore(rwScore, mathScore)
        : (rwRawTotal > 0 ? rwScore : mathScore);

      const newSession = {
        ...session,
        module_results: updatedModules,
        total_score: totalScore,
        rw_score: rwRawTotal > 0 ? rwScore : undefined,
        math_score: mathRawTotal > 0 ? mathScore : undefined,
      };

      saveTestSession(newSession);
      return newSession;
    });

    setSessions(updatedSessions.filter(s => s.status === 'completed'));
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1000px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-medium">Test History</span>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Test History</h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              {sessions.length} completed exam{sessions.length !== 1 ? 's' : ''}
            </p>
          </div>
          {sessions.length > 0 && (
            <Button variant="secondary" size="sm" onClick={handleRecalculate}>
              <RefreshCw size={14} className="mr-1" /> Re-check Scores
            </Button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Trophy size={40} className="text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)] font-medium mb-1">No tests completed yet</p>
            <p className="text-[var(--text-muted)] text-sm mb-4">Complete a full exam to see your results here.</p>
            <Link href="/">
              <Button variant="primary" size="sm">Go to Dashboard</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session, i) => {
              const date = new Date(session.completed_at).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              });
              const totalQ = session.module_results.reduce((s, m) => s + m.raw_total, 0);
              const totalCorrect = session.module_results.reduce((s, m) => s + m.raw_correct, 0);
              const accuracy = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

              return (
                <div
                  key={session.session_id}
                  className="glass-card glass-card-hover p-5 flex items-center gap-4 animate-fadeIn"
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  {/* Type icon badge — emoji based on exam type */}
                  <div className="w-14 h-14 rounded-xl gradient-indigo flex flex-col items-center justify-center flex-shrink-0 select-none">
                    {session.exam_type === 'full' ? (
                      <>
                        <span className="text-white font-black text-base leading-none">
                          {session.total_score}
                        </span>
                        <span className="text-white/70 text-[10px]">
                          /{session.modules.some(m => m.section === 'Reading and Writing') && session.modules.some(m => m.section === 'Math') ? '1600' : '800'}
                        </span>
                      </>
                    ) : (
                      <span className="text-2xl leading-none" role="img" aria-label={TYPE_LABELS[session.exam_type]}>
                        {session.exam_type === 'custom' ? '🌐' : session.exam_type === 'rw' ? '📖' : '🔢'}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[var(--text-primary)] font-semibold text-sm truncate">
                        {session.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full text-[var(--text-muted)]">
                        {TYPE_LABELS[session.exam_type] ?? session.exam_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Calendar size={10} /> {date}</span>
                      {session.exam_type !== 'custom' && (
                        <span className="flex items-center gap-1 font-semibold text-[var(--accent-indigo)]">
                          {session.total_score}
                          <span className="font-normal text-[var(--text-muted)]">
                            /{session.modules.some(m => m.section === 'Reading and Writing') && session.modules.some(m => m.section === 'Math') ? '1600' : '800'}
                          </span>
                        </span>
                      )}
                      <span className="flex items-center gap-1"><Trophy size={10} /> {totalCorrect}/{totalQ} correct</span>
                      <span className="text-emerald-700 font-semibold">{accuracy}%</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/results/${session.session_id}`}>
                      <Button variant="ghost" size="sm">
                        Analytics <ChevronRight size={12} />
                      </Button>
                    </Link>
                    <Link href={`/review/${session.session_id}`}>
                      <Button variant="secondary" size="sm">
                        Review
                      </Button>
                    </Link>
                    <button
                      onClick={() => handleDelete(session.session_id)}
                      className="p-2 rounded-lg text-[var(--text-muted)] hover:text-rose-700 hover:bg-rose-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Modal
        isOpen={isRecalculateModalOpen}
        onClose={() => setIsRecalculateModalOpen(false)}
        title="Re-check Scores"
        maxWidth="max-w-md"
      >
        <div className="text-[var(--text-secondary)] text-sm mb-6">
          Are you sure you want to re-evaluate all past answers? This will recalculate your scores using the latest grading logic and scoring curves.
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setIsRecalculateModalOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmRecalculate}>
            Re-check
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        title="Delete Test Session"
        maxWidth="max-w-md"
      >
        <div className="text-[var(--text-secondary)] text-sm mb-6">
          Are you sure you want to remove this test from your history? This action cannot be undone.
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteSessionId(null)}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={confirmDelete}>
            <span className="text-rose-600">Delete</span>
          </Button>
        </div>
      </Modal>
    </div>
  );
}
