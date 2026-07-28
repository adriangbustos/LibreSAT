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
  // Fix literal escaped newlines (e.g. \n from JSON data)
  s = s.replace(/\\n/g, '\n');
  
  // Remove stray backslashes at the ends of words/lines (common OCR artifact)
  s = s.replace(/\\\s*$/gm, '');
  // Fix currency $4.00 -> \$4.00 so it doesn't trigger math blocks
  // Matches $ followed by digits and a decimal, optionally surrounded by text
  s = s.replace(/\$(\d+\.\d{2})(?!\w|\$|\\)/g, '\\$$$1');

  // KaTeX supports \begin{array} but not \begin{tabular}. Swap them.
  s = s.replace(/\\begin{tabular}/g, '\\begin{array}').replace(/\\end{tabular}/g, '\\end{array}');

  // Convert SAT raw tables (lines separated by |) to Markdown tables
  let linesArr = s.split('\n');
  for (let i = 0; i < linesArr.length; i++) {
    if (linesArr[i].includes('|')) {
      let j = i;
      while (j < linesArr.length && linesArr[j].includes('|')) {
        j++;
      }
      if (j - i >= 2) {
        let hasSeparator = false;
        for (let k = i; k < j; k++) {
          if (linesArr[k].match(/\|?\s*---\s*\|?/)) {
            hasSeparator = true;
            break;
          }
        }
        if (!hasSeparator) {
          const colsCount = linesArr[i].split('|').length;
          const separator = Array(colsCount).fill('---').join('|');
          linesArr.splice(i + 1, 0, separator);
          j++;
        }
        for (let k = i; k < j; k++) {
          let line = linesArr[k].trim();
          if (!line.startsWith('|')) line = '| ' + line;
          if (!line.endsWith('|')) line = line + ' |';
          linesArr[k] = line;
        }
      }
      i = j - 1;
    }
  }
  s = linesArr.join('\n');

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
    <div key={keyIdx} className="overflow-x-auto my-4 w-full rounded-lg border border-slate-700/60 shadow-sm">
      <table className="w-full text-sm border-collapse">
        <thead className="bg-slate-800/60 border-b border-slate-700/60">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-semibold text-slate-200">
                <MathText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-700/60 bg-slate-900/20">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-3 text-slate-300">
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

  if (processed.includes('|') && processed.includes('---')) {
    const lines = processed.split('\n');
    const blocks: { type: 'text' | 'table'; content: string }[] = [];
    let currentBlock: string[] = [];
    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const isTableLine = line.startsWith('|') && line.endsWith('|');

      if (isTableLine) {
        if (!inTable) {
          if (currentBlock.length > 0) {
            blocks.push({ type: 'text', content: currentBlock.join('\n') });
            currentBlock = [];
          }
          inTable = true;
        }
        currentBlock.push(line);
      } else {
        if (inTable) {
          const isRealTable = currentBlock.length >= 2 && currentBlock.some((l) => l.match(/\|?\s*---\s*\|?/));
          blocks.push({ type: isRealTable ? 'table' : 'text', content: currentBlock.join('\n') });
          currentBlock = [];
          inTable = false;
        }
        currentBlock.push(lines[i]);
      }
    }

    if (currentBlock.length > 0) {
      const isRealTable = inTable && currentBlock.length >= 2 && currentBlock.some((l) => l.match(/\|?\s*---\s*\|?/));
      blocks.push({ type: isRealTable ? 'table' : 'text', content: currentBlock.join('\n') });
    }

    if (blocks.some((b) => b.type === 'table')) {
      return (
        <span className={className}>
          {blocks.map((block, i) => {
            if (block.type === 'table') {
              return renderTable(block.content, i);
            }
            if (block.content.trim()) {
              return <MathText key={i} text={block.content} className="" />;
            }
            return null;
          })}
        </span>
      );
    }
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
        let htmlText = plainText.replace(/\n/g, '<br/>');
        
        // Handle markdown bold: **text** or *text* (SAT questions often use * for bold)
        htmlText = htmlText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        htmlText = htmlText.replace(/\*(.+?)\*/g, '<strong>$1</strong>');

        return <span key={i} dangerouslySetInnerHTML={{ __html: htmlText }} />;
      })}
    </span>
  );
}
