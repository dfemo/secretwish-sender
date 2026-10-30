"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Banknote, CalendarHeart, CheckCircle2, ExternalLink, Gift, Lock, MapPin, Sparkles } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, ButtonLink, cx, EmptyState, ErrorState, PageSkeleton, ProductArt } from "@/shared/ui/primitives";
import { SendCashModal, SourceWishModal, type SharedWish } from "@/components/wish-actions";

type Shared = {
  id: string; title: string; description: string; occasion: string; eventDate: string; visibility: string; token: string;
  owner: { firstName: string; city: string };
  items: SharedWish[];
};

export default function SharedWishlistPage() {
  const { token } = useParams<{ token: string }>();
  const { data, error, loading, reload } = useApi<Shared>(`/sender/wishlists/shared/${token}`);
  const { fmt } = useSession();
  const [sourcing, setSourcing] = useState<SharedWish | null>(null);
  const [cash, setCash] = useState<SharedWish | "any" | null>(null);
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
        {data.items.map((it, index) => {
          const p = it.product;
          const giftable = !it.fulfilled && (it.kind !== "Catalog" || !!p?.available);
          const price = p?.priceUsd ?? it.cashAmountUsd ?? it.estimatedPriceUsd;
          return (
            <li key={it.id} className={cx(it.fulfilled && "opacity-70")}>
              <div className="relative">
                {p ? (
                  <ProductArt emoji={p.emoji} tint={p.tint} size="lg" label={p.name} />
                ) : it.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.imageUrl} alt={it.name} referrerPolicy="no-referrer" className="aspect-square w-full rounded-2xl object-cover" />
                ) : (
                  <ProductArt emoji={it.kind === "Cash" ? "💸" : "🎁"} tint={it.kind === "Cash" ? "sage" : "lavender"} size="lg" label={it.name} />
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {it.fulfilled ? (
                    <Badge tone="success" icon={CheckCircle2}>Gifted</Badge>
                  ) : index === 0 ? (
                    <Badge tone="gold">★ Most wanted</Badge>
                  ) : null}
                  {it.kind === "Cash" && !it.fulfilled && <Badge tone="plum">Cash</Badge>}
                  {p && !p.available && !it.fulfilled && <Badge tone="warning">Unavailable</Badge>}
                </div>
              </div>
              <p className="mt-2.5 line-clamp-2 text-sm font-semibold">{it.name}</p>
              <p className="text-xs text-ink-500">
                {p ? p.vendor : it.kind === "Custom" ? "From another shop · vendors source it" : `${data.owner.firstName} would love cash`}
              </p>
              {it.url && (
                <a href={it.url} target="_blank" rel="noopener noreferrer nofollow" className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-plum-700 hover:underline">
                  <ExternalLink className="size-3" aria-hidden /> See it on {new URL(it.url).hostname.replace(/^www\./, "")}
                </a>
              )}
              {it.notes && <p className="mt-1 text-xs text-ink-700 italic">“{it.notes}”</p>}
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-bold tabular">{price != null ? `${it.kind === "Custom" ? "~" : ""}${fmt(price)}` : ""}</span>
                {!giftable ? (
                  <span className="text-xs text-ink-400">{it.fulfilled ? "Already gifted" : "Not available"}</span>
                ) : it.kind === "Catalog" ? (
                  <Link href={`/checkout?product=${p!.id}&wl=${data.token}&item=${it.id}`} className="inline-flex items-center gap-1 rounded-lg bg-plum-800 px-3 py-1.5 text-xs font-semibold text-ivory-50 hover:bg-plum-700">
                    <Gift className="size-3.5" aria-hidden /> Gift this
                  </Link>
                ) : it.kind === "Cash" ? (
                  <button type="button" onClick={() => setCash(it)} className="inline-flex items-center gap-1 rounded-lg bg-plum-800 px-3 py-1.5 text-xs font-semibold text-ivory-50 hover:bg-plum-700">
                    <Banknote className="size-3.5" aria-hidden /> Send cash
                  </button>
                ) : (
                  <button type="button" onClick={() => setSourcing(it)} className="inline-flex items-center gap-1 rounded-lg bg-plum-800 px-3 py-1.5 text-xs font-semibold text-ivory-50 hover:bg-plum-700">
                    <Sparkles className="size-3.5" aria-hidden /> Get quotes
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-10 text-center text-sm text-ink-500">
        Not sure what to pick? <button type="button" className="font-semibold text-plum-700 underline" onClick={() => setCash("any")}>Send {data.owner.firstName} cash instead</button>
      </p>
      {sourcing && <SourceWishModal token={data.token} wish={sourcing} ownerName={data.owner.firstName} onClose={() => setSourcing(null)} />}
      {cash && <SendCashModal token={data.token} wish={cash === "any" ? null : cash} ownerName={data.owner.firstName} onClose={() => { setCash(null); reload(); }} />}
    </>
  );
}
