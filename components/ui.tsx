"use client";

import { forwardRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/cn";
export { cn };

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 shadow-soft focus-visible:ring-brand-300 disabled:bg-brand-300",
  secondary: "bg-brand-50 text-brand-700 hover:bg-brand-100 focus-visible:ring-brand-200",
  outline: "border border-line bg-white text-ink hover:bg-surface-2 focus-visible:ring-brand-200",
  ghost: "text-ink-700 hover:bg-surface-2 focus-visible:ring-brand-200",
  danger: "bg-danger text-white hover:bg-red-700 focus-visible:ring-red-300",
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-sm font-medium rounded-xl gap-2",
  lg: "h-12 px-6 text-base font-semibold rounded-xl gap-2",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center whitespace-nowrap transition-all duration-200 focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-70 active:scale-[0.98]",
    variants[variant],
    sizes[size],
    extra
  );

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }
>(function Button({ className, variant = "primary", size = "md", loading, children, disabled, ...props }, ref) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-w-0 max-w-full rounded-2xl border border-line bg-white shadow-card", className)}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink placeholder:text-ink-300 transition focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-surface-2";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref
) {
  return <input ref={ref} className={cn(inputBase, "h-11", className)} {...props} />;
});

/** Password field with a show/hide eye toggle. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputHTMLAttributes<HTMLInputElement>, "type">>(
  function PasswordInput({ className, ...props }, ref) {
    const [show, setShow] = useState(false);
    return (
      <div className="relative">
        <input ref={ref} type={show ? "text" : "password"} className={cn(inputBase, "h-11 pr-11", className)} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-11 place-items-center text-ink-300 hover:text-ink-700"
          aria-label={show ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(inputBase, "min-h-[96px] py-2.5", className)} {...props} />;
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref
) {
  return (
    <select ref={ref} className={cn(inputBase, "h-11 appearance-none pr-9", className)} {...props}>
      {children}
    </select>
  );
});

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: "neutral" | "blue" | "green" | "amber" | "red" | "orange";
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "bg-gray-100 text-ink-700",
    blue: "bg-brand-50 text-brand-700",
    green: "bg-green-50 text-green-700",
    amber: "bg-amber-50 text-amber-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Alert({ tone = "error", children }: { tone?: "error" | "info" | "success"; children: ReactNode }) {
  const tones = {
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-brand-200 bg-brand-50 text-brand-800",
    success: "border-green-200 bg-green-50 text-green-700",
  };
  return <div className={cn("rounded-xl border px-3.5 py-2.5 text-sm", tones[tone])}>{children}</div>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      {icon && <div className="mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
      <p className="font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin text-brand-600", className)} />;
}

export function PageLoading({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-500">
      <Spinner className="size-7" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function StatCard({ label, value, icon, tone = "blue", sub }: { label: string; value: ReactNode; icon: ReactNode; tone?: "blue" | "green" | "amber" | "red"; sub?: string }) {
  const tones = {
    blue: "bg-brand-50 text-brand-600",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        <span className={cn("grid size-9 place-items-center rounded-xl", tones[tone])}>{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </Card>
  );
}
