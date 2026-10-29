"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { UserPlus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { TankSizePicker } from "@/components/TankSizePicker";
import { LocationPicker, type LatLng } from "@/components/maps/LocationPicker";
import { errorText, useToast } from "@/components/Toast";

export default function NewClientPage() {
  const { token } = useSession();
  const toast = useToast();
  const router = useRouter();
  const create = useAction(api.auth.adminCreateClient);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [tank, setTank] = useState<"11kg" | "2.7kg">("11kg");
  const [days, setDays] = useState("");
  const [notes, setNotes] = useState("");
  const [loc, setLoc] = useState<LatLng | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = await create({
        token,
        name,
        phone,
        password,
        address,
        landmark: landmark || undefined,
        tankSize: tank,
        avgDaysPerTank: days ? Number(days) : undefined,
        lat: loc?.lat,
        lng: loc?.lng,
        notes: notes || undefined,
      });
      toast("Client added. Share the password with them so they can log in.");
      router.push(`/admin/clients/${id}`);
    } catch (err) {
      toast(errorText(err), "error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Add a client" description="Create the account for them. They can log in with their mobile number and this password." />
      <Card className="p-6">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Maria Santos" />
            </Field>
            <Field label="Mobile number">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" required placeholder="09XX XXX XXXX" />
            </Field>
          </div>
          <Field label="Login password" hint="At least 6 characters. Tell the client; they can change it later.">
            <Input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required placeholder="e.g. pgi2026" />
          </Field>
          <Field label="Home address">
            <Textarea value={address} onChange={(e) => setAddress(e.target.value)} required className="min-h-[72px]" placeholder="House no., street, barangay, city" />
          </Field>
          <Field label="Landmark (optional)">
            <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. beside the barangay hall" />
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Tank size</span>
            <TankSizePicker value={tank} onChange={setTank} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Usual days per tank" hint={`Leave blank to use the default (${tank === "2.7kg" ? 14 : 30} days).`}>
              <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} placeholder={tank === "2.7kg" ? "14" : "30"} />
            </Field>
            <Field label="Private notes (optional)">
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. pays weekly, dog in yard" />
            </Field>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Pin the house on the map</span>
            <LocationPicker value={loc} onChange={setLoc} />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={busy}>
            <UserPlus className="size-4" /> Create client
          </Button>
        </form>
      </Card>
    </div>
  );
}
