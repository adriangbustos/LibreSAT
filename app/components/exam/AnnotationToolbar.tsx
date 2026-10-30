'use client';
import React, { useEffect, useRef, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

interface Props {
  x: number;
  y: number;
  onHighlight: (color: string) => void;
  onUnderline: () => void;
  onClear: () => void;
  onClose: () => void;
}

const COLORS = [
  { color: '#FEF08A', label: 'Yellow' },
  { color: '#BFDBFE', label: 'Blue' },
  { color: '#FBCFE8', label: 'Pink' },
];

export function AnnotationToolbar({ x, y, onHighlight, onUnderline, onClear, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [handleOutsideClick]);

  // Adjust so the toolbar stays within viewport
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.max(y - 52, 8);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        left: adjustedX,
        top: adjustedY,
        zIndex: 60,
        background: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: 10,
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
      }}
    >
      {/* Color highlight circles */}
      {COLORS.map(({ color, label }) => (
        <button
          key={color}
          title={`Highlight ${label}`}
          onClick={() => { onHighlight(color); onClose(); }}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: color,
            border: '1.5px solid rgba(0,0,0,0.15)',
            cursor: 'pointer',
            transition: 'transform 0.1s',
            flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget).style.transform = 'scale(1.15)'; }}
          onMouseLeave={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
        />
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: '#E5E7EB', margin: '0 2px' }} />

      {/* Underline */}
      <button
        title="Underline"
        onClick={() => { onUnderline(); onClose(); }}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          border: '1px solid #E5E7EB',
          background: 'white',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'serif',
          color: '#1E293B',
          textDecoration: 'underline',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget).style.background = '#F1F5F9'; }}
        onMouseLeave={e => { (e.currentTarget).style.background = 'white'; }}
      >
        U
      </button>

      {/* Clear / Trash */}
      <button
        title="Clear highlights"
        onClick={() => { onClear(); onClose(); }}
        style={{
          width: 28,
          height: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 6,
          border: '1px solid #E5E7EB',
          background: 'white',
          cursor: 'pointer',
          color: '#EF4444',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget).style.background = '#FEF2F2'; }}
        onMouseLeave={e => { (e.currentTarget).style.background = 'white'; }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
