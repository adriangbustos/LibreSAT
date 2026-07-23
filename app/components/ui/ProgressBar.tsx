'use client';

import React from 'react';

interface ProgressBarProps {
  value: number; // 0–100
  height?: number;
  colorClass?: string;
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  height = 8,
  colorClass = 'gradient-indigo',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="progress-track flex-1" style={{ height }}>
        <div
          className={`progress-fill ${colorClass}`}
          style={{ width: `${pct}%`, height: '100%' }}
        />
      </div>
      {showLabel && (
        <span className="text-xs font-semibold text-[var(--text-secondary)] min-w-[36px] text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}

interface CircularProgressProps {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  color?: string;
  children?: React.ReactNode;
}

export function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  color = '#6366f1',
  children,
}: CircularProgressProps) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--bg-muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">{children}</div>
      )}
    </div>
  );
}
