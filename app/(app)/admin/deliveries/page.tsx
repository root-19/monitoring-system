"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { Trash2, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge, Button, Card, CardHeader, EmptyState } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { RecordDeliveryForm } from "@/components/admin/RecordDeliveryForm";
import { errorText, useToast } from "@/components/Toast";
import { formatDate, formatPhone } from "@/lib/gas";

export default function DeliveriesPage() {
  const { token } = useSession();
  const toast = useToast();
  const deliveries = useQuery(api.deliveries.listRecent, { token, limit: 100 });
  const clients = useQuery(api.users.listClients, { token });
  const remove = useMutation(api.deliveries.remove);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-5">
      <PageHeader title="Deliveries" description="Every delivery you record updates the client's gas estimate." action={<Button size="sm" onClick={() => setOpen(true)}><Truck className="size-4" /> Record delivery</Button>} />
      <Card>
        <CardHeader title="Recent deliveries" />
        {!deliveries ? (
          <div className="p-5"><div className="skeleton h-20 rounded-xl" /></div>
        ) : deliveries.length === 0 ? (
          <div className="p-5"><EmptyState icon={<Truck className="size-5" />} title="No deliveries yet" action={<Button size="sm" onClick={() => setOpen(true)}>Record the first one</Button>} /></div>
        ) : (
          <ul className="divide-y divide-line">
            {deliveries.map((d) => (
              <li key={d._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <Link href={`/admin/clients/${d.clientId}`} className="font-medium text-ink hover:text-brand-600">{d.clientName}</Link>
                  <p className="text-xs text-ink-500">{formatPhone(d.clientPhone)} · {formatDate(d.deliveredAt, true)}{d.notes ? ` · ${d.notes}` : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="blue">{d.quantity} x {d.tankSize}</Badge>
                  {d.amount != null && <Badge tone="neutral">₱{d.amount.toLocaleString()}</Badge>}
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this delivery record?")) return;
                      try {
                        await remove({ token, deliveryId: d._id });
                        toast("Delivery deleted.", "info");
                      } catch (e) {
                        toast(errorText(e), "error");
                      }
                    }}
                    className="grid size-8 place-items-center rounded-lg text-ink-300 hover:bg-red-50 hover:text-danger"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a delivery">
        {clients && <RecordDeliveryForm clients={clients} onDone={() => setOpen(false)} />}
      </Modal>
    </div>
  );
}
