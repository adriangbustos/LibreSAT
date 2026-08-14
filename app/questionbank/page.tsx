'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutGrid, Zap, Filter, ChevronRight } from 'lucide-react';
import { useApp } from '@/app/context/AppContext';
import { buildCustomExam } from '@/app/lib/db';
import { saveInProgressExam } from '@/app/lib/storage';
import type { InProgressExamState, CustomTestFilters, ExamType } from '@/app/types';
import { DifficultyBadge, SectionBadge } from '@/app/components/ui/Badge';
import { Button } from '@/app/components/ui/Button';

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div className="mb-5">
      <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
        {label}
      </label>
      <div className="flex flex-wrap gap-1.5">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              selected.includes(opt)
                ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-light)]'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function QuestionBankPage() {
  const router = useRouter();
  const { questions, questionDex, isLoading } = useApp();

  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<string[]>([]);
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(20);
  const [launching, setLaunching] = useState(false);

  const domains = useMemo(() => {
    let pool = questions;
    if (selectedSections.length > 0) pool = pool.filter(q => selectedSections.includes(q.section));
    return [...new Set(pool.map(q => q.domain))].sort();
  }, [questions, selectedSections]);

  const skills = useMemo(() => {
    let pool = questions;
    if (selectedSections.length > 0) pool = pool.filter(q => selectedSections.includes(q.section));
    if (selectedDomains.length > 0) pool = pool.filter(q => selectedDomains.includes(q.domain));
    return [...new Set(pool.map(q => q.skill))].sort();
  }, [questions, selectedSections, selectedDomains]);

  const filteredPool = useMemo(() => {
    return questions.filter(q => {
      if (selectedSections.length > 0 && !selectedSections.includes(q.section)) return false;
      if (selectedDomains.length > 0 && !selectedDomains.includes(q.domain)) return false;
      if (selectedSkills.length > 0 && !selectedSkills.includes(q.skill)) return false;
      if (selectedDifficulties.length > 0 && !selectedDifficulties.includes(q.difficulty)) return false;
      if (selectedBatches.length > 0) {
        const batchName = q.is_new_batch ? '2nd Batch' : '1st Batch';
        if (!selectedBatches.includes(batchName)) return false;
      }
      if (selectedStatuses.length > 0) {
        const qStatus = questionDex.entries[q.question_id]?.status || 'unseen';
        const isSeen = qStatus !== 'unseen';
        const mappedStatus = isSeen ? 'Seen' : 'Unseen';
        if (!selectedStatuses.includes(mappedStatus)) return false;
      }
      return true;
    });
  }, [questions, questionDex, selectedSections, selectedDomains, selectedSkills, selectedDifficulties, selectedBatches, selectedStatuses]);

  const canLaunch = filteredPool.length > 0 && questionCount > 0;

  const handleLaunch = async () => {
    if (!canLaunch) return;
    setLaunching(true);
    const filters: CustomTestFilters = {
      sections: selectedSections,
      domains: selectedDomains,
      skills: selectedSkills,
      difficulties: selectedDifficulties,
      batches: selectedBatches,
      statuses: selectedStatuses,
      question_count: Math.min(questionCount, filteredPool.length),
    };
    const exam = buildCustomExam(filteredPool, filters);
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const state: InProgressExamState = {
      session_id: sessionId,
      exam_id: exam.exam_id,
      exam_type: 'custom' as ExamType,
      label: exam.label,
      started_at: new Date().toISOString(),
      modules: exam.modules,
      current_module_index: 0,
      answers: {},
      time_per_question: {},
      completed_modules: [],
      custom_filters: filters,
    };
    saveInProgressExam(state);
    router.push(`/exam/${sessionId}`);
  };

  // Difficulty distribution in filtered pool
  const diffCounts = useMemo(() => {
    const easy = filteredPool.filter(q => q.difficulty === 'Easy').length;
    const med = filteredPool.filter(q => q.difficulty === 'Medium').length;
    const hard = filteredPool.filter(q => q.difficulty === 'Hard').length;
    return { easy, med, hard };
  }, [filteredPool]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-bold">Question Bank</span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="w-10 h-10 gradient-amber rounded-xl flex items-center justify-center">
            <LayoutGrid size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Custom Question Bank</h1>
            <p className="text-[var(--text-muted)] text-sm">Build a targeted practice set</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── Filter Panel ─── */}
          <div className="lg:col-span-1">
            <div className="glass-card p-5 sticky top-20">
              <div className="flex items-center gap-2 mb-5">
                <Filter size={14} className="text-[var(--accent-indigo)]" />
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Filters</h2>
              </div>

              <MultiSelect
                label="Section"
                options={['Reading and Writing', 'Math']}
                selected={selectedSections}
                onChange={setSelectedSections}
              />

              <MultiSelect
                label="Domain"
                options={domains}
                selected={selectedDomains}
                onChange={setSelectedDomains}
              />

              <MultiSelect
                label="Skill"
                options={skills.slice(0, 20)}
                selected={selectedSkills}
                onChange={setSelectedSkills}
              />

              <MultiSelect
                label="Difficulty"
                options={['Easy', 'Medium', 'Hard']}
                selected={selectedDifficulties}
                onChange={setSelectedDifficulties}
              />

              <MultiSelect
                label="Batch"
                options={['1st Batch', '2nd Batch']}
                selected={selectedBatches}
                onChange={setSelectedBatches}
              />

              <MultiSelect
                label="Status"
                options={['Seen', 'Unseen']}
                selected={selectedStatuses}
                onChange={setSelectedStatuses}
              />

              {/* Question count slider */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    Question Count
                  </label>
                  <span className="text-sm font-bold text-[var(--accent-indigo)]">
                    {Math.min(questionCount, filteredPool.length)}
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={Math.max(5, Math.min(100, filteredPool.length))}
                  value={Math.min(questionCount, filteredPool.length)}
                  onChange={e => setQuestionCount(Number(e.target.value))}
                  className="w-full accent-[var(--accent-indigo)]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
                  <span>5</span>
                  <span>{Math.min(100, filteredPool.length)} max</span>
                </div>
              </div>

              {/* Pool stats */}
              <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border)] mb-4">
                <div className="text-xs text-[var(--text-muted)] mb-2">Available pool</div>
                <div className="text-2xl font-black text-[var(--text-primary)] mb-2">
                  {filteredPool.length}
                  <span className="text-sm font-normal text-[var(--text-muted)] ml-1">questions</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {diffCounts.easy > 0 && (
                    <span className="badge-easy text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {diffCounts.easy} Easy
                    </span>
                  )}
                  {diffCounts.med > 0 && (
                    <span className="badge-medium text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {diffCounts.med} Med
                    </span>
                  )}
                  {diffCounts.hard > 0 && (
                    <span className="badge-hard text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                      {diffCounts.hard} Hard
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                disabled={!canLaunch}
                loading={launching}
                onClick={handleLaunch}
              >
                <Zap size={16} />
                {launching ? 'Launching…' : `Launch ${Math.min(questionCount, filteredPool.length)} Questions`}
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>

          {/* ─── Preview List ─── */}
          <div className="lg:col-span-2">
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)]">Question Preview</h2>
                <span className="text-xs text-[var(--text-muted)]">
                  Showing first {Math.min(50, filteredPool.length)} of {filteredPool.length}
                </span>
              </div>

              {filteredPool.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <LayoutGrid size={32} className="mx-auto mb-3 opacity-40" />
                  <p>No questions match your filters.</p>
                  <p className="text-xs mt-1">Try removing some filters.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                  {filteredPool.slice(0, 50).map((q, i) => (
                    <div
                      key={q.question_id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-light)] transition-all"
                    >
                      <span className="text-xs text-[var(--text-muted)] font-mono min-w-[24px] mt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <DifficultyBadge difficulty={q.difficulty} />
                          <SectionBadge section={q.section} />
                          <span className="text-[10px] text-[var(--text-muted)]">{q.skill}</span>
                          {q.is_new_batch && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-semibold border border-blue-500/20">
                              2nd Batch
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                          {q.question_text.replace(/\$[^$]+\$/g, '[math]').slice(0, 120)}
                          {q.question_text.length > 120 ? '…' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredPool.length > 50 && (
                    <div className="text-center py-3 text-xs text-[var(--text-muted)]">
                      +{filteredPool.length - 50} more questions in pool
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
