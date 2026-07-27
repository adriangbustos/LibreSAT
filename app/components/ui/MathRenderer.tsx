'use client';

import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function MathRenderer({ math, block = false, className = '' }: MathRendererProps) {
  const ref = useRef<HTMLSpanElement | HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !math) return;
    import('katex').then((katex) => {
      try {
        katex.default.render(math, ref.current!, {
          throwOnError: false,
          displayMode: block,
          strict: false,
          trust: true,
        });
      } catch (e) {
        if (ref.current) ref.current.textContent = math;
      }
    });
  }, [math, block]);

  if (block) {
    return <div ref={ref as React.RefObject<HTMLDivElement>} className={`katex-display ${className}`} />;
  }
  return <span ref={ref as React.RefObject<HTMLSpanElement>} className={className} />;
}

/**
 * Helper to preprocess text for common formatting issues.
 */
function preprocessText(t: string) {
  let s = t;
  // Remove stray backslashes at the ends of words/lines (common OCR artifact)
  s = s.replace(/\\\s*$/gm, '');
  // Fix currency $4.00 -> \$4.00 so it doesn't trigger math blocks
  // Matches $ followed by digits and a decimal, optionally surrounded by text
  s = s.replace(/\$(\d+\.\d{2})(?!\w|\$|\\)/g, '\\$$$1');

  // KaTeX supports \begin{array} but not \begin{tabular}. Swap them.
  s = s.replace(/\\begin{tabular}/g, '\\begin{array}').replace(/\\end{tabular}/g, '\\end{array}');

  // Auto-wrap common LaTeX commands if they aren't inside $...$
  if (!s.includes('$') && (s.includes('\\frac') || s.includes('\\sqrt') || s.includes('\\cdot') || s.includes('^'))) {
    s = `$${s}$`;
  }
  return s;
}

/**
 * Parses and renders basic markdown tables.
 */
function renderTable(tableStr: string, keyIdx: number) {
  const lines = tableStr.split('\n').map(l => l.trim()).filter(l => l.startsWith('|') && l.endsWith('|'));
  if (lines.length < 2) return <span key={keyIdx}>{tableStr}</span>;

  const rows = lines.map(line => line.slice(1, -1).split('|').map(cell => cell.trim()));
  const headers = rows[0];
  const bodyRows = rows.slice(2); // skip separator

  return (
    <div key={keyIdx} className="overflow-x-auto my-4 w-full">
      <table className="w-full text-sm border-collapse border border-[var(--border)] bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-50 border-b border-[var(--border)]">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-2 text-left font-semibold text-gray-700">
                <MathText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border)]">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-gray-50/50">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-2 text-gray-700">
                  <MathText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Renders a string that may contain inline LaTeX delimited by $...$ or $$...$$
 * Plain text is rendered as-is; math segments are rendered by KaTeX.
 * Also handles basic markdown tables.
 */
export function MathText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;

  const processed = preprocessText(text);

  // Split on tables first (a block of lines starting/ending with |)
  // We use a regex that looks for \n| ... |\n|---| ... 
  const tableRegex = /(\|.*\|[\s\S]*?(?:\n|\|)(?:[\s:-]+\|)+[\s\S]*?\|.*\|(?=\n|$))/g;

  if (processed.match(/\|.*---.*\|/)) {
    const blocks = processed.split(tableRegex);
    return (
      <span className={className}>
        {blocks.map((block, i) => {
          if (block.match(/\|.*---.*\|/)) {
            return renderTable(block, i);
          }
          if (block.trim()) {
            return <MathText key={i} text={block} className="" />;
          }
          return null;
        })}
      </span>
    );
  }

  // If no tables, split on $...$ (inline) and $$...$$ (block)
  // Negative lookbehind ensures we don't match \$
  const parts = processed.split(/((?<!\\)\$\$[\s\S]+?(?<!\\)\$\$|(?<!\\)\$[\s\S]+?(?<!\\)\$)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return (
            <MathRenderer
              key={i}
              math={part.slice(2, -2)}
              block
            />
          );
        }
        if (part.startsWith('$') && part.endsWith('$')) {
          return (
            <MathRenderer
              key={i}
              math={part.slice(1, -1)}
              block={false}
            />
          );
        }

        // Remove the backslash from escaped dollar signs and fix escaped percentages
        const plainText = part.replace(/\\\$/g, '$').replace(/\\%/g, '%');

        // Convert \n to <br/> for standard multiline text
        return <span key={i} dangerouslySetInnerHTML={{ __html: plainText.replace(/\n/g, '<br/>') }} />;
      })}
    </span>
  );
}
