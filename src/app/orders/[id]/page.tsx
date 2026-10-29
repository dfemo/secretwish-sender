"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CreditCard, LifeBuoy, MapPin, RotateCcw, Truck, XCircle } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date, dateTime } from "@/shared/lib/format";
import { Button, ButtonLink, Card, ErrorState, Notice, PageSkeleton, ProductArt, StatusBadge } from "@/shared/ui/primitives";
import { Timeline, type TimelineItem } from "@/shared/ui/data";
import { OrderActionDialog } from "@/shared/ui/order-actions";
import { PaymentSheet } from "@/components/payment-sheet";
import type { SenderOrder } from "@/lib/types";

// The customer-facing journey. Completed steps come from real events; the rest show what's next.
const journey = [
  { type: "placed", title: "Order placed", next: "We've saved your order." },
  { type: "payment_confirmed", title: "Payment confirmed", next: "Complete payment to send your gift to the vendor." },
  { type: "accepted", title: "Being prepared", next: "The vendor will accept and prepare your gift." },
  { type: "dispatched", title: "Picked up by the courier", next: "Your gift will be handed to a courier." },
  { type: "delivered", title: "Delivered", next: "It'll be verified on arrival — we hope they love it!" },
];

export default function OrderTracking() {
  const { id } = useParams<{ id: string }>();
  const { data: o, error, loading, reload } = useApi<SenderOrder>(`/sender/orders/${id}`);
  const { fmt } = useSession();
  const [action, setAction] = useState<{ key: string; label: string } | null>(null);
  const [paying, setPaying] = useState(false);
  if (loading) return <PageSkeleton />;
  if (error || !o) return <ErrorState error={error} onRetry={reload} />;

  const happy = journey.map<TimelineItem>((j) => {
    const e = [...o.events].reverse().find((x) => x.type === j.type);
    return { id: j.type, at: e?.at ?? "", title: e && j.type === "dispatched" && o.delivery.courier ? `Picked up by ${o.delivery.courier}` : j.title, detail: e ? e.detail : j.next, done: !!e };
  });
  // Off-path events (failures, exceptions, refunds) are shown in order after the main journey.
  const extra = o.events.filter((e) => !journey.some((j) => j.type === e.type) && e.type !== "sent_to_vendor").map<TimelineItem>((e) => ({ id: e.id, at: e.at, title: e.title, detail: e.detail, done: true }));
  const items = ["Cancelled", "RefundRequested", "RefundCompleted", "DeliveryException"].includes(o.status) ? [...happy.filter((h) => h.done), ...extra] : [...happy.filter((h) => h.done), ...extra, ...happy.filter((h) => !h.done)];
  const total = o.money;

  return (
    <>
      <Link href="/orders" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-plum-700">
        <ArrowLeft className="size-4" aria-hidden /> My gifts
      </Link>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-gold-700 uppercase">Order status</p>
          <h1 className="font-display text-3xl font-semibold text-plum-900">{o.reference}</h1>
          <p className="mt-1 text-sm text-ink-500">Placed {dateTime(o.createdAt)}</p>
        </div>
        <StatusBadge status={o.status} className="text-sm" />
      </div>

      {o.status === "PaymentPending" && (
        <Notice className="mb-6" tone={o.paymentStatus === "Failed" ? "danger" : "warning"} title={o.paymentStatus === "Failed" ? "Your last payment attempt failed" : "Payment not completed"}>
          Your gift hasn&apos;t been sent to the vendor yet.
          <div className="mt-2">
            <Button size="sm" variant="gold" icon={CreditCard} onClick={() => setPaying(true)}>
              Complete payment
            </Button>
          </div>
        </Notice>
      )}
      {o.status === "DeliveryException" && (
        <Notice className="mb-6" tone="warning" title="There's a delay with your gift">
          Our operations team is working with the vendor. You don&apos;t need to do anything — or contact support if it&apos;s urgent.
        </Notice>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6 md:p-8">
          <Timeline items={items} formatTime={dateTime} />
          {o.delivery.trackingReference && (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-ivory-100 px-4 py-3 text-sm">
              <Truck className="size-4 text-plum-600" aria-hidden /> {o.delivery.courier} · tracking <span className="font-mono">{o.delivery.trackingReference}</span>
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <p className="text-xs font-semibold tracking-[0.12em] text-ink-500 uppercase">Delivering to</p>
            <p className="mt-2 flex items-start gap-2 text-sm">
              <MapPin className="mt-0.5 size-4 shrink-0 text-plum-600" aria-hidden />
              <span>
                <b>{o.recipient.name}</b>
                <br />
                {o.recipient.address}, {o.recipient.city}
              </span>
            </p>
            <p className="mt-2 text-xs text-ink-500">
              {o.delivery.deliveryOption}
              {o.delivery.deliveryDate && ` · by ${date(o.delivery.deliveryDate)}`}
            </p>
            <hr className="my-5 border-ink-100" />
            <p className="text-xs font-semibold tracking-[0.12em] text-ink-500 uppercase">Order details</p>
            <ul className="mt-3 space-y-3">
              {o.lines.map((l, i) => (
                <li key={i} className="flex items-center gap-3">
                  <ProductArt emoji={l.emoji} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{l.productName}</p>
                    <p className="text-xs text-ink-500">
                      {l.quantity} × {fmt(l.unitPrice)} · {o.vendor.name}
                    </p>
                  </div>
                  <p className="font-display font-semibold tabular">{fmt(l.total)}</p>
                </li>
              ))}
            </ul>
            {o.gift.giftMessage && <p className="mt-4 rounded-xl bg-plum-50 px-4 py-3 font-display text-plum-900 italic">“{o.gift.giftMessage}”</p>}
            <p className="mt-3 text-xs text-ink-500">
              {o.gift.revealSender ? "Your name is revealed after delivery" : "Sent anonymously"} · {o.gift.hidePriceFromRecipient ? "price hidden" : "price visible"} · {o.gift.discreetPackaging ? "discreet packaging" : "standard packaging"}
            </p>
          </Card>
          <div className="overflow-hidden rounded-3xl bg-gradient-to-b from-plum-800 to-plum-950 p-6 text-ivory-50">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-plum-200">Subtotal</dt><dd className="tabular">{fmt(total.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-plum-200">Delivery</dt><dd className="tabular">{total.deliveryFee ? fmt(total.deliveryFee) : "Free"}</dd></div>
              {!!total.discount && <div className="flex justify-between"><dt className="text-plum-200">Discount</dt><dd className="tabular">−{fmt(total.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-plum-200">VAT</dt><dd className="tabular">{fmt(total.tax)}</dd></div>
            </dl>
            <div className="mt-4 flex items-baseline justify-between border-t border-white/15 pt-3">
              <span className="font-display text-lg">Total paid</span>
              <span className="font-display text-2xl font-semibold tabular">{fmt(total.total)}</span>
            </div>
            <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-plum-300">
              Payment <StatusBadge status={o.paymentStatus} />
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {o.actions.map((a) => (
              <Button key={a.key} variant="secondary" icon={a.key === "cancel" ? XCircle : RotateCcw} onClick={() => setAction(a)}>
                {a.key === "request-refund" ? "Report a problem / refund" : a.label}
              </Button>
            ))}
            <ButtonLink href="/account#support" variant="ghost" icon={LifeBuoy}>
              Contact support
            </ButtonLink>
          </div>
        </div>
      </div>
      <OrderActionDialog action={action} basePath="/sender" orderId={o.id} onClose={() => setAction(null)} />
      <PaymentSheet order={paying ? { id: o.id, reference: o.reference, total: o.money.total } : null} method="Card" onClose={() => setPaying(false)} onPaid={() => setPaying(false)} />
    </>
  );
}
