"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { useSession } from "@/shared/lib/session";
import { ProductArt } from "@/shared/ui/primitives";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  const { fmt } = useSession();
  return (
    <Link href={`/products/${product.id}`} className="group block">
      <ProductArt emoji={product.emoji} tint={product.tint} size="lg" className="transition-transform group-hover:scale-[1.02]" label={product.name} />
      <div className="mt-2.5 px-0.5">
        <p className="line-clamp-1 text-sm font-semibold text-ink-900 group-hover:text-plum-700">{product.name}</p>
        <p className="line-clamp-1 text-xs text-ink-500">{product.vendor.name}</p>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm font-bold text-plum-900 tabular">{fmt(product.priceUsd)}</span>
          <span className="inline-flex items-center gap-0.5 text-[11px] text-ink-500">
            <Star className="size-3 fill-gold-500 text-gold-500" aria-hidden /> {product.rating.toFixed(1)}
          </span>
        </div>
      </div>
    </Link>
  );
}
