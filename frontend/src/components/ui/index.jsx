import { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

export function Button({
  children,
  variant = 'primary',
  type = 'button',
  loading,
  className = '',
  ...props
}) {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'bg-white text-navy border border-line hover:bg-cream',
    ghost: 'bg-transparent text-navy hover:bg-white',
    danger: 'bg-danger text-white hover:opacity-90',
  };
  return (
    <button
      type={type}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold transition disabled:opacity-50 ${styles[variant]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? 'Working…' : children}
    </button>
  );
}

export function IconButton({ label, children, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-control text-navy hover:bg-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, error, children }) {
  const id = useId();
  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-sm font-medium text-navy">{label}</span>
      <div id={id}>{children}</div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </label>
  );
}

const control =
  'w-full min-h-11 rounded-control border border-line bg-white px-3 text-sm text-navy placeholder:text-muted';

export function Input(props) {
  return <input className={control} {...props} />;
}

export function Textarea(props) {
  return <textarea className={`${control} min-h-28 py-2`} {...props} />;
}

export function Select({ children, ...props }) {
  return (
    <select className={control} {...props}>
      {children}
    </select>
  );
}

export function Checkbox({ label, ...props }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" className="h-4 w-4" {...props} />
      {label}
    </label>
  );
}

export function Badge({ children, tone = 'default' }) {
  const tones = {
    default: 'bg-cream text-navy',
    success: 'bg-emerald-50 text-success',
    warning: 'bg-amber-50 text-warning',
    danger: 'bg-red-50 text-danger',
    primary: 'bg-violet-50 text-primary',
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-card bg-white p-5 shadow-card ${className}`}>{children}</section>;
}

export function StatCard({ label, value, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-card bg-white p-5 text-left shadow-card">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold text-navy">{value}</p>
    </button>
  );
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl font-bold text-navy">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions}
    </header>
  );
}

export function SearchInput(props) {
  return <Input type="search" placeholder="Search" {...props} />;
}

export function EmptyState({ title, body, action }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-white px-6 py-12 text-center">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function LoadingSkeleton() {
  return <div className="h-28 animate-pulse rounded-card bg-white" />;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-card border border-danger/20 bg-white p-6">
      <p className="font-semibold text-danger">Something went wrong</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button className="mt-4" onClick={onRetry} variant="secondary">
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', onConfirm, onClose, danger }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-card bg-white p-6 shadow-card">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted">{body}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button ref={ref} variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ToastProvider({ toasts, dismiss }) {
  const reduce = useReducedMotion();
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2" aria-live="polite">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.button
            type="button"
            key={toast.id}
            onClick={() => dismiss(toast.id)}
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="pointer-events-auto w-80 rounded-card bg-navy px-4 py-3 text-left text-sm text-white"
          >
            {toast.message}
          </motion.button>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Avatar({ name }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
      {name
        ?.split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()}
    </span>
  );
}

export function DataTable({ columns, rows, onRowClick }) {
  return (
    <div className="hidden overflow-x-auto rounded-card bg-white shadow-card md:block">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-line text-muted">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b border-line last:border-0 hover:bg-cream/60"
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MobileRecordCard({ title, meta, onClick, badge }) {
  return (
    <button type="button" onClick={onClick} className="w-full rounded-card bg-white p-4 text-left shadow-card md:hidden">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">{title}</p>
        {badge}
      </div>
      <p className="mt-1 text-sm text-muted">{meta}</p>
    </button>
  );
}
