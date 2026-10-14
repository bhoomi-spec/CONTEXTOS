/**
 * Date and temporal utilities for CONTEXTOS.
 * Provides dynamic relative time, overdue calculations, and ISO formatting
 * based on current system time or optional reference clock for testing.
 */

export function getStartOfDay(reference?: Date): Date {
  const d = reference || new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function formatRelativeTime(dateInput: string | Date | undefined, reference?: Date): string {
  if (!dateInput) return 'Recently';

  const ref = reference || new Date();
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;

  if (isNaN(date.getTime())) {
    // Return original string if already formatted e.g. "12m ago"
    return typeof dateInput === 'string' ? dateInput : 'Recently';
  }

  const diffMs = ref.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 45) return 'Just now';
  if (diffSecs < 90) return '1m ago';

  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;

  return `${Math.floor(diffMonths / 12)}y ago`;
}

export function calculateDaysRemaining(dueDateStr: string, reference?: Date): number {
  const ref = getStartOfDay(reference);
  const due = new Date(dueDateStr);
  if (isNaN(due.getTime())) return 0;

  const dueStart = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffMs = dueStart.getTime() - ref.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function calculateDaysOverdue(dueDateStr: string, reference?: Date): number {
  const days = calculateDaysRemaining(dueDateStr, reference);
  return days < 0 ? Math.abs(days) : 0;
}

export function isOverdue(dueDateStr: string, reference?: Date): boolean {
  return calculateDaysRemaining(dueDateStr, reference) < 0;
}

export function formatDisplayDate(dateInput: string | Date | undefined): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return typeof dateInput === 'string' ? dateInput : '';

  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
