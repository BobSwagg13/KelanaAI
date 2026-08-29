/**
 * Hero Section Component
 *
 * Displays a prominent hero section with:
 * - Large display heading over a blue brand gradient
 * - Animated tagline using framer-motion
 * - Call-to-action scroll indicator
 *
 * Validates Requirements: 6.1, 12.1, 12.2
 */

'use client';

import { motion, type Variants } from 'framer-motion';
import { ChevronDown, Compass } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface HeroProps {
  className?: string;
  /** Personalized greeting shown above the headline when signed in. */
  greeting?: string;
}

export function Hero({ className, greeting }: HeroProps) {
  const taglineVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, delay: 0.3, ease: 'easeOut' },
    },
  };

  const scrollIndicatorVariants: Variants = {
    initial: { y: 0 },
    animate: {
      y: [0, 10, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  const handleScrollDown = () => {
    document.getElementById('travel-planner')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className={cn(
        'relative min-h-screen flex items-center justify-center overflow-hidden',
        'px-4 sm:px-6 lg:px-8 bg-white',
        className
      )}
    >
      {/* Soft blue wash behind the content */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 20% 20%, rgba(37, 99, 235, 0.10) 0%, transparent 55%), radial-gradient(ellipse at 80% 70%, rgba(30, 58, 138, 0.10) 0%, transparent 55%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-8"
        >
          <div
            className="p-4 rounded-2xl shadow-lg"
            style={{ background: 'var(--brand-gradient)' }}
          >
            <Compass className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {greeting && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-lg font-semibold text-brand-primary sm:text-xl"
            data-testid="hero-greeting"
          >
            {greeting}
          </motion.p>
        )}

        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="font-display text-6xl sm:text-7xl lg:text-8xl font-bold tracking-tighter leading-[0.95] text-brand-ink"
        >
          Discover Your Next
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: 'var(--brand-gradient)' }}
          >
            Adventure
          </span>
        </motion.h1>

        <motion.p
          variants={taglineVariants}
          initial="hidden"
          animate="visible"
          className="mt-8 text-xl sm:text-2xl lg:text-3xl font-normal text-brand-muted max-w-3xl mx-auto"
        >
          AI-powered travel planning that adapts to{' '}
          <span className="font-semibold text-brand-ink">your style</span>, your{' '}
          <span className="font-semibold text-brand-ink">budget</span>, and your{' '}
          <span className="font-semibold text-brand-primary">destination</span>
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleScrollDown}
          className="mt-12 px-8 py-4 rounded-full text-lg font-semibold text-white shadow-xl hover:shadow-2xl transition-shadow duration-300"
          style={{ background: 'var(--brand-gradient)' }}
        >
          Start Planning
        </motion.button>
      </div>

      <motion.button
        variants={scrollIndicatorVariants}
        initial="initial"
        animate="animate"
        onClick={handleScrollDown}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-10"
        aria-label="Scroll to the trip planner"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-brand-muted">Explore</span>
          <ChevronDown className="w-6 h-6 text-brand-primary" />
        </div>
      </motion.button>
    </section>
  );
}
