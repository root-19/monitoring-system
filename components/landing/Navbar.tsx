"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Logo } from "@/components/Logo";
import { ButtonLink, cn } from "@/components/ui";
import { InstallAppButton } from "@/components/pwa/InstallApp";

const links = [
  { href: "#features", label: "Features" },
  { href: "#map", label: "Delivery map" },
  { href: "#how", label: "How it works" },
  { href: "#contact", label: "Contact" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 shadow-[0_1px_0_0_#e5e9f2] backdrop-blur-xl"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-700 transition hover:text-brand-600"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <InstallAppButton />
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/register" size="sm">
            Create account
          </ButtonLink>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <InstallAppButton compact />
          <button
            className="grid size-10 place-items-center rounded-xl text-ink-700 hover:bg-surface-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line bg-white md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-surface-2"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  className="rounded-xl border border-line px-3 py-2.5 text-center text-sm font-medium"
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl bg-brand-600 px-3 py-2.5 text-center text-sm font-medium text-white"
                >
                  Create account
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
