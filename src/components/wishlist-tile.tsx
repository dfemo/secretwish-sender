"use client";

import Link from "next/link";
import { date } from "@/shared/lib/format";
import { Badge, ProductArt } from "@/shared/ui/primitives";
import type { WishlistCard } from "@/lib/types";

/** "Gifted once" / "Gifted 3 times". */
export const giftedTimes = (n: number) => (n === 1 ? "Gifted once" : `Gifted ${n} times`);

export function WishlistTile({ w }: { w: WishlistCard }) {
  return (
    <Link href={`/w/${w.token}`} className="group block overflow-hidden rounded-2xl bg-white shadow-[var(--shadow-card)] transition hover:shadow-[var(--shadow-pop)]">
      <div className="grid h-32 grid-cols-[2fr_1fr] gap-0.5" aria-hidden>
        <ProductArt emoji={w.preview[0]?.emoji ?? "🎁"} tint={w.preview[0]?.tint} size="lg" className="!aspect-auto h-full rounded-none text-5xl" />
        <div className="grid grid-rows-2 gap-0.5">
          <ProductArt emoji={w.preview[1]?.emoji ?? "✨"} tint={w.preview[1]?.tint ?? "gold"} size="lg" className="!aspect-auto h-full rounded-none text-2xl" />
          <ProductArt emoji={w.preview[2]?.emoji ?? "💝"} tint={w.preview[2]?.tint ?? "rose"} size="lg" className="!aspect-auto h-full rounded-none text-2xl" />
        </div>
      </div>
      <div className="p-4">
        <p className="font-semibold text-ink-900 group-hover:text-plum-700">{w.title}</p>
        <p className="text-xs text-ink-500">
          {w.owner.firstName} · {w.owner.city} · {w.items === 0 ? "open to cash gifts" : w.state === "Fulfilled" ? "every wish gifted" : `${w.remaining} of ${w.items} wishes left`}
        </p>
        {/* Gifts count orders and cash, including cash sent to the list as a whole (which has no wish to tick off). */}
        {(w.state === "Fulfilled" || (w.gifts ?? 0) > 0) && (
          <p className="mt-1 flex flex-wrap gap-1">
            {w.state === "Fulfilled" && <Badge tone="success">Fulfilled</Badge>}
            {(w.gifts ?? 0) > 0 && <Badge tone="plum">{giftedTimes(w.gifts!)}</Badge>}
            {(w.gifters ?? 0) > 1 && <Badge tone="gold">Multiple gifters</Badge>}
          </p>
        )}
        {w.eventDate && <p className="mt-1 text-[11px] font-semibold text-gold-700">{w.occasion} · {date(w.eventDate)}</p>}
      </div>
    </Link>
  );
}
