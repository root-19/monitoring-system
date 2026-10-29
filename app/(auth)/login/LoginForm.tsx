"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { LogIn } from "lucide-react";
import { loginAction } from "@/app/actions/auth";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const params = useSearchParams();
  const next = params.get("next") ?? "";

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="rounded-3xl border border-line bg-white p-7 shadow-card sm:p-9">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-500">Log in with the mobile number you registered with.</p>

      <form action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        {state?.error && <Alert>{state.error}</Alert>}
        <Field label="Mobile number" htmlFor="phone">
          <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="09XX XXX XXXX" required />
        </Field>
        <Field label="Password" htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" placeholder="Your password" required />
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          <LogIn className="size-4" /> Log in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New client?{" "}
        <Link href="/register" className="font-semibold text-brand-600 hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-ink-300">
        Forgot your password? Message PGI at 0998 586 1976 and we will reset it.
      </p>
    </motion.div>
  );
}
