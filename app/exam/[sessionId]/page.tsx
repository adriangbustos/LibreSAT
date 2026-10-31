'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Calculator as CalcIcon,
  ChevronUp, X, Strikethrough,
  Bookmark, LogOut, Highlighter, Loader2,
  FileText
} from 'lucide-react';
import { loadQuestionsMap } from '@/app/lib/db';
import {
  getInProgressExam,
  saveInProgressExam,
  clearInProgressExam,
  bulkUpdateQuestionDex,
  saveTestSession,
  getAIConfig
} from '@/app/lib/storage';
import { generateAIExamQuestionsInChunks } from '@/app/lib/ai';
import {
  generateModule,
  RW_MODULE2_DISTRIBUTION,
  MATH_MODULE1_DISTRIBUTION,
  MATH_MODULE2_DISTRIBUTION,
  generateTargetsFromDistribution
} from '@/app/lib/examGenerator';
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
import { Modal } from '@/app/components/ui/Modal';
import { DataTable } from '@/app/components/ui/DataTable';
import { AutoSizedImage } from '@/app/components/ui/AutoSizedImage';
import { TextHighlighter } from '@/app/components/ui/TextHighlighter';
import { QuestionNavPopover } from '@/app/components/exam/QuestionNavPopover';
import { CheckYourWorkView } from '@/app/components/exam/CheckYourWorkView';
import { MathReferenceDrawer } from '@/app/components/exam/MathReferenceDrawer';
import { NotesGutter } from '@/app/components/exam/NotesGutter';
import { StandByScreen } from '@/app/components/exam/StandByScreen';

// ─── Countdown Timer Hook ─────────────────────────────────────────────────────
function useCountdown(
  totalSeconds: number,
  moduleStartedAt: number | undefined,
  elapsedMs: number = 0,
  resetKey: unknown,
  onExpire: () => void,
  onFiveMinutes: () => void,
) {
  const getInitial = useCallback(() => {
    if (!moduleStartedAt) return totalSeconds;
    const elapsed = Math.floor((Date.now() - moduleStartedAt + elapsedMs) / 1000);
    return Math.max(0, totalSeconds - elapsed);
  }, [totalSeconds, moduleStartedAt, elapsedMs]);

  const [seconds, setSeconds] = useState(getInitial);
  const expiredRef = useRef(false);
  const fiveMinFiredRef = useRef(false);

  useEffect(() => {
    setSeconds(getInitial());
    expiredRef.current = false;
    fiveMinFiredRef.current = false;
  }, [resetKey, getInitial]);

  useEffect(() => {
    if (seconds <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpire();
      }
      return;
    }
    if (seconds <= 300 && !fiveMinFiredRef.current) {
      fiveMinFiredRef.current = true;
      onFiveMinutes();
    }
    const id = setTimeout(() => setSeconds(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [seconds, onExpire, onFiveMinutes]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const pct = totalSeconds > 0 ? (seconds / totalSeconds) * 100 : 0;
  const isWarning = seconds <= totalSeconds * 0.25;
  const isDanger = seconds <= 120;

  return { mm, ss, pct, isWarning, isDanger, seconds };
}

// ─── Exam Timer Component ─────────────────────────────────────────────────────
function ExamTimer({
  totalSeconds, moduleStartedAt, elapsedMs, resetKey, onExpire, onFiveMinutes,
}: {
  totalSeconds: number;
  moduleStartedAt: number | undefined;
  elapsedMs: number;
  resetKey: unknown;
  onExpire: () => void;
  onFiveMinutes: () => void;
}) {
  const { mm, ss, isWarning, isDanger } = useCountdown(
    totalSeconds, moduleStartedAt, elapsedMs, resetKey, onExpire, onFiveMinutes
  );
  const color = isDanger ? '#DC2626' : isWarning ? '#D97706' : '#1E293B';

  return (
    <span style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 18, color, letterSpacing: '0.02em' }}>
      {mm}:{ss}
    </span>
  );
}

// ─── Directions Modal ────────────────────────────────────────────────────────
function DirectionsModal({ isOpen, onClose, section }: { isOpen: boolean; onClose: () => void; section: string }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-lg w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg text-[#1E293B]">Directions</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#1E293B] transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>
        {section === 'Reading and Writing' ? (
          <div className="text-sm text-[#374151] space-y-3 leading-relaxed">
            <p>The questions in this section address a number of important reading and writing skills.</p>
            <p>Each question includes one or more passages, which may include a table or graph. Read each passage and question carefully, and then choose the best answer to the question based on the passage(s).</p>
            <p>All questions in this section are multiple-choice with four answer choices. Each question has a single best answer.</p>
          </div>
        ) : (
          <div className="text-sm text-[#374151] space-y-3 leading-relaxed">
            <p>The questions in this section address a number of important math skills.</p>
            <p>Use of a calculator is permitted for all questions. A reference sheet, calculator, and these directions can be accessed throughout the test.</p>
            <p>Unless otherwise indicated: All variables and expressions represent real numbers. Figures provided are drawn to scale. All figures lie in a plane. The domain of a given function f is the set of all real numbers x for which f(x) is a real number.</p>
          </div>
        )}
        <button onClick={onClose} className="mt-6 w-full py-2.5 rounded-full bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] transition-all cursor-pointer">
          Close
        </button>
      </div>
    </div>
  );
}

// ─── 5-Minute Warning Modal ───────────────────────────────────────────────────
function FiveMinWarningModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-7 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <span className="text-amber-600 text-xl font-bold">!</span>
          </div>
          <h2 className="font-bold text-lg text-[#1E293B]">5 Minutes Remaining</h2>
        </div>
        <p className="text-sm text-[#374151] leading-relaxed mb-6">
          You have 5 minutes left in this module. On test day, you won&apos;t be able to move on until time expires.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-full bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] transition-all cursor-pointer"
        >
          OK, Continue
        </button>
      </div>
    </div>
  );
}


// ─── Highlight Color List ─────────────────────────────────────────────────────
const HIGHLIGHT_COLORS = [
  { id: 'yellow', color: '#FEF08A', label: 'Yellow' },
  { id: 'blue', color: '#BFDBFE', label: 'Blue' },
  { id: 'pink', color: '#FBCFE8', label: 'Pink' },
];

// ─── Question Card (Bluebook style) ──────────────────────────────────────────
const BluebookQuestionCard = React.memo(function BluebookQuestionCard({
  question,
  selectedAnswer,
  onAnswer,
  questionNum,
  totalQuestions,
  isFlagged,
  onToggleFlag,
  highlights,
  isHighlightMode,
  onAddHighlight,
  onClearHighlights,
  eliminatedChoices,
  onToggleEliminate,
  isEliminationMode,
  note,
  onNoteChange,
  showNotes,
  onCloseNotes,
}: {
  question: Question;
  selectedAnswer: string | null | undefined;
  onAnswer: (value: string) => void;
  questionNum: number;
  totalQuestions: number;
  isFlagged: boolean;
  onToggleFlag: () => void;
  highlights?: { start: number; end: number; color?: string }[];
  isHighlightMode?: boolean;
  onAddHighlight?: (range: { start: number; end: number }) => void;
  onClearHighlights?: () => void;
  eliminatedChoices?: string[];
  onToggleEliminate?: (letter: string) => void;
  isEliminationMode?: boolean;
  note?: string;
  onNoteChange?: (note: string) => void;
  showNotes?: boolean;
  onCloseNotes?: () => void;
}) {
  const isEnglish = question.section === 'Reading and Writing';

  return (
    <div className={`mx-auto ${isEnglish ? 'flex gap-0 max-w-full h-full' : 'max-w-[860px] pt-6'}`}>
      {/* ── Left: Passage pane (RW only) ── */}
      {isEnglish && (
        <div className="flex-1 min-w-0 overflow-y-auto pr-6 border-r border-[#E5E7EB]" style={{ paddingTop: 24, paddingLeft: 32, paddingBottom: 24 }}>
          {question.image_url && (
            <AutoSizedImage src={question.image_url} className="mb-5 max-w-[460px]" />
          )}
          {question.table_data && (
            <div className="mb-5">
              <DataTable data={question.table_data} />
            </div>
          )}
          {question.stimulus && (
            <div className="question-stimulus whitespace-pre-wrap text-[15px] leading-relaxed text-[#1E293B]">
              {onAddHighlight && onClearHighlights ? (
                <TextHighlighter
                  questionId={question.question_id}
                  highlights={highlights || []}
                  isHighlightMode={!!isHighlightMode}
                  onAddHighlight={onAddHighlight}
                >
                  <MathText text={question.stimulus} />
                </TextHighlighter>
              ) : (
                <MathText text={question.stimulus} />
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Middle: Notes Gutter ── */}
      {isEnglish && showNotes && (
        <NotesGutter
          note={note || ''}
          onChange={onNoteChange ? onNoteChange : () => { }}
          onDelete={() => onNoteChange?.('')}
          isCollapsed={false}
          onToggleCollapse={onCloseNotes ? onCloseNotes : () => { }}
        />
      )}

      {/* ── Right: Question pane ── */}
      <div
        className={isEnglish ? 'flex-1 min-w-0 overflow-y-auto' : ''}
        style={isEnglish ? { paddingTop: 24, paddingLeft: 28, paddingRight: 28, paddingBottom: 24 } : {}}
      >
        {/* Question header row */}
        <div className="flex items-center gap-3 mb-3">
          {/* Black number badge */}
          <div
            style={{
              background: '#1E293B',
              color: 'white',
              width: 36,
              height: 36,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            {questionNum}
          </div>

          {/* Mark for Review */}
          <button
            onClick={onToggleFlag}
            className="flex items-center gap-1.5 text-sm transition-colors cursor-pointer"
            style={{ color: isFlagged ? '#EF4444' : '#4B5563', fontWeight: isFlagged ? 600 : 400 }}
          >
            <Bookmark
              size={15}
              style={{
                fill: isFlagged ? '#EF4444' : 'none',
                stroke: isFlagged ? '#EF4444' : '#4B5563',
              }}
            />
            Mark for Review
          </button>

          {/* Spacer + dashed line */}
          <div className="flex-1 border-t border-dashed border-[#C8CCDA]" />

          {/* Question ID (Replaced non-working ABC button) */}
          <span className="text-xs text-[#6B7280] font-mono tracking-wide ml-2 flex-shrink-0">
            ID: {question.question_id}
          </span>
        </div>

        {/* Dashed separator */}
        <hr style={{ border: 'none', borderTop: '1.5px dashed #C8CCDA', marginBottom: 16 }} />

        {/* For Math: stimulus above question */}
        {!isEnglish && question.stimulus && (
          <div className="question-stimulus mb-5 whitespace-pre-wrap text-[15px] leading-relaxed text-[#1E293B]">
            <MathText text={question.stimulus} />
          </div>
        )}

        {!isEnglish && question.image_url && (
          <AutoSizedImage src={question.image_url} className="mb-5 mx-auto max-w-[440px]" />
        )}
        {!isEnglish && question.table_data && (
          <div className="mb-5">
            <DataTable data={question.table_data} />
          </div>
        )}

        {/* Question text */}
        <div className="question-text mb-6 whitespace-pre-wrap text-[15px] leading-relaxed text-[#1E293B]">
          <MathText text={question.question_text} />
        </div>

        {/* Answer area */}
        {(question.is_open_ended || !question.options) ? (
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[#4B5563] font-medium">Your Answer:</label>
            <input
              type="text"
              value={selectedAnswer ?? ''}
              onChange={e => {
                const val = e.target.value;
                const maxLen = val.startsWith('-') ? 6 : 5;
                if (val.length <= maxLen) onAnswer(val);
              }}
              placeholder="Enter numeric answer…"
              className="w-full max-w-xs px-4 py-3 border border-[#D1D5DB] rounded-xl text-[#1E293B] text-lg font-mono placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] transition-all bg-white"
            />
            <p className="text-xs text-[#6B7280]">Enter a fraction (e.g. 3/4), decimal, or whole number.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {question.options && Object.entries(question.options).map(([letter, text]) => {
              const isSelected = selectedAnswer === letter;
              const isEliminated = eliminatedChoices?.includes(letter);
              return (
                <div key={letter} className="flex items-center gap-2">
                  <button
                    className="flex-1 text-left flex items-start gap-3 transition-all"
                    onClick={() => {
                      if (isEliminated) return; // Block selection if eliminated
                      onAnswer(letter);
                    }}
                    style={{
                      padding: '11px 14px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid #2563EB' : '1.5px solid #D1D5DB',
                      background: isSelected ? 'rgba(37,99,235,0.05)' : 'white',
                      color: '#1E293B',
                      cursor: isEliminated ? 'not-allowed' : 'pointer',
                      position: 'relative',
                      opacity: isEliminated ? 0.45 : 1,
                    }}
                  >
                    {/* Letter badge */}
                    <span
                      style={{
                        width: 26, height: 26, minWidth: 26,
                        borderRadius: '50%',
                        border: isSelected ? '1.5px solid #2563EB' : '1.5px solid #9CA3AF',
                        background: isSelected ? '#2563EB' : 'transparent',
                        color: isSelected ? 'white' : '#374151',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', fontWeight: 700,
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {letter}
                    </span>
                    <span className="flex-1 text-[15px] leading-snug">
                      <MathText text={text} autoWrapMath={true} />
                    </span>
                    {/* Strikethrough overlay */}
                    {isEliminated && (
                      <span
                        style={{
                          position: 'absolute', top: '50%', left: 14, right: 14,
                          height: 1.5, background: '#374151', pointerEvents: 'none',
                        }}
                      />
                    )}
                  </button>

                  {/* Elimination toggle + Undo */}
                  <div style={{ width: 50, display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
                    {isEliminationMode && (
                      isEliminated ? (
                        <button
                          onClick={e => { e.stopPropagation(); onToggleEliminate?.(letter); }}
                          style={{
                            fontSize: 11, fontWeight: 700, color: '#2563EB',
                            background: 'none', border: 'none', cursor: 'pointer',
                            textDecoration: 'underline', padding: '0 2px',
                          }}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); onToggleEliminate?.(letter); }}
                          style={{
                            width: 26, height: 26,
                            borderRadius: '50%',
                            border: '1.5px solid #9CA3AF',
                            background: 'white',
                            color: '#374151',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '0.72rem', fontWeight: 700,
                            position: 'relative',
                          }}
                          title="Cross out this choice"
                        >
                          <span style={{ position: 'absolute', width: '70%', height: 1.5, background: '#374151' }} />
                          {letter}
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.question.question_id === next.question.question_id &&
    prev.selectedAnswer === next.selectedAnswer &&
    prev.isHighlightMode === next.isHighlightMode &&
    prev.isEliminationMode === next.isEliminationMode &&
    prev.isFlagged === next.isFlagged &&
    prev.questionNum === next.questionNum &&
    prev.note === next.note &&
    prev.showNotes === next.showNotes &&
    JSON.stringify(prev.highlights) === JSON.stringify(next.highlights) &&
    JSON.stringify(prev.eliminatedChoices) === JSON.stringify(next.eliminatedChoices)
  );
});

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
  const [showNavPopover, setShowNavPopover] = useState(false);
  const [showCheckYourWork, setShowCheckYourWork] = useState(false);
  const [showStandBy, setShowStandBy] = useState(false);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [highlightColor, setHighlightColor] = useState('yellow');
  const [isNotesCollapsed, setIsNotesCollapsed] = useState(false);
  const [isEliminationMode, setIsEliminationMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isGeneratingBackground, setIsGeneratingBackground] = useState(false);
  const [isWaitingForNextModule, setIsWaitingForNextModule] = useState(false);
  const [showDirections, setShowDirections] = useState(false);
  const [showFiveMinWarning, setShowFiveMinWarning] = useState(false);
  const [fiveMinWarningShown, setFiveMinWarningShown] = useState(false);

  useEffect(() => {
    if (state && questions.length > 0) {
      const t = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(t);
    }
  }, [state, questions.length]);

  // Per-question time tracking
  const questionStartTime = useRef<number>(Date.now());
  const accumulatedTime = useRef<Record<string, number>>({});

  // ─── Load state ─────────────────────────────────────────────────────────────
  const loadModuleQuestions = useCallback((s: InProgressExamState, map: Map<string, Question>) => {
    const module = s.modules[s.current_module_index];
    const qs = module.question_ids
      .map(id => map.get(id) || (s.generated_questions?.find(q => q.question_id === id)))
      .filter(Boolean) as Question[];
    setQuestions(qs);
    setCurrentQIdx(0);
    setShowCheckYourWork(false);
    setIsEliminationMode(false);
    questionStartTime.current = Date.now();
  }, []);

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
      setFlagged(new Set(s.flagged || []));
      accumulatedTime.current = { ...s.time_per_question };
      loadModuleQuestions(s, map);
    }).catch(err => {
      console.error('Failed to load questions:', err);
    });
  }, [sessionId, router, loadModuleQuestions]);

  // ─── Background Generation ──────────────────────────────────────────────────
  useEffect(() => {
    if (!state || !state.pending_ai_modules || state.pending_ai_modules.length === 0 || isGeneratingBackground || questionsMap.size === 0) {
      return;
    }

    // Skip background AI generation for randomized exams (generated synchronously on submit)
    if (state.exam_id.startsWith('randomized_')) {
      return;
    }

    let isCancelled = false;
    const generatePending = async () => {
      setIsGeneratingBackground(true);
      try {
        const config = getAIConfig();
        if (!config || !config.apiKey) throw new Error("No API key");

        const nextPending = state.pending_ai_modules![0];

        if ((nextPending.sectionId.includes('Module2') || nextPending.sectionId.includes('Module 2')) && !nextPending.difficultyProfile) {
          setIsGeneratingBackground(false);
          return;
        }

        let distribution: Record<string, number>;
        let section: 'Reading and Writing' | 'Math';

        if (nextPending.sectionId === 'RW_Module2') {
          distribution = RW_MODULE2_DISTRIBUTION;
          section = 'Reading and Writing';
        } else if (nextPending.sectionId === 'Math_Module1') {
          distribution = MATH_MODULE1_DISTRIBUTION;
          section = 'Math';
        } else if (nextPending.sectionId === 'Math_Module2') {
          distribution = MATH_MODULE2_DISTRIBUTION;
          section = 'Math';
        } else {
          setIsGeneratingBackground(false);
          return;
        }

        const allQs = Array.from(questionsMap.values());
        const targets = generateTargetsFromDistribution(distribution, section, allQs, nextPending.difficultyProfile || 'mixed');

        const generated = await generateAIExamQuestionsInChunks(config, targets, allQs, 12);

        if (isCancelled) return;

        const newIds = generated.map(q => q.question_id);
        const timeMinutes = section === 'Reading and Writing' ? 32 : 35;

        setState(prev => {
          if (!prev || isCancelled) return prev;
          const newModule: SessionModule = {
            module_num: prev.modules.length + 1,
            section,
            time_minutes: timeMinutes,
            question_ids: newIds,
          };
          const newModules = [...prev.modules, newModule];
          const newGenerated = [...(prev.generated_questions || []), ...generated];
          const newPending = prev.pending_ai_modules!.slice(1);

          const updated = { ...prev, modules: newModules, generated_questions: newGenerated, pending_ai_modules: newPending };

          if (isWaitingForNextModule) {
            updated.current_module_index = prev.current_module_index + 1;
            updated.module_started_at = Date.now();
            updated.module_time_elapsed_ms = 0;
            saveInProgressExam(updated);
            setTimeout(() => {
              loadModuleQuestions(updated, questionsMap);
              setIsWaitingForNextModule(false);
              setIsSubmitting(false);
            }, 50);
          } else {
            saveInProgressExam(updated);
          }
          return updated;
        });
      } catch (err) {
        console.error('Background AI generation failed:', err);
      } finally {
        if (!isCancelled) setIsGeneratingBackground(false);
      }
    };

    generatePending();
    return () => { isCancelled = true; };
  }, [state?.pending_ai_modules, questionsMap, isGeneratingBackground, isWaitingForNextModule, loadModuleQuestions]);

  // ─── Module Submit ───────────────────────────────────────────────────────────
  const handleModuleSubmit = useCallback(
    async (timedOut: boolean) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setShowConfirmSubmit(false);
      setShowCheckYourWork(false);

      setState(prev => {
        if (!prev) return prev;
        const module = prev.modules[prev.current_module_index];
        if (!module) return prev;

        // Track final question time
        const lastQ = questions[currentQIdx];
        if (lastQ) {
          const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
          accumulatedTime.current[lastQ.question_id] = (accumulatedTime.current[lastQ.question_id] ?? 0) + elapsed;
        }

        const isFullModule = questions.length >= 22;
        const pretestIndices = isFullModule ? new Set([7, 17]) : new Set<number>();

        const results: QuestionResult[] = questions.map((q, i) => {
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
            is_pretest: pretestIndices.has(i),
          };
        });

        const rawCorrect = results.filter(r => r.is_correct).length;
        const rawTotal = results.length;

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
          stage: module.stage ?? (module.module_num === 1 || module.module_num === 3 ? 'Module1' : undefined),
        };

        const newCompletedModules = [...prev.completed_modules, moduleResult];
        const nextModuleIdx = prev.current_module_index + 1;

        let newPending = prev.pending_ai_modules ? [...prev.pending_ai_modules] : [];
        let updatedModules = [...prev.modules];

        if (prev.exam_id.startsWith('randomized_') && newPending.length > 0) {
          const nextPending = newPending[0];
          const allQs = Array.from(questionsMap.values());
          const usedIds = new Set<string>(prev.modules.flatMap(m => m.question_ids));
          const seenIds = prev.seen_question_ids ? new Set<string>(prev.seen_question_ids) : new Set<string>();

          if (nextPending.sectionId === 'RW_Module2') {
            const isAdvanced = (rawCorrect / rawTotal) >= 0.65;
            const stage = isAdvanced ? 'Module2_Advanced' : 'Module2_Standard';
            const generatedQs = generateModule(allQs, { section: 'Reading and Writing', stage }, usedIds, seenIds);
            updatedModules.push({
              module_num: 2,
              section: 'Reading and Writing',
              time_minutes: 32,
              question_ids: generatedQs.map(q => q.question_id),
              stage,
            });
            newPending = newPending.slice(1);
          } else if (nextPending.sectionId === 'Math_Module1') {
            const generatedQs = generateModule(allQs, { section: 'Math', stage: 'Module1' }, usedIds, seenIds);
            updatedModules.push({
              module_num: prev.exam_type === 'full' ? 3 : 1,
              section: 'Math',
              time_minutes: 35,
              question_ids: generatedQs.map(q => q.question_id),
            });
            newPending = newPending.slice(1);
          } else if (nextPending.sectionId === 'Math_Module2') {
            const isAdvanced = (rawCorrect / rawTotal) >= 0.65;
            const stage = isAdvanced ? 'Module2_Advanced' : 'Module2_Standard';
            const generatedQs = generateModule(allQs, { section: 'Math', stage }, usedIds, seenIds);
            updatedModules.push({
              module_num: prev.exam_type === 'full' ? 4 : 2,
              section: 'Math',
              time_minutes: 35,
              question_ids: generatedQs.map(q => q.question_id),
              stage,
            });
            newPending = newPending.slice(1);
          }
        } else if (module.module_num === 1) {
          const isAdvanced = (rawCorrect / rawTotal) >= 0.65;
          const nextProfile = isAdvanced ? 'hard' : 'easy';
          const nextSectionId = module.section === 'Reading and Writing' ? 'RW_Module2' : 'Math_Module2';
          const pendingIdx = newPending.findIndex(p => p.sectionId === nextSectionId);
          if (pendingIdx !== -1) {
            newPending[pendingIdx] = { ...newPending[pendingIdx], difficultyProfile: nextProfile };
          }
        }

        const hasPending = newPending.length > 0;
        const isActuallyDone = nextModuleIdx >= updatedModules.length && !hasPending;

        if (isActuallyDone) {
          const allResults = newCompletedModules.flatMap(m => m.results);
          bulkUpdateQuestionDex(allResults.map(r => ({
            question_id: r.question_id,
            is_correct: r.is_correct,
            time_spent: r.time_spent_seconds,
          })));

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
            const m2 = results.find(m => m.module_num === 2 || m.module_num === 4);
            const m1 = results.find(m => m.module_num === 1 || m.module_num === 3);
            let sectionStage = m2?.stage;
            if (!sectionStage && m1 && m1.raw_total > 0) {
              sectionStage = (m1.raw_correct / m1.raw_total >= 0.65) ? 'Module2_Advanced' : 'Module2_Standard';
            }

            results.forEach(m => {
              m.results.forEach(r => {
                if (r.is_pretest) return; // Unscored pretest question in Bluebook
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
              const rawIncorrect = rawTotal - rawCorrect;
              return scaleThetaToSAT(calculateThetaMLE(responses), { stage: sectionStage, rawIncorrect });
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
            modules: updatedModules,
            module_results: newCompletedModules,
            total_score: totalScore,
            rw_score: rwRawTotal > 0 ? rwScore : undefined,
            math_score: mathRawTotal > 0 ? mathScore : undefined,
            status: 'completed',
            custom_filters: prev.custom_filters,
            generated_questions: prev.generated_questions,
          };

          saveTestSession(session);
          clearInProgressExam();
          // Trigger Punto 4 Stand By Screen instead of abrupt redirect
          setIsSubmitting(false);
          setShowStandBy(true);
          return prev;
        }

        const isNextModuleReady = nextModuleIdx < updatedModules.length;
        const updated: InProgressExamState = {
          ...prev,
          modules: updatedModules,
          completed_modules: newCompletedModules,
          time_per_question: { ...accumulatedTime.current },
          pending_ai_modules: newPending,
        };

        if (isNextModuleReady) {
          updated.current_module_index = nextModuleIdx;
          updated.module_started_at = Date.now();
          updated.module_time_elapsed_ms = 0;
          saveInProgressExam(updated);
          setTimeout(() => {
            loadModuleQuestions(updated, questionsMap);
            setIsSubmitting(false);
          }, 50);
          return updated;
        } else {
          saveInProgressExam(updated);
          setIsWaitingForNextModule(true);
          return updated;
        }
      });
    },
    [isSubmitting, questions, currentQIdx, questionsMap, loadModuleQuestions]
  );

  const handleTimerExpire = useCallback(() => {
    handleModuleSubmit(true);
  }, [handleModuleSubmit]);

  const handleFiveMinutes = useCallback(() => {
    if (!fiveMinWarningShown) {
      setFiveMinWarningShown(true);
      setShowFiveMinWarning(true);
    }
  }, [fiveMinWarningShown]);

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
      setShowCheckYourWork(false);
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

  // ─── Note handler ────────────────────────────────────────────────────────────
  const handleUpdateNote = useCallback((questionId: string, note: string) => {
    setState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, notes: { ...(prev.notes || {}), [questionId]: note } };
      saveInProgressExam(updated);
      return updated;
    });
  }, []);

  // ─── Highlight handlers ──────────────────────────────────────────────────────
  const handleAddHighlight = useCallback((questionId: string, range: { start: number; end: number }) => {
    setState(prev => {
      if (!prev) return prev;
      const currentHighlights = prev.highlights || {};
      const qHighlights = currentHighlights[questionId] || [];
      const updated = {
        ...prev,
        highlights: {
          ...currentHighlights,
          [questionId]: [...qHighlights, { ...range, color: highlightColor }],
        },
      };
      saveInProgressExam(updated);
      return updated;
    });
  }, [highlightColor]);

  const handleClearHighlights = useCallback((questionId: string) => {
    setState(prev => {
      if (!prev) return prev;
      const updated = { ...prev, highlights: { ...(prev.highlights || {}), [questionId]: [] } };
      saveInProgressExam(updated);
      return updated;
    });
  }, []);

  // ─── Elimination handler ────────────────────────────────────────────────────
  const handleToggleEliminate = useCallback((questionId: string, letter: string) => {
    setState(prev => {
      if (!prev) return prev;
      const currentEliminated = prev.eliminated_choices || {};
      const qEliminated = currentEliminated[questionId] || [];
      const newQEliminated = qEliminated.includes(letter)
        ? qEliminated.filter(l => l !== letter)
        : [...qEliminated, letter];
      const updated = {
        ...prev,
        eliminated_choices: { ...currentEliminated, [questionId]: newQEliminated },
      };
      saveInProgressExam(updated);
      return updated;
    });
  }, []);

  // ─── Flag handler ─────────────────────────────────────────────────────────────
  const handleToggleFlag = useCallback((qid: string) => {
    setFlagged(prev => {
      const n = new Set(prev);
      n.has(qid) ? n.delete(qid) : n.add(qid);
      setState(s => {
        if (!s) return s;
        const updated = { ...s, flagged: Array.from(n) };
        saveInProgressExam(updated);
        return updated;
      });
      return n;
    });
  }, []);

  // ─── Save & Exit ──────────────────────────────────────────────────────────────
  const handleSaveExit = useCallback(() => {
    if (isSaving) return;
    setIsSaving(true);
    if (questions[currentQIdx]) {
      const elapsed = Math.round((Date.now() - questionStartTime.current) / 1000);
      accumulatedTime.current[questions[currentQIdx].question_id] =
        (accumulatedTime.current[questions[currentQIdx].question_id] ?? 0) + elapsed;
    }
    if (state) {
      const elapsedSinceStart = Date.now() - (state.module_started_at || Date.now());
      const newElapsed = (state.module_time_elapsed_ms || 0) + elapsedSinceStart;
      saveInProgressExam({
        ...state,
        flagged: Array.from(flagged),
        time_per_question: { ...accumulatedTime.current },
        module_time_elapsed_ms: newElapsed,
        module_started_at: undefined,
      });
    }
    router.push('/');
  }, [isSaving, questions, currentQIdx, state, flagged, router]);

  // ─── Derived values ──────────────────────────────────────────────────────────
  const currentModule = state?.modules[state.current_module_index];
  const timerTotalSeconds = (currentModule?.time_minutes ?? 32) * 60;
  const isMathModule = currentModule?.section === 'Math';
  const isRWModule = currentModule?.section === 'Reading and Writing';
  const answeredCount = questions.filter(q => {
    const ans = state?.answers[q.question_id];
    return ans != null && ans !== '';
  }).length;
  const sectionNumber = currentModule?.section === 'Reading and Writing' ? 1 : (state?.exam_type === 'math' ? 1 : 2);
  const moduleNumberInSection = currentModule?.section === 'Reading and Writing'
    ? (state?.current_module_index ?? 0) + 1
    : (state?.exam_type === 'math' ? (state?.current_module_index ?? 0) + 1 : (state?.current_module_index ?? 2) - 1);

  const sectionLabel = currentModule
    ? `Section ${sectionNumber}, Module ${moduleNumberInSection}: ${currentModule.section} Questions`
    : '';
  const currentQ = questions[currentQIdx];

  // ─── Stand By Screen (Punto 4) ───────────────────────────────────────────────
  if (showStandBy && state) {
    return (
      <StandByScreen
        onComplete={() => {
          router.push(`/results/${state.session_id}`);
        }}
      />
    );
  }

  // ─── Loading states ──────────────────────────────────────────────────────────
  if (!state || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (isWaitingForNextModule) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-t-[#2563EB] border-[#2563EB]/30 rounded-full animate-spin mb-6" />
        <h2 className="text-2xl font-bold text-[#1E293B] mb-2 text-center">Generating Adaptive Module…</h2>
        <p className="text-[#4B5563] text-sm max-w-sm text-center">
          Evaluating your performance and building your next section. Just a few seconds.
        </p>
      </div>
    );
  }

  const headerSectionTitle = currentModule
    ? `Section ${sectionNumber}, Module ${moduleNumberInSection}: ${currentModule.section}`
    : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: 'white' }}>

      {/* ── Top Header ── */}
      <header
        style={{
          flexShrink: 0,
          background: '#ffffffff',
          borderBottom: '1.5px dashed #CBD5E1',
          zIndex: 40,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '10px 20px',
            gap: 12,
          }}
        >
          {/* Left: Section + Directions */}
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, justifySelf: 'start' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1E293B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headerSectionTitle}
            </span>
            <button
              onClick={() => setShowDirections(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                cursor: 'pointer', color: '#374151', fontSize: 12, fontWeight: 500, padding: 0, width: 'fit-content',
              }}
            >
              Directions <ChevronUp size={11} style={{ transform: 'rotate(180deg)' }} />
            </button>
          </div>

          {/* Center: Timer (Clean, completely centered) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {state.exam_type !== 'custom' && (
              <ExamTimer
                totalSeconds={timerTotalSeconds}
                moduleStartedAt={state.module_started_at}
                elapsedMs={state.module_time_elapsed_ms || 0}
                resetKey={state.current_module_index}
                onExpire={handleTimerExpire}
                onFiveMinutes={handleFiveMinutes}
              />
            )}
          </div>

          {/* Right: Tools */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end', position: 'relative' }}>
            {isRWModule && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* 4x1 Inline Palette to the left of Highlight */}
                {isHighlightMode && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '3px 6px',
                      borderRadius: 8,
                      background: 'white',
                      border: '1px solid #D1D5DB',
                    }}
                  >
                    {HIGHLIGHT_COLORS.map(hc => (
                      <button
                        key={hc.id}
                        onClick={() => setHighlightColor(hc.id)}
                        title={hc.label}
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          background: hc.color,
                          border: highlightColor === hc.id ? '2px solid #2563EB' : '1px solid #D1D5DB',
                          cursor: 'pointer',
                        }}
                      />
                    ))}
                    {/* Red X button to clear current question highlights */}
                    <button
                      onClick={() => currentQ && handleClearHighlights(currentQ.question_id)}
                      title="Clear highlights"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 4,
                        border: '1px solid #FCA5A5',
                        background: '#FEF2F2',
                        color: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  </div>
                )}

                {/* Highlight Button */}
                <button
                  onClick={() => setIsHighlightMode(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    border: isHighlightMode ? '1.5px solid #2563EB' : '1.5px solid #D1D5DB',
                    background: isHighlightMode ? 'rgba(37,99,235,0.08)' : 'white',
                    color: isHighlightMode ? '#2563EB' : '#374151',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}
                  title="Toggle highlight mode"
                >
                  <Highlighter size={13} />
                  Highlight
                </button>

                {/* Notes Button */}
                <button
                  onClick={() => setShowNotes(v => !v)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    border: showNotes ? '1.5px solid #2563EB' : '1.5px solid #D1D5DB',
                    background: showNotes ? 'rgba(37,99,235,0.08)' : 'white',
                    color: showNotes ? '#2563EB' : '#374151',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    position: 'relative',
                  }}
                  title="Toggle notes"
                >
                  <FileText size={13} />
                  Notes
                  {currentQ && state.notes?.[currentQ.question_id] && (
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#EAB308',
                        position: 'absolute',
                        top: 4,
                        right: 4,
                      }}
                    />
                  )}
                </button>
              </div>
            )}

            {isMathModule && (
              <>
                <button
                  onClick={() => setShowDesmos(v => !v)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 8,
                    background: 'white', cursor: 'pointer',
                    color: showDesmos ? '#2563EB' : '#374151',
                  }}
                  title="Open Graphing Calculator"
                >
                  <CalcIcon size={18} />
                  <span style={{ fontSize: 10, fontWeight: 500, marginTop: 1 }}>Calculator</span>
                </button>
                <button
                  onClick={() => setShowFormulas(v => !v)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: '4px 10px', borderRadius: 8,
                    background: 'white', cursor: 'pointer',
                    color: showFormulas ? '#2563EB' : '#374151',
                  }}
                  title="Reference Formulas"
                >
                  <span style={{ fontSize: 16, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.1 }}>x²</span>
                  <span style={{ fontSize: 10, fontWeight: 500, marginTop: 1 }}>Reference</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content (Banner deleted) ── */}
      {showCheckYourWork ? (
        <CheckYourWorkView
          questions={questions}
          currentIdx={currentQIdx}
          answers={state.answers}
          flagged={flagged}
          onJump={i => { handleQuestionChange(i); setShowCheckYourWork(false); }}
          sectionLabel={sectionLabel}
          onBack={() => { setShowCheckYourWork(false); }}
          onNext={() => {
            if (currentQIdx < questions.length - 1) {
              setShowCheckYourWork(false);
            } else {
              setShowConfirmSubmit(true);
            }
          }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Desmos left pane (Mini-header completely deleted, full 100% iframe) */}
          {isMathModule && (
            <div
              style={{
                width: showDesmos ? '50%' : '0',
                flexShrink: 0,
                overflow: 'hidden',
                transition: isReady ? 'width 0.32s cubic-bezier(0.4,0,0.2,1)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                borderRight: '1px solid #E5E7EB',
              }}
            >
              {showDesmos && (
                <iframe
                  src="https://www.desmos.com/testing/collegeboard/graphing"
                  style={{ flex: 1, width: '100%', height: '100%', border: 'none', minWidth: 0 }}
                  title="Desmos Graphing Calculator"
                  allow="fullscreen"
                />
              )}
            </div>
          )}

          {/* Question area */}
          <div
            style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}
            onCopy={e => e.preventDefault()}
          >
            <div
              style={{
                flex: 1,
                overflow: isRWModule ? 'hidden' : 'auto',
                display: isRWModule ? 'flex' : 'block',
                flexDirection: isRWModule ? 'column' : undefined,
              }}
            >
              {currentQ && (
                <div
                  style={{
                    flex: 1,
                    display: isRWModule ? 'flex' : 'block',
                    overflow: isRWModule ? 'hidden' : undefined,
                    maxWidth: isRWModule ? undefined : 860,
                    margin: isRWModule ? undefined : '0 auto',
                    padding: isRWModule ? 0 : '24px 24px',
                  }}
                >
                  <BluebookQuestionCard
                    question={currentQ}
                    selectedAnswer={state.answers[currentQ.question_id]}
                    onAnswer={val => handleAnswer(currentQ.question_id, val)}
                    questionNum={currentQIdx + 1}
                    totalQuestions={questions.length}
                    isFlagged={flagged.has(currentQ.question_id)}
                    onToggleFlag={() => handleToggleFlag(currentQ.question_id)}
                    highlights={state.highlights?.[currentQ.question_id]}
                    isHighlightMode={isHighlightMode}
                    onAddHighlight={r => handleAddHighlight(currentQ.question_id, r)}
                    onClearHighlights={() => handleClearHighlights(currentQ.question_id)}
                    eliminatedChoices={state.eliminated_choices?.[currentQ.question_id]}
                    onToggleEliminate={letter => handleToggleEliminate(currentQ.question_id, letter)}
                    isEliminationMode={isEliminationMode}
                    note={state.notes?.[currentQ.question_id]}
                    onNoteChange={note => handleUpdateNote(currentQ.question_id, note)}
                    showNotes={showNotes}
                    onCloseNotes={() => setShowNotes(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Footer ── */}
      {!showCheckYourWork && (
        <footer
          style={{
            flexShrink: 0,
            background: '#ffffff',
            borderTop: '1.5px solid #CBD5E1',
            padding: '10px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {/* Left: Save & Exit + Flag + Eliminate Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'start' }}>
            <button
              onClick={handleSaveExit}
              disabled={isSaving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: '1.5px solid #D1D5DB',
                background: 'white',
                color: '#374151',
                fontSize: 12,
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              title="Save progress and exit"
            >
              {isSaving ? <Loader2 size={13} className="animate-spin text-[#2563EB]" /> : <LogOut size={13} />}
              <span>{isSaving ? 'Saving…' : 'Save & Exit'}</span>
            </button>

            <button
              onClick={() => currentQ && handleToggleFlag(currentQ.question_id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                border: currentQ && flagged.has(currentQ.question_id) ? '1.5px solid rgba(239,68,68,0.4)' : '1.5px solid #D1D5DB',
                background: currentQ && flagged.has(currentQ.question_id) ? 'rgba(239,68,68,0.08)' : 'white',
                color: currentQ && flagged.has(currentQ.question_id) ? '#EF4444' : '#4B5563',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <Bookmark
                size={13}
                style={{
                  fill: currentQ && flagged.has(currentQ.question_id) ? '#EF4444' : 'none',
                  stroke: currentQ && flagged.has(currentQ.question_id) ? '#EF4444' : '#4B5563',
                }}
              />
              {currentQ && flagged.has(currentQ.question_id) ? 'Flagged' : 'Flag'}
            </button>

            {/* Eliminate Options button */}
            {currentQ?.options && (
              <button
                onClick={() => setIsEliminationMode(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 14px', borderRadius: 8,
                  border: isEliminationMode ? '1.5px solid #2563EB' : '1.5px solid #D1D5DB',
                  background: isEliminationMode ? 'rgba(37,99,235,0.08)' : 'white',
                  color: isEliminationMode ? '#2563EB' : '#4B5563',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}
                title="Cross out answer choices you think are wrong."
              >
                <Strikethrough size={13} />
                Eliminate Options
              </button>
            )}
          </div>

          {/* Center: Question X of Y pill — triggers nav popover */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
            {showNavPopover && currentModule && (
              <QuestionNavPopover
                questions={questions}
                currentIdx={currentQIdx}
                answers={state.answers}
                flagged={flagged}
                onJump={handleQuestionChange}
                onClose={() => setShowNavPopover(false)}
                onGoToReview={() => setShowCheckYourWork(true)}
                sectionLabel={sectionLabel}
              />
            )}
            <button
              onClick={() => setShowNavPopover(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', borderRadius: 999,
                background: '#1E293B', color: 'white',
                border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700,
              }}
            >
              Question {currentQIdx + 1} of {questions.length}
              <ChevronUp size={14} style={{ transform: showNavPopover ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }} />
            </button>
          </div>

          {/* Right: Back / Next */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
            <button
              onClick={() => {
                if (currentQIdx > 0) handleQuestionChange(currentQIdx - 1);
              }}
              disabled={currentQIdx === 0}
              style={{
                padding: '8px 22px', borderRadius: 999,
                border: '1.5px solid #D1D5DB',
                background: 'white', color: currentQIdx === 0 ? '#9CA3AF' : '#374151',
                fontSize: 13, fontWeight: 700, cursor: currentQIdx === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Back
            </button>
            {currentQIdx < questions.length - 1 ? (
              <button
                onClick={() => handleQuestionChange(currentQIdx + 1)}
                style={{
                  padding: '8px 22px', borderRadius: 999,
                  border: 'none',
                  background: '#2563EB', color: 'white',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => setShowCheckYourWork(true)}
                style={{
                  padding: '8px 20px', borderRadius: 999,
                  border: 'none',
                  background: '#2563EB', color: 'white',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </footer>
      )}

      {/* ── Math Reference Drawer ── */}
      <MathReferenceDrawer isOpen={showFormulas} onClose={() => setShowFormulas(false)} />

      {/* ── Modals ── */}
      <DirectionsModal
        isOpen={showDirections}
        onClose={() => setShowDirections(false)}
        section={currentModule?.section || 'Reading and Writing'}
      />

      <FiveMinWarningModal
        isOpen={showFiveMinWarning}
        onClose={() => setShowFiveMinWarning(false)}
      />

      {/* Confirm Submit */}
      <Modal
        isOpen={showConfirmSubmit}
        onClose={() => setShowConfirmSubmit(false)}
        title="Submit Module?"
        maxWidth="max-w-sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#4B5563]">
            You have answered <strong className="text-[#1E293B]">{answeredCount}</strong> of{' '}
            <strong className="text-[#1E293B]">{questions.length}</strong> questions.
            {answeredCount < questions.length && (
              <span className="text-red-600 ml-1">
                {questions.length - answeredCount} question(s) unanswered.
              </span>
            )}
          </p>
          <p className="text-xs text-[#6B7280]">
            {(state.current_module_index + 1 < state.modules.length || (state.pending_ai_modules && state.pending_ai_modules.length > 0))
              ? 'This will advance you to the next module.'
              : 'This will complete the exam and show your results.'}
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setShowConfirmSubmit(false)}
              className="px-4 py-2 rounded-full border border-[#D1D5DB] text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all cursor-pointer"
            >
              Keep Reviewing
            </button>
            <button
              onClick={() => handleModuleSubmit(false)}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-full bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? 'Submitting…' : 'Confirm Submit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Grading overlay */}
      {isSubmitting && !showStandBy && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm cursor-wait">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            <p className="font-bold text-[#1E293B]">Grading your exam…</p>
          </div>
        </div>
      )}
    </div>
  );
}
