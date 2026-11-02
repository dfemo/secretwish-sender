"use client";

import { useState } from "react";
import { Mail, MailCheck } from "lucide-react";
import { api, useMutation } from "@/shared/lib/api";
import { timeAgo } from "@/shared/lib/format";
import { Button, Card, Field, Input, Notice } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/overlay";
import type { SenderOrder } from "@/lib/types";

/** For recipients who aren't on SecretWish: once the gift is delivered, email them an invitation to join. */
export function InviteRecipient({ order, onSent }: { order: SenderOrder; onSent: (o: SenderOrder) => void }) {
  const r = order.recipient;
  const toast = useToast();
  const [email, setEmail] = useState(r.email ?? "");
  const invite = useMutation(() => api<SenderOrder>(`/sender/orders/${order.id}/invite-recipient`, { method: "POST", body: { email: email.trim() || null } }));
  if (r.onSecretWish || r.viaWishlist) return null;
  const first = r.name.split(" ")[0];
  const delivered = order.status === "Delivered";

  return (
    <Card className="p-6">
      <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-ink-500 uppercase">
        <Mail className="size-4 text-plum-600" aria-hidden /> Invite {first} to SecretWish
      </p>
      <p className="mt-2 text-sm text-ink-700">
        {first} isn&apos;t on SecretWish yet. {delivered ? "Send them an invitation to make their own wishlist." : "Once the gift is delivered you can email them an invitation to make their own wishlist."}
        {order.gift.revealSender ? " The email says it's from you." : " The email doesn't say who sent the gift."} It never mentions the price.
      </p>
      {r.invitedAt && (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success-700">
          <MailCheck className="size-4" aria-hidden /> Invitation sent {timeAgo(r.invitedAt)}{r.email && ` to ${r.email}`}
        </p>
      )}
      {delivered && (
        <div className="mt-4 space-y-3">
          <Field label={`${first}'s email`} error={invite.error?.errors?.email?.[0]}>
            {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />}
          </Field>
          {r.inviteBlocked && <p className="text-xs text-ink-500">{r.inviteBlocked}</p>}
          {invite.error && !invite.error.errors?.email && <Notice tone="danger">{invite.error.message}</Notice>}
          <Button
            icon={Mail}
            loading={invite.pending}
            disabled={!!r.inviteBlocked || !email.trim()}
            onClick={async () => {
              const o = await invite.run();
              if (o) {
                toast({ tone: "success", title: "Invitation sent", body: `We emailed ${first} an invitation to join SecretWish.` });
                onSent(o);
              }
            }}
          >
            {r.invitedAt ? "Send again" : "Send invitation"}
          </Button>
        </div>
      )}
    </Card>
  );
}
