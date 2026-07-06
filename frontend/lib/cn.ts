/**
 * Misc formatting / animation helpers used across the app.
 * The `cn` className helper lives in `@/lib/utils` (shadcn convention).
 */
export { cn } from '@/lib/utils';

export function formatDate(date: string | Date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}
