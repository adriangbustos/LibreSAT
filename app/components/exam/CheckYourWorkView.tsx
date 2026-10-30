'use client';

import React from 'react';
import type { Question } from '@/app/types';
import { MapPin, Bookmark } from 'lucide-react';

interface Props {
  questions: Question[];
  currentIdx: number;
  answers: Record<string, string | null>;
  flagged: Set<string>;
  onJump: (i: number) => void;
  sectionLabel: string;
  onBack: () => void;
  onNext: () => void;
}

export function CheckYourWorkView({
  questions,
  currentIdx,
  answers,
  flagged,
  onJump,
  sectionLabel,
  onBack,
  onNext,
}: Props) {
  const answeredCount = questions.filter(
    q => answers[q.question_id] != null && answers[q.question_id] !== ''
  ).length;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#F8F9FB' }}>
      <div className="flex-1 overflow-y-auto flex flex-col items-center px-6 py-10">
        <h1 className="text-[2rem] font-bold text-[#1E293B] mb-3 tracking-tight">Check Your Work</h1>
        <p className="text-sm text-[#374151] text-center max-w-lg mb-8 leading-relaxed">
          On test day, you won&apos;t be able to move on to the next module until time expires.{' '}
          For these practice questions, you can click <strong>Next</strong> when you&apos;re ready to move on.
        </p>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm w-full max-w-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="font-bold text-sm text-[#1E293B]">{sectionLabel}</span>
            <div className="flex items-center gap-4 text-[11px] text-[#4B5563]">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="inline-block w-3.5 h-3.5 border-[1.5px] border-dashed border-[#94A3B8] rounded-[2px]" />
                Unanswered
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Bookmark size={12} className="text-[#EF4444] fill-[#EF4444]" />
                For Review
              </span>
            </div>
          </div>
          <hr className="border-[#E5E7EB] mb-5" />

          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
            {questions.map((q, i) => {
              const isAnswered = answers[q.question_id] != null && answers[q.question_id] !== '';
              const isFlagged = flagged.has(q.question_id);
              const isCurrent = i === currentIdx;

              return (
                <div key={q.question_id} className="relative flex flex-col items-center" style={{ paddingTop: 16 }}>
                  {isCurrent && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2" style={{ lineHeight: 1 }}>
                      <MapPin size={12} className="text-[#2563EB] fill-[#2563EB]" />
                    </span>
                  )}
                  <button
                    onClick={() => onJump(i)}
                    className="w-10 h-10 rounded-[4px] text-sm font-bold flex items-center justify-center relative transition-all hover:scale-105 cursor-pointer"
                    style={{
                      background: isAnswered ? '#2563EB' : 'white',
                      color: isAnswered ? 'white' : '#1E293B',
                      border: isCurrent
                        ? '2px dashed #2563EB'
                        : isAnswered
                        ? 'none'
                        : '1.5px dashed #94A3B8',
                    }}
                  >
                    {i + 1}
                    {isFlagged && (
                      <span className="absolute -top-1 -right-1">
                        <Bookmark size={10} className="text-[#EF4444] fill-[#EF4444]" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#E5E7EB] text-xs text-[#6B7280] text-center">
            {answeredCount} of {questions.length} questions answered
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#E5E7EB] px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-5 py-2 rounded-full border border-[#D1D5DB] text-sm font-semibold text-[#374151] hover:bg-[#F9FAFB] transition-all cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="px-6 py-2 rounded-full bg-[#2563EB] text-white text-sm font-bold hover:bg-[#1D4ED8] transition-all cursor-pointer"
        >
          Next
        </button>
      </div>
    </div>
  );
}
