'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Zap, CheckCircle2, Clock, BookOpen, Calculator,
  Dices, ChevronRight, Lock
} from 'lucide-react';
import { loadExamSuites, generateRandomizedExam, loadQuestions } from '@/app/lib/db';
import { getCompletedStaticExams, saveInProgressExam, getQuestionDex } from '@/app/lib/storage';
import type { StaticExam, InProgressExamState, ExamType, Question } from '@/app/types';
import { Button } from '@/app/components/ui/Button';

type ExamCategory = 'full' | 'rw' | 'math';

const TYPE_CONFIG: Record<ExamCategory, {
  title: string;
  subtitle: string;
  modules: string;
  duration: string;
  icon: React.ReactNode;
  gradient: string;
}> = {
  full: {
    title: 'Full-Length SAT',
    subtitle: 'Complete 4-module exam across Reading & Writing and Math',
    modules: '4 modules (R&W × 2 + Math × 2)',
    duration: '2 hours 14 minutes',
    icon: <Zap size={20} className="text-white" />,
    gradient: 'gradient-indigo',
  },
  rw: {
    title: 'Reading & Writing Diagnostic',
    subtitle: 'Two-module English section exam',
    modules: '2 modules (27 + 27 questions)',
    duration: '64 minutes',
    icon: <BookOpen size={20} className="text-white" />,
    gradient: 'gradient-amber',
  },
  math: {
    title: 'Math Diagnostic',
    subtitle: 'Two-module Math section exam',
    modules: '2 modules (22 + 22 questions)',
    duration: '70 minutes',
    icon: <Calculator size={20} className="text-white" />,
    gradient: 'gradient-indigo',
  },
};

function launchExam(exam: StaticExam, router: ReturnType<typeof useRouter>) {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const state: InProgressExamState = {
    session_id: sessionId,
    exam_id: exam.exam_id,
    exam_type: exam.type as ExamType,
    label: exam.label,
    started_at: new Date().toISOString(),
    modules: exam.modules.map(m => ({
      module_num: m.module_num,
      section: m.section,
      time_minutes: m.time_minutes,
      question_ids: m.question_ids,
    })),
    current_module_index: 0,
    answers: {},
    time_per_question: {},
    completed_modules: [],
  };
  saveInProgressExam(state);
  router.push(`/exam?id=${sessionId}`);
}

function SelectExamContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const type = (searchParams.get('type') || 'full') as ExamCategory;
  const config = TYPE_CONFIG[type] ?? TYPE_CONFIG.full;

  const [exams, setExams] = useState<StaticExam[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [suites, qs] = await Promise.all([loadExamSuites(), loadQuestions()]);
        if (!mounted) return;
        const list =
          type === 'full' ? suites.full_length :
            type === 'rw' ? suites.rw_diagnostic :
              suites.math_diagnostic;
        setExams(list || []);
        setCompletedIds(getCompletedStaticExams());
        setQuestions(qs);
      } catch (err: any) {
        console.error('Failed to load exam data:', err);
        if (mounted) setError(err.message || 'Failed to load exam data');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [type]);

  const handleRandomize = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 200)); // small delay for UX
    
    const dex = getQuestionDex();
    const seenQuestionIds = new Set<string>();
    for (const [id, entry] of Object.entries(dex.entries)) {
      if (entry.status !== 'unseen') {
        seenQuestionIds.add(id);
      }
    }

    const exam = generateRandomizedExam(questions, type, seenQuestionIds);
    launchExam(exam, router);
  };

  const totalQuestions =
    type === 'full' ? '98 questions' :
      type === 'rw' ? '54 questions' :
        '44 questions';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center border-rose-500/30">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap size={24} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Failed to load data</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{error}</p>
          <Link href="/">
            <Button variant="secondary" className="w-full">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-medium">{config.title}</span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 ${config.gradient} rounded-xl flex items-center justify-center`}>
              {config.icon}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">{config.title}</h1>
              <p className="text-[var(--text-muted)] text-sm">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-3">
            <span className="flex items-center gap-1"><Clock size={12} /> {config.duration}</span>
            <span className="flex items-center gap-1"><BookOpen size={12} /> {totalQuestions}</span>
            <span className="flex items-center gap-1"><Zap size={12} /> Hard-route Module 2</span>
          </div>
        </div>

        {/* Randomize CTA */}
        <div className="glass-card mb-6 p-5 border-[var(--accent-indigo)]/30 animate-fadeIn animate-fadeIn-1">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                <Dices size={18} className="text-[var(--accent-indigo)]" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-sm">Generate Randomized Exam</h3>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">
                  Dynamically samples questions following strict difficulty distributions.
                  May include previously seen questions.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              loading={generating}
              onClick={handleRandomize}
            >
              <Dices size={15} />
              {generating ? 'Generating…' : '🎲 Generate Randomized Exam'}
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
            Static Practice Tests ({exams.length} available)
          </span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Static Exam Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.map((exam, i) => {
            const isDone = completedIds.has(exam.exam_id);
            const totalQs = exam.modules.reduce((s, m) => s + m.question_ids.length, 0);
            const totalMin = exam.modules.reduce((s, m) => s + m.time_minutes, 0);
            const testNumber = exams[0]?.is_golden ? i : i + 1;

            return (
              <div
                key={exam.exam_id}
                className={`glass-card glass-card-hover p-5 flex flex-col animate-fadeIn ${exam.is_golden ? 'bg-amber-400/10 border-amber-400/40 shadow-[0_0_20px_rgba(251,191,36,0.15)]' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold uppercase tracking-wider ${exam.is_golden ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'}`}>
                    {exam.is_golden ? '★ Golden Standard' : `Practice Test ${testNumber}`}
                  </span>
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                      <CheckCircle2 size={10} />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-2 py-0.5">
                      Not started
                    </span>
                  )}
                </div>

                <h3 className="text-[var(--text-primary)] font-bold text-base mb-3">{exam.label}</h3>

                {/* Module list */}
                <div className="space-y-1.5 mb-4">
                  {exam.modules.map(m => (
                    <div key={m.module_num} className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span>
                        {m.section === 'Reading and Writing' ? '📖' : '🔢'} Module {m.module_num}
                        <span className="ml-1 text-[var(--text-secondary)]">({m.section === 'Reading and Writing' ? 'R&W' : 'Math'})</span>
                      </span>
                      <span>{m.question_ids.length}Q · {m.time_minutes}m</span>
                    </div>
                  ))}
                </div>

                <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between">
                  <div className="text-xs text-[var(--text-muted)]">
                    {totalQs} questions · {totalMin} min
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => launchExam(exam, router)}
                  >
                    {isDone ? 'Retake' : 'Start'} <ChevronRight size={12} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default function SelectExamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" /></div>}>
      <SelectExamContent />
    </Suspense>
  );
}
