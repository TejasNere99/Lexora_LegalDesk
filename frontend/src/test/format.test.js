import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatDay,
  statusLabel,
  initials,
  mascotMoodForContext,
  CASE_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from '../utils/format';

describe('format utilities', () => {
  it('formats dates safely without crashing on null or invalid dates', () => {
    expect(formatDate(null)).toBe('Not scheduled');
    expect(formatDate(undefined)).toBe('Not scheduled');
    expect(formatDate('invalid-date')).toBe('Not scheduled');

    const iso = '2026-10-20T10:30:00.000Z';
    const formatted = formatDate(iso, 'UTC');
    expect(formatted).toContain('2026');
  });

  it('formats day correctly', () => {
    expect(formatDay(null)).toBe('—');
    const iso = '2026-10-20T10:30:00.000Z';
    const formatted = formatDay(iso, 'UTC');
    expect(formatted).toContain('2026');
  });

  it('maps case and task status labels properly', () => {
    expect(statusLabel('case', 'active')).toBe(CASE_STATUS_LABELS.active);
    expect(statusLabel('case', 'pending')).toBe(CASE_STATUS_LABELS.pending);
    expect(statusLabel('task', 'todo')).toBe(TASK_STATUS_LABELS.todo);
    expect(statusLabel('task', 'completed')).toBe(TASK_STATUS_LABELS.completed);
    expect(statusLabel('other', 'custom')).toBe('custom');
  });

  it('generates name initials for avatars', () => {
    expect(initials('Asha Menon')).toBe('AM');
    expect(initials('Rahul')).toBe('R');
    expect(initials('Senior Advocate Ram Jethmalani')).toBe('SA');
    expect(initials('')).toBe('');
  });

  it('resolves correct mascot mood based on context', () => {
    expect(mascotMoodForContext('onboarding')).toBe('happy');
    expect(mascotMoodForContext('complete')).toBe('celebrating');
    expect(mascotMoodForContext('deadline')).toBe('reminder');
    expect(mascotMoodForContext('loading')).toBe('focused');
    expect(mascotMoodForContext('empty')).toBe('thinking');
    expect(mascotMoodForContext('unknown')).toBe('happy');
  });
});
