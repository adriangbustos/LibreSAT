'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Flag, ChevronLeft, ChevronRight, Calculator as CalcIcon,
  BookOpen as FormulaIcon, Send, Clock, ArrowRight, X, Zap, Save, Loader2
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
  calculateThetaMLE, scaleThetaToSAT, type IRTResponse,
  scaleSingleSectionRW, scaleSingleSectionMath,
  calculateTotalScore, checkAnswer
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
import { DataTable } from '@/app/components/ui/DataTable';
import { AutoSizedImage } from '@/app/components/ui/AutoSizedImage';

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
function useCountdown(totalSeconds: number, moduleStartedAt: number | undefined, resetKey: any, onExpire: () => void) {
  const getInitial = useCallback(() => {
    if (!moduleStartedAt) return totalSeconds;
    const elapsed = Math.floor((Date.now() - moduleStartedAt) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  }, [totalSeconds, moduleStartedAt]);

  const [seconds, setSeconds] = useState(getInitial);
  const expiredRef = useRef(false);

  useEffect(() => {
    setSeconds(getInitial());
    expiredRef.current = false;
  }, [resetKey, getInitial]);

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

// ─── Formula Panel (floating right, ~280px, single-column scrollable) ──────────

const FORMULAS = [
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
  { label: '30-60-90 Triangle', formula: '1 : \\sqrt{3} : 2' },
  { label: '45-45-90 Triangle', formula: '1 : 1 : \\sqrt{2}' },
];

function FormulaPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '280px',
        zIndex: 45,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border)',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.45)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Formulas
        </span>
        <button
          onClick={onClose}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Scrollable formula list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {FORMULAS.map(f => (
          <div
            key={f.label}
            style={{ background: 'var(--bg-elevated)', borderRadius: 10, padding: '10px 12px', border: '1px solid var(--border)' }}
          >
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {f.label}
            </div>
            <MathText text={`$${f.formula}$`} className="text-[var(--text-primary)]" />
          </div>
        ))}
        <p style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 4, paddingBottom: 8 }}>
          All triangles in this reference have right angles unless noted. Degrees in a circle: 360°. Radians: 2π. Triangle angle sum: 180°.
        </p>
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
  const isEnglish = question.section === 'Reading and Writing';

  return (
    <div className={`mx-auto animate-fadeIn ${isEnglish ? 'flex gap-8 max-w-6xl' : 'max-w-3xl'}`}>
      {/* Left Column (or full width if not English) */}
      <div className={isEnglish ? 'flex-1 min-w-0 pr-4 border-r border-[var(--border)]' : ''}>
        {/* Q Number + Difficulty */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-[var(--text-muted)] font-medium">
            Question {questionNum} of {totalQuestions} <span className="opacity-50 ml-2">({question.question_id})</span>
          </span>
          <DifficultyBadge difficulty={question.difficulty} />
        </div>

        {/* Stimulus */}
        {question.stimulus && (
          <div className="question-stimulus mb-5 whitespace-pre-wrap">
            <MathText text={question.stimulus} />
          </div>
        )}

        {/* Visuals */}
        {question.image_url && (
          <AutoSizedImage src={question.image_url} className={`mb-6 ${!isEnglish ? 'mx-auto max-w-[400px] max-h-[400px]' : ''}`} />
        )}
        {question.table_data && (
          <div className="mb-6">
            <DataTable data={question.table_data} />
          </div>
        )}
      </div>

      {/* Right Column (or below if not English) */}
      <div className={isEnglish ? 'flex-1 min-w-0 pl-4' : ''}>
        {/* Question Text */}
        <div className="question-text mb-6 whitespace-pre-wrap">
          <MathText text={question.question_text} />
        </div>

        {/* Input Area */}
        {(question.is_open_ended || !question.options) ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--text-secondary)] font-medium">Your Answer:</label>
            <input
              type="text"
              value={selectedAnswer ?? ''}
              onChange={e => {
                const val = e.target.value;
                const maxLen = val.startsWith('-') ? 6 : 5;
                if (val.length <= maxLen) onAnswer(val);
              }}
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
  const [isSaving, setIsSaving] = useState(false);
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
      if (!s.module_started_at) {
        s.module_started_at = Date.now();
        saveInProgressExam(s);
      }
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
          const isCorrect = userAns !== null && checkAnswer(userAns, q.correct_answer);
          return {
            question_id: q.question_id,
            user_answer: userAns,
            correct_answer: q.correct_answer,
            is_correct: isCorrect,
            time_spent_seconds: accumulatedTime.current[q.question_id] ?? 0,
            question_number: i + 1,
            irt_parameters: q.irt_parameters ? { ...q.irt_parameters } : undefined,
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

          const calculateIRT = (results: ModuleResult[], fallbackScorer: (r: number) => number) => {
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
          module_started_at: Date.now(),
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
  const { mm, ss, stateClass } = useCountdown(timerTotalSeconds, state?.module_started_at, state?.current_module_index, handleTimerExpire);

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
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ─── Desmos Left Pane (inline, shifts the layout) ─── */}
      <div
        style={{
          width: showDesmos ? '50%' : '0',
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 0.32s cubic-bezier(0.4,0,0.2,1)',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>Graphing Calculator</span>
          <button
            onClick={() => setShowDesmos(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-elevated)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            <X size={15} />
          </button>
        </div>
        <iframe
          src="https://www.desmos.com/testing/collegeboard/graphing"
          style={{ flex: 1, width: '100%', border: 'none', minWidth: 0 }}
          title="Desmos Graphing Calculator"
          allow="fullscreen"
        />
      </div>

      {/* ─── Right column: header + scrollable content + footer ─── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
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

            {/* Timer — hidden for custom practice (no fixed time limit) */}
            {state.exam_type !== 'custom' && (
              <div className={`flex items-center gap-1.5 ml-auto font-mono text-base font-bold ${stateClass}`}>
                <Clock size={14} />
                {mm}:{ss}
              </div>
            )}

            {/* Progress */}
            <div className={`text-xs text-[var(--text-muted)]${state.exam_type === 'custom' ? ' ml-auto' : ''}`}>
              {answeredCount}/{questions.length} answered
            </div>

            {/* Math tools — toggle panels (clicking active button closes panel) */}
            {isMathModule && (
              <>
                <button
                  onClick={() => setShowDesmos(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${showDesmos
                    ? 'border-[var(--accent-indigo)] bg-[rgba(2,99,235,0.1)] text-[var(--accent-indigo)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-light)]'
                    }`}
                >
                  <CalcIcon size={13} /> Calculator
                </button>
                <button
                  onClick={() => setShowFormulas(v => !v)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${showFormulas
                    ? 'border-[var(--accent-indigo)] bg-[rgba(2,99,235,0.1)] text-[var(--accent-indigo)]'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-light)]'
                    }`}
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
              Question Navigation
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
        <main 
          style={{ flex: 1, overflowY: 'auto' }} 
          className="px-4 py-6 sm:py-10 select-none"
          onCopy={(e) => e.preventDefault()}
        >
          <div className="max-w-[1200px] mx-auto">
            {currentQ && (
              <QuestionCard
                question={currentQ}
                selectedAnswer={state.answers[currentQ.question_id]}
                onAnswer={(val) => handleAnswer(currentQ.question_id, val)}
                questionNum={currentQIdx + 1}
                totalQuestions={questions.length}
              />
            )}
          </div>
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${currentQ && flagged.has(currentQ.question_id)
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
                  : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                  }`}
              >
                <Flag size={13} />
                {currentQ && flagged.has(currentQ.question_id) ? 'Flagged' : 'Flag'}
              </button>

              {/* Save & Exit */}
              <button
                onClick={() => {
                  if (isSaving) return;
                  setIsSaving(true);
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
                {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {isSaving ? 'Saving…' : 'Save & Exit'}
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

      </div>{/* end right column */}

      {/* ─── Formula Panel (floating right, non-intrusive) ─── */}
      <FormulaPanel isOpen={showFormulas} onClose={() => setShowFormulas(false)} />


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
              <span className="text-red-700 ml-1">
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
