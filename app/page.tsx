'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen, Calculator, LayoutGrid, History, Zap,
  BookMarked, TrendingUp, ChevronRight, Dices, PlayCircle
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { getQuestionDexStats, getInProgressExam } from './lib/storage';
import { ProgressBar } from './components/ui/ProgressBar';
import { Button } from './components/ui/Button';

function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(5,8,16,0.85)] backdrop-blur-xl">
      <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 gradient-indigo rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-[var(--text-primary)] font-bold text-lg tracking-tight">
            SAT Practice
          </span>
        </div>
        <nav className="flex items-center gap-1">
          <Link href="/questiondex" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all">
            <BookMarked size={14} />
            QuestionDex
          </Link>
          <Link href="/questionbank" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all">
            <LayoutGrid size={14} />
            Question Bank
          </Link>
          <Link href="/review" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] transition-all">
            <History size={14} />
            Review
          </Link>
        </nav>
      </div>
    </header>
  );
}

// ─── QuestionDex Tile ─────────────────────────────────────────────────────────
function QuestionDexTile({ questions }: { questions: { question_id: string; section: string }[] }) {
  const { questionDex } = useApp();
  const allIds = questions.map(q => q.question_id);
  const stats = getQuestionDexStats(allIds);
  const rwIds = questions.filter(q => q.section === 'Reading and Writing').map(q => q.question_id);
  const mathIds = questions.filter(q => q.section === 'Math').map(q => q.question_id);
  const rwStats = getQuestionDexStats(rwIds);
  const mathStats = getQuestionDexStats(mathIds);

  return (
    <div className="glass-card glass-card-hover h-full p-6 flex flex-col bento-tile-xl animate-fadeIn animate-fadeIn-1">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center">
            <BookMarked size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] font-bold text-lg">QuestionDex</h2>
            <p className="text-[var(--text-muted)] text-xs">Your question coverage tracker</p>
          </div>
        </div>
        <Link href="/questiondex">
          <Button variant="secondary" size="sm">
            Open <ChevronRight size={13} />
          </Button>
        </Link>
      </div>

      {/* Overall Progress */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-[var(--text-secondary)] font-medium">Overall Coverage</span>
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {stats.seen} / {stats.total}
          </span>
        </div>
        <ProgressBar value={stats.seenPercent} height={10} showLabel />
      </div>

      {/* Subject breakdown */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {/* R&W */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="text-xs text-[var(--text-muted)] font-medium">Reading & Writing</span>
          </div>
          <div className="text-2xl font-bold text-cyan-400">{rwStats.seenPercent}%</div>
          <div className="text-xs text-[var(--text-muted)]">{rwStats.seen}/{rwStats.total} seen</div>
          <ProgressBar value={rwStats.seenPercent} height={4} colorClass="gradient-cyan" className="mt-2" />
        </div>
        {/* Math */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs text-[var(--text-muted)] font-medium">Math</span>
          </div>
          <div className="text-2xl font-bold text-violet-400">{mathStats.seenPercent}%</div>
          <div className="text-xs text-[var(--text-muted)]">{mathStats.seen}/{mathStats.total} seen</div>
          <ProgressBar value={mathStats.seenPercent} height={4} colorClass="gradient-indigo" className="mt-2" />
        </div>
      </div>

      {/* Accuracy */}
      {stats.seen > 0 && (
        <div className="mt-auto grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-bold text-emerald-400">{stats.correct}</div>
            <div className="text-xs text-[var(--text-muted)]">Correct</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="text-lg font-bold text-rose-400">{stats.incorrect}</div>
            <div className="text-xs text-[var(--text-muted)]">Incorrect</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
            <div className="text-lg font-bold text-[var(--text-primary)]">
              {stats.seen > 0 ? Math.round((stats.correct / stats.seen) * 100) : 0}%
            </div>
            <div className="text-xs text-[var(--text-muted)]">Accuracy</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Exam Launch Tile ────────────────────────────────────────────────────────
interface ExamTileProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient: string;
  delay: string;
}

function ExamTile({ href, icon, title, subtitle, gradient, delay }: ExamTileProps) {
  return (
    <Link href={href} className={`glass-card glass-card-hover h-full p-5 flex flex-col justify-between cursor-pointer bento-tile-md animate-fadeIn ${delay} group`}>
      <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div>
        <h3 className="text-[var(--text-primary)] font-bold text-base mb-0.5 group-hover:gradient-text-indigo transition-all">{title}</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-[var(--accent-indigo)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        Select Exam <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Question Bank Tile ───────────────────────────────────────────────────────
function QuestionBankTile() {
  return (
    <Link href="/questionbank" className="glass-card glass-card-hover h-full p-5 flex flex-col bento-tile-md animate-fadeIn animate-fadeIn-5 group cursor-pointer">
      <div className="w-10 h-10 gradient-amber rounded-xl flex items-center justify-center mb-3">
        <LayoutGrid size={20} className="text-white" />
      </div>
      <h3 className="text-[var(--text-primary)] font-bold text-base mb-1">Question Bank</h3>
      <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-4">
        Build a custom practice set filtered by subject, domain, skill, and difficulty.
      </p>
      <div className="mt-auto space-y-1.5">
        {['Subject & Domain', 'Skill Tags', 'Difficulty Mix'].map((tag) => (
          <div key={tag} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <div className="w-1 h-1 rounded-full bg-amber-400" />
            {tag}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-[var(--accent-indigo)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        Build Set <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Review Tests Tile ────────────────────────────────────────────────────────
function ReviewTestsTile({ sessionCount }: { sessionCount: number }) {
  return (
    <Link href="/review" className="glass-card glass-card-hover h-full p-5 flex flex-col bento-tile-md animate-fadeIn animate-fadeIn-6 group cursor-pointer">
      <div className="w-10 h-10 gradient-rose rounded-xl flex items-center justify-center mb-3">
        <History size={20} className="text-white" />
      </div>
      <h3 className="text-[var(--text-primary)] font-bold text-base mb-1">Review Tests</h3>
      <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-4">
        Access your complete test history with blind review and explanation modes.
      </p>
      <div className="mt-auto">
        {sessionCount > 0 ? (
          <div className="inline-flex items-center gap-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2">
            <TrendingUp size={14} className="text-[var(--accent-indigo)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">{sessionCount}</span>
            <span className="text-xs text-[var(--text-muted)]">test{sessionCount !== 1 ? 's' : ''} completed</span>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">No tests completed yet</span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs text-[var(--accent-indigo)] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        View Archive <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Resume Session Tile ──────────────────────────────────────────────────────
function ResumeSessionTile() {
  const [inProgressId, setInProgressId] = React.useState<string | null>(null);
  
  React.useEffect(() => {
    const exam = getInProgressExam();
    if (exam) setInProgressId(exam.session_id);
  }, []);

  const content = (
    <>
      <div className={`w-10 h-10 ${inProgressId ? 'gradient-emerald' : 'bg-[var(--bg-muted)]'} rounded-xl flex items-center justify-center mb-3`}>
        <PlayCircle size={20} className={inProgressId ? 'text-white' : 'text-[var(--text-muted)]'} />
      </div>
      <div>
        <h3 className={`text-[var(--text-primary)] font-bold text-base mb-1 transition-all ${inProgressId ? 'group-hover:text-emerald-400' : ''}`}>Restore Session</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
          {inProgressId ? 'You have an exam in progress. Click to resume where you left off.' : 'No active session.'}
        </p>
      </div>
      <div className={`flex items-center gap-1 mt-auto text-xs font-semibold transition-opacity ${inProgressId ? 'text-[var(--accent-emerald)] opacity-0 group-hover:opacity-100' : 'text-[var(--text-muted)] opacity-50'}`}>
        {inProgressId ? <>Resume <ChevronRight size={12} /></> : '--'}
      </div>
    </>
  );

  if (inProgressId) {
    return (
      <Link href={`/exam/${inProgressId}`} className="glass-card glass-card-hover h-full p-5 flex flex-col bento-tile-sm-tall animate-fadeIn animate-fadeIn-2 group">
        {content}
      </Link>
    );
  }

  return (
    <div className="glass-card h-full p-5 flex flex-col bento-tile-sm-tall animate-fadeIn animate-fadeIn-2 group opacity-60">
      {content}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { questions, isLoading, sessions } = useApp();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 gradient-indigo rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Zap size={24} className="text-white" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm">Loading SAT database…</p>
        </div>
      </div>
    );
  }

  const completedSessions = sessions.filter(s => s.status === 'completed');

  return (
    <>
      <NavBar />
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 animate-fadeIn">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-1">
            <span className="gradient-text-indigo">SAT</span> Practice Platform
          </h1>
          <p className="text-[var(--text-secondary)] text-sm">
            {questions.length.toLocaleString()} questions · Digital SAT format · Full analytics
          </p>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* QuestionDex — large spanning tile */}
          <QuestionDexTile questions={questions} />

          {/* Full-Length Exam */}
          <ExamTile
            href="/select/full"
            icon={<Zap size={20} className="text-white" />}
            title="Full-Length SAT"
            subtitle="4 modules · R&W + Math · 2h 14m · Score 400–1600"
            gradient="gradient-indigo"
            delay="animate-fadeIn-2"
          />

          {/* Resume Session */}
          <ResumeSessionTile />

          {/* English Diagnostic */}
          <ExamTile
            href="/select/rw"
            icon={<BookOpen size={20} className="text-white" />}
            title="English Diagnostic"
            subtitle="2 modules · Reading & Writing · 64 minutes · Score 200–800"
            gradient="gradient-cyan"
            delay="animate-fadeIn-3"
          />

          {/* Math Diagnostic */}
          <ExamTile
            href="/select/math"
            icon={<Calculator size={20} className="text-white" />}
            title="Math Diagnostic"
            subtitle="2 modules · Algebra, Geometry, Advanced Math · 70 minutes · Score 200–800"
            gradient="gradient-indigo"
            delay="animate-fadeIn-4"
          />

          {/* Question Bank */}
          <QuestionBankTile />

          {/* Review Tests */}
          <ReviewTestsTile sessionCount={completedSessions.length} />
        </div>
      </main>
    </>
  );
}
