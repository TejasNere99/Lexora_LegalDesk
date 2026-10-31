export function formatDate(value, timezone = 'UTC') {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not scheduled';
  return new Intl.DateTimeFormat(undefined, {
    timeZone: timezone,
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDay(value, timezone = 'UTC') {
  if (!value) return '—';
  const date = new Date(value);
  return new Intl.DateTimeFormat(undefined, { timeZone: timezone, dateStyle: 'medium' }).format(date);
}

export const CASE_STATUS_LABELS = {
  active: 'Active — work is underway',
  pending: 'Pending — opened, not yet in active progress',
  on_hold: 'On hold',
  closed: 'Closed — recorded as complete internally',
  archived: 'Archived',
};

export const TASK_STATUS_LABELS = {
  todo: 'To do',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function statusLabel(kind, value) {
  if (kind === 'case') return CASE_STATUS_LABELS[value] || value;
  if (kind === 'task') return TASK_STATUS_LABELS[value] || value;
  return value;
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export function mascotMoodForContext(context) {
  const map = {
    onboarding: 'happy',
    login: 'happy',
    dashboard: 'happy',
    empty: 'thinking',
    loading: 'focused',
    complete: 'celebrating',
    deadline: 'reminder',
    error: 'thinking',
  };
  return map[context] || 'happy';
}
