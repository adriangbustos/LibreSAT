'use client';
import React, { useState, useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { MathText } from '@/app/components/ui/MathRenderer';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const RULES = [
  'The number of degrees of arc in a circle is 360.',
  'The number of radians of arc in a circle is $2\\pi$.',
  'The sum of the measures in degrees of the angles of a triangle is 180.',
];

function CircleSVG() {
  return (
    <svg viewBox="0 0 60 60" width="52" height="52" fill="none" className="mx-auto mb-1">
      <circle cx="30" cy="30" r="24" stroke="#1E293B" strokeWidth="1.5"/>
      <circle cx="30" cy="30" r="2" fill="#1E293B"/>
      <line x1="30" y1="30" x2="54" y2="30" stroke="#1E293B" strokeWidth="1.5"/>
      <text x="38" y="28" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">r</text>
    </svg>
  );
}
function RectangleSVG() {
  return (
    <svg viewBox="0 0 74 52" width="66" height="46" fill="none" className="mx-auto mb-1">
      <rect x="4" y="8" width="64" height="34" stroke="#1E293B" strokeWidth="1.5"/>
      <text x="30" y="55" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">ℓ</text>
      <text x="70" y="29" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">w</text>
    </svg>
  );
}
function TriangleSVG() {
  return (
    <svg viewBox="0 0 66 60" width="60" height="54" fill="none" className="mx-auto mb-1">
      <polygon points="4,52 62,52 33,4" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <line x1="33" y1="4" x2="33" y2="52" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,2"/>
      <rect x="30" y="46" width="6" height="6" fill="none" stroke="#1E293B" strokeWidth="1"/>
      <text x="14" y="60" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">b</text>
      <text x="36" y="33" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">h</text>
    </svg>
  );
}
function RightTriangleSVG() {
  return (
    <svg viewBox="0 0 60 54" width="54" height="48" fill="none" className="mx-auto mb-1">
      <polygon points="4,50 4,4 58,50" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <rect x="4" y="44" width="7" height="7" fill="none" stroke="#1E293B" strokeWidth="1"/>
      <text x="0" y="30" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">a</text>
      <text x="24" y="58" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">b</text>
      <text x="32" y="26" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">c</text>
    </svg>
  );
}
function PrismSVG() {
  return (
    <svg viewBox="0 0 68 56" width="60" height="50" fill="none" className="mx-auto mb-1">
      <path d="M4 42 L44 42 L44 12 L4 12 Z" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <path d="M44 12 L58 4 L58 34 L44 42" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <path d="M4 12 L18 4 L58 4" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <text x="18" y="53" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">ℓ</text>
      <text x="48" y="54" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">w</text>
      <text x="60" y="24" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">h</text>
    </svg>
  );
}
function CylinderSVG() {
  return (
    <svg viewBox="0 0 54 64" width="48" height="58" fill="none" className="mx-auto mb-1">
      <ellipse cx="27" cy="14" rx="22" ry="7" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <ellipse cx="27" cy="50" rx="22" ry="7" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <line x1="5" y1="14" x2="5" y2="50" stroke="#1E293B" strokeWidth="1.5"/>
      <line x1="49" y1="14" x2="49" y2="50" stroke="#1E293B" strokeWidth="1.5"/>
      <line x1="27" y1="7" x2="49" y2="7" stroke="#1E293B" strokeWidth="1"/>
      <text x="34" y="5" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">r</text>
      <text x="51" y="35" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">h</text>
    </svg>
  );
}
function SphereSVG() {
  return (
    <svg viewBox="0 0 54 54" width="48" height="48" fill="none" className="mx-auto mb-1">
      <circle cx="27" cy="27" r="22" stroke="#1E293B" strokeWidth="1.5"/>
      <ellipse cx="27" cy="27" rx="22" ry="9" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,2"/>
      <circle cx="27" cy="27" r="2" fill="#1E293B"/>
      <line x1="27" y1="27" x2="49" y2="27" stroke="#1E293B" strokeWidth="1"/>
      <text x="34" y="25" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">r</text>
    </svg>
  );
}
function ConeSVG() {
  return (
    <svg viewBox="0 0 54 58" width="48" height="52" fill="none" className="mx-auto mb-1">
      <ellipse cx="27" cy="48" rx="22" ry="8" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
      <line x1="5" y1="48" x2="27" y2="6" stroke="#1E293B" strokeWidth="1.5"/>
      <line x1="49" y1="48" x2="27" y2="6" stroke="#1E293B" strokeWidth="1.5"/>
      <line x1="27" y1="6" x2="27" y2="48" stroke="#1E293B" strokeWidth="1" strokeDasharray="3,2"/>
      <text x="29" y="32" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">h</text>
      <text x="34" y="54" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">r</text>
    </svg>
  );
}

const GRID_FORMULAS: Array<{ label: string; diagram?: React.ReactNode; desc: string[] }> = [
  { label: 'Circle', diagram: <CircleSVG />, desc: ['$A = \\pi r^2$', '$C = 2\\pi r$'] },
  { label: 'Rectangle', diagram: <RectangleSVG />, desc: ['$A = \\ell w$'] },
  { label: 'Triangle', diagram: <TriangleSVG />, desc: ['$A = \\frac{1}{2}bh$'] },
  { label: 'Right Triangle', diagram: <RightTriangleSVG />, desc: ['$c^2 = a^2 + b^2$'] },
  { label: 'Prism', diagram: <PrismSVG />, desc: ['$V = \\ell w h$'] },
  { label: 'Cylinder', diagram: <CylinderSVG />, desc: ['$V = \\pi r^2 h$'] },
  { label: 'Sphere', diagram: <SphereSVG />, desc: ['$V = \\dfrac{4}{3}\\pi r^3$'] },
  { label: 'Cone', diagram: <ConeSVG />, desc: ['$V = \\dfrac{1}{3}\\pi r^2 h$'] },
];

export function MathReferenceDrawer({ isOpen, onClose }: Props) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIsReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '320px',
        zIndex: 50,
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: isReady ? 'transform 0.28s cubic-bezier(0.4,0,0.2,1)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        borderLeft: '1px solid #E5E7EB',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: '#1E293B',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Reference</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            title="Expand"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer',
            }}
          >
            <Maximize2 size={12} />
          </button>
          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer',
            }}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px' }}>
        {/* Formula grid - 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {GRID_FORMULAS.map(f => (
            <div key={f.label} style={{ textAlign: 'center', background: '#F9FAFB', borderRadius: 10, padding: '10px 6px', border: '1px solid #E5E7EB' }}>
              {f.diagram}
              {f.desc.map((d, j) => (
                <div key={j} style={{ fontSize: 11, lineHeight: 1.4 }}>
                  <MathText text={d} />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Special right triangles */}
        <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '10px 8px', border: '1px solid #E5E7EB', marginBottom: 12, textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Special Right Triangles</div>
          <div style={{ display: 'flex', justifyContent: 'space-around', gap: 6 }}>
            <div>
              <svg viewBox="0 0 64 56" width="56" height="50" fill="none">
                <polygon points="4,52 52,52 4,4" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
                <rect x="4" y="46" width="6" height="6" fill="none" stroke="#1E293B" strokeWidth="1"/>
                <text x="6" y="32" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">x</text>
                <text x="20" y="60" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">x</text>
                <text x="28" y="34" fontSize="7.5" fill="#1E293B" fontFamily="serif" fontStyle="italic">x√3</text>
                <text x="2" y="60" fontSize="6" fill="#1E293B">30°</text>
                <text x="44" y="60" fontSize="6" fill="#1E293B">60°</text>
              </svg>
            </div>
            <div>
              <svg viewBox="0 0 60 56" width="54" height="50" fill="none">
                <polygon points="4,52 56,52 4,4" stroke="#1E293B" strokeWidth="1.5" fill="none"/>
                <rect x="4" y="46" width="6" height="6" fill="none" stroke="#1E293B" strokeWidth="1"/>
                <text x="6" y="30" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">s</text>
                <text x="24" y="60" fontSize="8" fill="#1E293B" fontFamily="serif" fontStyle="italic">s</text>
                <text x="28" y="32" fontSize="7.5" fill="#1E293B" fontFamily="serif" fontStyle="italic">s√2</text>
                <text x="2" y="60" fontSize="6" fill="#1E293B">45°</text>
                <text x="48" y="60" fontSize="6" fill="#1E293B">45°</text>
              </svg>
            </div>
          </div>
        </div>

        {/* Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
          {RULES.map((r, i) => (
            <p key={i} style={{ fontSize: 11, color: '#374151', lineHeight: 1.5, margin: 0 }}>
              <MathText text={r} />
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
