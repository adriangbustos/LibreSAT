'use client';

import React from 'react';
import { Trash2, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  note: string;
  onChange: (note: string) => void;
  onDelete: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  activeSnippet?: string;
}

export function NotesGutter({
  note,
  onChange,
  onDelete,
  isCollapsed,
  onToggleCollapse,
  activeSnippet,
}: Props) {
  if (isCollapsed) {
    return (
      <div className="relative flex flex-col justify-end items-center py-4 px-1 border-r border-[#E5E7EB] bg-[#FAFAFA] flex-shrink-0">
        <button
          onClick={onToggleCollapse}
          title="Show notes"
          className="p-1 rounded bg-white border border-[#D1D5DB] text-[#4B5563] hover:text-[#1E293B] hover:border-[#9CA3AF] shadow-xs transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] max-w-[280px] flex-shrink-0 flex flex-col border-r border-[#E5E7EB] bg-[#FAFAFA] relative">
      <div className="p-3 flex-1 flex flex-col min-h-0">
        {/* Sticky Note Card */}
        <div className="bg-white rounded-lg border-1.5 border-[#1E293B] shadow-sm flex flex-col overflow-hidden">
          {/* Yellow Header */}
          <div className="bg-[#FEF08A] px-3 py-1.5 flex items-center justify-between border-b border-[#FACC15]">
            <span className="text-xs font-bold text-[#1E293B] truncate mr-2" title={activeSnippet || 'Notes'}>
              {activeSnippet ? `"${activeSnippet}"` : 'Notes'}
            </span>
            <button
              onClick={onDelete}
              title="Delete note"
              className="text-[#1E293B] hover:text-red-600 transition-colors p-0.5"
            >
              <Trash2 size={13} />
            </button>
          </div>

          {/* Note Body */}
          <textarea
            value={note}
            onChange={e => onChange(e.target.value)}
            placeholder="Type your notes here…"
            rows={5}
            className="w-full p-2.5 text-xs text-[#1E293B] placeholder-[#9CA3AF] focus:outline-none resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Bottom Collapse Toggle */}
      <div className="p-2 border-t border-[#E5E7EB] flex justify-end bg-white">
        <button
          onClick={onToggleCollapse}
          title="Collapse notes"
          className="flex items-center gap-1 text-[11px] font-semibold text-[#4B5563] hover:text-[#1E293B] transition-colors p-1"
        >
          <span>Hide</span>
          <ChevronLeft size={13} />
        </button>
      </div>
    </div>
  );
}

