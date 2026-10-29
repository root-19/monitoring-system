"use client";

import { PageHeader } from "@/components/shell/AppShell";
import { Card } from "@/components/ui";
import { ChatThread } from "@/components/ChatThread";
import { PGI_PHONE, PGI_PHONE_DISPLAY } from "@/lib/gas";

export default function PortalMessages() {
  return (
    <div>
      <PageHeader
        title="Messages"
        description="Chat with Fiesta Gas PGI. Replies also appear in your notifications."
        action={
          <a href={`sms:${PGI_PHONE}`} className="text-sm font-medium text-brand-600 hover:underline">
            Or text us at {PGI_PHONE_DISPLAY}
          </a>
        }
      />
      <Card className="overflow-hidden">
        <ChatThread emptyText="No messages yet. Ask us anything about your gas or delivery." />
      </Card>
    </div>
  );
}
