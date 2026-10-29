"use client";

import Link from "next/link";
import { useState } from "react";
import { PackageOpen } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { ButtonLink, Card, EmptyState, ErrorState, PageHeader, ProductArt, Spinner, StatusBadge, Tabs } from "@/shared/ui/primitives";

type Row = { id: string; reference: string; createdAt: string; status: string; paymentStatus: string; total: number; recipientName: string; deliveryCity: string; deliveryDate: string; product: string; emoji: string; vendor: string; deliveryStatus: string };

const closed = ["Delivered", "Cancelled", "RefundCompleted"];

export default function OrdersPage() {
  const { data, error, loading, reload } = useApi<Row[]>("/sender/orders");
  const [tab, setTab] = useState<"active" | "done" | "all">("active");
  const { fmt } = useSession();
  const rows = data?.filter((o) => (tab === "all" ? true : tab === "active" ? !closed.includes(o.status) : closed.includes(o.status))) ?? [];

  return (
    <>
      <PageHeader title="My gifts" description="Track every surprise you've sent. Updates never reveal the gift to the recipient." />
      <Tabs
        className="mb-5 w-fit"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "active", label: "In progress", count: data?.filter((o) => !closed.includes(o.status)).length },
          { value: "done", label: "Completed", count: data?.filter((o) => closed.includes(o.status)).length },
          { value: "all", label: "All" },
        ]}
      />
      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data && rows.length === 0 && <EmptyState icon={PackageOpen} title={tab === "active" ? "No gifts in progress" : "Nothing here yet"} action={<ButtonLink href="/browse">Find a gift</ButtonLink>} />}
      <ul className="space-y-3">
        {rows.map((o) => (
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
    </>
  );
}
