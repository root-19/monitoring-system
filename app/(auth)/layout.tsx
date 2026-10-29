import Link from "next/link";
import { Logo } from "@/components/Logo";
import Image from "next/image";
import { PGI_PHONE, PGI_PHONE_DISPLAY } from "@/lib/gas";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-1 flex-col lg:flex-row">
      {/* Left brand panel */}
      <aside className="relative hidden w-[46%] overflow-hidden bg-ink text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
        <div className="absolute -left-32 -top-32 size-[420px] rounded-full bg-brand-600/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 size-[420px] rounded-full bg-brand-400/30 blur-3xl" />
        <div className="bg-grid absolute inset-0 opacity-30 [background-image:linear-gradient(to_right,rgb(255_255_255/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.08)_1px,transparent_1px)]" />
        <div className="relative">
          <Logo light />
        </div>
        <div className="relative flex items-center gap-8">
          <div className="relative h-72 w-40 shrink-0 drop-shadow-[0_24px_30px_rgba(0,0,0,0.5)]">
            <Image src="/gasul-tank.webp" alt="Fiesta Gas LPG tank" fill unoptimized priority sizes="160px" className="object-contain" />
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight">Never run out of gas again.</h2>
            <p className="mt-3 text-white/70">
              Track your tank, get SMS reminders, and request refills online. Delivered by Fiesta Gas PGI.
            </p>
          </div>
        </div>
        <div className="relative text-sm text-white/60">
          Need help? Call{" "}
          <a href={`tel:${PGI_PHONE}`} className="font-semibold text-white">
            {PGI_PHONE_DISPLAY}
          </a>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="flex flex-1 flex-col bg-surface-2">
        <div className="flex items-center justify-between px-5 py-4 lg:hidden">
          <Logo />
          <Link href="/" className="text-sm font-medium text-ink-500">
            Back to home
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </main>
    </div>
  );
}
