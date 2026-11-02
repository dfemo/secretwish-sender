"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, Columns3, List, Sparkles, Star } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date, dateTime, moneyIn, timeAgo } from "@/shared/lib/format";
import { Badge, ButtonLink, Card, CardHeader, cx, EmptyState, ErrorState, PageSkeleton, StatusBadge, Tabs } from "@/shared/ui/primitives";
import { InvoiceButton } from "@/shared/ui/invoice";
import { CompareQuotes, QuoteAction, type Quote } from "../quotes";

type Detail = {
  id: string; reference: string; title: string; status: string; createdAt: string; neededBy: string | null; notes: string; category: string;
  currency: string; budgetMin: number; budgetMax: number; budgetMinLocal: number; budgetMaxLocal: number; recipientName: string; deliveryCity: string;
  items: { id: string; name: string; category: string; emoji: string; quantity: number; notes: string }[];
  wish: { title: string; url: string | null; imageUrl: string | null; estimatedPriceUsd: number | null } | null;
  quotes: Quote[];
  order: { id: string; reference: string; status: string; paymentStatus: string; total: number } | null;
};

export default function SurpriseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: s, error, loading, reload } = useApi<Detail>(`/sender/surprises/${id}`);
  const { fmt, currency: viewerCurrency } = useSession();
  const [view, setView] = useState("list");

  if (loading) return <PageSkeleton />;
  if (error || !s) return <ErrorState error={error} onRetry={reload} />;
  const budget = `${moneyIn(s.budgetMinLocal, s.currency)} – ${moneyIn(s.budgetMaxLocal, s.currency)}`;
  const lowest = s.quotes[0]?.priceUsd;
  const choose = (q: Quote) => router.push(`/checkout?quote=${q.id}`);
  const withInvoice = s.quotes.filter((q) => q.invoice).length;

  return (
    <>
      <Link href="/surprises" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-plum-700">
        <ArrowLeft className="size-4" aria-hidden /> Surprise requests
      </Link>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-ink-500">{s.reference} · {s.category} · posted {timeAgo(s.createdAt)}</p>
          <h1 className="font-display text-3xl font-semibold text-plum-900">{s.title}</h1>
          <p className="text-sm text-ink-500">
            For {s.recipientName} in {s.deliveryCity}
            {s.neededBy && ` · needed by ${date(s.neededBy)}`}
          </p>
        </div>
        <div className="text-right">
          <Badge tone="gold">Budget {budget}</Badge>
          {s.currency !== viewerCurrency && <p className="mt-1 text-[11px] text-ink-500">≈ {fmt(s.budgetMin)} – {fmt(s.budgetMax)}</p>}
          <div className="mt-1"><StatusBadge status={s.status} /></div>
        </div>
      </header>

      {s.order && (
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm">
            You chose a vendor and checked out: order <span className="font-semibold">{s.order.reference}</span> · {fmt(s.order.total)}
            <span className="ml-2 inline-flex gap-1.5 align-middle"><StatusBadge status={s.order.paymentStatus} /> <StatusBadge status={s.order.status} /></span>
          </p>
          <ButtonLink href={`/orders/${s.order.id}`} size="sm" variant="secondary" icon={ArrowUpRight}>Track order</ButtonLink>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0">
          <CardHeader
            title={`Vendor quotes (${s.quotes.length})`}
            description={s.quotes.length ? `Cheapest first${withInvoice ? ` · ${withInvoice} with an invoice to preview` : ""}${s.items.length > 1 ? ` · each covers all ${s.items.length} items` : ""}` : undefined}
            action={
              s.quotes.length > 1 ? (
                <Tabs value={view} onChange={setView} tabs={[
                    { value: "list", label: <span className="inline-flex items-center gap-1.5"><List className="size-3.5" aria-hidden /> List</span> },
                    { value: "compare", label: <span className="inline-flex items-center gap-1.5"><Columns3 className="size-3.5" aria-hidden /> Side by side</span> },
                  ]} />
              ) : undefined
            }
          />
          <div className="p-5">
            {s.quotes.length === 0 ? (
              <EmptyState icon={Sparkles} title="Waiting for vendors to quote" description="You'll be notified as soon as a vendor sends a quote." />
            ) : view === "compare" && s.quotes.length > 1 ? (
              <CompareQuotes quotes={s.quotes} requestStatus={s.status} fmt={fmt} onChoose={choose} />
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {s.quotes.map((q) => (
                  <li key={q.id} className={cx("flex flex-col rounded-2xl border p-4", q.status === "Accepted" ? "border-success-600/40 bg-success-50/50" : q.overBudget ? "border-warning-600/30 bg-warning-50/40" : "border-ink-200")}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{q.vendor.name}</p>
                        <p className="flex items-center gap-1 text-xs text-ink-500">
                          <Star className="size-3 fill-gold-500 text-gold-500" aria-hidden /> {q.vendor.rating.toFixed(1)} · {q.vendor.city}
                          {q.vendor.onTimeRate ? ` · ${Math.round(q.vendor.onTimeRate * 100)}% on time` : ""}
                        </p>
                      </div>
                      <p className="text-right">
                        <span className="block font-display text-xl font-semibold tabular">{fmt(q.priceUsd)}</span>
                        <span className="text-[11px] text-ink-500">{dateTime(q.createdAt)}</span>
                      </p>
                    </div>
                    {q.vendor.description && <p className="mt-1 line-clamp-2 text-xs text-ink-500">{q.vendor.description}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {q.overBudget ? <Badge tone="warning">Outside your range</Badge> : <Badge tone="success">Within budget</Badge>}
                      {s.quotes.length > 1 && q.priceUsd === lowest && <Badge tone="gold">Lowest price</Badge>}
                    </div>
                    {q.description && <p className="mt-2 text-[13px] whitespace-pre-line text-ink-700">{q.description}</p>}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
                      {q.invoice ? <InvoiceButton invoice={q.invoice} title={`${q.vendor.name}'s invoice`} /> : <span className="text-xs text-ink-400">No invoice attached</span>}
                      <QuoteAction requestStatus={s.status} q={q} onChoose={() => choose(q)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="h-fit">
          <CardHeader title="What you asked for" />
          <div className="space-y-3 p-5">
            {s.wish && (
              <div className="flex items-center gap-3 rounded-xl bg-plum-50 p-3 text-[13px]">
                {s.wish.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.wish.imageUrl} alt="" referrerPolicy="no-referrer" className="size-12 shrink-0 rounded-lg object-cover" />
                )}
                <p className="min-w-0 font-semibold text-plum-900">From their wishlist: {s.wish.title}</p>
              </div>
            )}
            <ul className="divide-y divide-ink-100 rounded-xl border border-ink-200 text-[13px]" aria-label="Items in this surprise">
              {s.items.map((i) => (
                <li key={i.id} className="flex items-start gap-2 px-3 py-2">
                  <span aria-hidden>{i.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-ink-900">{i.name}</span> <span className="text-ink-500">· {i.category}</span>
                    {i.notes && <span className="block text-xs text-ink-500">{i.notes}</span>}
                  </span>
                  <span className="text-xs text-ink-500 tabular">× {i.quantity}</span>
                </li>
              ))}
            </ul>
            {s.notes && <p className="text-[13px] whitespace-pre-line text-ink-700">“{s.notes}”</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
