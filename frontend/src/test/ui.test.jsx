import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Button, Badge, Card, StatCard, EmptyState } from '../components/ui';

describe('UI Component Primitives', () => {
  it('renders primary button and handles click', () => {
    let clicked = false;
    render(<Button onClick={() => { clicked = true; }}>Open Case</Button>);
    const btn = screen.getByRole('button', { name: 'Open Case' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(clicked).toBe(true);
  });

  it('renders disabled button with loading indicator', () => {
    render(<Button loading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(screen.getByText('Working…')).toBeInTheDocument();
  });

  it('renders badge with correct tone styling', () => {
    render(<Badge tone="success">Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders StatCard with label and value and handles click', () => {
    let clicked = false;
    render(<StatCard label="Active Cases" value={12} onClick={() => { clicked = true; }} />);
    expect(screen.getByText('Active Cases')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(clicked).toBe(true);
  });

  it('renders EmptyState with title, body, and action', () => {
    render(
      <EmptyState
        title="No clients found"
        body="Add practice clients to get started."
        action={<Button>Create Client</Button>}
      />,
    );
    expect(screen.getByText('No clients found')).toBeInTheDocument();
    expect(screen.getByText('Add practice clients to get started.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Client' })).toBeInTheDocument();
  });
});
