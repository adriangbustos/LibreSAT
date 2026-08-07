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
    return <div ref={ref as React.RefObject<HTMLDivElement>} className={`katex-display text-[1.15em] ${className}`} />;
  }
  return <span ref={ref as React.RefObject<HTMLSpanElement>} className={`text-[1.15em] ${className}`} />;
}

/**
 * Helper to preprocess text for common formatting issues.
 */
function preprocessText(t: string, autoWrapMath: boolean = false) {
  let s = t;
  // Fix literal escaped newlines (e.g. \n from JSON data)
  s = s.replace(/\\n/g, '\n');
  
  // Fix literal escaped unicode characters (e.g. \u00a9 -> ©)
  s = s.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
  
  // Fix missing line breaks before Choices A, B, C, D in explanations
  s = s.replace(/\.\s+(Choice [A-D]\b)/g, '.\n\n$1');
  
  // Replace LaTeX \rule commands used for blanks with a literal blank line
  s = s.replace(/\\rule\{[^}]*\}\{[^}]*\}/g, '_______');
  
  // Remove stray backslashes at the ends of words/lines (common OCR artifact)
  s = s.replace(/\\\s*$/gm, '');
  // Fix currency $4.00 -> \$4.00 so it doesn't trigger math blocks
  // Matches $ followed by digits and a decimal, optionally surrounded by text
  s = s.replace(/\$(\d+\.\d{2})(?!\w|\$|\\)/g, '\\$$$1');

  // Remove unsupported LaTeX environments like \begin{center}
  s = s.replace(/\\begin{center}/g, '').replace(/\\end{center}/g, '');

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
  const mathTriggers = [
    '\\frac', '\\sqrt', '\\cdot', '^', '\\\\', '\\begin', 
    '\\sin', '\\cos', '\\tan', '\\pi', '\\theta', '\\triangle', 
    '\\angle', '\\circ', '\\pm', '\\approx', '\\neq', '\\leq', 
    '\\geq', '\\mu', '\\alpha', '\\beta', '\\text'
  ];

  // Convert markdown bold/italics containing math triggers into math blocks
  // e.g. *4.46\text{ cm}* -> $4.46\text{ cm}$
  s = s.replace(/\*{1,2}([^*]+)\*{1,2}/g, (match, content) => {
    if (mathTriggers.some((cmd) => content.includes(cmd))) {
      return `$${content}$`;
    }
    return match;
  });

  // If autoWrapMath is true, wrap the entire string if it contains a math trigger 
  // but doesn't already contain $ or *
  if (autoWrapMath && !s.includes('$') && !s.includes('*')) {
    if (mathTriggers.some((cmd) => s.includes(cmd))) {
      // If it's a tabular, we don't need inline math because it's handled as block later, 
      // but wrapping it is fine, the array regex handles it.
      s = `$${s}$`;
    }
  }

  // Fix common OCR artifact: word split by underscore (e.g. Gavi_a -> Gavia)
  s = s.replace(/([a-zA-Z]{2,})_([a-zA-Z]+)/g, '$1$2');

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
      <table className="w-full text-sm border-collapse border border-gray-800">
        <thead className="bg-gray-100 border-b border-gray-800">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 text-center font-semibold text-gray-900 border border-gray-800">
                <MathText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800 bg-white">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-4 py-3 text-gray-900 border border-gray-800 text-center">
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
 * Also handles basic markdown tables and LaTeX array/tabular.
 */
export function MathText({ text, className = '', autoWrapMath = false }: { text: string; className?: string; autoWrapMath?: boolean }) {
  if (!text) return null;

  // Render as image if text looks like an image path
  if (text.match(/\.(png|jpe?g|gif|svg|webp)$/i) || text.startsWith('/images/')) {
    return (
      <img
        src={text}
        alt="Option"
        className={`max-w-full max-h-48 object-contain rounded-md ${className}`}
      />
    );
  }

  const processed = preprocessText(text, autoWrapMath);

  // Parse \begin{array}...\end{array} (which also covers original tabulars that were replaced)
  const latexTableRegex = /(?:\$\$?\s*)?\\begin{array}([\s\S]*?)\\end{array}(?:\s*\$\$?)?/g;
  const latexParts: { type: 'text' | 'latex-table'; content: string }[] = [];
  let lastIndex = 0;
  let match;
  while ((match = latexTableRegex.exec(processed)) !== null) {
    if (match.index > lastIndex) {
      latexParts.push({ type: 'text', content: processed.substring(lastIndex, match.index) });
    }
    latexParts.push({ type: 'latex-table', content: match[1] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < processed.length) {
    latexParts.push({ type: 'text', content: processed.substring(lastIndex) });
  }

  if (latexParts.some(p => p.type === 'latex-table')) {
    return (
      <span className={className}>
        {latexParts.map((part, i) => {
          if (part.type === 'latex-table') {
            return parseLatexTableToReact(part.content, i);
          }
          if (part.content.trim()) {
            return <MathText key={i} text={part.content} className="" />;
          }
          return null;
        })}
      </span>
    );
  }

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

  // If no tables, split on $...$ (inline) and $$...$$ (block) manually to avoid Safari lookbehind issues
  const parts: string[] = [];
  let current = '';
  let inMath = false;
  let isBlock = false;

  for (let i = 0; i < processed.length; i++) {
    if (processed[i] === '\\' && (processed[i + 1] === '$' || processed[i + 1] === '%')) {
      current += processed[i] + processed[i + 1];
      i++;
      continue;
    }
    
    if (processed[i] === '$') {
      const block = processed[i + 1] === '$';
      if (!inMath) {
        parts.push(current);
        current = block ? '$$' : '$';
        inMath = true;
        isBlock = block;
        if (block) i++;
      } else {
        if (isBlock && block) {
          current += '$$';
          parts.push(current);
          current = '';
          inMath = false;
          i++;
        } else if (!isBlock && !block) {
          current += '$';
          parts.push(current);
          current = '';
          inMath = false;
        } else {
          current += '$';
        }
      }
    } else {
      current += processed[i];
    }
  }
  if (current) parts.push(current);

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

function extractLatexArgs(str: string, cmd: string) {
  let idx = str.indexOf(cmd);
  if (idx === -1) return null;
  
  let args = [];
  let currentArg = "";
  let depth = 0;
  let inArg = false;
  
  for (let i = idx + cmd.length; i < str.length; i++) {
    if (str[i] === '{') {
      if (depth > 0) currentArg += '{';
      depth++;
      inArg = true;
    } else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        args.push(currentArg);
        currentArg = "";
        inArg = false;
        // check if next is '{'
        let nextBrace = -1;
        for (let j = i + 1; j < str.length; j++) {
            if (str[j].trim() === '') continue;
            if (str[j] === '{') nextBrace = j;
            break;
        }
        if (nextBrace === -1) {
          return { args, matchStr: str.substring(idx, i + 1) };
        } else {
            i = nextBrace - 1; // loop will increment and land on '{'
        }
      } else {
        currentArg += '}';
      }
    } else {
      if (inArg) currentArg += str[i];
      else if (str[i].trim() !== '') {
        break; // non-whitespace outside braces
      }
    }
  }
  return null;
}

function parseCell(cellStr: string) {
  let text = cellStr.trim();
  let colspan = 1;
  let rowspan = 1;
  
  while (true) {
      let mMultiCol = extractLatexArgs(text, '\\multicolumn');
      let mMultiRow = extractLatexArgs(text, '\\multirow');
      
      if (mMultiCol) {
          colspan = parseInt(mMultiCol.args[0], 10);
          text = text.replace(mMultiCol.matchStr, mMultiCol.args[2]);
          continue;
      }
      if (mMultiRow) {
          rowspan = parseInt(mMultiRow.args[0], 10);
          text = text.replace(mMultiRow.matchStr, mMultiRow.args[2]);
          continue;
      }
      break;
  }
  return { text: text.trim(), colspan, rowspan };
}

function parseLatexTableToReact(content: string, keyIdx: number) {
  // Remove formatting braces if any
  let tableContent = content;
  if (tableContent.startsWith('{') && tableContent.includes('}')) {
    // Usually \begin{array}{|c|c|} so the first block is format string
    tableContent = tableContent.replace(/^{[^{}]*}/, '');
  }
  // Remove \hline and \cline{...}
  tableContent = tableContent.replace(/\\hline/g, '').replace(/\\cline{[^}]+}/g, '');
  
  const latexRows = tableContent.split('\\\\').map(r => r.trim()).filter(r => r.length > 0);
  const parsedRows = latexRows.map(row => row.split('&').map(c => parseCell(c)));
  
  const grid: boolean[][] = [];
  const finalRows: { text: string; colspan: number; rowspan: number; }[][] = [];
  
  for (let rIdx = 0; rIdx < parsedRows.length; rIdx++) {
    if (!grid[rIdx]) grid[rIdx] = [];
    const htmlRow = [];
    
    let cIdx = 0;
    let gridCol = 0;
    
    while (cIdx < parsedRows[rIdx].length || gridCol < grid[rIdx].length) {
      if (grid[rIdx][gridCol]) {
        gridCol++;
        // Skip empty cell in latex if it was just a placeholder for rowspan
        if (cIdx < parsedRows[rIdx].length && parsedRows[rIdx][cIdx].text === "") {
          cIdx++;
        }
        continue;
      }
      
      if (cIdx >= parsedRows[rIdx].length) break;
      
      const cell = parsedRows[rIdx][cIdx];
      
      for (let r = 0; r < cell.rowspan; r++) {
        for (let c = 0; c < cell.colspan; c++) {
          if (!grid[rIdx + r]) grid[rIdx + r] = [];
          grid[rIdx + r][gridCol + c] = true;
        }
      }
      
      htmlRow.push(cell);
      gridCol += cell.colspan;
      cIdx++;
    }
    
    finalRows.push(htmlRow);
  }
  
  return (
    <div key={keyIdx} className="overflow-x-auto my-4 w-full max-w-3xl mx-auto">
      <table className="w-full text-base border-collapse border-[1.5px] border-black">
        <tbody className="bg-white">
          {finalRows.map((row, rIdx) => (
            <tr key={rIdx}>
              {row.map((cell, cIdx) => (
                <td 
                  key={cIdx} 
                  colSpan={cell.colspan > 1 ? cell.colspan : undefined} 
                  rowSpan={cell.rowspan > 1 ? cell.rowspan : undefined}
                  className="px-4 py-3 text-black border-[1.5px] border-black text-center font-medium"
                >
                  <MathText text={cell.text} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
