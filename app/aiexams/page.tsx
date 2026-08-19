'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles, BookOpen, Calculator, LayoutGrid, X, AlertCircle } from 'lucide-react';
import { useApp } from '@/app/context/AppContext';
import { Button } from '@/app/components/ui/Button';
import { generateAIExamQuestion } from '@/app/lib/ai';
import { getAIConfig, saveInProgressExam } from '@/app/lib/storage';
import type { InProgressExamState, ExamType, Question } from '@/app/types';

function Modal({ isOpen, onClose, children }: { isOpen: boolean, onClose: () => void, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white border border-[var(--border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fadeIn relative">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-elevated)] transition">
          <X size={20} />
        </button>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function MultiSelect({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (vals: string[]) => void;
}) {
  const toggle = (val: string) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => toggle(opt)}
          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${selected.includes(opt)
            ? 'bg-blue-500/20 border-blue-500/40 text-blue-400'
            : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-light)]'
            }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function ModeCard({ title, icon, desc, onClick }: { title: string, icon: React.ReactNode, desc: string, onClick: () => void }) {
  return (
    <div
      className="glass-card glass-card-hover p-5 flex flex-col animate-fadeIn cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold uppercase tracking-wider text-[var(--accent-indigo)]">
          AI Generation
        </span>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h3 className="text-[var(--text-primary)] font-bold text-base">{title}</h3>
      </div>
      <p className="text-sm text-[var(--text-secondary)] mb-4">{desc}</p>
      <div className="mt-auto pt-3 border-t border-[var(--border)] flex items-center justify-between">
        <div className="text-xs text-[var(--text-muted)]">Targeted Practice</div>
        <Button variant="primary" size="sm">
          Generate <ArrowLeft size={12} className="rotate-180" />
        </Button>
      </div>
    </div>
  );
}

export default function AIExamsPage() {
  const router = useRouter();
  const { questions } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const domains = useMemo(() => {
    let pool = questions;
    if (selectedSections.length > 0) pool = pool.filter(q => selectedSections.includes(q.section));
    return [...new Set(pool.map(q => q.domain))].sort();
  }, [questions, selectedSections]);

  const skillsForDomain = useMemo(() => {
    if (selectedDomains.length === 0) return [];
    return [...new Set(questions.filter(q => selectedDomains.includes(q.domain)).map(q => q.skill))].sort();
  }, [questions, selectedDomains]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const config = getAIConfig();
      if (!config || !config.apiKey) {
        setError("Please set your AI API key in the Settings first.");
        setIsGenerating(false);
        return;
      }

      const generatedQuestions: Question[] = [];

      for (let i = 0; i < questionCount; i++) {
        // Pick random domain from selected, or all available if none selected
        const domainPool = selectedDomains.length > 0 ? selectedDomains : domains;
        if (domainPool.length === 0) continue;
        const randomDomain = domainPool[Math.floor(Math.random() * domainPool.length)];

        // Pick random skill for that domain
        const domainSkills = [...new Set(questions.filter(q => q.domain === randomDomain).map(q => q.skill))];
        let skillPool = domainSkills;
        if (selectedSkills.length > 0) {
          const intersected = domainSkills.filter(s => selectedSkills.includes(s));
          if (intersected.length > 0) skillPool = intersected;
        }
        const randomSkill = skillPool[Math.floor(Math.random() * skillPool.length)];

        const generatedQ = await generateAIExamQuestion(config, randomDomain, randomSkill, questions);
        generatedQuestions.push(generatedQ);
      }

      if (generatedQuestions.length === 0) {
        throw new Error("No questions could be generated with the selected criteria.");
      }

      const sessionId = `ai_session_${Date.now()}`;

      const rwQuestions = generatedQuestions.filter(q => q.section === 'Reading and Writing');
      const mathQuestions = generatedQuestions.filter(q => q.section === 'Math');

      const modules: { module_num: number; section: "Reading and Writing" | "Math"; time_minutes: number; question_ids: string[]; }[] = [];
      let modNum = 1;

      if (rwQuestions.length > 0) {
        modules.push({
          module_num: modNum++,
          section: 'Reading and Writing',
          time_minutes: Math.ceil(rwQuestions.length * 1.5),
          question_ids: rwQuestions.map(q => q.question_id)
        });
      }

      if (mathQuestions.length > 0) {
        modules.push({
          module_num: modNum++,
          section: 'Math',
          time_minutes: Math.ceil(mathQuestions.length * 1.5),
          question_ids: mathQuestions.map(q => q.question_id)
        });
      }

      const state: InProgressExamState = {
        session_id: sessionId,
        exam_id: `aiexam_${Date.now()}`,
        exam_type: 'custom' as ExamType,
        label: `AI Exam: Custom Generation`,
        started_at: new Date().toISOString(),
        modules,
        current_module_index: 0,
        answers: {},
        time_per_question: {},
        completed_modules: [],
        custom_filters: {
          sections: selectedSections,
          domains: selectedDomains,
          skills: selectedSkills,
          difficulties: [],
          batches: [],
          statuses: [],
          question_count: questionCount
        },
        generated_questions: generatedQuestions
      };
      saveInProgressExam(state);
      setIsModalOpen(false);
      router.push(`/exam/${sessionId}`);
    } catch (e: any) {
      setError("Failed to generate AI Question(s): " + e.message);
      setIsGenerating(false);
    }
  };

  const handleFullLengthClick = () => showToast('Full-Length AI Generation coming soon!');
  const handleEnglishClick = () => showToast('English AI Generation coming soon!');
  const handleMathClick = () => showToast('Math AI Generation coming soon!');

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={14} /> Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-bold flex items-center gap-1.5">
            AI Exams
          </span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center`}>
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">AI Exams</h1>
              <p className="text-[var(--text-muted)] text-sm">Create high-quality, targeted SAT practice tests powered by advanced RAG AI</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-3">
            <span className="flex items-center gap-1"><Sparkles size={12} /> Powered by AI</span>
            <span className="flex items-center gap-1"><BookOpen size={12} /> Grounded in Official Theory</span>
          </div>
        </div>

        {/* Generate Randomized equivalent for AI */}
        <div className="glass-card mb-6 p-5 border-[var(--accent-indigo)]/30 animate-fadeIn animate-fadeIn-1">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center flex-shrink-0">
                <Sparkles size={18} className="text-[var(--accent-indigo)]" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-sm">Generate Full-Length AI Exam</h3>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">
                  Generate a complete 4-module test dynamically mimicking real SAT difficulty distributions.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={handleFullLengthClick}
            >
              <Sparkles size={15} />
              Generate AI Full-Length
            </Button>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
            Targeted AI Generation Modes (3 available)
          </span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <ModeCard
            title="English Only"
            icon={<BookOpen size={20} className="text-white" />}
            desc="Focused Reading and Writing AI-generated modules."
            onClick={handleEnglishClick}
          />
          <ModeCard
            title="Math Only"
            icon={<Calculator size={20} className="text-white" />}
            desc="Generate complex math problems with accurate LaTeX formatting."
            onClick={handleMathClick}
          />
          <ModeCard
            title="Per Domain"
            icon={<LayoutGrid size={20} className="text-white" />}
            desc="Filter by specific Domain and Skill for hyper-targeted practice."
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => {
        if (isGenerating) return;
        setIsModalOpen(false);
        setError(null);
      }}>
        <div className="mb-5 flex items-center gap-2">
          <LayoutGrid className="text-[var(--accent-indigo)]" size={20} />
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Per Domain Setup</h2>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm rounded-xl flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Select Sections
            </label>
            <MultiSelect
              options={['Reading and Writing', 'Math']}
              selected={selectedSections}
              onChange={(val) => {
                setSelectedSections(val);
                setSelectedDomains([]);
                setSelectedSkills([]);
              }}
            />
          </div>

          {selectedSections.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Select Domains
              </label>
              <MultiSelect
                options={domains}
                selected={selectedDomains}
                onChange={(val) => {
                  setSelectedDomains(val);
                  setSelectedSkills([]);
                }}
              />
            </div>
          )}

          {selectedDomains.length > 0 && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                Select Skills
              </label>
              <MultiSelect
                options={skillsForDomain}
                selected={selectedSkills}
                onChange={setSelectedSkills}
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
              Question Count ({questionCount})
            </label>
            <input
              type="range"
              min={1}
              max={15}
              value={questionCount}
              onChange={(e) => setQuestionCount(parseInt(e.target.value))}
              className="w-full accent-[var(--accent-indigo)]"
            />
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--border)]">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={selectedSections.length === 0 || isGenerating}
              loading={isGenerating}
              onClick={() => handleGenerate()}
            >
              <Sparkles size={16} />
              {isGenerating ? 'Generating AI Questions...' : `Generate ${questionCount} AI Questions`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <div className="bg-gray-900 dark:bg-gray-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-gray-700/50">
            <AlertCircle size={16} className="text-rose-400" />
            <span className="text-sm font-medium">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
