"use client";

import { useState } from "react";
import { cx, ProductArt } from "@/shared/ui/primitives";
import type { Product } from "@/lib/types";

/** A product's photos (up to three) with thumbnails to switch between them, or its illustration when it has none. */
export function ProductGallery({ product }: { product: Product }) {
  const images = product.images ?? [];
  const [shown, setShown] = useState(0);
  if (images.length === 0) return <ProductArt emoji={product.emoji} tint={product.tint} size="lg" className="text-[140px]" label={product.name} />;
  const current = images[Math.min(shown, images.length - 1)];

  return (
    <div>
      <ProductArt emoji={product.emoji} tint={product.tint} size="lg" src={current} label={`${product.name}, photo ${shown + 1} of ${images.length}`} />
      {images.length > 1 && (
        <div className="mt-3 flex gap-2" role="group" aria-label="Photos">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              aria-label={`Show photo ${i + 1}`}
              aria-pressed={i === shown}
              onClick={() => setShown(i)}
              className={cx("size-16 overflow-hidden rounded-xl ring-offset-2", i === shown ? "ring-2 ring-plum-600" : "opacity-80 hover:opacity-100")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
