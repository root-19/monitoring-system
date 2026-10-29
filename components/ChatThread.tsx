"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Send } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/components/providers/SessionProvider";
import { Button, cn, Input } from "@/components/ui";
import { errorText, useToast } from "@/components/Toast";
import { formatDate } from "@/lib/gas";

/** Shared chat UI. For admin, pass the clientId of the conversation. */
export function ChatThread({ clientId, emptyText }: { clientId?: Id<"users">; emptyText?: string }) {
  const { token, user } = useSession();
  const toast = useToast();
  const messages = useQuery(api.messages.thread, { token, clientId });
  const send = useMutation(api.messages.send);
  const markRead = useMutation(api.messages.markRead);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  useEffect(() => {
    if (messages && messages.length) markRead({ token, clientId }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length, clientId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    try {
      await send({ token, body: text, clientId });
      setText("");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[65vh] min-h-[420px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {!messages ? (
          <div className="skeleton h-12 w-2/3 rounded-xl" />
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-500">{emptyText ?? "No messages yet. Say hello!"}</p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === user._id;
            const fromPgi = m.senderRole === "admin";
            return (
              <div key={m._id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-line bg-white text-ink")}>
                  {!mine && <p className={cn("mb-0.5 text-[11px] font-semibold", fromPgi ? "text-brand-600" : "text-ink-500")}>{fromPgi ? "Fiesta Gas PGI" : "Client"}</p>}
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-1 text-[10px]", mine ? "text-white/70" : "text-ink-300")}>{formatDate(m.createdAt, true)}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={submit} className="flex gap-2 border-t border-line p-3">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" />
        <Button type="submit" loading={busy} disabled={!text.trim()}>
          <Send className="size-4" /> Send
        </Button>
      </form>
    </div>
  );
}
