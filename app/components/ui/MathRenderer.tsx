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
 * Renders a string that may contain inline LaTeX delimited by $...$ or $$...$$
 * Plain text is rendered as-is; math segments are rendered by KaTeX.
 */
export function MathText({ text, className = '' }: { text: string; className?: string }) {
  if (!text) return null;

  // Split on $...$ (inline) and $$...$$ (block)
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^$]+?\$)/g);

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
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
