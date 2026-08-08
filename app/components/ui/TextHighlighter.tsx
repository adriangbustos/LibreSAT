'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface HighlightRange {
  start: number;
  end: number;
}

interface TextHighlighterProps {
  questionId: string;
  highlights: HighlightRange[];
  isHighlightMode: boolean;
  onAddHighlight: (range: HighlightRange) => void;
  children: React.ReactNode;
}

// Helper to get character offset of a text node within a container
function getCharacterOffset(container: HTMLElement, node: Node, offset: number): number {
  let charOffset = 0;
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let currentNode;
  while ((currentNode = treeWalker.nextNode())) {
    if (currentNode === node) {
      charOffset += offset;
      break;
    } else {
      charOffset += currentNode.textContent?.length || 0;
    }
  }
  return charOffset;
}

// Helper to reconstruct a DOM Range from character offsets
function createRange(container: HTMLElement, start: number, end: number): Range | null {
  const treeWalker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let charOffset = 0;
  let currentNode;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  while ((currentNode = treeWalker.nextNode())) {
    const nextOffset = charOffset + (currentNode.textContent?.length || 0);

    if (startNode === null && start >= charOffset && start <= nextOffset) {
      startNode = currentNode;
      startOffset = start - charOffset;
    }

    if (endNode === null && end >= charOffset && end <= nextOffset) {
      endNode = currentNode;
      endOffset = end - charOffset;
    }

    charOffset = nextOffset;
    if (startNode && endNode) break;
  }

  if (startNode && endNode) {
    const range = document.createRange();
    range.setStart(startNode, startOffset);
    range.setEnd(endNode, endOffset);
    return range;
  }
  return null;
}

export function TextHighlighter({
  questionId,
  highlights,
  isHighlightMode,
  onAddHighlight,
  children,
}: TextHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Apply highlights via CSS.highlights API whenever highlights change or DOM mutates
  useEffect(() => {
    if (!containerRef.current) return;
    if (!('highlights' in CSS)) return; // Fallback if browser doesn't support it

    const applyHighlights = () => {
      if (!containerRef.current) return;
      const ranges = highlights
        .map((h) => createRange(containerRef.current!, h.start, h.end))
        .filter((r): r is Range => r !== null);

      // @ts-ignore
      const highlight = new Highlight(...ranges);
      // @ts-ignore
      CSS.highlights.set(`sat-highlight`, highlight);
    };

    applyHighlights();

    // Observe DOM changes (e.g. if React recreates dangerouslySetInnerHTML nodes on timer tick)
    const observer = new MutationObserver(() => {
      applyHighlights();
    });
    
    observer.observe(containerRef.current, { 
      childList: true, 
      subtree: true, 
      characterData: true 
    });

    return () => {
      observer.disconnect();
      // @ts-ignore
      CSS.highlights.delete(`sat-highlight`);
    };
  }, [highlights, questionId]);

  const handleMouseUp = useCallback(() => {
    if (!isHighlightMode) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    const text = selection.toString().trim();
    if (!text) return;

    // Calculate character offsets
    const startOffset = getCharacterOffset(container, range.startContainer, range.startOffset);
    const endOffset = getCharacterOffset(container, range.endContainer, range.endOffset);

    // Persist highlight
    onAddHighlight({ start: startOffset, end: endOffset });
    
    // Clear selection so the user can continue reading/highlighting easily
    selection.removeAllRanges();
  }, [isHighlightMode, onAddHighlight]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `::highlight(sat-highlight-${questionId}) { background-color: rgba(253, 224, 71, 0.8); color: inherit; }` }} />
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className={`relative highlight-container ${isHighlightMode ? 'cursor-text' : ''}`}
      >
        {children}
      </div>
    </>
  );
}
