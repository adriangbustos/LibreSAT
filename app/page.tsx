'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  BookOpen, Calculator, LayoutGrid, History, Zap,
  BookMarked, TrendingUp, ChevronRight, Dices, PlayCircle, Type, Loader2,
  Settings, Download, Upload, CheckCircle2, XCircle
} from 'lucide-react';
import { useApp } from './context/AppContext';
import { getQuestionDexStats, getInProgressExam, getAIConfig, setAIConfig, exportData, importData, type AIConfig } from './lib/storage';
import { ProgressBar } from './components/ui/ProgressBar';
import { Button } from './components/ui/Button';
import { Modal } from './components/ui/Modal';
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
function VocabularyTile({ className = "col-span-1 md:col-span-12 lg:col-span-3" }: { className?: string }) {
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
      {isRestoring && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-wait">
          <div className="bg-[var(--bg-surface)] p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4 animate-scaleIn">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-indigo)]" />
            <p className="font-semibold text-[var(--text-primary)]">Restoring your session...</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );

  if (inProgressId) {
    return (
      <div onClick={handleRestore} className={`cursor-pointer glass-card glass-card-hover hover-emerald h-full p-5 flex flex-col animate-fadeIn animate-fadeIn-2 group ${className}`}>
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [provider, setProvider] = useState<AIConfig['provider']>('gemini');
  const [apiKey, setApiKey] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');

  useEffect(() => {
    const config = getAIConfig();
    if (config) {
      setProvider(config.provider);
      setApiKey(config.apiKey);
    }
  }, []);

  const handleSaveConfig = () => {
    setAIConfig({ provider, apiKey });
    setIsSettingsOpen(false);
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const dataStr = exportData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportFileDefaultName = 'sat_practice_data.json';
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
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
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
        <div className="mb-6 animate-fadeIn flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] mb-1">
            Libre<span className="gradient-text-indigo">SAT</span>
          </h1>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/adriangbustos/LibreSAT"
              target="_blank"
              rel="noopener noreferrer"
              className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
              title="GitHub Repository"
            >
              <i className="bx bxl-github text-[22px]"></i>
            </a>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="w-10 h-10 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] rounded-full transition-colors"
              title="Settings"
            >
              <Settings size={22} />
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* Row 1 & 2 Left: QuestionDex (spans 5 cols, 2 rows) */}
          <QuestionDexTile questions={questions} className="bento-tile-xl" />

          {/* Row 1 & 2 Right: 2x2 Grid (spans 7 cols, 2 rows) */}
          <div className="col-span-1 md:col-span-12 lg:col-span-7 row-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            className="col-span-1 md:col-span-12 lg:col-span-4 row-span-1"
          />
          <QuestionBankTile className="col-span-1 md:col-span-12 lg:col-span-4 row-span-1" />
          <ReviewTestsTile sessionCount={completedSessions.length} className="col-span-1 md:col-span-12 lg:col-span-4 row-span-1" />
        </div>
      </main>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Settings"
        maxWidth="max-w-md"
      >
        <div className="space-y-6">

          {/* AI Settings Section */}
          <div className="space-y-4">
            <h3 className="font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">AI Diagnostic</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Configure your AI provider to receive diagnostic feedback on your exam results. Your API key is stored securely in your browser's local storage.
            </p>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">AI Provider</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as AIConfig['provider'])}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-indigo)]"
              >
                <option value="gemini">Google Gemini (Gemini 3.6 Flash)</option>
                <option value="openai">OpenAI (gpt-4o-mini)</option>
                <option value="anthropic">Anthropic (Claude 3.5 Haiku)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-primary)]">API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === 'gemini' ? 'Gemini' : provider === 'openai' ? 'OpenAI' : 'Anthropic'} API key`}
                className="w-full px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-indigo)]"
              />
            </div>

          </div>

          {/* Data Transfer Section */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <h3 className="font-bold text-[var(--text-primary)] border-b border-[var(--border)] pb-2">Data Transfer</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              Export your data to transfer your progress to another device or browser. You can import this data file later to pick up exactly where you left off.
            </p>
            {importStatus === 'success' ? (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-700 text-sm font-semibold flex items-center justify-center animate-fadeIn">
                <CheckCircle2 size={16} className="mr-2" /> Data imported successfully! Reloading...
              </div>
            ) : importStatus === 'error' ? (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-700 text-sm font-semibold flex items-center justify-center animate-fadeIn">
                <XCircle size={16} className="mr-2" /> Failed to import data.
              </div>
            ) : (
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleExport} className="flex-1" disabled={importStatus === 'importing'}>
                  <Download size={16} className="mr-2" /> Export Data
                </Button>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImport}
                />
                <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="flex-1" disabled={importStatus === 'importing'}>
                  {importStatus === 'importing' ? (
                    <><Loader2 size={16} className="mr-2 animate-spin" /> Importing...</>
                  ) : (
                    <><Upload size={16} className="mr-2" /> Import Data</>
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border)] mt-6">
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveConfig}>
              Save Configuration
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
