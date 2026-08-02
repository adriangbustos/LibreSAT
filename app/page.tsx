'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen, Calculator, LayoutGrid, History, Zap,
  BookMarked, TrendingUp, ChevronRight, Dices, PlayCircle, Type, Loader2
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { getQuestionDexStats, getInProgressExam } from './lib/storage';
import { ProgressBar } from './components/ui/ProgressBar';
import { Button } from './components/ui/Button';
import { useRouter } from 'next/navigation';


// ─── QuestionDex Tile ─────────────────────────────────────────────────────────
function QuestionDexTile({ questions, className = "bento-tile-xl" }: { questions: { question_id: string; section: string }[], className?: string }) {
  const { questionDex } = useApp();
  const allIds = questions.map(q => q.question_id);
  const stats = getQuestionDexStats(allIds);
  const rwIds = questions.filter(q => q.section === 'Reading and Writing').map(q => q.question_id);
  const mathIds = questions.filter(q => q.section === 'Math').map(q => q.question_id);
  const rwStats = getQuestionDexStats(rwIds);
  const mathStats = getQuestionDexStats(mathIds);

  return (
    <div className={`glass-card glass-card-hover h-full p-6 flex flex-col animate-fadeIn animate-fadeIn-1 ${className}`}>
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
            <div className="w-2 h-2 rounded-full bg-[var(--accent-indigo)]" />
            <span className="text-xs text-[var(--text-muted)] font-medium">Reading & Writing</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{rwStats.seenPercent}%</div>
          <div className="text-xs text-[var(--text-muted)]">{rwStats.seen}/{rwStats.total} seen</div>
          <ProgressBar value={rwStats.seenPercent} height={4} colorClass="gradient-indigo" className="mt-2" />
        </div>
        {/* Math */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-[var(--accent-indigo)]" />
            <span className="text-xs text-[var(--text-muted)] font-medium">Math</span>
          </div>
          <div className="text-2xl font-bold text-[var(--text-primary)]">{mathStats.seenPercent}%</div>
          <div className="text-xs text-[var(--text-muted)]">{mathStats.seen}/{mathStats.total} seen</div>
          <ProgressBar value={mathStats.seenPercent} height={4} colorClass="gradient-indigo" className="mt-2" />
        </div>
      </div>

      {/* Accuracy */}
      {stats.seen > 0 && (
        <div className="mt-auto grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="text-lg font-bold text-emerald-700">{stats.correct}</div>
            <div className="text-xs text-[var(--text-muted)]">Correct</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
            <div className="text-lg font-bold text-rose-700">{stats.incorrect}</div>
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
  className?: string;
}

function ExamTile({ href, icon, title, subtitle, gradient, delay, className = "bento-tile-md" }: ExamTileProps) {
  const color = gradient.replace('gradient-', '');
  const hoverClass = color === 'indigo' ? '' : `hover-${color}`;
  
  return (
    <Link href={href} className={`glass-card glass-card-hover ${hoverClass} h-full p-5 flex flex-col justify-between cursor-pointer animate-fadeIn ${delay} group ${className}`}>
      <div className={`w-10 h-10 ${gradient} rounded-xl flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div>
        <h3 className="text-[var(--text-primary)] font-bold text-base mb-0.5 group-hover:text-[color:var(--hover-border,var(--accent-indigo))] transition-all">{title}</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--hover-border, var(--accent-indigo))' }}>
        Select Exam <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Question Bank Tile ───────────────────────────────────────────────────────
function QuestionBankTile({ className = "bento-tile-md" }: { className?: string }) {
  return (
    <Link href="/questionbank" className={`glass-card glass-card-hover hover-amber h-full p-5 flex flex-col animate-fadeIn animate-fadeIn-5 group cursor-pointer ${className}`}>
      <div className="w-10 h-10 gradient-amber rounded-xl flex items-center justify-center mb-3">
        <LayoutGrid size={20} className="text-white" />
      </div>
      <div>
        <h3 className="text-[var(--text-primary)] font-bold text-base mb-1 group-hover:text-[color:var(--hover-border,var(--accent-indigo))] transition-all">Question Bank</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-4">
          Build a custom practice set filtered by subject, domain, skill, and difficulty.
        </p>
      </div>
      <div className="mt-auto space-y-1.5">
        {['Subject & Domain', 'Skill Tags', 'Difficulty Mix'].map((tag) => (
          <div key={tag} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <div className="w-1 h-1 rounded-full bg-amber-400" />
            {tag}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--hover-border, var(--accent-indigo))' }}>
        Build Set <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Review Tests Tile ────────────────────────────────────────────────────────
function ReviewTestsTile({ sessionCount, className = "bento-tile-md" }: { sessionCount: number, className?: string }) {
  return (
    <Link href="/review" className={`glass-card glass-card-hover hover-rose h-full p-5 flex flex-col justify-between animate-fadeIn animate-fadeIn-6 group cursor-pointer ${className}`}>
      <div className="w-10 h-10 gradient-rose rounded-xl flex items-center justify-center mb-3">
        <History size={20} className="text-white" />
      </div>
      <div>
        <h3 className="text-[var(--text-primary)] font-bold text-base mb-1 group-hover:text-[color:var(--hover-border,var(--accent-indigo))] transition-all">Review Tests</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-4">
          Access your complete test history with blind review and explanation modes.
        </p>
      </div>
      <div className="mt-auto">
        {sessionCount > 0 ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)]">
            <TrendingUp size={12} className="text-emerald-700" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">{sessionCount}</span>
            <span className="text-xs text-[var(--text-muted)]">test{sessionCount !== 1 ? 's' : ''} completed</span>
          </div>
        ) : (
          <span className="text-xs text-[var(--text-muted)]">No tests completed yet</span>
        )}
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--hover-border, var(--accent-indigo))' }}>
        View Archive <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Vocabulary Tile ──────────────────────────────────────────────────────────
function VocabularyTile({ className = "col-span-12 lg:col-span-3" }: { className?: string }) {
  return (
    <Link href="/vocabulary" className={`glass-card glass-card-hover hover-rose h-full p-5 flex flex-col justify-between animate-fadeIn animate-fadeIn-5 group cursor-pointer ${className}`}>
      <div className="w-10 h-10 gradient-rose rounded-xl flex items-center justify-center mb-3">
        <Type size={20} className="text-white" />
      </div>
      <div>
        <h3 className="text-[var(--text-primary)] font-bold text-base mb-1 group-hover:text-[color:var(--hover-border,var(--accent-indigo))] transition-all">Vocabulary</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed">
          Master SAT vocabulary words with targeted spaced repetition.
        </p>
      </div>
      <div className="flex items-center gap-1 mt-3 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--hover-border, var(--accent-indigo))' }}>
        Practice Vocab <ChevronRight size={12} />
      </div>
    </Link>
  );
}

// ─── Resume Session Tile ──────────────────────────────────────────────────────
function ResumeSessionTile({ className = "bento-tile-sm-tall" }: { className?: string }) {
  const [inProgressId, setInProgressId] = React.useState<string | null>(null);
  const [isRestoring, setIsRestoring] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const exam = getInProgressExam();
    if (exam) setInProgressId(exam.session_id);
  }, []);

  const handleRestore = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!inProgressId) return;
    setIsRestoring(true);
    router.push(`/exam/${inProgressId}`);
  };

  const content = (
    <>
      <div className={`w-10 h-10 ${inProgressId ? 'gradient-emerald' : 'bg-[var(--bg-muted)]'} rounded-xl flex items-center justify-center mb-3`}>
        {isRestoring ? (
          <Loader2 size={20} className="animate-spin text-white" />
        ) : (
          <PlayCircle size={20} className={inProgressId ? 'text-white' : 'text-[var(--text-muted)]'} />
        )}
      </div>
      <div>
        <h3 className={`text-[var(--text-primary)] font-bold text-base mb-1`}>Restore Session</h3>
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
      <div onClick={handleRestore} className={`cursor-pointer glass-card glass-card-hover h-full p-5 flex flex-col animate-fadeIn animate-fadeIn-2 group ${className}`}>
        {content}
      </div>
    );
  }

  return (
    <div className={`glass-card h-full p-5 flex flex-col animate-fadeIn animate-fadeIn-2 group opacity-60 ${className}`}>
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
      <main className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6 animate-fadeIn">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-1">
            <span className="gradient-text-indigo">SAT</span> Practice Platform
          </h1>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* Row 1 & 2 Left: QuestionDex (spans 5 cols, 2 rows) */}
          <QuestionDexTile questions={questions} className="bento-tile-xl" />

          {/* Row 1 & 2 Right: 2x2 Grid (spans 7 cols, 2 rows) */}
          <div className="col-span-12 lg:col-span-7 row-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <ExamTile
              href="/select/math"
              icon={<Calculator size={20} className="text-white" />}
              title="Math Diagnostic"
              subtitle="2 modules · Algebra, Geometry, Advanced Math · 70 mins"
              gradient="gradient-indigo"
              delay="animate-fadeIn-2"
              className="h-full"
            />
            <ResumeSessionTile className="h-full" />

            <ExamTile
              href="/select/rw"
              icon={<BookOpen size={20} className="text-white" />}
              title="English Diagnostic"
              subtitle="2 modules · Reading & Writing · 64 mins"
              gradient="gradient-amber"
              delay="animate-fadeIn-3"
              className="h-full"
            />
            <VocabularyTile className="h-full" />
          </div>

          {/* Row 3: Bottom 3 tiles */}
          <ExamTile
            href="/select/full"
            icon={<Zap size={20} className="text-white" />}
            title="Full-Length SAT"
            subtitle="4 modules · R&W + Math · 2h 14m · Score 400–1600"
            gradient="gradient-indigo"
            delay="animate-fadeIn-4"
            className="col-span-12 lg:col-span-4 row-span-1"
          />
          <QuestionBankTile className="col-span-12 lg:col-span-4 row-span-1" />
          <ReviewTestsTile sessionCount={completedSessions.length} className="col-span-12 lg:col-span-4 row-span-1" />
        </div>
      </main>
    </>
  );
}
