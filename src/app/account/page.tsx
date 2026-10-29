"use client";

import { Crown } from "lucide-react";
import { api, useApi, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Badge, Button, Card, CardHeader, cx, PageHeader } from "@/shared/ui/primitives";
import { NotificationPreferences, SupportCenter } from "@/shared/ui/account";
import { useToast } from "@/shared/ui/overlay";

type Me = { name: string; email: string; city: string; plan: string; usedFreeSample: boolean };
type Order = { id: string; reference: string; product: string };

const plans = [
  { id: "Free", title: "Free", body: "Your first gift up to $100 has no SecretWish fee." },
  { id: "Customer Monthly", title: "Monthly", body: "Unlimited gifts and surprise requests. Billed monthly." },
  { id: "Customer Yearly", title: "Yearly", body: "Everything in Monthly at a reduced yearly price." },
];

export default function AccountPage() {
  const { data: me } = useApi<Me>("/me");
  const { data: orders } = useApi<Order[]>("/sender/orders");
  const { meta, fmt } = useSession();
  const toast = useToast();
  const change = useMutation((plan: string) => api("/sender/plan", { method: "POST", body: { plan } }));

  return (
    <>
      <PageHeader title="Account" description={me ? `${me.name} · ${me.email}` : undefined} />
      <Card className="mb-6">
        <CardHeader title="Your plan" description={`Prices are set in USD and shown in your local currency. Plan price points are still being finalised.`} action={<Badge tone="gold">Simulated billing</Badge>} />
        <ul className="grid gap-3 p-5 md:grid-cols-3">
          {plans.map((p) => {
            const current = me?.plan === p.id;
            return (
              <li key={p.id} className={cx("flex flex-col rounded-2xl border p-4", current ? "border-plum-500 bg-plum-50" : "border-ink-200")}>
                <p className="flex items-center gap-2 font-semibold">
                  {p.id !== "Free" && <Crown className="size-4 text-gold-600" aria-hidden />} {p.title} {current && <Badge tone="plum">Current</Badge>}
                </p>
                <p className="mt-1 flex-1 text-[13px] text-ink-700">{p.id === "Free" ? `Your first gift up to ${fmt(meta?.freeSampleLimitUsd ?? 100)} has no SecretWish fee.` : p.body}</p>
                {p.id === "Free" && me && <p className="mt-2 text-xs text-ink-500">Free first gift: {me.usedFreeSample ? "used" : "available"}</p>}
                {!current && (
                  <Button
                    className="mt-3"
                    size="sm"
                    variant={p.id === "Free" ? "secondary" : "primary"}
                    loading={change.pending}
                    onClick={async () => {
                      if ((await change.run(p.id)) !== undefined) toast({ tone: "success", title: `Switched to ${p.title} (simulated)` });
                    }}
                  >
                    {p.id === "Free" ? "Downgrade" : "Choose"} {p.title}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
      <div className="mb-10">
        <NotificationPreferences showWishlist={false} />
      </div>
      <h2 id="support" className="mb-4 scroll-mt-24 font-display text-2xl font-semibold text-plum-900">
        Help & support
      </h2>
      <SupportCenter orders={orders?.map((o) => ({ id: o.id, reference: o.reference, label: o.product }))} />
    </>
  );
}
