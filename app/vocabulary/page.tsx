'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, History, BookMarked, Type, ChevronRight, CheckCircle2, PlayCircle, BookOpen
} from 'lucide-react';
import { loadVocabulary } from '@/app/lib/vocabDb';
import { getVocabTestSessions, getVocabDexStats } from '@/app/lib/vocabStorage';
import { ProgressBar } from '@/app/components/ui/ProgressBar';
import { Button } from '@/app/components/ui/Button';
import type { VocabWord } from '@/app/types';

export default function VocabularyPage() {
  const [vocab, setVocab] = useState<VocabWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({ seen: 0, total: 0, percentage: 0 });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadVocabulary();
        if (!mounted) return;
        setVocab(data);

        const sessions = getVocabTestSessions();
        const completed = new Set<string>();
        sessions.forEach(s => completed.add(s.set_id));
        setCompletedSets(completed);

        setStats(getVocabDexStats(data.length));
      } catch (err: any) {
        console.error('Failed to load vocabulary:', err);
        if (mounted) setError(err.message || 'Failed to load vocabulary');
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-rose)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-8 max-w-md w-full text-center border-rose-500/30">
          <div className="w-12 h-12 bg-rose-500/20 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Type size={24} />
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Failed to load data</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">{error}</p>
          <Link href="/">
            <Button variant="secondary" className="w-full">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const chunkSize = 50;
  const totalChunks = Math.ceil(vocab.length / chunkSize);
  const sets = Array.from({ length: totalChunks }).map((_, i) => ({
    id: String(i + 1),
    label: `Vocab Set ${i + 1}`,
    wordCount: Math.min(chunkSize, vocab.length - i * chunkSize),
  }));

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={16} />
            Dashboard
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-medium">Vocabulary Practice</span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 gradient-rose rounded-xl flex items-center justify-center`}>
              <Type size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Vocabulary Practice</h1>
              <p className="text-[var(--text-muted)] text-sm">Master SAT vocabulary words with targeted spaced repetition.</p>
            </div>
          </div>
        </div>

        {/* Top Tiles: History and VocabDex */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 animate-fadeIn animate-fadeIn-1">
          <Link href="/vocabulary/history" className="glass-card glass-card-hover hover-amber p-5 border-[var(--accent-amber)]/30 group cursor-pointer flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl gradient-amber flex items-center justify-center flex-shrink-0">
                <History size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-base group-hover:text-[color:var(--hover-border,var(--accent-indigo))] transition-all">Test History</h3>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">
                  View past vocabulary test results and review progress.
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--text-muted)] opacity-50 group-hover:opacity-100 transition-all" style={{ color: 'var(--hover-border, var(--accent-indigo))' }} />
          </Link>

          {/* VocabDex Tile */}
          <div className="glass-card p-5 flex flex-col justify-center">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 gradient-indigo rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookMarked size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[var(--text-primary)] font-semibold text-base">VocabDex</h3>
                  <p className="text-[var(--text-muted)] text-xs mt-0.5">
                    Your vocabulary coverage tracker
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-[var(--text-secondary)] font-medium">Overall Coverage</span>
                <span className="text-xs font-bold text-[var(--text-primary)]">
                  {stats.seen} / {stats.total}
                </span>
              </div>
              <ProgressBar value={stats.percentage} height={8} showLabel />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider">
            Static Practice Sets ({sets.length} available)
          </span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Static Exam Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.map((set, i) => {
            const isDone = completedSets.has(set.id);

            return (
              <div
                key={set.id}
                className={`glass-card p-5 flex flex-col animate-fadeIn`}
                style={{ animationDelay: `${(i % 10) * 0.05}s` }}
              >
                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Set {i + 1}
                  </span>
                  {isDone ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
                      <CheckCircle2 size={10} />
                      Completed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] border border-[var(--border)] rounded-full px-2 py-0.5">
                      Not started
                    </span>
                  )}
                </div>

                <h3 className="text-[var(--text-primary)] font-bold text-base mb-1">{set.label}</h3>
                <div className="text-xs text-[var(--text-muted)] mb-5">
                  {set.wordCount} words
                </div>

                {/* Actions Grid */}
                <div className="mt-auto grid grid-cols-2 gap-2 pt-3 border-t border-[var(--border)]">
                  <Link href={`/vocabulary/flashcards?id=${set.id}`} className="w-full">
                    <Button variant="secondary" className="w-full text-xs py-1.5 h-auto">
                      <BookOpen size={12} className="mr-1.5" /> Flashcards
                    </Button>
                  </Link>
                  <Link href={`/vocabulary/test?id=${set.id}`} className="w-full">
                    <Button variant="primary" className="w-full text-xs py-1.5 h-auto">
                      <PlayCircle size={12} className="mr-1.5" /> Test
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
