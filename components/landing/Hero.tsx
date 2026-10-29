"use client";

import { motion } from "motion/react";
import { ArrowRight, Bell, MapPin, MessageSquareText, Phone, Truck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import Image from "next/image";
import { PGI_PHONE, PGI_PHONE_DISPLAY } from "@/lib/gas";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.1, duration: 0.55, ease: "easeOut" as const } }),
};

function FloatingCard({
  className,
  delay = 0,
  children,
}: {
  className?: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className={`absolute ${className}`}
    >
      <div className="animate-float rounded-2xl border border-line bg-white/90 p-3 shadow-card backdrop-blur" style={{ animationDelay: `${delay}s` }}>
        {children}
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
      {/* background */}
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <motion.div
        aria-hidden
        className="absolute -top-40 left-1/2 -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show" className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-brand-600" />
            </span>
            Now serving 11 kg and 2.7 kg LPG tanks
          </motion.div>

          <motion.h1 custom={1} variants={fadeUp} initial="hidden" animate="show" className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Hindi na mauubusan <br className="hidden sm:block" />
            ng <span className="text-gradient">gas</span> sa bahay.
          </motion.h1>

          <motion.p custom={2} variants={fadeUp} initial="hidden" animate="show" className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
            Fiesta Gas PGI monitors your LPG tank, reminds you by SMS before it runs out, and delivers straight to your
            doorstep. Request a refill in one tap, chat with us, and track everything in one place.
          </motion.p>

          <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show" className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/register" size="lg">
              Get started <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/login" variant="outline" size="lg">
              Client login
            </ButtonLink>
            <a href={`tel:${PGI_PHONE}`} className="inline-flex items-center gap-2 px-2 text-sm font-medium text-ink-700 hover:text-brand-600">
              <Phone className="size-4" /> {PGI_PHONE_DISPLAY}
            </a>
          </motion.div>

          <motion.ul custom={4} variants={fadeUp} initial="hidden" animate="show" className="mt-10 grid max-w-lg grid-cols-3 gap-4 text-sm">
            {[
              ["SMS", "reminders before you run out"],
              ["Map", "we know exactly where you live"],
              ["1-tap", "refill request anytime"],
            ].map(([k, v]) => (
              <li key={k} className="rounded-xl border border-line bg-white/70 p-3 backdrop-blur">
                <p className="text-lg font-bold text-brand-600">{k}</p>
                <p className="text-xs text-ink-500">{v}</p>
              </li>
            ))}
          </motion.ul>
        </div>

        {/* illustration */}
        <div className="relative mx-auto h-[480px] w-full max-w-lg sm:h-[560px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-brand-600 via-brand-500 to-blue-400 shadow-soft"
          >
            <div className="bg-grid absolute inset-0 rounded-[2.5rem] opacity-40 [background-image:linear-gradient(to_right,rgb(255_255_255/0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.15)_1px,transparent_1px)]" />
          </motion.div>

          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
              className="relative h-[380px] w-[260px] drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] sm:h-[460px] sm:w-[300px]"
            >
              <Image src="/gasul-tank.webp" alt="Fiesta Gas LPG tank" fill unoptimized priority sizes="300px" className="object-contain" />
            </motion.div>
          </div>

          <FloatingCard className="left-2 top-10 sm:-left-6" delay={0.6}>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <Bell className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink">SMS reminder sent</p>
                <p className="text-[11px] text-ink-500">Tank at 20% — refill soon</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="right-2 top-28 sm:-right-8" delay={0.9}>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-green-50 text-green-600">
                <Truck className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink">Delivery scheduled</p>
                <p className="text-[11px] text-ink-500">Tomorrow, 9:00 AM</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="bottom-16 left-4 sm:-left-4" delay={1.2}>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <MapPin className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink">Home pinned on map</p>
                <p className="text-[11px] text-ink-500">Rider knows the way</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="bottom-6 right-4 sm:-right-4" delay={1.5}>
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquareText className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink">New message</p>
                <p className="text-[11px] text-ink-500">“On the way po!”</p>
              </div>
            </div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
