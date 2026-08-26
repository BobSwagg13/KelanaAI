/**
 * className Utility
 * 
 * Combines clsx and tailwind-merge for optimal className handling.
 * - clsx: conditionally constructs className strings
 * - tailwind-merge: intelligently merges Tailwind classes, resolving conflicts
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges multiple className values and resolves Tailwind class conflicts
 * 
 * @param inputs - Class names, conditional classes, or arrays of classes
 * @returns Merged className string
 * 
 * @example
 * cn('px-4 py-2', 'bg-blue-500')
 * // => 'px-4 py-2 bg-blue-500'
 * 
 * cn('px-4', 'px-6')
 * // => 'px-6' (later class wins)
 * 
 * cn('text-red-500', condition && 'text-blue-500')
 * // => 'text-blue-500' if condition is true, otherwise 'text-red-500'
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
