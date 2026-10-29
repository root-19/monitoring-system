"use client";

import { motion } from "motion/react";
import { Bell, Gauge, MapPin, MessageSquareText, Phone, ShieldCheck, Smartphone, Truck, UserPlus, ClipboardList, PackageCheck } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { PGI_PHONE, PGI_PHONE_DISPLAY } from "@/lib/gas";

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h2>
      {description && <p className="mt-3 text-base text-ink-500">{description}</p>}
    </motion.div>
  );
}

const features = [
  { icon: Gauge, title: "Gas level tracking", text: "We estimate how much gas is left in your 11 kg or 2.7 kg tank from your last delivery and usual usage." },
  { icon: Bell, title: "SMS reminders", text: "Get a text before your tank runs out, plus updates on schedules and deliveries. No app needed." },
  { icon: MapPin, title: "Google Maps delivery", text: "Your home is pinned on the map so our rider finds you fast, even on the first delivery." },
  { icon: Truck, title: "One-tap refill request", text: "Request a refill from your phone. We confirm, schedule, and notify you when it is on the way." },
  { icon: MessageSquareText, title: "Direct messaging", text: "Ask questions or send instructions. Replies show up in the app and in your notifications." },
  { icon: ShieldCheck, title: "Simple & secure", text: "Log in with your mobile number. Your data stays private and is only used for deliveries." },
];

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 bg-surface-2 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="Features" title="Everything you need, nothing you don't" description="Built for households and small businesses that rely on LPG every day." />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              variants={reveal}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className="group rounded-2xl border border-line bg-white p-6 shadow-card transition-shadow hover:shadow-soft"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{f.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const steps = [
  { icon: UserPlus, title: "Create your account", text: "Sign up with your mobile number, home address, and tank size. Pin your house on the map." },
  { icon: ClipboardList, title: "Request or get reminded", text: "Tap “Request refill” anytime, or wait for our SMS when your gas is getting low." },
  { icon: PackageCheck, title: "We deliver", text: "PGI schedules the delivery, texts you the time, and records it so your gas estimate stays accurate." },
];

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionTitle eyebrow="How it works" title="Three simple steps" />
        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent md:block" />
          {steps.map((s, i) => (
            <motion.div key={s.title} variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.12 }} className="relative text-center">
              <div className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
                <s.icon className="size-6" />
                <span className="absolute -right-2 -top-2 grid size-6 place-items-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">{s.title}</h3>
              <p className="mx-auto mt-1.5 max-w-xs text-sm text-ink-500">{s.text}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contact" className="scroll-mt-20 pb-20 sm:pb-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true }} className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-14 text-white sm:px-12">
          <div className="absolute -right-24 -top-24 size-72 rounded-full bg-brand-600/40 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 size-72 rounded-full bg-brand-400/30 blur-3xl" />
          <div className="relative grid items-center gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Contact Fiesta Gas PGI</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Need gas today? Call or text us.</h2>
              <p className="mt-3 max-w-md text-white/70">Our delivery line is open daily. You can also create an account and request a refill online in seconds.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
              <a href={`tel:${PGI_PHONE}`} className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-white px-6 text-lg font-bold text-ink transition hover:bg-brand-50">
                <Phone className="size-5 text-brand-600" /> {PGI_PHONE_DISPLAY}
              </a>
              <a href={`sms:${PGI_PHONE}`} className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl border border-white/20 px-6 font-semibold text-white transition hover:bg-white/10">
                <Smartphone className="size-5" /> Send SMS
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6">
        <Logo />
        <p className="text-sm text-ink-500">© 2026 Fiesta Gas PGI. LPG monitoring & delivery.</p>
        <div className="flex gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">Log in</ButtonLink>
          <ButtonLink href="/register" variant="secondary" size="sm">Create account</ButtonLink>
        </div>
      </div>
    </footer>
  );
}
