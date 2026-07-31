'use client';

import React from 'react';

interface BadgeProps {
  difficulty: 'Easy' | 'Medium' | 'Hard';
  className?: string;
}

export function DifficultyBadge({ difficulty, className = '' }: BadgeProps) {
  const cls = difficulty === 'Easy'
    ? 'badge-easy'
    : difficulty === 'Medium'
      ? 'badge-medium'
      : 'badge-hard';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls} ${className}`}>
      {difficulty}
    </span>
  );
}

interface SectionBadgeProps {
  section: 'Reading and Writing' | 'Math' | string;
  className?: string;
}

export function SectionBadge({ section, className = '' }: SectionBadgeProps) {
  const isMath = section === 'Math';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border)] ${className}`}>
      {section}
    </span>
  );
}

interface StatusBadgeProps {
  status: 'correct' | 'incorrect' | 'unseen';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = {
    correct:   { cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: '✓ Correct' },
    incorrect: { cls: 'bg-rose-500/10 text-rose-400 border border-rose-500/20', label: '✗ Incorrect' },
    unseen:    { cls: 'bg-slate-500/10 text-slate-400 border border-slate-500/20', label: '○ Unseen' },
  }[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.cls} ${className}`}>
      {config.label}
    </span>
  );
}
