import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/design/cn';
import { ChevronRightGlyph } from '@/components/admin/icons';

/**
 * Admin form primitives in the spacedrivey grammar: --sd-input fill, 1px --sd-line
 * hairline, chrome radius, the canonical cyan focus ring (inherited from
 * :focus-visible in globals.css). Denser than public surfaces but the same
 * language. Functional hues appear only via error text, never as chrome.
 */

const CONTROL_BASE =
  'w-full rounded-sd-chrome border border-sd-line bg-sd-input px-3 py-2 text-sm text-sd-ink ' +
  'placeholder:text-sd-ink-faint transition-[color,background-color,border-color,box-shadow] duration-150 ' +
  'hover:border-[color-mix(in_srgb,var(--sd-accent)_28%,var(--sd-line))] ' +
  'disabled:cursor-not-allowed disabled:opacity-50';

/** Tiny mono uppercase label, matching .sd-stat-label. */
export interface FieldLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  hint?: ReactNode;
}

export function FieldLabel({ children, hint, className, ...props }: FieldLabelProps) {
  return (
    <label className={cn('mb-1.5 flex items-center gap-2', className)} {...props}>
      <span className="sd-stat-label">{children}</span>
      {hint ? <span className="text-tiny text-sd-ink-faint normal-case">{hint}</span> : null}
    </label>
  );
}

/** Label + control + optional error, vertical stack. */
export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string | null;
  className?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {label ? (
        <FieldLabel htmlFor={htmlFor} hint={hint}>
          {label}
        </FieldLabel>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs" style={{ color: 'var(--ink-coral)' }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, type = 'text', ...props }: InputProps) {
  return <input type={type} className={cn(CONTROL_BASE, className)} {...props} />;
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 3, ...props }: TextareaProps) {
  return <textarea rows={rows} className={cn(CONTROL_BASE, 'resize-y leading-relaxed', className)} {...props} />;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative">
      <select className={cn(CONTROL_BASE, 'appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      {/* Chevron affordance so the control never reads as an OS-default select. */}
      <ChevronRightGlyph
        aria-hidden
        width={14}
        height={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-sd-ink-faint"
      />
    </div>
  );
}

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  return (
    <label className={cn('flex cursor-pointer select-none items-center gap-2 text-sm text-sd-ink-dull', className)}>
      <input
        id={id}
        type="checkbox"
        className="size-4 rounded-sd-crumb border border-sd-line bg-sd-input accent-sd-accent"
        {...props}
      />
      <span>{label}</span>
    </label>
  );
}
