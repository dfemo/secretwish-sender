"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarHeart, CheckCircle2, Gift, Lock, MapPin } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, ButtonLink, cx, EmptyState, ErrorState, PageSkeleton, ProductArt } from "@/shared/ui/primitives";

type Shared = {
  id: string; title: string; description: string; occasion: string; eventDate: string; visibility: string; token: string;
  owner: { firstName: string; city: string };
  items: { id: string; priority: number; notes: string; quantity: number; fulfilled: boolean; category: string; product: { id: string; name: string; priceUsd: number; emoji: string; tint: string; available: boolean; vendor: string } | null }[];
};

const priority = { 1: { label: "Top wish", tone: "gold" as const }, 2: { label: "Would love", tone: "plum" as const }, 3: { label: "Nice to have", tone: "neutral" as const } };

export default function SharedWishlistPage() {
  const { token } = useParams<{ token: string }>();
  const { data, error, loading, reload } = useApi<Shared>(`/sender/wishlists/shared/${token}`);
  const { fmt } = useSession();
  if (loading) return <PageSkeleton />;
  if (error?.status === 404)
    return <EmptyState icon={Lock} title="This wishlist isn't available" description="The link may have been changed by its owner, or the list is now private. Ask them for a fresh link." action={<ButtonLink href="/wishlists">Back to wishlists</ButtonLink>} />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <header className="mb-8 flex flex-col items-start gap-5 md:flex-row md:items-center">
        <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-plum-600 to-plum-900 font-display text-3xl font-semibold text-gold-300" aria-hidden>
          {data.owner.firstName[0]}
        </span>
        <div>
          <h1 className="font-display text-4xl font-semibold text-plum-900">{data.title}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
            <span>by {data.owner.firstName}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {data.owner.city}
            </span>
            {data.eventDate && (
              <span className="inline-flex items-center gap-1 font-semibold text-gold-700">
                <CalendarHeart className="size-3.5" aria-hidden /> {data.occasion} · {date(data.eventDate)}
              </span>
            )}
          </p>
          {data.description && <p className="mt-2 max-w-2xl text-[15px] text-ink-700">{data.description}</p>}
        </div>
      </header>
      <p className="mb-6 flex items-center gap-2 rounded-xl bg-plum-50 px-4 py-2.5 text-[13px] text-plum-800">
        <Lock className="size-4 shrink-0" aria-hidden /> {data.owner.firstName}&apos;s address stays private. We deliver to it for you — you&apos;ll only see the city.
      </p>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
        {data.items.map((it) => {
          const p = it.product;
          if (!p) return null;
          const pr = priority[it.priority as 1 | 2 | 3];
          const giftable = !it.fulfilled && p.available;
          return (
            <li key={it.id} className={cx(it.fulfilled && "opacity-70")}>
              <div className="relative">
                <ProductArt emoji={p.emoji} tint={p.tint} size="lg" label={p.name} />
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {it.fulfilled ? (
                    <Badge tone="success" icon={CheckCircle2}>
                      Gifted
                    </Badge>
                  ) : (
                    <Badge tone={pr.tone}>{pr.label}</Badge>
                  )}
                  {!p.available && !it.fulfilled && <Badge tone="warning">Unavailable</Badge>}
                </div>
              </div>
              <p className="mt-2.5 line-clamp-1 text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-ink-500">{p.vendor}</p>
              {it.notes && <p className="mt-1 text-xs text-ink-700 italic">“{it.notes}”</p>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold tabular">{fmt(p.priceUsd)}</span>
                {giftable ? (
                  <Link href={`/checkout?product=${p.id}&wl=${data.token}&item=${it.id}`} className="inline-flex items-center gap-1 rounded-lg bg-plum-800 px-3 py-1.5 text-xs font-semibold text-ivory-50 hover:bg-plum-700">
                    <Gift className="size-3.5" aria-hidden /> Gift this
                  </Link>
                ) : (
                  <span className="text-xs text-ink-400">{it.fulfilled ? "Already gifted" : "Not available"}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
