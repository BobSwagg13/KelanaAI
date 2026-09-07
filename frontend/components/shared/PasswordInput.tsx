'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
>;

/**
 * Password field with a show/hide toggle.
 *
 * Toggling only swaps the input's `type`, so the value, react-hook-form
 * registration and browser autofill all behave exactly as they did. The button
 * is `tabIndex={-1}` so tabbing runs field -> submit rather than detouring
 * through a control that only changes how the field looks; it stays reachable
 * by pointer and by screen readers via its label.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={cn(
            'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 pr-11 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-brand-primary',
            className
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-brand-muted transition-colors hover:text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
        >
          {visible ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
    );
  }
);
