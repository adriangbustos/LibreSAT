'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getTestSession } from '@/app/lib/storage';
import { loadQuestionsMap } from '@/app/lib/db';
import type { TestSession, Question } from '@/app/types';
import { MathText } from '@/app/components/ui/MathRenderer';
import { Button } from '@/app/components/ui/Button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function PrintWrongAnswersContent() {
  const { sessionId } = useParams() as { sessionId: string };
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject') || 'Both';

  const router = useRouter();
  const [session, setSession] = useState<TestSession | null>(null);
  const [questionsMap, setQuestionsMap] = useState<Map<string, Question>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const s = getTestSession(sessionId);
    if (!s) { router.replace('/'); return; }
    setSession(s);
    loadQuestionsMap().then(map => {
      setQuestionsMap(map);
      setIsLoading(false);
    });
  }, [sessionId, router]);

  useEffect(() => {
    // Automatically open print dialog once loaded
    if (!isLoading && session) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [isLoading, session]);

  if (isLoading || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const allWrongResults = session.module_results.flatMap(m => m.results).filter(r => !r.is_correct);
  const mathWrong = allWrongResults.filter(r => questionsMap.get(r.question_id)?.section === 'Math');
  const englishWrong = allWrongResults.filter(r => questionsMap.get(r.question_id)?.section === 'Reading and Writing');

  const targetQuestions = subject === 'Both'
    ? allWrongResults
    : subject === 'Math'
      ? mathWrong
      : englishWrong;

  return (
    <div className="min-h-screen bg-white text-black font-sans print:bg-white print:m-0 print:p-0">

      {/* Non-printable UI header for navigation */}
      <div className="print:hidden sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href={`/results/${sessionId}`}>
            <Button variant="secondary" size="sm">
              <ArrowLeft size={16} /> Back to Results
            </Button>
          </Link>
          <div className="text-sm text-gray-500">
            If the print dialog doesn't appear, click the print button. <br />
            <strong>Tip:</strong> Choose "Save as PDF" in the destination dropdown.
          </div>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Save PDF
        </Button>
      </div>

      <div className="max-w-[800px] mx-auto p-8 print:max-w-none print:w-full print:p-0 print:pt-4">

        <div className="mb-10 text-center print:text-left print:mb-6">
          <h1 className="text-3xl font-bold text-[var(--accent-indigo)] mb-2">Wrong Answers - {subject}</h1>
          <p className="text-gray-500 font-medium">Session: {session.label}</p>
        </div>

        {targetQuestions.length === 0 ? (
          <div className="text-center text-gray-500 py-10">
            No wrong answers found for {subject}.
          </div>
        ) : (
          targetQuestions.map((result, idx) => {
            const q = questionsMap.get(result.question_id);
            if (!q) return null;
            return (
              <div
                key={q.question_id}
                className="mb-8 border border-gray-200 rounded-xl overflow-hidden shadow-sm print:shadow-none print:border-gray-300 print:mb-6"
                style={{ breakInside: idx === 0 ? 'auto' : 'avoid' }}
              >
                {/* Beautiful Header Table */}
                <div className="bg-[var(--accent-indigo)] text-white p-3 print:bg-[var(--accent-indigo)] print:text-white" style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                  <table className="w-full text-xs font-semibold text-left">
                    <tbody>
                      <tr>
                        <td className="w-[10%] py-1">#{idx + 1}</td>
                        <td className="w-1/5 py-1">ID: <span className="font-mono">{q.question_id}</span></td>
                        <td className="w-1/5 py-1">Sec: {q.section}</td>
                        <td className="w-2/5 py-1">Dom: {q.domain}</td>
                        <td className="w-1/5 py-1 text-right">Diff: {q.difficulty}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-6 print:p-4">
                  {q.stimulus && (
                    <div className="text-[14px] leading-relaxed mb-5 text-gray-800 font-sans bg-gray-50/80 p-4 rounded-lg border border-gray-100 print:border-none print:bg-gray-50">
                      <MathText text={q.stimulus} />
                    </div>
                  )}
                  <div className="text-[15px] font-medium leading-relaxed mb-6 text-black font-sans">
                    <MathText text={q.question_text} />
                  </div>

                  {/* Options */}
                  {q.options && (
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {Object.entries(q.options).map(([letter, text]) => (
                        <div key={letter} className="flex gap-3 text-[14px] font-sans bg-white border border-gray-200 p-3 rounded-lg print:border-gray-300">
                          <span className="font-bold text-[var(--accent-indigo)]">{letter}.</span>
                          <MathText text={text} autoWrapMath />
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-10 text-[14px] font-sans mb-6 bg-gray-50 border border-gray-200 py-4 px-5 rounded-xl print:bg-white print:border-gray-300">
                    <div>
                      <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Your answer: </span>
                      <span className="font-bold text-red-600 ml-2 text-base">{result.user_answer ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 font-bold uppercase text-xs tracking-wider">Correct: </span>
                      <span className="font-bold text-emerald-600 ml-2 text-base">{q.correct_answer}</span>
                    </div>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Global Print Styles targeting MathJax/KaTeX specifically if needed, but standard print media usually suffices */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          @page {
            margin: 1.5cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}} />
    </div>
  );
}

export default function PrintWrongAnswersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><div className="animate-spin w-8 h-8 border-2 border-[var(--accent-indigo)] border-t-transparent rounded-full" /></div>}>
      <PrintWrongAnswersContent />
    </Suspense>
  );
}
