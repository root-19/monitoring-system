"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAction, useMutation, useQuery } from "convex/react";
import { ArrowLeft, ExternalLink, KeyRound, MessageSquareText, Phone, Save, Send, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession, type SessionUser } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge, Button, ButtonLink, Card, CardHeader, EmptyState, Field, Input, PageLoading, Select, Textarea } from "@/components/ui";
import { GasStatusCard, LevelBar } from "@/components/GasGauge";
import { Modal } from "@/components/Modal";
import { RecordDeliveryForm } from "@/components/admin/RecordDeliveryForm";
import { ReminderComposer } from "@/components/admin/ReminderComposer";
import { LocationPicker, type LatLng } from "@/components/maps/LocationPicker";
import { errorText, useToast } from "@/components/Toast";
import { estimateGas, formatDate, formatPhone } from "@/lib/gas";
import { smsLink } from "@/lib/sms";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const clientId = id as Id<"users">;
  const { token } = useSession();
  const client = useQuery(api.users.getClient, { token, clientId });
  const clients = useQuery(api.users.listClients, { token });
  const deliveries = useQuery(api.deliveries.listForClient, { token, clientId });
  const [showDeliver, setShowDeliver] = useState(false);
  const [showRemind, setShowRemind] = useState(false);

  if (client === undefined) return <PageLoading />;
  if (client === null) return <EmptyState title="Client not found" action={<ButtonLink href="/admin/clients" size="sm">Back to clients</ButtonLink>} />;

  const est = estimateGas(client.lastDeliveryAt, client.avgDaysPerTank, client.tankSize);

  return (
    <div className="space-y-6">
      <Link href="/admin/clients" className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-600">
        <ArrowLeft className="size-4" /> All clients
      </Link>
      <PageHeader
        title={client.name}
        description={`${formatPhone(client.phone)} · ${client.address ?? "No address"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${client.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium hover:bg-surface-2"><Phone className="size-4" /> Call</a>
            <a href={smsLink(client.phone, `Hi ${client.name.split(" ")[0]}! This is Fiesta Gas PGI. `)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-white px-3 text-sm font-medium hover:bg-surface-2"><Send className="size-4" /> SMS</a>
            <ButtonLink href={`/admin/messages?client=${client._id}`} variant="outline" size="sm" className="h-10"><MessageSquareText className="size-4" /> Chat</ButtonLink>
            <Button size="sm" variant="secondary" className="h-10" onClick={() => setShowRemind(true)}><Send className="size-4" /> Remind</Button>
            <Button size="sm" className="h-10" onClick={() => setShowDeliver(true)}><Truck className="size-4" /> Record delivery</Button>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <GasStatusCard estimate={est} tank={client.tankSize} />
          <div className="mt-5">
            <LevelBar pct={est.pct} status={est.status} />
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-ink-500">
              <span>Last delivery: {client.lastDeliveryAt ? formatDate(client.lastDeliveryAt) : "none yet"}</span>
              <span>Usual: one tank per ~{client.avgDaysPerTank ?? 30} days</span>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">House location</p>
          {client.lat != null && client.lng != null ? (
            <>
              <iframe title="Client location" className="mt-3 h-40 w-full rounded-xl border border-line" loading="lazy" src={`https://maps.google.com/maps?q=${client.lat},${client.lng}&z=16&output=embed`} />
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${client.lat},${client.lng}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
                Get directions <ExternalLink className="size-3.5" />
              </a>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-500">Not pinned yet. Add the pin in the form below.</p>
          )}
          {client.landmark && <p className="mt-2 text-xs text-ink-500">Landmark: {client.landmark}</p>}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Delivery history" />
          <div className="p-5">
            {!deliveries ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : deliveries.length === 0 ? (
              <EmptyState icon={<Truck className="size-5" />} title="No deliveries yet" description="Record the first delivery to start the gas estimate." action={<Button size="sm" onClick={() => setShowDeliver(true)}>Record delivery</Button>} />
            ) : (
              <ul className="divide-y divide-line">
                {deliveries.map((d) => (
                  <li key={d._id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-ink">{d.quantity} x {d.tankSize}</p>
                      <p className="text-xs text-ink-500">{formatDate(d.deliveredAt, true)}{d.notes ? ` · ${d.notes}` : ""}</p>
                    </div>
                    {d.amount != null && <Badge tone="neutral">₱{d.amount.toLocaleString()}</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <ResetPasswordCard clientId={clientId} />
      </div>

      <EditClientCard key={client._id + String(client.lat) + client.address + String(client.avgDaysPerTank)} client={client} />

      <Modal open={showDeliver} onClose={() => setShowDeliver(false)} title={`Record delivery for ${client.name}`}>
        {clients && <RecordDeliveryForm clients={clients} clientId={clientId} onDone={() => setShowDeliver(false)} />}
      </Modal>
      <Modal open={showRemind} onClose={() => setShowRemind(false)} title={`Send reminder to ${client.name}`} wide>
        {clients && <ReminderComposer clients={clients} preselected={[clientId]} onSent={() => setShowRemind(false)} />}
      </Modal>
    </div>
  );
}

function EditClientCard({ client }: { client: SessionUser }) {
  const { token } = useSession();
  const toast = useToast();
  const update = useMutation(api.users.updateProfile);
  const [name, setName] = useState(client.name);
  const [address, setAddress] = useState(client.address ?? "");
  const [landmark, setLandmark] = useState(client.landmark ?? "");
  const [tank, setTank] = useState<"11kg" | "2.7kg">(client.tankSize ?? "11kg");
  const [days, setDays] = useState(String(client.avgDaysPerTank ?? ""));
  const [notes, setNotes] = useState(client.notes ?? "");
  const [active, setActive] = useState(client.isActive);
  const [loc, setLoc] = useState<LatLng | null>(client.lat != null && client.lng != null ? { lat: client.lat, lng: client.lng } : null);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await update({
        token,
        userId: client._id,
        name,
        address,
        landmark,
        tankSize: tank,
        avgDaysPerTank: days ? Number(days) : undefined,
        notes,
        isActive: active,
        lat: loc?.lat,
        lng: loc?.lng,
      });
      toast("Client updated.");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Client details" description="Edit address, tank, usage, and pin." />
      <form onSubmit={save} className="grid gap-4 p-5 lg:grid-cols-2">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Mobile number"><Input value={formatPhone(client.phone)} disabled /></Field>
        <Field label="Home address"><Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="min-h-[64px]" /></Field>
        <Field label="Landmark"><Input value={landmark} onChange={(e) => setLandmark(e.target.value)} /></Field>
        <Field label="Tank size">
          <Select value={tank} onChange={(e) => setTank(e.target.value as "11kg" | "2.7kg")}>
            <option value="11kg">11 kg</option>
            <option value="2.7kg">2.7 kg</option>
          </Select>
        </Field>
        <Field label="Usual days per tank" hint="How long one tank normally lasts for this client. Drives the gas estimate.">
          <Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} />
        </Field>
        <Field label="Private notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <Field label="Account status">
          <Select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")}>
            <option value="1">Active</option>
            <option value="0">Inactive (cannot log in)</option>
          </Select>
        </Field>
        <div className="lg:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-ink-700">House pin</span>
          <LocationPicker value={loc} onChange={setLoc} />
        </div>
        <div className="lg:col-span-2">
          <Button type="submit" loading={busy}><Save className="size-4" /> Save changes</Button>
        </div>
      </form>
    </Card>
  );
}

function ResetPasswordCard({ clientId }: { clientId: Id<"users"> }) {
  const { token } = useSession();
  const toast = useToast();
  const reset = useAction(api.auth.adminResetPassword);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Card className="self-start">
      <CardHeader title="Reset password" description="If the client forgot their password." />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await reset({ token, userId: clientId, newPassword: pw });
            toast("Password reset. Tell the client the new password.");
            setPw("");
          } catch (err) {
            toast(errorText(err), "error");
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-3 p-5"
      >
        <Field label="New password"><Input value={pw} onChange={(e) => setPw(e.target.value)} minLength={6} required placeholder="At least 6 characters" /></Field>
        <Button type="submit" variant="secondary" loading={busy}><KeyRound className="size-4" /> Reset password</Button>
      </form>
    </Card>
  );
}
