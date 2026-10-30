"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Gift, Search, Sparkles, Truck } from "lucide-react";
import { useApi, type Paged } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { ButtonLink, Card, ErrorState, PageSkeleton, ProductArt, StatusBadge, cx } from "@/shared/ui/primitives";
import { ProductCard } from "@/components/product-card";
import { WishlistTile } from "@/components/wishlist-tile";
import { recentlyViewed, type Product, type WishlistCard } from "@/lib/types";

type Home = {
  user: { name: string; plan: string; usedFreeSample: boolean };
  categories: { id: string; name: string; emoji: string }[];
  recommended: Product[];
  activeOrders: { id: string; reference: string; status: string; createdAt: string; recipientName: string; deliveryDate: string; product: string; emoji: string; vendor: string }[];
  stats: { sent: number; active: number; openSurprises: number; newQuotes: number };
  wishlists: WishlistCard[];
};

export default function SenderHome() {
  const { data, error, loading, reload } = useApi<Home>("/sender/home");
  const { meta, fmt } = useSession();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [viewed, setViewed] = useState<string[]>([]);
  useEffect(() => setViewed(recentlyViewed()), []);
  // Fetch only the recently viewed gifts, not the whole catalogue.
  const { data: catalog } = useApi<Paged<Product>>(viewed.length ? `/catalog/products?ids=${viewed.join(",")}` : null);

  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error} onRetry={reload} />;
  const recent = viewed.map((id) => catalog?.items.find((p) => p.id === id)).filter(Boolean) as Product[];

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-[28px] bg-plum-900 px-6 py-10 text-ivory-50 md:px-12 md:py-14">
        <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-gold-500/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute right-10 bottom-6 hidden text-[120px] leading-none opacity-90 md:block" aria-hidden>
          🎁
        </div>
        <p className="text-sm font-semibold text-gold-300">Welcome back, {data.user.name.split(" ")[0]}</p>
        <h1 className="mt-2 max-w-xl font-display text-4xl leading-[1.1] font-semibold md:text-5xl">Who are we surprising today?</h1>
        <form
          role="search"
          className="mt-6 flex max-w-xl gap-2 rounded-2xl bg-white p-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/browse?search=${encodeURIComponent(q)}`);
          }}
        >
          <label htmlFor="home-search" className="sr-only">
            Search gifts
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
            <input id="home-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Flowers, hampers, a spa day…" className="h-11 w-full rounded-xl pr-3 pl-9 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none" />
          </div>
          <button type="submit" className="rounded-xl bg-gold-500 px-5 text-sm font-semibold text-plum-950 hover:bg-gold-400">
            Search
          </button>
        </form>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/surprises" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/15">
            <Sparkles className="size-4 text-gold-300" aria-hidden /> Brief a surprise
            {data.stats.newQuotes > 0 && <span className="rounded-full bg-gold-500 px-2 text-xs text-plum-950">{data.stats.newQuotes} quotes</span>}
          </Link>
          <Link href="/wishlists" className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 font-semibold hover:bg-white/15">
            <Gift className="size-4 text-gold-300" aria-hidden /> Open a wishlist link
          </Link>
        </div>
        {data.user.plan === "Free" && !data.user.usedFreeSample && (
          <p className="mt-6 inline-block rounded-xl bg-gold-500/15 px-3 py-2 text-xs text-gold-300">Your first gift up to {fmt(meta?.freeSampleLimitUsd ?? 100)} is free of SecretWish fees.</p>
        )}
      </section>

      {data.activeOrders.length > 0 && (
        <section aria-labelledby="active-h">
          <div className="mb-4 flex items-end justify-between">
            <h2 id="active-h" className="font-display text-2xl font-semibold text-plum-900">
              Gifts in motion
            </h2>
            <Link href="/orders" className="text-sm font-semibold text-plum-700 hover:underline">
              All gifts
            </Link>
          </div>
          <ul className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
            {data.activeOrders.map((o) => (
              <li key={o.id} className="w-[290px] shrink-0">
                <Link href={`/orders/${o.id}`} className="block">
                  <Card className="p-4 transition hover:shadow-[var(--shadow-pop)]">
                    <div className="flex items-center gap-3">
                      <ProductArt emoji={o.emoji} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{o.product}</p>
                        <p className="text-xs text-ink-500">For {o.recipientName}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <StatusBadge status={o.status} />
                      <span className="inline-flex items-center gap-1 text-[11px] text-ink-500">
                        <Truck className="size-3.5" aria-hidden /> by {date(o.deliveryDate)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="mb-4 font-display text-2xl font-semibold text-plum-900">
          Shop by category
        </h2>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-10">
          {data.categories.map((c, i) => (
            <li key={c.id}>
              <Link href={`/browse?category=${c.id}`} className={cx("flex flex-col items-center gap-2 rounded-2xl p-3 text-center transition hover:-translate-y-0.5", ["bg-lavender-tint", "bg-gold-tint", "bg-rose-tint", "bg-sage-tint", "bg-ivory-tint"][i % 5])}>
                <span className="text-3xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-[11px] leading-tight font-semibold text-ink-700">{c.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="rec-h">
        <div className="mb-4 flex items-end justify-between">
          <h2 id="rec-h" className="font-display text-2xl font-semibold text-plum-900">
            Recommended gifts
          </h2>
          <Link href="/browse" className="inline-flex items-center gap-1 text-sm font-semibold text-plum-700 hover:underline">
            Browse all <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {data.recommended.map((p) => (
            <li key={p.id}>
              <ProductCard product={p} />
            </li>
          ))}
        </ul>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="mb-4 font-display text-2xl font-semibold text-plum-900">
            Recently viewed
          </h2>
          <ul className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {recent.slice(0, 6).map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="wl-h" className="rounded-[28px] bg-ivory-200/70 p-6 md:p-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="wl-h" className="font-display text-2xl font-semibold text-plum-900">
              Wishlists you can gift from
            </h2>
            <p className="text-sm text-ink-500">Only lists their owners chose to make public appear here.</p>
          </div>
          <ButtonLink href="/wishlists" variant="secondary" size="sm">
            Discover wishlists
          </ButtonLink>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {data.wishlists.map((w) => (
            <li key={w.id}>
              <WishlistTile w={w} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
