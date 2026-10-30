'use client';

import React, { useRef, useEffect } from 'react';
import type { Question } from '@/app/types';
import { X, MapPin, Bookmark } from 'lucide-react';

interface Props {
  questions: Question[];
  currentIdx: number;
  answers: Record<string, string | null>;
  flagged: Set<string>;
  onJump: (i: number) => void;
  onClose: () => void;
  onGoToReview: () => void;
  sectionLabel: string;
}

export function QuestionNavPopover({
  questions,
  currentIdx,
  answers,
  flagged,
  onJump,
  onClose,
  onGoToReview,
  sectionLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-white rounded-2xl z-50 w-[540px] max-w-[95vw]"
      style={{ boxShadow: '0 -4px 32px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.10)' }}
    >
      {/* Downward Caret */}
      <div className="absolute -bottom-[9px] left-1/2 -translate-x-1/2">
        <div
          className="w-0 h-0"
          style={{
            borderLeft: '9px solid transparent',
            borderRight: '9px solid transparent',
            borderTop: '9px solid white',
            filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.06))',
          }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#E5E7EB]">
        <span className="font-bold text-sm text-[#1E293B]">{sectionLabel}</span>
        <button
          onClick={onClose}
          className="text-[#9CA3AF] hover:text-[#1E293B] transition-colors p-0.5 rounded cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Legend Bar (No Emojis, pure Lucide icons) */}
      <div className="flex items-center gap-5 px-5 py-2 text-[11px] text-[#4B5563]">
        <span className="flex items-center gap-1.5 font-medium">
          <MapPin size={12} className="text-[#2563EB] fill-[#2563EB]" />
          Current
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <span className="inline-block w-3.5 h-3.5 border-[1.5px] border-dashed border-[#94A3B8] rounded-[2px]" />
          Unanswered
        </span>
        <span className="flex items-center gap-1.5 font-medium">
          <Bookmark size={12} className="text-[#EF4444] fill-[#EF4444]" />
          For Review
        </span>
      </div>

      {/* Number Grid */}
      <div className="px-5 pb-2 pt-1">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(10, minmax(0, 1fr))' }}>
          {questions.map((q, i) => {
            const isAnswered = answers[q.question_id] != null && answers[q.question_id] !== '';
            const isFlagged = flagged.has(q.question_id);
            const isCurrent = i === currentIdx;

            return (
              <div key={q.question_id} className="relative flex flex-col items-center" style={{ paddingTop: 16 }}>
                {isCurrent && (
                  <span className="absolute top-0.5 left-1/2 -translate-x-1/2" style={{ lineHeight: 1 }}>
                    <MapPin size={11} className="text-[#2563EB] fill-[#2563EB]" />
                  </span>
                )}
                <button
                  onClick={() => {
                    onJump(i);
                    onClose();
                  }}
                  className="w-9 h-9 rounded-[4px] text-xs font-bold flex items-center justify-center relative transition-all hover:scale-105 cursor-pointer"
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
                    <span className="absolute -top-1 -right-1 flex items-center justify-center">
                      <Bookmark size={10} className="text-[#EF4444] fill-[#EF4444]" />
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Button */}
      <div className="px-5 pb-4 pt-3 flex justify-center border-t border-[#F3F4F6] mt-2">
        <button
          onClick={() => {
            onGoToReview();
            onClose();
          }}
          className="px-5 py-1.5 rounded-full border border-[#2563EB] text-[#2563EB] text-xs font-semibold hover:bg-[#EFF6FF] transition-all cursor-pointer"
        >
          Go to Review Page
        </button>
      </div>
    </div>
  );
}
