"use client";

import { useEffect, useState } from "react";
import { useApi, type Paged } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { PageHeader, Skeleton } from "@/shared/ui/primitives";
import { BillingToggle, parsePlanCode, PlanButton, PricingCards, usePlanChoice, type Billing, type PlanCatalog } from "@/shared/ui/pricing";
import { NotificationPreferences, SupportCenter } from "@/shared/ui/account";
import { useToast } from "@/shared/ui/overlay";

type Me = { name: string; email: string; city: string; plan: string; planPaidUntil?: string | null; usedFreeSample: boolean };
type Order = { id: string; reference: string; product: string };

export default function AccountPage() {
  const { data: me } = useApi<Me>("/me");
  // Recent orders for the support form's "which order?" picker.
  const { data: orders } = useApi<Paged<Order>>("/sender/orders?pageSize=50");
  const { fmt } = useSession();
  const { data: catalog } = useApi<PlanCatalog>("/plans/customer");
  const [billing, setBilling] = useState<Billing>("Yearly");
  // Open on the period the person pays for.
  useEffect(() => { const b = parsePlanCode(me?.plan).billing; if (b) setBilling(b); }, [me?.plan]);
  const toast = useToast();
  const change = usePlanChoice("customer");

  return (
    <>
      <PageHeader title="Account" description={me ? `${me.name} · ${me.email}` : undefined} />
      <section aria-labelledby="plan-h" className="mb-8 rounded-[32px] bg-[linear-gradient(135deg,#f3eef7_0%,#fbf6e8_100%)] p-4 sm:p-6 md:p-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 id="plan-h" className="flex items-center gap-2 font-display text-3xl font-semibold text-plum-900">
              Your plan
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Prices are set in USD and shown in your currency. Paid plans are paid securely with our payment partner.
              {me?.planPaidUntil && <> Paid until {date(me.planPaidUntil)}.</>}
              {me && <> Free first gift: {me.usedFreeSample ? "used" : "available"}.</>}
            </p>
          </div>
          <BillingToggle value={billing} onChange={setBilling} />
        </div>
        {catalog ? (
          <PricingCards
            catalog={catalog}
            billing={billing}
            format={(usd) => fmt(usd)}
            current={me?.plan}
            action={(p, { current, code }) => (
              <PlanButton
                plan={p}
                disabled={current || change.pending}
                onClick={async () => {
                  const r = await change.choose(code, p.isFree);
                  if (r?.switched) toast({ tone: "success", title: `Switched to ${p.name}` });
                }}
              >
                {current ? "Your plan" : p.isFree ? "Switch to Free" : `Pay for ${p.name}`}
              </PlanButton>
            )}
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-[480px] rounded-[30px]" />)}</div>
        )}
        {change.error && <p role="alert" className="mt-4 text-center text-sm text-danger-700">{change.error.message}</p>}
      </section>
      <div className="mb-10">
        <NotificationPreferences showWishlist={false} />
      </div>
      <h2 id="support" className="mb-4 scroll-mt-24 font-display text-2xl font-semibold text-plum-900">
        Help & support
      </h2>
      <SupportCenter orders={orders?.items.map((o) => ({ id: o.id, reference: o.reference, label: o.product }))} />
    </>
  );
}
