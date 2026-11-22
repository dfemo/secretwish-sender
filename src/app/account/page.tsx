"use client";

import { useEffect, useState } from "react";
import { useApi, type Paged } from "@/shared/lib/api";
import { PageHeader } from "@/shared/ui/primitives";
import { PlansDialog, PlanSummaryCard } from "@/shared/ui/pricing";
import { NotificationPreferences, ProfileDetails, SupportCenter } from "@/shared/ui/account";

type Me = { name: string; email: string; city: string; plan: string; usedFreeSample: boolean };
type Order = { id: string; reference: string; product: string };

/**
 * Account: your plan first, then your details and notifications, side by side on wide screens and stacked on phones. Plans are
 * compared in a dialog (opened here, or with ?plans=1 from elsewhere) so the page stays short.
 */
export default function AccountPage() {
  const { data: me, reload } = useApi<Me>("/me");
  // Recent orders for the support form's "which order?" picker.
  const { data: orders } = useApi<Paged<Order>>("/sender/orders?pageSize=50");
  const [plansOpen, setPlansOpen] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("plans") === "1" || url.hash === "#plans" || url.hash === "#plan-h") setPlansOpen(true);
  }, []);

  return (
    <>
      <PageHeader title="Account" description={me ? `${me.name} · ${me.email}` : undefined} />
      {/* Phones: plan, details, notifications. Wide screens: plan above notifications on the left, details on the right. */}
      <section aria-label="Your account" className="mb-10 grid items-start gap-4 sm:gap-6 lg:grid-cols-2">
        <PlanSummaryCard audience="customer" onManage={() => setPlansOpen(true)} />
        <div className="lg:row-span-2">
          <ProfileDetails description="How VeilWish (SecretWish) reaches you, and where gifts sent to you are delivered. Your date of birth lets us send you birthday wishes." />
        </div>
        <NotificationPreferences showWishlist={false} />
      </section>
      <h2 id="support" className="mb-4 scroll-mt-24 font-display text-2xl font-semibold text-plum-900">
        Help & support
      </h2>
      <SupportCenter orders={orders?.items.map((o) => ({ id: o.id, reference: o.reference, label: o.product }))} />
      <PlansDialog
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        audience="customer"
        current={me?.plan}
        next="/account"
        onSwitched={reload}
        intro={<>Prices are set in USD and shown in your currency. Paid plans are paid securely with our payment partner.{me && <> Free first gift: {me.usedFreeSample ? "used" : "available"}.</>}</>}
      />
    </>
  );
}
