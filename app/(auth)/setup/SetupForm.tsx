"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { setupAdminAction } from "@/app/actions/auth";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAdminAction, undefined);
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-line bg-white p-7 shadow-card sm:p-9">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
        <ShieldCheck className="size-6" />
      </span>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Set up the PGI admin</h1>
      <p className="mt-1 text-sm text-ink-500">This creates the first administrator account. Only works once.</p>
      <form action={action} className="mt-6 space-y-4">
        {state?.error && <Alert>{state.error}</Alert>}
        <Field label="Admin name" htmlFor="name">
          <Input id="name" name="name" placeholder="Fiesta Gas PGI" required />
        </Field>
        <Field label="Admin mobile number" htmlFor="phone">
          <Input id="phone" name="phone" inputMode="tel" placeholder="0998 586 1976" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" htmlFor="password">
            <PasswordInput id="password" name="password" minLength={6} required />
          </Field>
          <Field label="Confirm" htmlFor="confirm">
            <PasswordInput id="confirm" name="confirm" minLength={6} required />
          </Field>
        </div>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Create admin account
        </Button>
      </form>
    </motion.div>
  );
}
