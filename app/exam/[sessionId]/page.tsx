'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Flag, ChevronLeft, ChevronRight, Calculator as CalcIcon,
  BookOpen as FormulaIcon, Send, Clock, ArrowRight, X, Zap, Save
} from 'lucide-react';
import { loadQuestionsMap } from '@/app/lib/db';
import {
  getInProgressExam,
  saveInProgressExam,
  clearInProgressExam,
  bulkUpdateQuestionDex,
  saveTestSession,
} from '@/app/lib/storage';
import {
  scaleRWScore, scaleMathScore,
  scaleSingleSectionRW, scaleSingleSectionMath,
  calculateTotalScore,
} from '@/app/lib/scoring';
import type {
  Question,
  InProgressExamState,
  ModuleResult,
  QuestionResult,
  TestSession,
  SessionModule,
} from '@/app/types';
import { MathText } from '@/app/components/ui/MathRenderer';
import { Button } from '@/app/components/ui/Button';
import { DifficultyBadge } from '@/app/components/ui/Badge';
import { Modal } from '@/app/components/ui/Modal';

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
function useCountdown(totalSeconds: number, onExpire: () => void) {
  const [seconds, setSeconds] = useState(totalSeconds);
  const expiredRef = useRef(false);

  useEffect(() => {
    setSeconds(totalSeconds);
    expiredRef.current = false;
  }, [totalSeconds]);

  useEffect(() => {
    if (seconds <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }
    const id = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onExpire]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const pct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
  const stateClass =
    seconds > totalSeconds * 0.25 ? 'timer-normal' :
    seconds > 120 ? 'timer-warning' : 'timer-danger';

  return { mm, ss, pct, stateClass, seconds };
}

// ─── Formula Sheet ────────────────────────────────────────────────────────────
function FormulaSheetModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const formulas = [
    { label: 'Circle Area', formula: 'A = \\pi r^2' },
    { label: 'Circle Circumference', formula: 'C = 2\\pi r' },
    { label: 'Rectangle Area', formula: 'A = lw' },
    { label: 'Triangle Area', formula: 'A = \\frac{1}{2}bh' },
    { label: 'Pythagorean Theorem', formula: 'a^2 + b^2 = c^2' },
    { label: 'Quadratic Formula', formula: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}' },
    { label: 'Slope', formula: 'm = \\frac{y_2 - y_1}{x_2 - x_1}' },
    { label: 'Slope-Intercept', formula: 'y = mx + b' },
    { label: 'Distance', formula: 'd = \\sqrt{(x_2-x_1)^2 + (y_2-y_1)^2}' },
    { label: 'Midpoint', formula: 'M = \\left(\\frac{x_1+x_2}{2}, \\frac{y_1+y_2}{2}\\right)' },
    { label: 'Sphere Volume', formula: 'V = \\frac{4}{3}\\pi r^3' },
    { label: 'Cone Volume', formula: 'V = \\frac{1}{3}\\pi r^2 h' },
    { label: 'Cylinder Volume', formula: 'V = \\pi r^2 h' },
    { label: 'Special Right Triangle 30-60-90', formula: '1 : \\sqrt{3} : 2' },
    { label: 'Special Right Triangle 45-45-90', formula: '1 : 1 : \\sqrt{2}' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="SAT Math Reference Sheet" maxWidth="max-w-2xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {formulas.map(f => (
          <div key={f.label} className="bg-[var(--bg-elevated)] rounded-lg p-3 border border-[var(--border)]">
            <div className="text-xs text-[var(--text-muted)] mb-1.5">{f.label}</div>
            <MathText text={`$${f.formula}$`} className="text-[var(--text-primary)]" />
          </div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-muted)] mt-4">
        Note: All triangles in this reference have right angles unless otherwise noted.
        The number of degrees of arc in a circle is 360. The number of radians of arc in a circle is 2π.
        The sum of the measures of angles of a triangle is 180°.
      </p>
    </Modal>
  );
}

// ─── Desmos Modal ─────────────────────────────────────────────────────────────
function DesmosModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-5xl h-[85vh] modal-panel flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Graphing Calculator</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all">
            <X size={18} />
          </button>
        </div>
        <iframe
          src="https://www.desmos.com/graphing"
          className="flex-1 w-full border-0 rounded-b-2xl"
          title="Desmos Graphing Calculator"
          allow="fullscreen"
        />
      </div>
    </div>
  );
}

// ─── Question Nav Grid ────────────────────────────────────────────────────────
function QuestionNavGrid({
  questions,
  currentIdx,
  answers,
  flagged,
  onJump,
}: {
  questions: Question[];
  currentIdx: number;
  answers: Record<string, string | null>;
  flagged: Set<string>;
  onJump: (i: number) => void;
}) {
  return (
    <div className="q-nav-grid">
      {questions.map((q, i) => {
        const isAnswered = answers[q.question_id] != null && answers[q.question_id] !== '';
        const isFlagged = flagged.has(q.question_id);
        const isCurrent = i === currentIdx;
        return (
          <button
            key={q.question_id}
            className={`q-nav-btn ${isCurrent ? 'current' : isFlagged ? 'flagged' : isAnswered ? 'answered' : 'unanswered'}`}
            onClick={() => onJump(i)}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

// ─── Single Question Card ─────────────────────────────────────────────────────
function QuestionCard({
  question,
  selectedAnswer,
  onAnswer,
  questionNum,
  totalQuestions,
}: {
  question: Question;
  selectedAnswer: string | null | undefined;
  onAnswer: (value: string) => void;
  questionNum: number;
  totalQuestions: number;
}) {
  return (
    <div className="max-w-3xl mx-auto animate-fadeIn">
      {/* Q Number + Difficulty */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-[var(--text-muted)] font-medium">
          Question {questionNum} of {totalQuestions}
        </span>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>

      {/* Stimulus */}
      {question.stimulus && (
        <div className="question-stimulus mb-5">
          <MathText text={question.stimulus} />
        </div>
      )}

      {/* Question Text */}
      <div className="question-text mb-6">
        <MathText text={question.question_text} />
      </div>

      {/* Options or Grid-in */}
      {question.is_open_ended ? (
        <div className="space-y-2">
          <label className="text-sm text-[var(--text-secondary)] font-medium">Your Answer:</label>
          <input
            type="text"
            value={selectedAnswer ?? ''}
            onChange={e => onAnswer(e.target.value)}
            placeholder="Enter numeric answer…"
            className="w-full max-w-xs px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] text-lg font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-indigo)] focus:ring-1 focus:ring-[var(--accent-indigo)] transition-all"
          />
          <p className="text-xs text-[var(--text-muted)]">
            Enter a fraction (e.g. 3/4), decimal, or whole number.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {question.options && Object.entries(question.options).map(([letter, text]) => {
            const isSelected = selectedAnswer === letter;
            return (
              <button
                key={letter}
                className={`option-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => onAnswer(letter)}
              >
                <span className={`option-letter ${isSelected ? 'selected' : ''}`}>{letter}</span>
                <span className="flex-1">
                  <MathText text={text} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Exam Page ───────────────────────────────────────────────────────────
export default function ExamPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();

  const [state, setState] = useState<InProgressExamState | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question>>(new Map());
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showDesmos, setShowDesmos] = useState(false);
  const [showFormulas, setShowFormulas] = useState(false);
  const [showNavPanel, setShowNavPanel] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  // Per-question time tracking
  const questionStartTime = useRef<number>(Date.now());
  const accumulatedTime = useRef<Record<string, number>>({});

  // ─── Load state ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const s = getInProgressExam();
    if (!s || s.session_id !== sessionId) {
      router.replace('/');
      return;
    }
    loadQuestionsMap().then(map => {
      setQuestionsMap(map);
      setState(s);
      // Pre-fill accumulated time from saved state
      accumulatedTime.current = { ...s.time_per_question };
      // Load current module's questions
      const module = s.modules[s.current_module_index];
      const qs = module.question_ids.map(id => map.get(id)).filter(Boolean) as Question[];
      setQuestions(qs);
    }).catch(err => {
      console.error('Failed to load questions:', err);
    });
  }, [sessionId, router]);

  // ─── Switch module ──────────────────────────────────────────────────────────
  const loadModuleQuestions = useCallback(
    (s: InProgressExamState, map: Map<string, Question>) => {
      const module = s.modules[s.current_module_index];
      const qs = module.question_ids.map(id => map.get(id)).filter(Boolean) as Question[];
      setQuestions(qs);
      setCurrentQIdx(0);
      setFlagged(new Set());
      questionStartTime.current = Date.now();
    },
    []
  );

  // ─── Timer expire / manual submit ───────────────────────────────────────────
  const handleModuleSubmit = useCallback(
    (forced = false) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setShowConfirmSubmit(false);

      setState(prev => {
        if (!prev) return prev;

        // Capture final question time
        const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
        const currentQ = questions[currentQIdx];
        if (currentQ) {
          accumulatedTime.current[currentQ.question_id] =
            (accumulatedTime.current[currentQ.question_id] ?? 0) + elapsed;
        }

        const module = prev.modules[prev.current_module_index];
        const moduleQuestions = module.question_ids
          .map(id => questionsMap.get(id))
          .filter(Boolean) as Question[];

        // Build results for this module
        const results: QuestionResult[] = moduleQuestions.map((q, i) => {
          const userAns = prev.answers[q.question_id] ?? null;
          const isCorrect = userAns !== null &&
            userAns.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
          return {
            question_id: q.question_id,
            user_answer: userAns,
            correct_answer: q.correct_answer,
            is_correct: isCorrect,
            time_spent_seconds: accumulatedTime.current[q.question_id] ?? 0,
            question_number: i + 1,
          };
        });

        const rawCorrect = results.filter(r => r.is_correct).length;
        const rawTotal = results.length;

        // Scale score for this module (will be combined later)
        let scaledScore = 200;
        if (module.section === 'Reading and Writing') {
          scaledScore = scaleSingleSectionRW(rawCorrect, rawTotal);
        } else {
          scaledScore = scaleSingleSectionMath(rawCorrect, rawTotal);
        }

        const moduleResult: ModuleResult = {
          module_num: module.module_num,
          section: module.section,
          results,
          raw_correct: rawCorrect,
          raw_total: rawTotal,
          scaled_score: scaledScore,
        };

        // Update QuestionDex
        bulkUpdateQuestionDex(results.map(r => ({
          question_id: r.question_id,
          is_correct: r.is_correct,
          time_spent: r.time_spent_seconds,
        })));

        const newCompletedModules = [...prev.completed_modules, moduleResult];
        const nextModuleIdx = prev.current_module_index + 1;
        const isDone = nextModuleIdx >= prev.modules.length;

        if (isDone) {
          // Calculate final scores
          const rwResults = newCompletedModules.filter(m => m.section === 'Reading and Writing');
          const mathResults = newCompletedModules.filter(m => m.section === 'Math');

          const rwRawCorrect = rwResults.reduce((s, m) => s + m.raw_correct, 0);
          const rwRawTotal = rwResults.reduce((s, m) => s + m.raw_total, 0);
          const mathRawCorrect = mathResults.reduce((s, m) => s + m.raw_correct, 0);
          const mathRawTotal = mathResults.reduce((s, m) => s + m.raw_total, 0);

          const rwScore = rwRawTotal > 0 ? scaleRWScore(rwRawCorrect) : 0;
          const mathScore = mathRawTotal > 0 ? scaleMathScore(mathRawCorrect) : 0;
          const totalScore = rwRawTotal > 0 && mathRawTotal > 0
            ? calculateTotalScore(rwScore, mathScore)
            : (rwRawTotal > 0 ? rwScore : mathScore);

          const session: TestSession = {
            session_id: prev.session_id,
            exam_id: prev.exam_id,
            exam_type: prev.exam_type,
            label: prev.label,
            started_at: prev.started_at,
            completed_at: new Date().toISOString(),
            modules: prev.modules,
            module_results: newCompletedModules,
            total_score: totalScore,
            rw_score: rwRawTotal > 0 ? rwScore : undefined,
            math_score: mathRawTotal > 0 ? mathScore : undefined,
            status: 'completed',
            custom_filters: prev.custom_filters,
          };

          saveTestSession(session);
          clearInProgressExam();
          setTimeout(() => router.push(`/results/${prev.session_id}`), 100);
          return prev;
        }

        // Advance to next module
        const updated: InProgressExamState = {
          ...prev,
          current_module_index: nextModuleIdx,
          completed_modules: newCompletedModules,
          time_per_question: { ...accumulatedTime.current },
        };
        saveInProgressExam(updated);

        // Load next module questions
        setTimeout(() => {
          loadModuleQuestions(updated, questionsMap);
          setIsSubmitting(false);
        }, 50);

        return updated;
      });
    },
    [isSubmitting, questions, currentQIdx, questionsMap, loadModuleQuestions, router]
  );

  const handleTimerExpire = useCallback(() => {
    handleModuleSubmit(true);
  }, [handleModuleSubmit]);

  // ─── Per-question time tracking ──────────────────────────────────────────────
  const handleQuestionChange = useCallback(
    (newIdx: number) => {
      const q = questions[currentQIdx];
      if (q) {
        const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
        accumulatedTime.current[q.question_id] =
          (accumulatedTime.current[q.question_id] ?? 0) + elapsed;
      }
      questionStartTime.current = Date.now();
      setCurrentQIdx(newIdx);
    },
    [questions, currentQIdx]
  );

  // ─── Answer handler ──────────────────────────────────────────────────────────
  const handleAnswer = useCallback((questionId: string, value: string) => {
    setState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, answers: { ...prev.answers, [questionId]: value } };
      saveInProgressExam(updated);
      return updated;
    });
  }, []);

  // ─── Countdown ──────────────────────────────────────────────────────────────
  const currentModule = state?.modules[state.current_module_index];
  const timerTotalSeconds = (currentModule?.time_minutes ?? 32) * 60;
  const { mm, ss, stateClass } = useCountdown(timerTotalSeconds, handleTimerExpire);

  if (!state || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentQ = questions[currentQIdx];
  const totalModules = state.modules.length;
  const currentModuleNum = state.current_module_index + 1;
  const isMathModule = currentModule?.section === 'Math';
  const answeredCount = questions.filter(q => {
    const ans = state.answers[q.question_id];
    return ans != null && ans !== '';
  }).length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ─── Sticky Exam Nav ─── */}
      <header className="sticky top-0 z-40 bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto px-4 py-2.5 flex items-center gap-4">
          {/* Module info */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--text-muted)] text-xs">Module</span>
            <span className="text-[var(--text-primary)] font-bold">
              {currentModuleNum}/{totalModules}
            </span>
            <span className="text-[var(--text-muted)] text-xs hidden sm:inline">—</span>
            <span className="text-[var(--text-secondary)] text-xs hidden sm:inline">
              {currentModule?.section}
            </span>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1.5 ml-auto font-mono text-base font-bold ${stateClass}`}>
            <Clock size={14} />
            {mm}:{ss}
          </div>

          {/* Progress */}
          <div className="text-xs text-[var(--text-muted)]">
            {answeredCount}/{questions.length} answered
          </div>

          {/* Math tools */}
          {isMathModule && (
            <>
              <button
                onClick={() => setShowDesmos(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-light)] transition-all"
              >
                <CalcIcon size={13} /> Calculator
              </button>
              <button
                onClick={() => setShowFormulas(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-light)] transition-all"
              >
                <FormulaIcon size={13} /> Formulas
              </button>
            </>
          )}

          {/* Nav toggle */}
          <button
            onClick={() => setShowNavPanel(v => !v)}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            Q Nav
          </button>
        </div>

        {/* Q Nav panel */}
        {showNavPanel && (
          <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 max-w-[1200px] mx-auto">
            <QuestionNavGrid
              questions={questions}
              currentIdx={currentQIdx}
              answers={state.answers}
              flagged={flagged}
              onJump={(i) => { handleQuestionChange(i); setShowNavPanel(false); }}
            />
          </div>
        )}
      </header>

      {/* ─── Question Area ─── */}
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-4 py-6 sm:py-10">
        {currentQ && (
          <QuestionCard
            question={currentQ}
            selectedAnswer={state.answers[currentQ.question_id]}
            onAnswer={(val) => handleAnswer(currentQ.question_id, val)}
            questionNum={currentQIdx + 1}
            totalQuestions={questions.length}
          />
        )}
      </main>

      {/* ─── Bottom Nav Bar ─── */}
      <footer className="sticky bottom-0 bg-[var(--bg-surface)] border-t border-[var(--border)] px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Flag */}
            <button
              onClick={() => {
                const qid = currentQ?.question_id;
                if (!qid) return;
                setFlagged(prev => {
                  const n = new Set(prev);
                  n.has(qid) ? n.delete(qid) : n.add(qid);
                  return n;
                });
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                currentQ && flagged.has(currentQ.question_id)
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-400'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Flag size={13} />
              {currentQ && flagged.has(currentQ.question_id) ? 'Flagged' : 'Flag'}
            </button>
            
            {/* Save & Exit */}
            <button
              onClick={() => {
                // Capture current question time
                if (currentQ) {
                  const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
                  accumulatedTime.current[currentQ.question_id] = 
                    (accumulatedTime.current[currentQ.question_id] ?? 0) + elapsed;
                }
                
                // Ensure state is updated before leaving
                if (state) {
                  saveInProgressExam({
                    ...state,
                    time_per_question: { ...accumulatedTime.current }
                  });
                }
                router.push('/');
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-light)] hover:bg-[var(--bg-elevated)] transition-all"
            >
              <Save size={13} />
              Save & Exit
            </button>
          </div>

          {/* Prev / Next */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={currentQIdx === 0}
              onClick={() => handleQuestionChange(currentQIdx - 1)}
            >
              <ChevronLeft size={14} /> Back
            </Button>
            {currentQIdx < questions.length - 1 ? (
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleQuestionChange(currentQIdx + 1)}
              >
                Next <ChevronRight size={14} />
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                onClick={() => setShowConfirmSubmit(true)}
              >
                Submit Module <Send size={13} />
              </Button>
            )}
          </div>
        </div>
      </footer>

      {/* ─── Modals ─── */}
      <DesmosModal isOpen={showDesmos} onClose={() => setShowDesmos(false)} />
      <FormulaSheetModal isOpen={showFormulas} onClose={() => setShowFormulas(false)} />

      {/* Confirm Submit Modal */}
      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        title="Submit Module?"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            You have answered <strong className="text-[var(--text-primary)]">{answeredCount}</strong> of{' '}
            <strong className="text-[var(--text-primary)]">{questions.length}</strong> questions.
            {answeredCount < questions.length && (
              <span className="text-amber-400 ml-1">
                {questions.length - answeredCount} question(s) unanswered.
              </span>
            )}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {currentModuleNum < totalModules
              ? `This will advance you to Module ${currentModuleNum + 1}.`
              : 'This will complete the exam and show your results.'}
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" size="sm" onClick={() => setShowConfirmSubmit(false)}>
              Keep Reviewing
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={() => handleModuleSubmit(false)}
            >
              {isSubmitting ? 'Submitting…' : 'Confirm Submit'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
