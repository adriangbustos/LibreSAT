'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Search, Filter, Clock, CheckCircle2, XCircle,
  BookMarked, Send, X
} from 'lucide-react';
import { useApp } from '@/app/context/AppContext';
import { getQuestionDexStats, updateQuestionDexEntry } from '@/app/lib/storage';
import type { Question, QuestionDexEntry, QuestionStatus } from '@/app/types';
import { MathText } from '@/app/components/ui/MathRenderer';
import { DifficultyBadge, SectionBadge } from '@/app/components/ui/Badge';
import { DataTable } from '@/app/components/ui/DataTable';
import { ProgressBar, CircularProgress } from '@/app/components/ui/ProgressBar';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';

// ─── Practice Modal ───────────────────────────────────────────────────────────
function PracticeModal({
  question,
  onClose,
  onComplete,
}: {
  question: Question | null;
  onClose: () => void;
  onComplete: (questionId: string, isCorrect: boolean, timeSpent: number) => void;
}) {
  const [answer, setAnswer] = useState<string>('');
  const [submitted, setSubmitted] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  // Live timer
  React.useEffect(() => {
    if (submitted) return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(id);
  }, [submitted, startTime]);

  if (!question) return null;

  const isCorrect = submitted && answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();

  const handleSubmit = () => {
    if (!answer) return;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);
    setSubmitted(true);
    onComplete(question.question_id, isCorrect, timeSpent);
  };

  const isEnglish = question.section === 'Reading and Writing';

  return (
    <Modal isOpen={!!question} onClose={onClose} title="Quick Practice" maxWidth={isEnglish ? "max-w-4xl" : "max-w-2xl"}>
      <div className={`space-y-4 ${isEnglish ? 'flex gap-6' : ''}`}>
        {/* Left Column (or full width if not English) */}
        <div className={isEnglish ? 'flex-1 min-w-0 pr-4 border-r border-[var(--border)] space-y-4' : 'space-y-4'}>
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <DifficultyBadge difficulty={question.difficulty} />
            <SectionBadge section={question.section} />
            <span className="text-xs text-[var(--text-muted)]">{question.domain}</span>
            <span className="ml-auto flex items-center gap-1 font-mono text-sm font-bold text-[var(--accent-indigo)]">
              <Clock size={13} /> {elapsed}s
            </span>
          </div>
          {/* Stimulus */}
          {question.stimulus && (
            <div className="question-stimulus text-sm">
              <MathText text={question.stimulus} />
            </div>
          )}

          {/* Visuals */}
          {question.image_url && (
            <img src={question.image_url} alt="Question Graphic" className={`w-full max-w-md max-h-64 object-contain mb-4 rounded-lg bg-white p-2 border border-[var(--border)] ${!isEnglish ? 'mx-auto' : ''}`} />
          )}
          {question.table_data && (
            <div className="mb-4">
              <DataTable data={question.table_data} />
            </div>
          )}
        </div>

        {/* Right Column (or below if not English) */}
        <div className={isEnglish ? 'flex-1 min-w-0 pl-2 space-y-4 flex flex-col justify-center' : 'space-y-4'}>
          {/* Question */}
          <div className="text-sm font-medium text-[var(--text-primary)] leading-relaxed">
            <MathText text={question.question_text} />
          </div>

          {/* Input */}
          {(question.is_open_ended || !question.options) ? (
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              disabled={submitted}
              placeholder="Enter numeric answer…"
              className="w-full max-w-xs px-4 py-3 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-indigo)] transition-all disabled:opacity-60"
            />
          ) : (
            <div className="space-y-2">
              {question.options && Object.entries(question.options).map(([letter, text]) => {
                let stateClass = '';
                if (submitted) {
                  if (question.correct_answer === letter) stateClass = 'correct';
                  else if (answer === letter) stateClass = 'incorrect';
                } else if (answer === letter) {
                  stateClass = 'selected';
                }
                return (
                  <button
                    key={letter}
                    className={`option-btn ${stateClass}`}
                    onClick={() => !submitted && setAnswer(letter)}
                    disabled={submitted}
                  >
                    <span className={`option-letter ${stateClass}`}>{letter}</span>
                    <MathText text={text} className="flex-1 text-sm" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Result */}
        {submitted && (
          <>
            <div className={`flex items-center gap-2 p-3 rounded-xl font-semibold text-sm ${isCorrect
                ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-400'
                : 'bg-rose-500/10 border border-rose-500/25 text-rose-400'
              }`}>
              {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              {isCorrect ? 'Correct!' : `Incorrect — Answer: ${question.correct_answer}`}
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Explanation</p>
              <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
                <MathText text={question.explanation} />
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={onClose} className="w-full">
              Close
            </Button>
          </>
        )}

        {!submitted && (
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            disabled={!answer}
            className="w-full"
          >
            <Send size={14} /> Submit Answer
          </Button>
        )}
      </div>
    </Modal>
  );
}

// ─── Coverage Bar ─────────────────────────────────────────────────────────────
function CoverageBar({ questions, entries }: { questions: Question[]; entries: Record<string, QuestionDexEntry> }) {
  const allIds = questions.map(q => q.question_id);
  const stats = getQuestionDexStats(allIds);

  const byDifficulty = (['Easy', 'Medium', 'Hard'] as const).map(diff => {
    const ids = questions.filter(q => q.difficulty === diff).map(q => q.question_id);
    return { diff, ...getQuestionDexStats(ids) };
  });

  return (
    <div className="glass-card p-5 mb-5">
      <div className="flex items-center gap-2 mb-4">
        <BookMarked size={16} className="text-[var(--accent-indigo)]" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Coverage Overview</h2>
      </div>

      {/* Overall */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-muted)]">Overall</span>
          <span className="text-xs font-bold text-[var(--text-primary)]">
            {stats.seen}/{stats.total} · {stats.seenPercent}%
          </span>
        </div>
        <ProgressBar value={stats.seenPercent} height={8} showLabel />
      </div>

      {/* By section */}
      {(['Reading and Writing', 'Math'] as const).map(section => {
        const ids = questions.filter(q => q.section === section).map(q => q.question_id);
        const s = getQuestionDexStats(ids);
        return (
          <div key={section} className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-[var(--text-muted)]">{section === 'Reading and Writing' ? 'R&W' : 'Math'}</span>
              <span className="text-xs text-[var(--text-secondary)]">{s.seen}/{s.total}</span>
            </div>
            <ProgressBar
              value={s.seenPercent}
              height={5}
              colorClass={section === 'Math' ? 'gradient-indigo' : 'gradient-cyan'}
            />
          </div>
        );
      })}

      {/* By difficulty */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {byDifficulty.map(({ diff, seen, total, correct }) => (
          <div key={diff} className="text-center p-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
            <DifficultyBadge difficulty={diff} className="mb-1.5" />
            <div className="text-sm font-bold text-[var(--text-primary)]">{seen}/{total}</div>
            {seen > 0 && (
              <div className="text-xs text-[var(--text-muted)]">
                {Math.round((correct / seen) * 100)}% acc
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Question Dex Card ────────────────────────────────────────────────────────
function QDexCard({
  question,
  entry,
  onClick,
}: {
  question: Question;
  entry: QuestionDexEntry | undefined;
  onClick: () => void;
}) {
  const status = entry?.status ?? 'unseen';
  const cardClass = status === 'correct'
    ? 'seen-correct'
    : status === 'incorrect'
      ? 'seen-incorrect'
      : 'unseen bg-[var(--bg-elevated)]';

  return (
    <div className={`qdex-card ${cardClass}`} onClick={onClick}>
      {/* Status indicator */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          {question.question_id.slice(0, 8)}
        </span>
        {status === 'correct' && <CheckCircle2 size={12} className="text-emerald-400" />}
        {status === 'incorrect' && <XCircle size={12} className="text-rose-400" />}
        {status === 'unseen' && <div className="w-2 h-2 rounded-full bg-[var(--border-light)]" />}
      </div>

      <DifficultyBadge difficulty={question.difficulty} className="mb-1.5" />
      <div className="text-[10px] text-[var(--text-muted)] leading-tight line-clamp-2">
        {question.skill}
      </div>

      {entry?.time_spent_seconds != null && (
        <div className="mt-1.5 text-[9px] text-[var(--text-muted)] flex items-center gap-0.5">
          <Clock size={8} /> {entry.time_spent_seconds}s
        </div>
      )}
    </div>
  );
}

// ─── Main QuestionDex Page ────────────────────────────────────────────────────
export default function QuestionDexPage() {
  const { questions, questionDex, refreshQuestionDex, isLoading } = useApp();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unseen' | 'correct' | 'incorrect'>('all');
  const [filterSection, setFilterSection] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [practiceQuestion, setPracticeQuestion] = useState<Question | null>(null);

  const domains = useMemo(() => [...new Set(questions.map(q => q.domain))].sort(), [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      const entry = questionDex.entries[q.question_id];
      const status = entry?.status ?? 'unseen';

      if (filterStatus !== 'all' && status !== filterStatus) return false;
      if (filterSection && q.section !== filterSection) return false;
      if (filterDomain && q.domain !== filterDomain) return false;
      if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!q.question_id.toLowerCase().includes(s) &&
          !q.question_text.toLowerCase().includes(s) &&
          !q.domain.toLowerCase().includes(s) &&
          !q.skill.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [questions, questionDex, filterStatus, filterSection, filterDomain, filterDifficulty, search]);

  const handleCardClick = useCallback((question: Question) => {
    setPracticeQuestion(question);
  }, []);

  const handlePracticeComplete = useCallback((questionId: string, isCorrect: boolean, timeSpent: number) => {
    updateQuestionDexEntry(questionId, isCorrect ? 'correct' : 'incorrect', timeSpent);
    refreshQuestionDex();
  }, [refreshQuestionDex]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(5,8,16,0.85)] backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-bold">QuestionDex</span>
          <span className="text-xs text-[var(--text-muted)] ml-2">
            {filteredQuestions.length} / {questions.length} shown
          </span>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-6 flex gap-6">
        {/* ─── Left Panel: Analytics ─── */}
        <aside className="w-72 flex-shrink-0 hidden lg:block">
          <CoverageBar questions={questions} entries={questionDex.entries} />

          {/* Domain breakdown */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">By Domain</h3>
            <div className="space-y-2.5">
              {domains.map(domain => {
                const dqs = questions.filter(q => q.domain === domain);
                const s = getQuestionDexStats(dqs.map(q => q.question_id));
                return (
                  <div key={domain}>
                    <div className="flex items-center justify-between mb-1">
                      <button
                        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-left"
                        onClick={() => setFilterDomain(d => d === domain ? '' : domain)}
                      >
                        {domain}
                      </button>
                      <span className="text-xs text-[var(--text-muted)]">{s.seenPercent}%</span>
                    </div>
                    <ProgressBar value={s.seenPercent} height={4} />
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ─── Main Panel: Grid + Filters ─── */}
        <div className="flex-1 min-w-0">
          {/* Search + Filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search ID, text, domain…"
                className="w-full pl-8 pr-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-indigo)] transition-all"
              />
            </div>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-indigo)] transition-all"
            >
              <option value="all">All Status</option>
              <option value="unseen">Unseen</option>
              <option value="correct">Correct</option>
              <option value="incorrect">Incorrect</option>
            </select>

            {/* Section filter */}
            <select
              value={filterSection}
              onChange={e => setFilterSection(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-indigo)] transition-all"
            >
              <option value="">All Sections</option>
              <option value="Reading and Writing">Reading & Writing</option>
              <option value="Math">Math</option>
            </select>

            {/* Domain filter */}
            <select
              value={filterDomain}
              onChange={e => setFilterDomain(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-indigo)] transition-all"
            >
              <option value="">All Domains</option>
              {domains.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Difficulty filter */}
            <select
              value={filterDifficulty}
              onChange={e => setFilterDifficulty(e.target.value)}
              className="px-3 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[var(--accent-indigo)] transition-all"
            >
              <option value="">All Difficulties</option>
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>

            {/* Clear filters */}
            {(search || filterStatus !== 'all' || filterSection || filterDomain || filterDifficulty) && (
              <button
                onClick={() => {
                  setSearch('');
                  setFilterStatus('all');
                  setFilterSection('');
                  setFilterDomain('');
                  setFilterDifficulty('');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs text-rose-400 border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
              >
                <X size={11} /> Clear
              </button>
            )}
          </div>

          {/* Grid */}
          <div className="qdex-grid">
            {filteredQuestions.map(q => (
              <QDexCard
                key={q.question_id}
                question={q}
                entry={questionDex.entries[q.question_id]}
                onClick={() => handleCardClick(q)}
              />
            ))}
          </div>

          {filteredQuestions.length === 0 && (
            <div className="text-center py-16 text-[var(--text-muted)]">
              <Search size={32} className="mx-auto mb-3 opacity-40" />
              <p>No questions match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* Practice Modal */}
      <PracticeModal
        question={practiceQuestion}
        onClose={() => setPracticeQuestion(null)}
        onComplete={handlePracticeComplete}
      />
    </div>
  );
}
