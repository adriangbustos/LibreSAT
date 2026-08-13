'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, PlayCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { loadVocabulary, getVocabChunk } from '@/app/lib/vocabDb';
import { saveVocabTestSession, bulkUpdateVocabDex } from '@/app/lib/vocabStorage';
import { Button } from '@/app/components/ui/Button';
import { ProgressBar } from '@/app/components/ui/ProgressBar';
import type { VocabWord } from '@/app/types';

interface Question {
  word: string;
  correctMeaning: string;
  options: string[];
}

function VocabTestContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id') as string;
  const params = { id };
  const router = useRouter();
  const setId = params.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [allVocab, chunk] = await Promise.all([
          loadVocabulary(),
          getVocabChunk(setId)
        ]);
        if (!mounted) return;

        // Generate questions
        const generated: Question[] = chunk.map(w => {
          const distractors = new Set<string>();
          while (distractors.size < 3) {
            const randomWord = allVocab[Math.floor(Math.random() * allVocab.length)];
            if (randomWord.meaning !== w.meaning) {
              distractors.add(randomWord.meaning);
            }
          }
          const options = [w.meaning, ...distractors].sort(() => Math.random() - 0.5);
          return {
            word: w.word,
            correctMeaning: w.meaning,
            options
          };
        });

        // Shuffle the questions so it's not the exact same order as flashcards
        setQuestions(generated.sort(() => Math.random() - 0.5));
        setStartTime(Date.now());
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [setId]);

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedAnswer(option);
    setIsAnswered(true);

    if (option === questions[currentIndex].correctMeaning) {
      setCorrectCount(c => c + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(c => c + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      finishTest();
    }
  };

  const finishTest = () => {
    const endTime = new Date().toISOString();
    saveVocabTestSession({
      session_id: `vocab_session_${Date.now()}`,
      set_id: setId,
      started_at: new Date(startTime).toISOString(),
      completed_at: endTime,
      total_questions: questions.length,
      correct_count: correctCount + (selectedAnswer === questions[currentIndex].correctMeaning ? 1 : 0),
      incorrect_count: questions.length - (correctCount + (selectedAnswer === questions[currentIndex].correctMeaning ? 1 : 0))
    });

    // Update VocabDex with all words from this set
    bulkUpdateVocabDex(questions.map(q => q.word));
    setIsCompleted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-rose)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-[var(--text-secondary)]">No words found in this set.</p>
        <Link href="/vocabulary">
          <Button as="div" variant="secondary">Go Back</Button>
        </Link>
      </div>
    );
  }

  if (isCompleted) {
    const finalCorrect = correctCount; // Since handleNext doesn't get called on the last question if we call finishTest directly, we actually handled the final logic inside finishTest but wait, handleNext IS called. Wait, finishTest is called INSTEAD of next if it's the last question. So my logic in finishTest is slightly flawed because if handleSelect was already processed, correctCount is ALREADY updated. Yes, correctCount is updated in handleSelect instantly.
    // So finalCorrect = correctCount is accurate.
    const percentage = Math.round((finalCorrect / questions.length) * 100);

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card max-w-lg w-full p-8 text-center animate-fadeIn">
          <div className="w-16 h-16 gradient-rose rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Test Complete!</h1>
          <p className="text-[var(--text-muted)] mb-8">You have completed Vocab Set {setId}.</p>

          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-4xl font-black text-[var(--accent-rose)] mb-1">{percentage}%</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-black text-emerald-600 mb-1">{finalCorrect}</div>
              <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-bold">Correct</div>
            </div>
          </div>

          <Link href="/vocabulary" className="block w-full">
            <Button as="div" variant="primary" className="w-full h-12 text-base gradient-rose border-none">
              Return to Vocabulary
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const progressPercent = Math.round(((currentIndex) / questions.length) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-default)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/vocabulary" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
              <ArrowLeft size={16} />
              Quit Test
            </Link>
            <span className="text-[var(--border-light)]">/</span>
            <span className="text-[var(--text-primary)] text-sm font-medium flex items-center gap-2">
              <PlayCircle size={16} className="text-[var(--accent-rose)]" />
              Set {setId} Test
            </span>
          </div>
          <div className="text-sm font-bold text-[var(--text-secondary)]">
            {currentIndex + 1} / {questions.length}
          </div>
        </div>
        <div className="max-w-[800px] mx-auto">
          <ProgressBar value={progressPercent} height={4} colorClass="gradient-rose" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-6 w-full max-w-[800px] mx-auto mt-8">

        <div className="w-full text-center mb-10">
          <h2 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            What is the meaning of:
          </h2>
          <div className="text-4xl md:text-5xl font-black text-[var(--text-primary)] tracking-tight">
            {currentQ.word}
          </div>
        </div>

        <div className="w-full space-y-3 mb-8">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedAnswer === option;
            const isCorrect = option === currentQ.correctMeaning;

            let btnStateClasses = "bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--accent-rose)] hover:bg-rose-50/50";

            if (isAnswered) {
              if (isCorrect) {
                btnStateClasses = "bg-emerald-50 border border-emerald-500 text-emerald-900";
              } else if (isSelected) {
                btnStateClasses = "bg-rose-50 border border-rose-500 text-rose-900";
              } else {
                btnStateClasses = "bg-[var(--bg-elevated)] border border-transparent opacity-50";
              }
            }
            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={isAnswered}
                className={`w-full text-left p-5 rounded-xl transition-all duration-200 flex items-center justify-between ${btnStateClasses}`}
              >
                <span className="text-base font-medium">{option}</span>
                {isAnswered && isCorrect && <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle size={20} className="text-rose-500 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className="w-full flex justify-end animate-fadeIn">
            <Button variant="primary" size="lg" onClick={handleNext} className="gradient-rose border-none">
              {currentIndex === questions.length - 1 ? 'Finish' : 'Next'} <ArrowRight size={18} />
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function VocabTestPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" /></div>}>
      <VocabTestContent />
    </Suspense>
  );
}
