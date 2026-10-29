"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, BadgeCheck, Gift, PackageCheck, ShieldCheck, Star, Truck } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Badge, ButtonLink, Card, CardHeader, ErrorState, PageSkeleton, ProductArt } from "@/shared/ui/primitives";
import { rememberViewed, type Product } from "@/lib/types";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useApi<{ product: Product; compare: Product[] }>(`/catalog/products/${id}`);
  const { fmt } = useSession();
  useEffect(() => {
    if (data) rememberViewed(data.product.id);
  }, [data]);
  if (loading) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error?.status === 404 ? { message: "This gift is no longer available." } : error} onRetry={reload} />;
  const p = data.product;
  const lowStock = p.stock <= 5;

  return (
    <>
      <Link href="/browse" className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-plum-700">
        <ArrowLeft className="size-4" aria-hidden /> Discover
      </Link>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductArt emoji={p.emoji} tint={p.tint} size="lg" className="text-[140px]" label={p.name} />
        <div>
          <p className="text-sm font-semibold text-gold-700">{p.category}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight font-semibold text-plum-900">{p.name}</h1>
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-500">
            <BadgeCheck className="size-4 text-success-600" aria-hidden /> {p.vendor.name} · {p.vendor.city}
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3.5 fill-gold-500 text-gold-500" aria-hidden /> {p.rating.toFixed(1)}
            </span>
          </p>
          <p className="mt-6 font-display text-3xl font-semibold tabular">{fmt(p.priceUsd)}</p>
          <p className="text-xs text-ink-500">Delivery and VAT calculated at checkout</p>
          <p className="mt-5 text-[15px] leading-relaxed text-ink-700">{p.description}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {p.deliveryOptions.map((d) => (
              <Badge key={d} tone="plum" icon={Truck}>
                {d}
              </Badge>
            ))}
            {lowStock && <Badge tone="warning">Only {p.stock} left</Badge>}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={`/checkout?product=${p.id}`} size="lg" icon={Gift}>
              Send as a surprise
            </ButtonLink>
            <ButtonLink href="/surprises" size="lg" variant="secondary">
              Brief a custom surprise
            </ButtonLink>
          </div>
          <ul className="mt-8 space-y-2 text-sm text-ink-700">
            <li className="flex gap-2">
              <ShieldCheck className="size-4 shrink-0 text-plum-600" aria-hidden /> The recipient never sees the price unless you choose to show it.
            </li>
            <li className="flex gap-2">
              <PackageCheck className="size-4 shrink-0 text-plum-600" aria-hidden /> Discreet packaging and a handwritten card with your message.
            </li>
          </ul>
        </div>
      </div>

      {data.compare.length > 0 && (
        <Card className="mt-12">
          <CardHeader title="Compare with other approved vendors" description="Similar gifts at a similar price" />
          <div className="overflow-x-auto p-2">
            <table className="w-full min-w-[560px] text-left text-sm">
              <caption className="sr-only">Comparison of similar gifts</caption>
              <thead>
                <tr className="text-xs text-ink-500">
                  <th className="px-3 py-2 font-semibold">Gift</th>
                  <th className="px-3 py-2 font-semibold">Vendor</th>
                  <th className="px-3 py-2 text-right font-semibold">Price</th>
                  <th className="px-3 py-2 font-semibold">Rating</th>
                  <th className="px-3 py-2 font-semibold">Delivery</th>
                </tr>
              </thead>
              <tbody>
                {[p, ...data.compare].map((c, i) => (
                  <tr key={c.id} className={i === 0 ? "bg-plum-50/60" : "border-t border-ink-100"}>
                    <td className="px-3 py-3">
                      <Link href={`/products/${c.id}`} className="flex items-center gap-3 font-semibold hover:text-plum-700">
                        <ProductArt emoji={c.emoji} tint={c.tint} size="sm" /> {c.name} {i === 0 && <Badge tone="plum">Viewing</Badge>}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-700">{c.vendor.name}</td>
                    <td className="px-3 py-3 text-right font-semibold tabular">{fmt(c.priceUsd)}</td>
                    <td className="px-3 py-3">★ {c.rating.toFixed(1)}</td>
                    <td className="px-3 py-3 text-xs text-ink-500">{c.deliveryOptions.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
