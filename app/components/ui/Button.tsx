'use client';

import React from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  as?: 'button' | 'span' | 'div';
  children: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'gradient-indigo text-white shadow-lg shadow-indigo-500/20 hover:opacity-90 hover:shadow-indigo-500/30',
  secondary:
    'bg-transparent border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[var(--accent-indigo)] hover:text-[var(--text-primary)] hover:bg-[rgba(2,99,235,0.05)]',
  danger:
    'bg-transparent border border-[rgba(244,63,94,0.35)] text-[var(--accent-rose)] hover:bg-[rgba(244,63,94,0.1)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
  success:
    'gradient-emerald text-white shadow-lg shadow-emerald-500/20 hover:opacity-90',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-md font-medium',
  md: 'px-4 py-2.5 text-sm rounded-lg font-semibold',
  lg: 'px-6 py-3 text-base rounded-xl font-semibold',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  disabled,
  as = 'button',
  children,
  ...props
}: ButtonProps) {
  const Component = as as any;
  return (
    <Component
      className={[
        'inline-flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer select-none',
        variantClasses[variant],
        sizeClasses[size],
        (disabled || loading) ? 'opacity-50 cursor-not-allowed' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      )}
      {children}
    </Component>
  );
}
