'use client';

import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Download } from 'lucide-react';
import type { TestSession } from '@/app/types';
import { useRouter } from 'next/navigation';

interface DownloadWrongAnswersModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: TestSession;
}

export function DownloadWrongAnswersModal({ isOpen, onClose, session }: DownloadWrongAnswersModalProps) {
  const [subject, setSubject] = useState<'Math' | 'English' | 'Both'>('Both');
  const router = useRouter();

  const handleDownload = () => {
    // Navigate to the dedicated print page with the selected subject
    router.push(`/print?id=${session.session_id}&subject=${subject}`);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Download Wrong Answers">
      <div className="space-y-6">
        <p className="text-sm text-[var(--text-secondary)]">
          This will generate a PDF containing the questions you answered incorrectly, including the correct answers.
          <br /><br />
          The aim of this feature is to allow the user to export their mistakes and easily share them with the AI of their liking, to recieve feedback, explanations, etc.
        </p>

        <div className="space-y-4">
          <label className="text-sm font-medium text-[var(--text-primary)]">Select Subject</label>
          <div className="grid grid-cols-3 gap-3">
            {(['Both', 'English', 'Math'] as const).map(opt => (
              <button
                key={opt}
                onClick={() => setSubject(opt)}
                className={`py-2.5 px-4 rounded-md border text-sm font-medium transition-colors ${subject === opt
                  ? 'bg-[var(--accent-indigo)] border-[var(--accent-indigo)] text-white'
                  : 'border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--border-strong)]'
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleDownload} className="min-w-[140px]">
            <Download size={16} /> Save PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
