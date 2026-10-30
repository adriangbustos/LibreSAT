'use client';

import React, { useState, useEffect } from 'react';
import { HelpCircle, Home, CloudUpload } from 'lucide-react';
import Link from 'next/link';

interface Props {
  onComplete: () => void;
}

export function StandByScreen({ onComplete }: Props) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const duration = 2400; // 2.4 seconds

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(pct);

      if (pct >= 100) {
        clearInterval(timer);
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    }, 40);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-[#F8F9FA] overflow-y-auto">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-8 py-3.5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
        <button
          className="flex items-center gap-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#1E293B] transition-colors"
          onClick={() => {}}
        >
          <HelpCircle size={15} />
          <span>Help</span>
        </button>

        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs font-semibold text-[#4B5563] hover:text-[#1E293B] transition-colors"
        >
          <Home size={15} />
          <span>Return to Home</span>
        </Link>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1E293B] mb-2 tracking-tight">
          Digital Practice Is Over: Stand By!
        </h1>
        <p className="text-xs sm:text-sm text-[#4B5563] max-w-md mb-8 leading-relaxed">
          All your work has been saved, and we&apos;re uploading it now. Do not refresh this page or quit the app.
        </p>

        {/* Central Card */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm p-8 sm:p-10 max-w-md w-full flex flex-col items-center">
          {/* Laptop + Cloud Upload Illustration */}
          <div className="relative mb-6">
            {/* Laptop Vector Outline */}
            <svg width="140" height="90" viewBox="0 0 140 90" fill="none" className="mx-auto">
              {/* Screen */}
              <rect x="22" y="10" width="96" height="62" rx="4" stroke="#1E293B" strokeWidth="2.5" fill="#F8FAFC" />
              {/* Base */}
              <path d="M6 76h128a4 4 0 0 1 4 4v2H2v-2a4 4 0 0 1 4-4z" stroke="#1E293B" strokeWidth="2.5" fill="#E2E8F0" />
              <rect x="58" y="76" width="24" height="3" rx="1.5" fill="#94A3B8" />
            </svg>

            {/* Cloud Upload Icon Floating in screen */}
            <div className="absolute inset-0 flex items-center justify-center pb-2">
              <div className="p-2.5 rounded-full bg-blue-50 text-[#2563EB] animate-bounce">
                <CloudUpload size={28} />
              </div>
            </div>
          </div>

          {/* Circular Percentage Spinner */}
          <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-[#E5E7EB]"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#2563EB] transition-all duration-75"
                strokeDasharray={`${progress}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-xs font-bold text-[#1E293B]">
              {progress}%
            </span>
          </div>

          {/* Status Message */}
          <p className="text-xs text-[#6B7280]">
            Finalizing score calculation…
          </p>

          <hr className="w-full border-[#E5E7EB] my-5" />

          {/* Fallback Action */}
          <p className="text-[11px] text-[#9CA3AF]">
            If this screen doesn&apos;t update in a few minutes, hit{' '}
            <Link href="/" className="font-bold text-[#2563EB] hover:underline">
              Return to Home
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

