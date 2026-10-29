"use client";

import { useActionState, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { UserPlus } from "lucide-react";
import { registerAction } from "@/app/actions/auth";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";
import { LocationPicker, type LatLng } from "@/components/maps/LocationPicker";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [locError, setLocError] = useState<string | null>(null);

  const geocodeRef = useRef<AbortController | null>(null);

  // Turn the pinned location into a readable address for the rider (OpenStreetMap reverse geocoding).
  const setLocation = useCallback((v: LatLng | null) => {
    geocodeRef.current?.abort();
    setLoc(v);
    setLocError(null);
    if (!v) {
      setAddress("");
      return;
    }
    setAddress(`${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}`);
    const ctrl = new AbortController();
    geocodeRef.current = ctrl;
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${v.lat}&lon=${v.lng}&zoom=18&accept-language=en`, {
      signal: ctrl.signal,
      headers: { Accept: "application/json" },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { display_name?: string } | null) => {
        if (j?.display_name) setAddress(j.display_name);
      })
      .catch(() => {});
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="rounded-3xl border border-line bg-white p-7 shadow-card sm:p-9">
      <h1 className="text-2xl font-bold tracking-tight text-ink">Create your account</h1>
      <p className="mt-1 text-sm text-ink-500">Takes about a minute. We only need this to deliver to you.</p>

      <form
        action={action}
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          if (!loc) {
            e.preventDefault();
            setLocError("Please set your location first so we know where to deliver.");
          }
        }}
      >
        {state?.error && <Alert>{state.error}</Alert>}

        <Field label="Full name" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" placeholder="Juan Dela Cruz" required />
        </Field>
        <Field label="Mobile number" htmlFor="phone" hint="We will send SMS reminders to this number.">
          <Input id="phone" name="phone" inputMode="tel" autoComplete="tel" placeholder="09XX XXX XXXX" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" htmlFor="password">
            <PasswordInput id="password" name="password" autoComplete="new-password" minLength={6} required />
          </Field>
          <Field label="Confirm" htmlFor="confirm">
            <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={6} required />
          </Field>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-ink-700">Your location</span>
          <p className="mb-2 text-xs text-ink-500">Tap &ldquo;Use my current location&rdquo; while you are at home. This is where we will deliver.</p>
          <LocationPicker value={loc} onChange={setLocation} />
          {address && loc && (
            <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-xs text-ink-700">
              <span className="font-semibold">Delivery address:</span> {address}
            </p>
          )}
          {locError && <p className="mt-1 text-xs text-danger">{locError}</p>}
          <input type="hidden" name="address" value={address} />
          <input type="hidden" name="lat" value={loc?.lat ?? ""} />
          <input type="hidden" name="lng" value={loc?.lng ?? ""} />
        </div>

        <Field label="Landmark (optional)" htmlFor="landmark" hint="Helps the rider find you faster.">
          <Input id="landmark" name="landmark" placeholder="e.g. beside the sari-sari store, blue gate" />
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={pending}>
          <UserPlus className="size-4" /> Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </motion.div>
  );
}
