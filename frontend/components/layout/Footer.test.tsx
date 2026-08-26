import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer Component', () => {
  it('should render the KelanaAI brand name', () => {
    render(<Footer />);
    expect(screen.getByText('KelanaAI')).toBeInTheDocument();
  });

  it('should display copyright information with current year', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear();
    expect(screen.getByText(new RegExp(`© ${currentYear} KelanaAI`))).toBeInTheDocument();
  });

  it('should render all resource links', () => {
    render(<Footer />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
    expect(screen.getAllByText('GitHub').length).toBeGreaterThan(0); // Multiple GitHub references
  });

  it('should render social media links with proper accessibility labels', () => {
    render(<Footer />);
    expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
    expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('should have proper ARIA role for accessibility', () => {
    render(<Footer />);
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  it('should render the tagline', () => {
    render(<Footer />);
    expect(screen.getByText('AI-powered travel planning for your next adventure')).toBeInTheDocument();
  });

  it('should render "Made with love" message', () => {
    render(<Footer />);
    expect(screen.getByText(/Made with.*for travelers/)).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    const { container } = render(<Footer className="custom-class" />);
    const footer = container.querySelector('footer');
    expect(footer?.className).toContain('custom-class');
  });

  it('should have external links with proper security attributes', () => {
    render(<Footer />);
    const githubLinks = screen.getAllByRole('link', { name: /GitHub|Documentation/i });
    githubLinks.forEach((link) => {
      if (link.getAttribute('href')?.startsWith('http')) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      }
    });
  });
});
