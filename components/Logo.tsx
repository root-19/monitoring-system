import Link from "next/link";
import { cn } from "@/lib/cn";

export function FlameMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 2.5c.6 3.2 3 4.6 4.4 6.6 1.6 2.2 2 5.3.4 7.7A6.3 6.3 0 0 1 12 20.5a6.3 6.3 0 0 1-5.3-9.7c.5-.8 1.1-1.5 1.8-2.1.1 1.3.5 2.3 1.4 3 .3-3.3 1-5.9 2.1-9.2Z"
        fill="currentColor"
      />
      <path
        d="M12 20.5a3.4 3.4 0 0 1-3.2-4.6c.3-.7.8-1.3 1.5-1.8.2 1 .6 1.6 1.2 2 .3-1.6.9-2.9 1.9-4.4.8 1.6 2.2 2.6 2.4 4.4A3.4 3.4 0 0 1 12 20.5Z"
        fill="#fff"
        opacity=".9"
      />
    </svg>
  );
}

export function Logo({ href = "/", light = false, className }: { href?: string; light?: boolean; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white shadow-soft">
        <FlameMark className="size-5" />
      </span>
      <span className="leading-tight">
        <span className={cn("block text-[15px] font-bold tracking-tight", light ? "text-white" : "text-ink")}>
          Fiesta <span className="text-brand-600">GAS</span>
        </span>
        <span className={cn("block text-[11px] font-medium", light ? "text-white/70" : "text-ink-500")}>
          PGI · LPG Monitoring & Delivery
        </span>
      </span>
    </Link>
  );
}
