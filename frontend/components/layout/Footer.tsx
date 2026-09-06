'use client';

import React from 'react';
import Link from 'next/link';
import { SquareCode, Heart } from 'lucide-react';

interface FooterProps {
  className?: string;
}

/**
 * Footer component with links, social media, and copyright information
 * Features minimalist design with seasonal accent colors
 * 
 * Requirements: 6.1 - Responsive Layout and Navigation
 */
export function Footer({ className = '' }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={`w-full border-t border-gray-200 bg-white ${className}`}
      role="contentinfo"
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand Section */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold" style={{ color: 'var(--brand-primary)' }}>
              KelanaAI
            </h3>
            <p className="text-sm text-gray-600">
              AI-powered travel planning for your next adventure
            </p>
          </div>

          {/* Links Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Resources</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/about"
                  className="inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--brand-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '';
                  }}
                >
                  About
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/BobSwagg13/KelanaAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--brand-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '';
                  }}
                >
                  Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/BobSwagg13/KelanaAI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-gray-600 transition-colors hover:text-gray-900"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--brand-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '';
                  }}
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Social Media Section */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900">Connect</h4>
            <div className="flex space-x-4">
              <a
                href="https://github.com/BobSwagg13/KelanaAI"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-gray-600 transition-colors hover:text-gray-900"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--brand-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '';
                }}
              >
                <SquareCode size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          className="my-6 h-px bg-gray-200"
          style={{
            background: 'linear-gradient(to right, transparent, var(--brand-accent-soft), transparent)',
            opacity: 0.3,
          }}
        />

        {/* Copyright Section */}
        <div className="flex flex-col items-center justify-between space-y-2 text-sm text-gray-600 sm:flex-row sm:space-y-0">
          <p>
            © {currentYear} KelanaAI. All rights reserved.
          </p>
          <p className="flex items-center gap-1">
            Made with <Heart size={14} className="text-red-500" fill="currentColor" /> for travelers
          </p>
        </div>
      </div>
    </footer>
  );
}
