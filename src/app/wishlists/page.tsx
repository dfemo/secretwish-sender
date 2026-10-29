"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Gift, Link2 } from "lucide-react";
import { useApi } from "@/shared/lib/api";
import { Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, SearchInput, Skeleton } from "@/shared/ui/primitives";
import { WishlistTile } from "@/components/wishlist-tile";
import type { WishlistCard } from "@/lib/types";

export default function WishlistsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const { data, error, loading, reload } = useApi<WishlistCard[]>(`/sender/wishlists/discover?search=${encodeURIComponent(search)}`);

  const openLink = () => {
    const token = link.trim().split("/w/").pop()?.split(/[?#]/)[0]?.trim();
    if (!token || !/^[A-Za-z0-9_-]{8,}$/.test(token)) {
      setLinkError("Paste the full wishlist link you were sent, e.g. …/w/AbC123xyz");
      return;
    }
    setLinkError(null);
    router.push(`/w/${token}`);
  };

  return (
    <>
      <PageHeader title="Wishlists" description="Gift exactly what they hoped for. Their address stays private — we deliver for you." />
      <Card className="mb-8 p-5">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            openLink();
          }}
        >
          <Field label="Got a private wishlist link?" error={linkError} className="min-w-[260px] flex-1">
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!linkError} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…/w/…" />}
          </Field>
          <Button type="submit" icon={Link2}>
            Open wishlist
          </Button>
        </form>
      </Card>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold text-plum-900">Public wishlists</h2>
        <SearchInput value={search} onChange={setSearch} label="Search wishlists" placeholder="Name or occasion" className="w-full sm:w-72" />
      </div>
      {error && <ErrorState error={error} onRetry={reload} />}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      )}
      {data?.length === 0 && <EmptyState icon={Gift} title="No public wishlists found" description="Most wishlists are shared privately by link. Ask your friend for theirs." />}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data?.map((w) => (
          <li key={w.id}>
            <WishlistTile w={w} />
          </li>
        ))}
      </ul>
    </>
  );
}
