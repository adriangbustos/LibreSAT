'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, CheckCircle2, XCircle } from 'lucide-react';
import { getVocabTestSessions } from '@/app/lib/vocabStorage';
import type { VocabTestSession } from '@/app/types';

export default function VocabHistoryPage() {
  const [sessions, setSessions] = useState<VocabTestSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setSessions(getVocabTestSessions());
    setIsLoading(false);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/90 backdrop-blur-xl">
        <div className="max-w-[1200px] mx-auto px-6 py-3 flex items-center gap-4">
          <Link href="/vocabulary" className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors text-sm">
            <ArrowLeft size={16} />
            Vocabulary
          </Link>
          <span className="text-[var(--border-light)]">/</span>
          <span className="text-[var(--text-primary)] text-sm font-medium">History</span>
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8 animate-fadeIn">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 gradient-amber rounded-xl flex items-center justify-center`}>
              <History size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Test History</h1>
              <p className="text-[var(--text-muted)] text-sm">Review your past vocabulary test results.</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-amber)] border-t-transparent rounded-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <History size={48} className="text-[var(--text-muted)] opacity-50 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">No History Yet</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Complete a vocabulary test to see your results here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session, i) => {
              const date = new Date(session.completed_at);
              const percentage = Math.round((session.correct_count / session.total_questions) * 100);
              
              return (
                <div key={session.session_id} className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fadeIn" style={{ animationDelay: `${i * 0.05}s` }}>
                  
                  {/* Info */}
                  <div className="flex-1">
                    <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {date.toLocaleDateString()} at {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">
                      Vocabulary Set {session.set_id}
                    </h3>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 size={20} className="text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-emerald-700 leading-none">{session.correct_count}</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Correct</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                        <XCircle size={20} className="text-rose-600" />
                      </div>
                      <div>
                        <div className="text-lg font-bold text-rose-700 leading-none">{session.incorrect_count}</div>
                        <div className="text-[10px] uppercase font-bold text-[var(--text-muted)]">Incorrect</div>
                      </div>
                    </div>

                    <div className="w-px h-12 bg-[var(--border)] mx-2 hidden md:block" />

                    <div className="text-right">
                      <div className="text-3xl font-black text-[var(--text-primary)] leading-none mb-1">
                        {percentage}%
                      </div>
                      <div className="text-[10px] uppercase font-bold text-[var(--text-muted)] tracking-wider">
                        Accuracy
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
