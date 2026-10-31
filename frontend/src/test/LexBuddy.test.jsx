import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { LexBuddy } from '../components/mascot/LexBuddy';

describe('LexBuddy Mascot Component', () => {
  it('renders default happy mood mascot with alt text', () => {
    render(<LexBuddy mood="happy" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('alt', 'LexBuddy the owl lawyer, smiling');
    expect(img).toHaveAttribute('src', '/mascot/happy.jpg');
  });

  it('renders celebrating mood with appropriate asset and message', () => {
    render(
      <LexBuddy
        mood="celebrating"
        size="md"
        showMessage
        message="Nice work! Your task is complete."
      />,
    );
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('alt', 'LexBuddy celebrating a completed task');
    expect(screen.getByText('Nice work! Your task is complete.')).toBeInTheDocument();
  });

  it('handles size classes correctly', () => {
    const { container } = render(<LexBuddy mood="reminder" size="sm" />);
    const img = container.querySelector('img');
    expect(img.className).toContain('h-16 w-16');
  });
});
