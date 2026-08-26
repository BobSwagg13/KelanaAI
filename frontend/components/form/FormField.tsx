'use client';

import React from 'react';
import type { FieldError, UseFormRegister, FieldValues, Path } from 'react-hook-form';
import { cn } from '@/lib/utils/cn';

interface Option {
  value: string;
  label: string;
}

export interface FormFieldProps<T extends FieldValues> {
  label: string;
  name: Path<T>;
  type?: 'text' | 'number' | 'select';
  options?: Option[];
  register: UseFormRegister<T>;
  error?: FieldError;
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  valueAsNumber?: boolean;
}

export function FormField<T extends FieldValues>({
  label,
  name,
  type = 'text',
  options,
  register,
  error,
  required,
  placeholder,
  min,
  max,
  step,
  className,
  valueAsNumber,
}: FormFieldProps<T>) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;

  const baseInputClasses = cn(
    'w-full rounded-lg border px-3.5 py-2.5 text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-[var(--brand-primary)]'
  );

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={fieldId} className="text-sm font-medium text-gray-800">
        {label}
        {required && (
          <span className="ml-0.5 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {type === 'select' ? (
        <select
          id={fieldId}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={baseInputClasses}
          {...register(name)}
        >
          <option value="">{placeholder || `Select ${label.toLowerCase()}`}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          type={type}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={baseInputClasses}
          {...register(name, valueAsNumber ? { valueAsNumber: true } : undefined)}
        />
      )}

      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
}
