'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className,
  type = 'button',
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const variantStyle: React.CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-accent))',
          color: 'white',
        };
      case 'secondary':
        return {
          background: 'var(--brand-surface-subtle)',
          color: 'var(--brand-ink)',
          border: '1px solid var(--brand-muted)',
        };
      case 'outline':
        return {
          background: 'transparent',
          color: 'var(--brand-primary)',
          border: '2px solid var(--brand-primary)',
        };
      case 'ghost':
        return {
          background: 'transparent',
          color: 'var(--brand-ink)',
        };
    }
  })();

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold',
        'transition-all duration-200 focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-offset-2 focus-visible:ring-[var(--brand-primary)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !isDisabled && 'hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0',
        sizeClasses[size],
        className
      )}
      style={{ ...variantStyle, ...style }}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 18} />}
      {children}
    </button>
  );
}
