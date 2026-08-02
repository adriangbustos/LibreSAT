'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, BookOpen, Shuffle } from 'lucide-react';
import { getVocabChunk } from '@/app/lib/vocabDb';
import { Button } from '@/app/components/ui/Button';
import { ProgressBar } from '@/app/components/ui/ProgressBar';
import type { VocabWord } from '@/app/types';

export default function FlashcardsPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params.id as string;

  const [words, setWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getVocabChunk(setId);
        if (!mounted) return;
        setWords(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [setId]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (isFlipped) {
          handleNext();
        } else {
          setIsFlipped(true);
        }
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, isFlipped, words.length]);

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c + 1), 150);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(c => c - 1), 150);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    setWords(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-rose)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-[var(--text-secondary)]">No words found in this set.</p>
        <Link href="/vocabulary">
          <Button variant="secondary">Go Back</Button>
        </Link>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / words.length) * 100);
  const currentWord = words[currentIndex];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-default)]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[800px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/vocabulary" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
              <ArrowLeft size={16} />
              Back
            </Link>
            <span className="text-[var(--border-light)]">/</span>
            <span className="text-[var(--text-primary)] text-sm font-medium flex items-center gap-2">
              <BookOpen size={16} className="text-[var(--accent-rose)]" />
              Set {setId} Flashcards
            </span>
          </div>
          <Button variant="secondary" size="sm" onClick={handleShuffle} title="Shuffle Words">
            <Shuffle size={14} />
          </Button>
        </div>
        <div className="max-w-[800px] mx-auto">
          <ProgressBar value={progressPercent} height={4} colorClass="gradient-rose" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-[800px] mx-auto">
        
        {/* Flashcard Area */}
        <div className="w-full aspect-[4/3] max-h-[400px] perspective-1000 mb-8" onClick={() => setIsFlipped(!isFlipped)}>
          <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`}>
            
            {/* Front */}
            <div className="absolute inset-0 backface-hidden glass-card flex flex-col items-center justify-center p-8 border-[var(--accent-rose)]/20 shadow-xl">
              <span className="absolute top-4 left-4 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                Word {currentIndex + 1} of {words.length}
              </span>
              <h2 className="text-4xl md:text-5xl font-extrabold text-[var(--text-primary)] text-center tracking-tight">
                {currentWord.word}
              </h2>
              <span className="absolute bottom-6 text-xs text-[var(--text-muted)] flex items-center gap-1 opacity-50">
                Click or press Space to flip
              </span>
            </div>

            {/* Back */}
            <div className="absolute inset-0 backface-hidden rotate-y-180 glass-card bg-rose-50/50 flex flex-col items-center justify-center p-8 border-[var(--accent-rose)]/40 shadow-xl">
               <span className="absolute top-4 left-4 text-xs font-bold text-[var(--accent-rose)] uppercase tracking-wider">
                Meaning
              </span>
              <p className="text-2xl md:text-3xl font-medium text-[var(--text-primary)] text-center leading-snug">
                {currentWord.meaning}
              </p>
            </div>

          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 w-full justify-center">
          <Button
            variant="secondary"
            size="lg"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-32"
          >
            <ChevronLeft size={20} /> Prev
          </Button>
          
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            disabled={currentIndex === words.length - 1}
            className="w-32 gradient-rose border-none"
          >
            Next <ChevronRight size={20} />
          </Button>
        </div>
      </main>

      {/* Embedded CSS for 3D Transforms */}
      <style dangerouslySetInnerHTML={{__html: `
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
      `}} />
    </div>
  );
}
