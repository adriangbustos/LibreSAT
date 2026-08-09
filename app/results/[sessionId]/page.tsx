'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, Trophy, Target, Clock, BookOpen, Home,
    ChevronDown, ChevronUp, CheckCircle2, XCircle
  } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
  } from 'recharts';
import { getTestSession } from '@/app/lib/storage';
import { loadQuestionsMap } from '@/app/lib/db';
import type { TestSession, Question, ModuleResult, QuestionResult } from '@/app/types';
import { MathText } from '@/app/components/ui/MathRenderer';
import { Modal } from '@/app/components/ui/Modal';
import { DifficultyBadge, SectionBadge } from '@/app/components/ui/Badge';
import { CircularProgress } from '@/app/components/ui/ProgressBar';
import { Button } from '@/app/components/ui/Button';
import { DataTable } from '@/app/components/ui/DataTable';
import { AutoSizedImage } from '@/app/components/ui/AutoSizedImage';

// ─── Time formatting helpers ──────────────────────────────────────────────────
function formatSeconds(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return s === 0 ? `${m}m` : `${m}m ${s}s`;
}

function avgSecondsPerQuestion(results: QuestionResult[]): number {
  if (!results.length) return 0;
  const total = results.reduce((acc, r) => acc + r.time_spent_seconds, 0);
  return Math.round(total / results.length);
}

// ─── Quick-Look Modal ────────────────────────────────────────────────────────
function QuickLookModal({
  isOpen,
  onClose,
  question,
  result,
}: {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  result: QuestionResult | null;
}) {
  if (!question || !result) return null;
  const isCorrect = result.is_correct;

  const isEnglish = question.section === 'Reading and Writing';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Question Review" maxWidth={isEnglish ? "max-w-5xl" : "max-w-2xl"}>
      <div className={`space-y-4 ${isEnglish ? 'flex gap-6' : ''}`}>
        <div className={isEnglish ? 'flex-1 min-w-0 pr-4 border-r border-[var(--border)] space-y-4' : 'space-y-4'}>
          {/* Meta */}
          <div className="flex items-center gap-2 flex-wrap">
            <DifficultyBadge difficulty={question.difficulty} />
            <SectionBadge section={question.section} />
            <span className="text-xs text-[var(--text-muted)]">{question.domain} · {question.skill}</span>
            <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded border border-[var(--border)]">
              ID: {question.question_id}
            </span>
            <span className="ml-auto text-xs text-[var(--text-muted)] flex items-center gap-1">
              <Clock size={11} /> {result.time_spent_seconds}s spent
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
            <AutoSizedImage src={question.image_url} className={`mb-4 ${!isEnglish ? 'mx-auto max-w-[400px] max-h-[400px]' : ''}`} />
          )}
          {question.table_data && (
            <DataTable data={question.table_data} />
          )}
        </div>

        <div className={isEnglish ? 'flex-1 min-w-0 pl-2 space-y-4' : 'space-y-4'}>
          {/* Question */}
          <div className="text-sm text-[var(--text-primary)] font-medium leading-relaxed">
            <MathText text={question.question_text} />
          </div>

          {/* Answers */}
          {(question.is_open_ended || !question.options) ? (
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-[var(--text-muted)] text-xs">Your answer:</span>
                <span className={`ml-2 font-mono font-bold ${isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {result.user_answer ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)] text-xs">Correct:</span>
                <span className="ml-2 font-mono font-bold text-emerald-700">{question.correct_answer}</span>
              </div>
            </div>
          ) : (
            question.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(question.options).map(([letter, text]) => {
                  const isUserChoice = result.user_answer === letter;
                  const isCorrectAnswer = question.correct_answer === letter;
                  return (
                    <div
                      key={letter}
                      className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm ${isCorrectAnswer
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                        : isUserChoice
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-700'
                          : 'border-[var(--border)] text-[var(--text-muted)]'
                        }`}
                    >
                      <span className="font-bold text-xs min-w-[16px]">{letter}.</span>
                      <MathText text={text} autoWrapMath={true} />
                      {isCorrectAnswer && <CheckCircle2 size={14} className="ml-auto flex-shrink-0 text-emerald-700" />}
                      {isUserChoice && !isCorrectAnswer && <XCircle size={14} className="ml-auto flex-shrink-0 text-rose-700" />}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* Outcome */}
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-semibold ${isCorrect
            ? 'bg-emerald-500/10 border border-emerald-500/25 text-emerald-700'
            : 'bg-rose-500/10 border border-rose-500/25 text-rose-700'
            }`}>
            {isCorrect ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {isCorrect ? 'Correct!' : 'Incorrect'}
            <span className="ml-auto font-normal text-xs text-[var(--text-muted)]">
              Time: {result.time_spent_seconds}s
            </span>
          </div>

          {/* Explanation */}
          <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border)]">
            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Official Explanation</h4>
            <div className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              <MathText text={question.explanation ? question.explanation.replace(/([.?!]["'”’\])]*)\s*(Choice [A-Z])/g, '$1\n\n$2') : ''} />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Timing Chart ────────────────────────────────────────────────────────────
interface ChartDataPoint {
  name: string;
  time: number;
  correct: boolean;
  result: QuestionResult;
}

function TimingChart({
  moduleResult,
  questionsMap: _questionsMap,
  onBarClick,
}: {
  moduleResult: ModuleResult;
  questionsMap: Map<string, Question>;
  onBarClick: (result: QuestionResult) => void;
}) {
  const data: ChartDataPoint[] = moduleResult.results.map((r, i) => ({
    name: `Q${i + 1}`,
    time: r.time_spent_seconds,
    correct: r.is_correct,
    result: r,
  }));


  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const d = data.find(x => x.name === label);
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-3 text-xs shadow-xl">
        <div className="font-semibold text-[var(--text-primary)] mb-1">{label}</div>
        <div className="text-[var(--text-muted)]">Time: {payload[0].value}s</div>
        <div className={d?.correct ? 'text-emerald-700' : 'text-red-700'}>
          {d?.correct ? '✓ Correct' : '✗ Incorrect'}
        </div>
      </div>
    );
  };

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)' }} />
          <Bar dataKey="time" radius={[4, 4, 0, 0]} onClick={(d: unknown) => onBarClick((d as ChartDataPoint).result)}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.correct ? '#10b981' : '#f43f5e'}
                fillOpacity={0.8}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


// ─── Domain Accordion ────────────────────────────────────────────────────────
function DomainAccordion({
  moduleResult,
  questionsMap,
  onQuestionClick,
}: {
  moduleResult: ModuleResult;
  questionsMap: Map<string, Question>;
  onQuestionClick: (result: QuestionResult) => void;
}) {
  const [openDomains, setOpenDomains] = useState<Set<string>>(new Set());

  const domainMap = useMemo(() => {
    const m: Record<string, { skills: Record<string, QuestionResult[]> }> = {};
    for (const r of moduleResult.results) {
      const q = questionsMap.get(r.question_id);
      if (!q) continue;
      if (!m[q.domain]) m[q.domain] = { skills: {} };
      if (!m[q.domain].skills[q.skill]) m[q.domain].skills[q.skill] = [];
      m[q.domain].skills[q.skill].push(r);
    }
    return m;
  }, [moduleResult.results, questionsMap]);

  const toggleDomain = (domain: string) => {
    setOpenDomains(prev => {
      const n = new Set(prev);
      n.has(domain) ? n.delete(domain) : n.add(domain);
      return n;
    });
  };

  return (
    <div className="space-y-2">
      {Object.entries(domainMap).map(([domain, { skills }]) => {
        const allResults = Object.values(skills).flat();
        const correct = allResults.filter(r => r.is_correct).length;
        const total = allResults.length;
        const pct = Math.round((correct / total) * 100);
        const isOpen = openDomains.has(domain);

        return (
          <div key={domain}>
            <button
              className={`accordion-header ${isOpen ? 'open' : ''}`}
              onClick={() => toggleDomain(domain)}
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-[var(--text-primary)]">{domain}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pct >= 70 ? 'bg-emerald-500/15 text-emerald-700' :
                  pct >= 40 ? 'bg-amber-500/15 text-amber-700' :
                    'bg-rose-500/15 text-rose-700'
                  }`}>
                  {correct}/{total} · {pct}%
                </span>
              </div>
              {isOpen ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
            </button>

            {isOpen && (
              <div className="accordion-body">
                <div className="space-y-3">
                  {Object.entries(skills).map(([skill, results]) => {
                    const sCorrect = results.filter(r => r.is_correct).length;
                    return (
                      <div key={skill}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-[var(--text-secondary)] font-medium">{skill}</span>
                          <span className="text-xs text-[var(--text-muted)]">{sCorrect}/{results.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {results.map((r, i) => (
                            <button
                              key={r.question_id}
                              onClick={() => onQuestionClick(r)}
                              className={`w-7 h-7 rounded-lg border text-xs font-semibold transition-all hover:scale-110 ${r.is_correct
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/25'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-700 hover:bg-rose-500/25'
                                }`}
                              title={`Q${r.question_number}: ${r.is_correct ? 'Correct' : 'Incorrect'}`}
                            >
                              {r.question_number}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Score Hero Card ─────────────────────────────────────────────────────────
function ScoreCard({ session }: { session: TestSession }) {
  const [displayed, setDisplayed] = useState(0);
  const target = session.total_score;

  useEffect(() => {
    const step = Math.ceil(target / 40);
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(current + step, target);
      setDisplayed(current);
      if (current >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [target]);

  const isFullLength = session.exam_type === 'full';

  return (
    <div className="glass-card p-6 text-center">
      <div className="mb-2 text-[var(--text-muted)] text-sm font-medium uppercase tracking-wider">
        {isFullLength ? 'Total SAT Score' : session.exam_type === 'rw' ? 'Reading & Writing Score' : 'Math Score'}
      </div>
      <div className="score-display gradient-text-indigo mb-2">{displayed}</div>
      <div className="text-[var(--text-muted)] text-sm">
        out of {isFullLength ? '1600' : '800'}
      </div>

      {isFullLength && session.rw_score != null && session.math_score != null && (
        <div className="flex justify-center gap-8 mt-4 pt-4 border-t border-[var(--border)]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{session.rw_score}</div>
            <div className="text-xs text-[var(--text-muted)]">Reading & Writing</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[var(--text-primary)]">{session.math_score}</div>
            <div className="text-xs text-[var(--text-muted)]">Math</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Custom Overall Performance (no score scale, 4 columns) ──────────────────
function CustomOverallPerformance({ moduleResults }: { moduleResults: ModuleResult[] }) {
  const allResults = moduleResults.flatMap(m => m.results);
  const correct = allResults.filter(r => r.is_correct).length;
  const total = allResults.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const avgTime = avgSecondsPerQuestion(allResults);

  const gauges = [
    { label: 'Correct', count: correct, color: '#10b981', isPercent: false },
    { label: 'Total', count: total, color: '#0263eb', isPercent: false },
    { label: 'Accuracy', count: accuracy, color: '#f59e0b', isPercent: true },
  ];

  return (
    <div className="glass-card p-5 w-full">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Overall Performance</h3>
      <div className="flex items-center justify-around">
        {gauges.map(({ label, count, color, isPercent }) => (
          <div key={label} className="text-center">
            <CircularProgress
              value={isPercent ? count : (total > 0 ? (count / total) * 100 : 0)}
              size={72}
              strokeWidth={5}
              color={color}
            >
              <div className="text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {count}{isPercent ? '%' : ''}
                </div>
              </div>
            </CircularProgress>
            <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
          </div>
        ))}

        {/* Avg Time Per Question — plain stat (no circle) */}
        <div className="text-center">
          <div
            className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto"
            style={{ background: 'rgba(56,189,248,0.08)', border: '2px solid rgba(56,189,248,0.3)' }}
          >
            <div className="text-center">
              <Clock size={14} className="text-sky-400 mx-auto mb-0.5" />
              <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                {formatSeconds(avgTime)}
              </div>
            </div>
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">Avg / Q</div>
        </div>
      </div>
    </div>
  );
}

// ─── Standard Overall Performance (with per-section avg time + hover tooltip) ─
function StandardOverallPerformance({ moduleResults }: { moduleResults: ModuleResult[] }) {
  const [hoveredSection, setHoveredSection] = useState<string | null>(null);
  const allResults = moduleResults.flatMap(m => m.results);
  const correct = allResults.filter(r => r.is_correct).length;
  const total = allResults.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  const rwModules = moduleResults.filter(m => m.section === 'Reading and Writing');
  const mathModules = moduleResults.filter(m => m.section === 'Math');

  const rwAllResults = rwModules.flatMap(m => m.results);
  const mathAllResults = mathModules.flatMap(m => m.results);

  const rwAvg = rwAllResults.length > 0 ? avgSecondsPerQuestion(rwAllResults) : null;
  const mathAvg = mathAllResults.length > 0 ? avgSecondsPerQuestion(mathAllResults) : null;

  const sectionStats = [
    ...(rwAvg !== null ? [{ key: 'rw', label: 'R&W Avg/Q', avg: rwAvg, modules: rwModules, color: 'rgba(2,99,235,0.3)', bg: 'rgba(2,99,235,0.08)', textColor: 'text-[var(--text-primary)]' }] : []),
    ...(mathAvg !== null ? [{ key: 'math', label: 'Math Avg/Q', avg: mathAvg, modules: mathModules, color: 'rgba(2,99,235,0.3)', bg: 'rgba(2,99,235,0.08)', textColor: 'text-[var(--text-primary)]' }] : []),
  ];

  return (
    <div className="glass-card p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Overall Performance</h3>
      <div className="flex items-center justify-around flex-wrap gap-4">
        {[
          { label: 'Correct', count: correct, color: '#10b981', isPercent: false },
          { label: 'Total', count: total, color: '#0263eb', isPercent: false },
          { label: 'Accuracy', count: accuracy, color: '#f59e0b', isPercent: true },
        ].map(({ label, count, color, isPercent }) => (
          <div key={label} className="text-center">
            <CircularProgress
              value={isPercent ? count : (total > 0 ? (count / total) * 100 : 0)}
              size={72}
              strokeWidth={5}
              color={color}
            >
              <div className="text-center">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {count}{isPercent ? '%' : ''}
                </div>
              </div>
            </CircularProgress>
            <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>
          </div>
        ))}

        {/* Per-section avg time with hover tooltip */}
        {sectionStats.map(({ key, label, avg, modules, color, bg, textColor }) => (
          <div
            key={key}
            className="text-center relative"
            onMouseEnter={() => setHoveredSection(key)}
            onMouseLeave={() => setHoveredSection(null)}
          >
            <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center mx-auto cursor-default"
              style={{ background: bg, border: `2px solid ${color}` }}
            >
              <div className="text-center">
                <Clock size={13} className={`${textColor} mx-auto mb-0.5`} />
                <div className="text-xs font-bold text-[var(--text-primary)] leading-tight">
                  {formatSeconds(avg)}
                </div>
              </div>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-1">{label}</div>

            {/* Hover tooltip: per-module breakdown */}
            {hoveredSection === key && modules.length > 1 && (
              <div
                className="absolute bottom-full left-1/2 mb-2 z-50 pointer-events-none"
                style={{ transform: 'translateX(-50%)' }}
              >
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-3 shadow-xl text-left min-w-[160px]">
                  <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">Per Module</div>
                  {modules.map(m => (
                    <div key={m.module_num} className="flex items-center justify-between gap-3 text-xs py-0.5">
                      <span className="text-[var(--text-secondary)]">Module {m.module_num}</span>
                      <span className={`font-mono font-bold ${textColor}`}>{formatSeconds(avgSecondsPerQuestion(m.results))}/q</span>
                    </div>
                  ))}
                </div>
                {/* Arrow */}
                <div className="flex justify-center">
                  <div className="w-2 h-2 bg-[var(--bg-elevated)] border-r border-b border-[var(--border-light)] rotate-45 -mt-1" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Results Page ─────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const [session, setSession] = useState<TestSession | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question>>(new Map());
  const [selectedResult, setSelectedResult] = useState<QuestionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const s = getTestSession(sessionId);
    if (!s) { router.replace('/'); return; }
    setSession(s);
    loadQuestionsMap().then(map => {
      setQuestionsMap(map);
      setIsLoading(false);
    });
  }, [sessionId, router]);

  const selectedQuestion = selectedResult
    ? questionsMap.get(selectedResult.question_id) ?? null
    : null;

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const completedAt = new Date(session.completed_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <Home size={14} />
            Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-secondary)] text-sm">{session.label}</span>
          <div className="ml-auto flex items-center gap-2">
            <Link href={`/review/${sessionId}`}>
              <Button variant="secondary" size="sm">
                <BookOpen size={13} /> Review Answers
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Session meta */}
        <div className="mb-6 flex items-center gap-3 animate-fadeIn">
          <div className="w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center">
            <Trophy size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">{session.label}</h1>
            <p className="text-xs text-[var(--text-muted)]">Completed {completedAt}</p>
          </div>
        </div>

        {/* Score + Performance grid — branches on exam type */}
        {session.exam_type === 'custom' ? (
          <div className="mb-8 animate-fadeIn animate-fadeIn-1">
            <CustomOverallPerformance moduleResults={session.module_results} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 animate-fadeIn animate-fadeIn-1">
            <div className="md:col-span-1">
              <ScoreCard session={session} />
            </div>
            <div className="md:col-span-2">
              <StandardOverallPerformance moduleResults={session.module_results} />
            </div>
          </div>
        )}

        {/* Per-module analytics */}
        {session.module_results.map((moduleResult, mi) => (
          <div key={moduleResult.module_num} className="mb-8 animate-fadeIn" style={{ animationDelay: `${mi * 0.1}s` }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Module {moduleResult.module_num} — {moduleResult.section}
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-emerald-700 font-semibold">{moduleResult.raw_correct} correct</span>
                <span className="text-[var(--text-muted)]">/{moduleResult.raw_total}</span>
                <span className="text-[var(--accent-indigo)] font-bold">{moduleResult.scaled_score}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Timing Chart */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Time Per Question
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Click any bar to preview the question
                </p>
                <TimingChart
                  moduleResult={moduleResult}
                  questionsMap={questionsMap}
                  onBarClick={(r) => setSelectedResult(r)}
                />
                {/* Legend row — left: colour dots, right: total time (space-between) */}
                <div className="flex items-center justify-between mt-2 text-xs text-[var(--text-muted)]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> Correct</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-500 inline-block" /> Incorrect</span>
                  </div>
                  <span className="flex items-center gap-1 text-[var(--text-muted)]">
                    <Clock size={10} />
                    {formatSeconds(moduleResult.results.reduce((acc, r) => acc + r.time_spent_seconds, 0))}
                  </span>
                </div>
              </div>

              {/* Domain Accordion */}
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                  Content Domains
                </h3>
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  Click question badges to preview
                </p>
                <DomainAccordion
                  moduleResult={moduleResult}
                  questionsMap={questionsMap}
                  onQuestionClick={(r) => setSelectedResult(r)}
                />
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* Quick-Look Modal */}
      <QuickLookModal
        isOpen={!!selectedResult}
        onClose={() => setSelectedResult(null)}
        question={selectedQuestion}
        result={selectedResult}
      />
    </div>
  );
}
