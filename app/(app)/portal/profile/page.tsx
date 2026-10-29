"use client";

import { useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { KeyRound, Save } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { TankSizePicker } from "@/components/TankSizePicker";
import { LocationPicker, type LatLng } from "@/components/maps/LocationPicker";
import { errorText, useToast } from "@/components/Toast";
import { formatPhone } from "@/lib/gas";

export default function ProfilePage() {
  const { token, user: sessionUser } = useSession();
  const me = useQuery(api.users.me, { token }) ?? sessionUser;
  return <ProfileForm key={me._id + String(me.lat) + String(me.lng) + me.address} me={me} token={token} />;
}

function ProfileForm({ me, token }: { me: NonNullable<ReturnType<typeof useSession>["user"]>; token: string }) {
  const toast = useToast();
  const update = useMutation(api.users.updateProfile);
  const changePw = useAction(api.auth.changePassword);

  const [name, setName] = useState(me.name);
  const [address, setAddress] = useState(me.address ?? "");
  const [landmark, setLandmark] = useState(me.landmark ?? "");
  const [tank, setTank] = useState<"11kg" | "2.7kg">(me.tankSize ?? "11kg");
  const [loc, setLoc] = useState<LatLng | null>(me.lat != null && me.lng != null ? { lat: me.lat, lng: me.lng } : null);
  const [saving, setSaving] = useState(false);

  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await update({ token, name, address, landmark, tankSize: tank, lat: loc?.lat, lng: loc?.lng });
      toast("Profile saved.");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwBusy(true);
    try {
      await changePw({ token, currentPassword: cur, newPassword: nw });
      toast("Password changed.");
      setCur("");
      setNw("");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Keep your address and pin updated so deliveries go to the right place." />
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Delivery details" />
          <form onSubmit={save} className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </Field>
              <Field label="Mobile number" hint="To change your number, message PGI.">
                <Input value={formatPhone(me.phone)} disabled />
              </Field>
            </div>
            <Field label="Home address">
              <Textarea value={address} onChange={(e) => setAddress(e.target.value)} required className="min-h-[72px]" />
            </Field>
            <Field label="Landmark">
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. blue gate near the chapel" />
            </Field>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-700">Tank size</span>
              <TankSizePicker value={tank} onChange={setTank} />
            </div>
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-700">House location</span>
              <LocationPicker value={loc} onChange={setLoc} />
            </div>
            <Button type="submit" loading={saving}>
              <Save className="size-4" /> Save changes
            </Button>
          </form>
        </Card>

        <Card className="self-start">
          <CardHeader title="Change password" />
          <form onSubmit={changePassword} className="space-y-4 p-5">
            <Field label="Current password">
              <Input type="password" value={cur} onChange={(e) => setCur(e.target.value)} required />
            </Field>
            <Field label="New password" hint="At least 6 characters.">
              <Input type="password" value={nw} onChange={(e) => setNw(e.target.value)} minLength={6} required />
            </Field>
            <Button type="submit" variant="secondary" loading={pwBusy}>
              <KeyRound className="size-4" /> Update password
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
