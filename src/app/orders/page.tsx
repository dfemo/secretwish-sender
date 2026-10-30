"use client";

import Link from "next/link";
import { useState } from "react";
import { PackageOpen } from "lucide-react";
import { usePagedApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { ButtonLink, Card, EmptyState, ErrorState, PageHeader, ProductArt, SearchInput, Spinner, StatusBadge, Tabs } from "@/shared/ui/primitives";
import { PagedFooter } from "@/shared/ui/data";

type Row = { id: string; reference: string; createdAt: string; status: string; paymentStatus: string; total: number; recipientName: string; deliveryCity: string; deliveryDate: string; product: string; emoji: string; vendor: string; deliveryStatus: string };

export default function OrdersPage() {
  const [tab, setTab] = useState<"active" | "done" | "all" | "cash">("active");
  const { data, items, error, loading, reload, setPage, search, setSearch } = usePagedApi<Row>(tab === "cash" ? null : "/sender/orders", { tab });
  const { fmt } = useSession();

  return (
    <>
      <PageHeader title="My gifts" description="Track every surprise you've sent. Updates never reveal the gift to the recipient." />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          className="w-fit"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "active", label: "In progress", count: data?.counts?.active },
            { value: "done", label: "Completed", count: data?.counts?.done },
            { value: "all", label: "All" },
            { value: "cash", label: "Cash" },
          ]}
        />
        {tab !== "cash" && <SearchInput value={search} onChange={setSearch} placeholder="Search by gift, recipient or order number" label="Search my gifts" className="sm:w-80" />}
      </div>
      {tab === "cash" && <SentCash />}
      {tab !== "cash" && loading && <Spinner />}
      {tab !== "cash" && error && <ErrorState error={error} onRetry={reload} />}
      {tab !== "cash" && items && items.length === 0 && (
        <EmptyState
          icon={PackageOpen}
          title={search ? "No gifts match your search" : tab === "active" ? "No gifts in progress" : "Nothing here yet"}
          action={search ? undefined : <ButtonLink href="/browse">Find a gift</ButtonLink>}
        />
      )}
      <ul className="space-y-3">
        {tab !== "cash" && items?.map((o) => (
          <li key={o.id}>
            <Link href={`/orders/${o.id}`} className="block">
              <Card className="flex flex-wrap items-center gap-4 p-4 transition hover:shadow-[var(--shadow-pop)]">
                <ProductArt emoji={o.emoji} size="md" />
                <div className="min-w-[180px] flex-1">
                  <p className="font-semibold">{o.product}</p>
                  <p className="text-xs text-ink-500">
                    {o.reference} · for {o.recipientName} in {o.deliveryCity} · {o.vendor}
                  </p>
                  <p className="text-xs text-ink-500">Ordered {date(o.createdAt)}{o.deliveryDate && ` · arriving by ${date(o.deliveryDate)}`}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold tabular">{fmt(o.total)}</p>
                  <StatusBadge status={o.paymentStatus === "Failed" && o.status === "PaymentPending" ? "Failed" : o.status} />
                </div>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
      {tab !== "cash" && <PagedFooter data={data} onPage={setPage} className="mt-4 rounded-2xl border bg-white" />}
    </>
  );
}

type CashRow = { id: string; reference: string; amountUsd: number; feeUsd: number; totalUsd: number; status: string; createdAt: string; recipient: string; message: string };
const cashStatus: Record<string, string> = { PaymentPending: "Not paid", PayoutPending: "Paid · waiting for their bank details", PaidOut: "Delivered to their bank", Paid: "Paid" };

/** Cash the sender has sent through SecretWish. */
function SentCash() {
  const { data, items, error, loading, reload, setPage } = usePagedApi<CashRow>("/sender/cash-gifts", {}, 20);
  const { fmt } = useSession();
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!items?.length) return <EmptyState icon={PackageOpen} title="No cash gifts yet" description="When a wishlist asks for cash, you can send it from the list." />;
  return (
    <>
      <ul className="space-y-3">
        {items.map((g) => (
          <li key={g.id}>
            <Card className="flex flex-wrap items-center gap-4 p-4">
              <span className="grid size-12 place-items-center rounded-xl bg-sage-tint text-2xl" aria-hidden>💸</span>
              <div className="min-w-[180px] flex-1">
                <p className="font-semibold">{fmt(g.amountUsd)} for {g.recipient}</p>
                <p className="text-xs text-ink-500">{g.reference} · {date(g.createdAt)} · {cashStatus[g.status] ?? g.status}</p>
              </div>
              <p className="text-right text-xs text-ink-500">Paid {fmt(g.totalUsd)}<br />incl. {fmt(g.feeUsd)} fee</p>
            </Card>
          </li>
        ))}
      </ul>
      <PagedFooter data={data} onPage={setPage} className="mt-4 rounded-2xl border bg-white" />
    </>
  );
}
