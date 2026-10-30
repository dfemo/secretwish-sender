"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Sparkles, Star } from "lucide-react";
import { api, useMutation, usePagedApi } from "@/shared/lib/api";
import { PagedFooter } from "@/shared/ui/data";
import { useSession } from "@/shared/lib/session";
import { date, timeAgo } from "@/shared/lib/format";
import { Badge, Button, Card, cx, EmptyState, ErrorState, Field, Input, Notice, PageHeader, SearchInput, Select, Spinner, StatusBadge, Textarea } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";

type Surprise = {
  id: string; reference: string; title: string; budgetMin: number; budgetMax: number; recipientName: string; deliveryCity: string; neededBy?: string; notes: string; status: string; createdAt: string; category: string;
  quotes: { id: string; description: string; priceUsd: number; overBudget: boolean; status: string; createdAt: string; vendor: { name: string; rating: number; city: string } }[];
};

const empty = { title: "", categoryId: "", budgetMin: "", budgetMax: "", recipientName: "", deliveryCity: "Lagos", neededBy: "", notes: "" };

export default function SurprisesPage() {
  const { data: paged, items: data, error, loading, reload, setPage, search, setSearch } = usePagedApi<Surprise>("/sender/surprises", {}, 10);
  const { fmt, meta } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const create = useMutation(() =>
    api<{ reference: string }>("/sender/surprises", {
      method: "POST",
      body: { ...form, categoryId: form.categoryId || meta?.categories.find((c) => c.slug === "hampers")?.id, budgetMin: Number(form.budgetMin), budgetMax: Number(form.budgetMax), neededBy: form.neededBy || null },
    }),
  );

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Give it a short title.";
    if (!(Number(form.budgetMin) >= 5)) e.budgetMin = "At least $5.";
    if (!(Number(form.budgetMax) >= Number(form.budgetMin))) e.budgetMax = "Must be at least the minimum.";
    if (!form.recipientName.trim()) e.recipientName = "Who is it for?";
    setErrors(e);
    if (Object.keys(e).length) return;
    const r = await create.run();
    if (r) {
      toast({ tone: "success", title: `${r.reference} sent to vendors`, body: "You'll be notified as quotes arrive." });
      setOpen(false);
      setForm(empty);
    }
  };

  return (
    <>
      <PageHeader
        title="Surprise requests"
        description="Describe the moment and set a budget range. Approved vendors quote within it — anything outside your range is clearly flagged."
        actions={<Button icon={Plus} onClick={() => setOpen(true)}>New surprise request</Button>}
      />
      <SearchInput value={search} onChange={setSearch} label="Search surprise requests" placeholder="Search by title or reference" className="mb-5 sm:w-80" />
      {loading && <Spinner />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.length === 0 &&
        (search ? (
          <EmptyState icon={Sparkles} title="No surprise requests match your search" />
        ) : (
          <EmptyState icon={Sparkles} title="No surprise requests yet" description="Not sure what to buy? Let vendors pitch ideas within your budget." action={<Button onClick={() => setOpen(true)}>Start one</Button>} />
        ))}
      <ul className="space-y-5">
        {data?.map((s) => (
          <li key={s.id}>
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-ink-500">
                    {s.reference} · {s.category} · {timeAgo(s.createdAt)}
                  </p>
                  <h2 className="font-display text-xl font-semibold text-plum-900">{s.title}</h2>
                  <p className="text-sm text-ink-500">
                    For {s.recipientName} in {s.deliveryCity}
                    {s.neededBy && ` · needed by ${date(s.neededBy)}`}
                  </p>
                  {s.notes && <p className="mt-1 text-[13px] text-ink-700">“{s.notes}”</p>}
                </div>
                <div className="text-right">
                  <Badge tone="gold">Budget {fmt(s.budgetMin)} – {fmt(s.budgetMax)}</Badge>
                  <div className="mt-1"><StatusBadge status={s.status} /></div>
                </div>
              </div>
              {s.quotes.length === 0 ? (
                <p className="mt-4 rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-500">Waiting for vendors to quote…</p>
              ) : (
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {s.quotes.map((q) => (
                    <li key={q.id} className={cx("rounded-2xl border p-4", q.status === "Accepted" ? "border-success-600/40 bg-success-50/50" : q.overBudget ? "border-warning-600/30 bg-warning-50/40" : "border-ink-200")}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{q.vendor.name}</p>
                          <p className="flex items-center gap-1 text-xs text-ink-500">
                            <Star className="size-3 fill-gold-500 text-gold-500" aria-hidden /> {q.vendor.rating.toFixed(1)} · {q.vendor.city}
                          </p>
                        </div>
                        <p className="font-display text-xl font-semibold tabular">{fmt(q.priceUsd)}</p>
                      </div>
                      <p className="mt-2 text-[13px] text-ink-700">{q.description}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        {q.overBudget ? <Badge tone="warning">Outside your range</Badge> : <Badge tone="success">Within budget</Badge>}
                        {q.status === "Submitted" && s.status !== "Accepted" ? (
                          <Button size="sm" onClick={() => router.push(`/checkout?quote=${q.id}`)}>
                            Choose & checkout
                          </Button>
                        ) : (
                          <StatusBadge status={q.status} />
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </li>
        ))}
      </ul>
      <PagedFooter data={paged} onPage={setPage} className="mt-4 rounded-2xl border bg-white" />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="New surprise request"
        description="Vendors only see the recipient's first name and city."
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button loading={create.pending} onClick={submit}>Send to vendors</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2" error={errors.title}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Anniversary surprise for my wife" />}
          </Field>
          <Field label="Category">
            {(id) => (
              <Select id={id} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {meta?.categories.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
              </Select>
            )}
          </Field>
          <Field label="Needed by">{(id) => <Input id={id} type="date" min={new Date().toISOString().slice(0, 10)} value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />}</Field>
          <Field label="Budget from (USD)" required error={errors.budgetMin}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.budgetMin} type="number" min={5} value={form.budgetMin} onChange={(e) => setForm({ ...form, budgetMin: e.target.value })} />}
          </Field>
          <Field label="Budget up to (USD)" required error={errors.budgetMax}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.budgetMax} type="number" min={5} value={form.budgetMax} onChange={(e) => setForm({ ...form, budgetMax: e.target.value })} />}
          </Field>
          <Field label="Recipient's first name" required error={errors.recipientName}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.recipientName} value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />}
          </Field>
          <Field label="City">
            {(id) => (
              <Select id={id} value={form.deliveryCity} onChange={(e) => setForm({ ...form, deliveryCity: e.target.value })}>
                {["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Kano"].map((c) => (<option key={c}>{c}</option>))}
              </Select>
            )}
          </Field>
          <Field label="Tell vendors about them" className="sm:col-span-2" hint="Tastes, allergies, things to avoid.">
            {(id, d) => <Textarea id={id} aria-describedby={d} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
          </Field>
          {create.error && <Notice tone="danger" className="sm:col-span-2">{create.error.message}</Notice>}
        </div>
      </Modal>
    </>
  );
}
