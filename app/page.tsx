'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  BookOpen, Calculator, LayoutGrid, History, Zap,
  ChevronRight, PlayCircle, Type, Loader2,
  Settings, Download, Upload, CheckCircle2, XCircle, Sparkles,
  ArrowRight, Target, AlertCircle, Clock, BookText
} from 'lucide-react';
import { useApp } from './context/AppContext';
import {
  getQuestionDexStats,
  getInProgressExam,
  getAIConfig,
  setAIConfig,
  exportData,
  importData,
  saveInProgressExam,
  type AIConfig
} from './lib/storage';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
import type { InProgressExamState } from './types';

// ─── Tier 0: Integrated Exam Readiness Engine (QuestionDex Signature) ───────────
function ExamReadinessBar({
  questions,
  onDrillMissed,
  isDrilling,
}: {
  questions: { question_id: string; section: string }[];
  onDrillMissed: () => void;
  isDrilling: boolean;
}) {
  const allIds = questions.map((q) => q.question_id);
  const stats = getQuestionDexStats(allIds);
  const rwIds = questions
    .filter((q) => q.section === 'Reading and Writing')
    .map((q) => q.question_id);
  const mathIds = questions
    .filter((q) => q.section === 'Math')
    .map((q) => q.question_id);
  const rwStats = getQuestionDexStats(rwIds);
  const mathStats = getQuestionDexStats(mathIds);

  const accuracy = stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0;

  // Estimated Digital SAT Score calculation (400 - 1600 scale)
  const rwAcc = rwStats.seen > 0 ? rwStats.correct / rwStats.seen : 0.7;
  const mathAcc = mathStats.seen > 0 ? mathStats.correct / mathStats.seen : 0.7;
  const estRw = Math.round((200 + rwAcc * 600) / 10) * 10;
  const estMath = Math.round((200 + mathAcc * 600) / 10) * 10;
  const estTotal = Math.min(1600, Math.max(400, estRw + estMath));

  // Prudent 30-point range (-20 to +10 points rounded to nearest 10 on SAT scale, e.g. 1490–1520)
  const estLow = Math.max(400, Math.round((estTotal - 20) / 10) * 10);
  const estHigh = Math.min(1600, Math.round((estTotal + 10) / 10) * 10);

  return (
    <section className="bg-white border border-[#E2E8F0] dashboard-card p-4 sm:p-5 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">

        {/* Metric 1: Projected Score (Restored to compact size) */}
        <div className="flex items-center gap-3.5 border-b lg:border-b-0 lg:border-r border-[#E2E8F0] pb-4 lg:pb-0 lg:pr-5 shrink-0">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Target size={22} />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-0.5">
              Projected SAT Score
            </div>
            <div className="text-xl font-extrabold text-[#1E293B] font-mono tabular-nums leading-tight">
              {stats.seen >= 10 ? `${estLow}–${estHigh}` : 'Baseline Pending'}
            </div>
            <div className="text-[11px] text-[#64748B]">
              {stats.seen >= 10 ? `Based on ${stats.seen} questions (${accuracy}% acc)` : 'Answer 10+ questions to calculate'}
            </div>
          </div>
        </div>

        {/* Metric 2: Coverage Progress & Breakdown (Compact layout) */}
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-[#1E293B]">Overall Coverage</span>
            <span className="text-[#64748B] font-mono tabular-nums text-xs">
              <strong className="text-[#1E293B]">{stats.seen}</strong> / {stats.total} seen ({stats.seenPercent}%)
            </span>
          </div>

          {/* Linear bar */}
          <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden mb-2.5">
            <div
              className="h-full bg-[#2563EB] transition-all duration-300 rounded-full"
              style={{ width: `${stats.seenPercent}%` }}
            />
          </div>

          {/* Domain Breakdown */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-1.5">
              <span className="text-[#64748B] text-[11px]">Reading & Writing</span>
              <span className="font-semibold text-[#1E293B] font-mono tabular-nums text-xs">
                {rwStats.seenPercent}% ({rwStats.seen}/{rwStats.total})
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#F1F5F9] pt-1.5">
              <span className="text-[#64748B] text-[11px]">Math</span>
              <span className="font-semibold text-[#1E293B] font-mono tabular-nums text-xs">
                {mathStats.seenPercent}% ({mathStats.seen}/{mathStats.total})
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Accuracy & Action Buttons Equalized */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 border-t lg:border-t-0 lg:border-l border-[#E2E8F0] pt-4 lg:pt-0 lg:pl-5 shrink-0">

          {/* Stat Boxes: Correct & Incorrect (Height grown vertically to 76px to match exactly the two 34px buttons + 8px gap) */}
          <div className="flex gap-2">
            <div className="w-[74px] sm:w-[80px] h-[76px] bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg flex flex-col items-center justify-center text-center p-1.5">
              <div className="text-lg font-bold text-[#16A34A] font-mono tabular-nums leading-tight">
                {stats.correct}
              </div>
              <div className="text-[10px] uppercase font-bold text-[#15803D] mt-0.5 tracking-wider">
                Correct
              </div>
            </div>

            <div className="w-[74px] sm:w-[80px] h-[76px] bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex flex-col items-center justify-center text-center p-1.5">
              <div className="text-lg font-bold text-[#DC2626] font-mono tabular-nums leading-tight">
                {stats.incorrect}
              </div>
              <div className="text-[10px] uppercase font-bold text-[#B91C1C] mt-0.5 tracking-wider">
                Incorrect
              </div>
            </div>
          </div>

          {/* Stacked Action Column: 2 buttons with reduced border-radius (rounded-md) and total height 76px */}
          <div className="flex flex-col justify-between h-[76px] min-w-[205px]">
            <button
              onClick={onDrillMissed}
              disabled={stats.incorrect === 0 || isDrilling}
              className="h-[34px] w-full inline-flex items-center justify-center gap-1.5 px-3.5 text-xs font-bold text-white bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors whitespace-nowrap shadow-sm"
            >
              {isDrilling ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Starting Drill...
                </>
              ) : (
                <>
                  <AlertCircle size={14} /> Drill {stats.incorrect} Missed Questions
                </>
              )}
            </button>

            <Link
              href="/questiondex"
              className="h-[34px] w-full inline-flex items-center justify-center gap-1 px-3.5 text-xs font-bold text-[#2563EB] hover:bg-[#EFF6FF] rounded-md border border-[#BFDBFE] transition-colors whitespace-nowrap"
            >
              Full QuestionDex Matrix <ChevronRight size={13} />
            </Link>
          </div>

        </div>

      </div>
    </section>
  );
}

// ─── Urgent Active Session Banner ──────────────────────────────────────────────
function ActiveSessionBanner({ inProgress }: { inProgress: InProgressExamState | null }) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState(false);

  if (!inProgress) return null;

  const handleResume = () => {
    setIsRestoring(true);
    router.push(`/exam/${inProgress.session_id}`);
  };

  const currentMod = inProgress.modules[inProgress.current_module_index];
  const answeredCount = Object.values(inProgress.answers || {}).filter(Boolean).length;
  const totalQuestions = currentMod?.question_ids?.length || 0;

  return (
    <div className="bg-[#EFF6FF] border border-[#2563EB] dashboard-card p-4 sm:p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm hover-accent-blue">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
          <PlayCircle size={22} />
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#2563EB] text-white rounded">
              Active Exam
            </span>
            <span className="text-sm font-bold text-[#1E293B]">
              {inProgress.label || 'Standard Digital SAT'}
            </span>
          </div>
          <p className="text-xs text-[#475569]">
            Module {inProgress.current_module_index + 1} of {inProgress.modules.length} ({currentMod?.section || 'In Progress'})
            {totalQuestions > 0 && ` · ${answeredCount}/${totalQuestions} answered`}
          </p>
        </div>
      </div>

      <button
        onClick={handleResume}
        disabled={isRestoring}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-colors shadow-sm shrink-0"
      >
        {isRestoring ? (
          <>
            <Loader2 size={16} className="animate-spin" /> Restoring Session...
          </>
        ) : (
          <>
            Resume Exam <ArrowRight size={15} />
          </>
        )}
      </button>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { questions, isLoading, sessions, questionDex } = useApp();
  const [inProgressExam, setInProgressExam] = useState<InProgressExamState | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [provider, setProvider] = useState<AIConfig['provider']>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [isDrilling, setIsDrilling] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const active = getInProgressExam();
    if (active) setInProgressExam(active);

    const config = getAIConfig();
    if (config) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
    }
  }, []);

  const handleDrillMissed = () => {
    setIsDrilling(true);
    const incorrectIds = new Set(
      Object.entries(questionDex.entries)
        .filter(([_, entry]) => entry.status === 'incorrect')
        .map(([id]) => id)
    );
    const missedQuestions = questions.filter((q) => incorrectIds.has(q.question_id));
    if (missedQuestions.length === 0) {
      setIsDrilling(false);
      return;
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const hasMath = missedQuestions.some((q) => q.section === 'Math');
    const hasRW = missedQuestions.some((q) => q.section === 'Reading and Writing');
    const estimatedTime = Math.max(10, Math.ceil(missedQuestions.length * 1.5));

    const state: InProgressExamState = {
      session_id: sessionId,
      exam_id: `drill_missed_${Date.now()}`,
      exam_type: 'custom',
      label: `Drill: ${missedQuestions.length} Missed Questions`,
      started_at: new Date().toISOString(),
      modules: [
        {
          module_num: 1,
          section: hasMath && !hasRW ? 'Math' : 'Reading and Writing',
          time_minutes: estimatedTime,
          question_ids: missedQuestions.map((q) => q.question_id),
        },
      ],
      current_module_index: 0,
      answers: {},
      time_per_question: {},
      completed_modules: [],
    };

    saveInProgressExam(state);
    router.push(`/exam/${sessionId}`);
  };

  const handleSaveConfig = () => {
    setAIConfig({ provider, apiKey });
    setIsSettingsOpen(false);
  };

  const handleExport = () => {
    const dataStr = exportData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', 'sat_practice_data.json');
    linkElement.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus('importing');
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importData(content);
        if (success) {
          setImportStatus('success');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          setImportStatus('error');
          setTimeout(() => setImportStatus('idle'), 3000);
        }
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="text-center">
          <div className="w-12 h-12 bg-[#2563EB] rounded-xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap size={24} className="text-white" />
          </div>
          <p className="text-[#64748B] text-sm font-medium">Loading SAT Practice Workspace…</p>
        </div>
      </div>
    );
  }

  const completedSessions = sessions.filter((s) => s.status === 'completed');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B]">
      {/* Top Header Masthead - Clean without 'Digital SAT Spec' */}
      <header className="border-b border-[#E2E8F0] bg-white sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-black tracking-tight text-[#1E293B]">
              Libre<span className="text-[#2563EB]">SAT</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://github.com/adriangbustos/LibreSAT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 flex items-center justify-center text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              title="GitHub Repository"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
            </a>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-9 h-9 flex items-center justify-center text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] rounded-lg transition-colors"
              title="Settings & Data Transfer"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container - Reduced top padding */}
      <main className="max-w-[1400px] mx-auto px-6 pt-4 pb-8">
        {/* Tier 0: Integrated Exam Readiness Engine */}
        <ExamReadinessBar
          questions={questions}
          onDrillMissed={handleDrillMissed}
          isDrilling={isDrilling}
        />

        {/* Tier 1A: Urgent In-Progress Exam */}
        <ActiveSessionBanner inProgress={inProgressExam} />

        {/* Tier 1B: Standard Test Pathways (3-Column Deck) */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Standard Examination Engines
            </h2>
            <span className="text-xs text-[#64748B]">Official Adaptive Specifications</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Full-Length SAT (No border until :hover, darker hover on button) */}
            <div className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-dark shadow-sm">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E293B] text-white flex items-center justify-center shadow-sm">
                    <Zap size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#1E293B] text-white rounded">
                    4 Modules · Adaptive
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1E293B]">Full-Length Digital SAT</h3>
              </div>
              <Link
                href="/select/full"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E293B] hover:bg-[#0F172A] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                Start Full Test <ChevronRight size={14} />
              </Link>
            </div>

            {/* Math Diagnostic (Royal Blue Accent) */}
            <div className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-blue shadow-sm">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-sm">
                    <Calculator size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] rounded">
                    2 Modules · 70 Mins
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1E293B]">Math Diagnostic</h3>
              </div>
              <Link
                href="/select/math"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB] text-xs font-bold rounded-lg transition-colors"
              >
                Launch Math Diagnostic <ChevronRight size={14} />
              </Link>
            </div>

            {/* English Diagnostic (Amber Accent) */}
            <div className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-amber shadow-sm">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-sm">
                    <BookOpen size={20} />
                  </div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A] rounded">
                    2 Modules · 64 Mins
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1E293B]">English Diagnostic</h3>
              </div>
              <Link
                href="/select/rw"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-[#FFFBEB] text-[#D97706] border border-[#F59E0B] text-xs font-bold rounded-lg transition-colors"
              >
                Launch R&W Diagnostic <ChevronRight size={14} />
              </Link>
            </div>

          </div>
        </div>

        {/* Tier 2: Targeted Practice & Utility Shelf */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">
            Targeted Practice & Archives
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            {/* Question Bank (#D97706 Amber) */}
            <Link
              href="/questionbank"
              className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-amber shadow-sm group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#D97706] text-white flex items-center justify-center shadow-sm">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Question Bank</h3>
                  <p className="text-[11px] text-[#64748B]">Custom practice sets</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#D97706] group-hover:translate-x-0.5 transition-transform pt-3 border-t border-[#F1F5F9]">
                <span>Build Practice Set</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* AI Exams (Indigo Accent) */}
            <Link
              href="/aiexams"
              className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-indigo shadow-sm group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#6366F1] text-white flex items-center justify-center shadow-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">AI Exams</h3>
                  <p className="text-[11px] text-[#64748B]">Targeted RAG quizzes</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#6366F1] group-hover:translate-x-0.5 transition-transform pt-3 border-t border-[#F1F5F9]">
                <span>Generate Quiz</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* Vocabulary (Rose Accent) */}
            <Link
              href="/vocabulary"
              className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-rose shadow-sm group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#F43F5E] text-white flex items-center justify-center shadow-sm">
                  <Type size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Vocabulary</h3>
                  <p className="text-[11px] text-[#64748B]">Spaced repetition</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#F43F5E] group-hover:translate-x-0.5 transition-transform pt-3 border-t border-[#F1F5F9]">
                <span>Study Vocabulary</span>
                <ChevronRight size={14} />
              </div>
            </Link>

            {/* Review Tests (Green #10B981) */}
            <Link
              href="/review"
              className="bg-white border border-[#E2E8F0] dashboard-card p-5 flex flex-col justify-between hover-accent-emerald shadow-sm group"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shadow-sm">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">Review Tests</h3>
                  <p className="text-[11px] text-[#64748B]">History & explanations</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs font-semibold text-[#10B981] group-hover:translate-x-0.5 transition-transform pt-3 border-t border-[#F1F5F9]">
                <span className="font-mono tabular-nums">{completedSessions.length} Tests Completed</span>
                <ChevronRight size={14} />
              </div>
            </Link>

          </div>
        </div>
      </main>

      {/* Settings & Transfer Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Settings & Data Management"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">
          {/* AI Settings Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-[#1E293B] border-b border-[#E2E8F0] pb-2 text-sm">
              AI Diagnostic Feedback
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Configure your API key to receive AI diagnostic feedback on completed exam questions. The key is stored locally in your browser.
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1E293B]">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIConfig['provider'])}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
              >
                <option value="gemini">Google Gemini (Gemini 3.5 Flash Lite)</option>
                <option value="openai">OpenAI (gpt-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Haiku)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#1E293B]">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="w-full px-3 py-2 bg-white border border-[#CBD5E1] rounded-lg text-xs text-[#1E293B] focus:outline-none focus:border-[#2563EB]"
              />
            </div>
          </div>

          {/* Data Transfer Section */}
          <div className="space-y-4 pt-4 border-t border-[#E2E8F0]">
            <h3 className="font-bold text-[#1E293B] border-b border-[#E2E8F0] pb-2 text-sm">
              Data Backup & Sync
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Export your QuestionDex question history and practice sessions to transfer progress to another device or browser.
            </p>

            {importStatus === 'success' ? (
              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[#16A34A] text-xs font-semibold flex items-center justify-center">
                <CheckCircle2 size={16} className="mr-2" /> Data imported successfully. Reloading...
              </div>
            ) : importStatus === 'error' ? (
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[#DC2626] text-xs font-semibold flex items-center justify-center">
                <XCircle size={16} className="mr-2" /> Failed to import JSON file.
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={importStatus === 'importing'}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#1E293B] transition-colors"
                >
                  <Download size={14} /> Export Backup
                </button>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImport}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importStatus === 'importing'}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#1E293B] transition-colors"
                >
                  {importStatus === 'importing' ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Importing...
                    </>
                  ) : (
                    <>
                      <Upload size={14} /> Import Backup
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[#E2E8F0]">
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <button
              onClick={handleSaveConfig}
              className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
