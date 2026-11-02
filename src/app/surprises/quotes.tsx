import { Star } from "lucide-react";
import { Badge, Button, StatusBadge } from "@/shared/ui/primitives";
import { InvoicePages, type Invoice } from "@/shared/ui/invoice";

export type Quote = {
  id: string; description: string; priceUsd: number; overBudget: boolean; status: string; createdAt: string; invoice: Invoice | null;
  vendor: { name: string; rating: number; city: string; description?: string; onTimeRate?: number };
};

/** Choose & checkout while the quote is open, otherwise its status. */
export function QuoteAction({ requestStatus, q, onChoose }: { requestStatus: string; q: Quote; onChoose: () => void }) {
  return q.status === "Submitted" && requestStatus !== "Accepted" ? (
    <Button size="sm" onClick={onChoose}>Choose & checkout</Button>
  ) : (
    <StatusBadge status={q.status} />
  );
}

/** Quotes in columns, cheapest first: price, budget fit, the vendor's description and their invoice, previewed inline. Scrolls sideways on phones. */
export function CompareQuotes({ quotes: all, requestStatus, fmt, onChoose }: { quotes: Quote[]; requestStatus: string; fmt: (usd: number) => string; onChoose: (q: Quote) => void }) {
  const quotes = [...all].sort((a, b) => a.priceUsd - b.priceUsd);
  const cheapest = quotes[0]?.priceUsd;
  return (
    <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" aria-label="Quotes side by side">
      {quotes.map((q) => (
        <li key={q.id} className="flex w-[85%] shrink-0 snap-start flex-col rounded-2xl border border-ink-200 sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]">
          <div className="border-b border-ink-100 p-4">
            <p className="text-sm font-semibold">{q.vendor.name}</p>
            <p className="flex items-center gap-1 text-xs text-ink-500">
              <Star className="size-3 fill-gold-500 text-gold-500" aria-hidden /> {q.vendor.rating.toFixed(1)} · {q.vendor.city}
            </p>
            <p className="mt-2 font-display text-2xl font-semibold tabular">{fmt(q.priceUsd)}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {q.overBudget ? <Badge tone="warning">Outside your range</Badge> : <Badge tone="success">Within budget</Badge>}
              {quotes.length > 1 && q.priceUsd === cheapest && <Badge tone="gold">Lowest price</Badge>}
            </div>
            <div className="mt-3"><QuoteAction requestStatus={requestStatus} q={q} onChoose={() => onChoose(q)} /></div>
          </div>
          <div className="flex-1 space-y-3 p-4">
            {q.description && <p className="text-[13px] whitespace-pre-line text-ink-700">{q.description}</p>}
            {q.invoice ? (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-ink-500">Invoice · {q.invoice.fileName}</p>
                <InvoicePages invoice={q.invoice} className="max-h-[60vh] overflow-y-auto" />
              </div>
            ) : (
              <p className="rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">No invoice attached.</p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
