"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SearchX, SlidersHorizontal } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Button, cx, EmptyState, ErrorState, Field, Input, PageHeader, SearchInput, Select, Skeleton, Spinner } from "@/shared/ui/primitives";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/lib/types";

function BrowseInner() {
  const params = useSearchParams();
  const { meta } = useSession();
  const [search, setSearch] = useState(params.get("search") ?? "");
  const [debounced, setDebounced] = useState(search);
  const [category, setCategory] = useState(params.get("category") ?? "");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [sort, setSort] = useState("popular");
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);
  const priceError = min && max && Number(min) > Number(max) ? "Min must be below max." : null;
  const qs = new URLSearchParams({ search: debounced, sort, ...(category ? { categoryId: category } : {}), ...(!priceError && min ? { min } : {}), ...(!priceError && max ? { max } : {}) });
  const { data, error, loading, reload } = useApi<Product[]>(`/catalog/products?${qs}`);
  const { fmt } = useSession();

  return (
    <>
      <PageHeader title="Discover gifts" description="Every gift is from an approved SecretWish vendor and ships in discreet packaging." />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <SearchInput value={search} onChange={setSearch} label="Search gifts" placeholder="Search gifts or vendors" className="min-w-[220px] flex-1" />
        <label htmlFor="sort" className="sr-only">
          Sort by
        </label>
        <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="w-44">
          <option value="popular">Most popular</option>
          <option value="rating">Top rated</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </Select>
        <Button variant="secondary" icon={SlidersHorizontal} aria-expanded={showFilters} onClick={() => setShowFilters((v) => !v)}>
          Price
        </Button>
      </div>
      {showFilters && (
        <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-[var(--shadow-card)]">
          <Field label="Min price (USD)" error={priceError}>
            {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} value={min} onChange={(e) => setMin(e.target.value)} className="w-36" />}
          </Field>
          <Field label="Max price (USD)">{(id) => <Input id={id} type="number" min={0} value={max} onChange={(e) => setMax(e.target.value)} className="w-36" />}</Field>
          <div className="flex gap-1">
            {[[0, 50], [50, 100], [100, 250]].map(([a, b]) => (
              <Button key={a} size="sm" variant="ghost" onClick={() => { setMin(String(a)); setMax(String(b)); }}>
                {fmt(a, { compact: true })}–{fmt(b, { compact: true })}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => { setMin(""); setMax(""); }}>Any</Button>
          </div>
        </div>
      )}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-thin" role="group" aria-label="Category">
        <button type="button" aria-pressed={!category} onClick={() => setCategory("")} className={cx("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", !category ? "bg-plum-800 text-ivory-50" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-plum-50")}>
          All
        </button>
        {meta?.categories.map((c) => (
          <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={cx("shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold", category === c.id ? "bg-plum-800 text-ivory-50" : "bg-white text-ink-700 ring-1 ring-ink-200 hover:bg-plum-50")}>
            <span aria-hidden>{c.emoji}</span> {c.name}
          </button>
        ))}
      </div>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      )}
      {data?.length === 0 && <EmptyState icon={SearchX} title="No gifts match" description="Try another search, category or price range — or brief a vendor on a custom surprise." />}
      {data && data.length > 0 && (
        <>
          <p className="mb-3 text-xs text-ink-500" aria-live="polite">
            {data.length} gift{data.length === 1 ? "" : "s"}
          </p>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4">
            {data.map((p) => (
              <li key={p.id}>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={<Spinner />}>
      <BrowseInner />
    </Suspense>
  );
}
