"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Info, Plus, Sparkles, Star, X } from "lucide-react";
import { api, useMutation, usePagedApi } from "@/shared/lib/api";
import { PagedFooter } from "@/shared/ui/data";
import { useSession } from "@/shared/lib/session";
import { date, timeAgo } from "@/shared/lib/format";
import { Badge, Button, Card, cx, EmptyState, ErrorState, Field, Input, Notice, PageHeader, SearchInput, Select, Spinner, StatusBadge, Textarea } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";

type SurpriseItem = { id: string; name: string; category: string; emoji: string; quantity: number; notes: string };
type Surprise = {
  id: string; reference: string; title: string; budgetMin: number; budgetMax: number; recipientName: string; deliveryCity: string; neededBy?: string; notes: string; status: string; createdAt: string; category: string;
  items: SurpriseItem[];
  quotes: { id: string; description: string; priceUsd: number; overBudget: boolean; status: string; createdAt: string; vendor: { name: string; rating: number; city: string } }[];
};

type ItemDraft = { key: number; name: string; categoryId: string; quantity: string; notes: string };

/** Common surprise items, one tap to add, each filed under the category vendors sell in. */
const quickItems: { name: string; slug: string }[] = [
  { name: "Money bouquet", slug: "flowers" },
  { name: "Flowers", slug: "flowers" },
  { name: "Cake", slug: "cakes" },
  { name: "Chocolates", slug: "cakes" },
  { name: "Perfume", slug: "beauty" },
  { name: "Bag", slug: "fashion" },
  { name: "Jewellery", slug: "jewellery" },
  { name: "Gadget", slug: "tech" },
  { name: "Hamper", slug: "hampers" },
  { name: "Experience", slug: "experiences" },
];

let nextKey = 1;
const newItem = (name = "", categoryId = ""): ItemDraft => ({ key: nextKey++, name, categoryId, quantity: "1", notes: "" });
const empty = { title: "", budgetMin: "", budgetMax: "", recipientName: "", deliveryCity: "Lagos", neededBy: "", notes: "" };

export default function SurprisesPage() {
  const { data: paged, items: data, error, loading, reload, setPage, search, setSearch } = usePagedApi<Surprise>("/sender/surprises", {}, 10);
  const { fmt, meta } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [items, setItems] = useState<ItemDraft[]>(() => [newItem()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const categories = meta?.categories ?? [];
  const categoryFor = (slug: string) => categories.find((c) => c.slug === slug)?.id ?? categories[0]?.id ?? "";
  const filled = items.filter((i) => i.name.trim());
  const create = useMutation(() =>
    api<{ reference: string }>("/sender/surprises", {
      method: "POST",
      body: {
        ...form,
        budgetMin: Number(form.budgetMin),
        budgetMax: Number(form.budgetMax),
        neededBy: form.neededBy || null,
        items: filled.map((i) => ({ name: i.name.trim(), categoryId: i.categoryId || categories[0]?.id, quantity: Number(i.quantity) || 1, notes: i.notes.trim() || null })),
      },
    }),
  );

  const updateItem = (key: number, patch: Partial<ItemDraft>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  const removeItem = (key: number) => setItems((list) => (list.length === 1 ? [newItem()] : list.filter((i) => i.key !== key)));
  const quickAdd = (name: string, slug: string) =>
    setItems((list) => {
      const draft = newItem(name, categoryFor(slug));
      // Fill the blank starter row rather than leaving it empty above the new item.
      const blank = list.findIndex((i) => !i.name.trim());
      return blank === -1 ? [...list, draft] : list.map((i, n) => (n === blank ? { ...draft, key: i.key } : i));
    });

  const close = () => {
    setOpen(false);
    setErrors({});
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Give it a short title.";
    if (filled.length === 0) e.items = "Add at least one item, e.g. a money bouquet or flowers.";
    else if (filled.some((i) => !(Number(i.quantity) >= 1 && Number(i.quantity) <= 99))) e.items = "Quantities are between 1 and 99.";
    if (!(Number(form.budgetMin) >= 5)) e.budgetMin = "At least $5.";
    if (!(Number(form.budgetMax) >= Number(form.budgetMin))) e.budgetMax = "Must be at least the minimum.";
    if (!form.recipientName.trim()) e.recipientName = "Who is it for?";
    setErrors(e);
    if (Object.keys(e).length) return;
    const r = await create.run();
    if (r) {
      toast({ tone: "success", title: `${r.reference} sent to vendors`, body: "You'll be notified as quotes arrive." });
      close();
      setForm(empty);
      setItems([newItem()]);
      reload();
    }
  };

  return (
    <>
      <PageHeader
        title="Surprise requests"
        description="List everything you want in the surprise and set one budget range. A single vendor supplies the whole list — quotes outside your range are clearly flagged."
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
                  <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Items in this surprise">
                    {s.items.map((i) => (
                      <li key={i.id} className="rounded-full bg-plum-50 px-2.5 py-1 text-xs font-semibold text-plum-800" title={[i.category, i.notes].filter(Boolean).join(" · ")}>
                        <span aria-hidden>{i.emoji}</span> {i.quantity > 1 && `${i.quantity}× `}
                        {i.name}
                      </li>
                    ))}
                  </ul>
                  {s.notes && <p className="mt-2 text-[13px] text-ink-700">“{s.notes}”</p>}
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
                        <p className="text-right">
                          <span className="block font-display text-xl font-semibold tabular">{fmt(q.priceUsd)}</span>
                          {s.items.length > 1 && <span className="text-[11px] text-ink-500">all {s.items.length} items</span>}
                        </p>
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
        onClose={close}
        title="New surprise request"
        description="Vendors only see the recipient's first name and city."
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button loading={create.pending} onClick={submit}>Send to vendors</Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2" error={errors.title}>
            {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.title} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Birthday surprise for my wife" />}
          </Field>

          <fieldset className="space-y-3 rounded-2xl border border-ink-200 p-4 sm:col-span-2" aria-describedby={errors.items ? "items-err" : "items-hint"}>
            <legend className="px-1 text-[13px] font-semibold text-ink-700">
              What&apos;s in the surprise <span className="text-danger-600">*</span>
            </legend>
            <p id="items-hint" className="text-xs text-ink-500">Add as many items as you like. One vendor will supply all of them within your budget.</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick add">
              {quickItems.map((q) => (
                <button
                  key={q.name}
                  type="button"
                  onClick={() => quickAdd(q.name, q.slug)}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white px-2.5 py-1 text-xs font-semibold text-plum-700 transition hover:border-plum-300 hover:bg-plum-50"
                >
                  <Plus className="size-3" aria-hidden /> {q.name}
                </button>
              ))}
            </div>
            <ol className="space-y-2">
              {items.map((item, n) => (
                <li key={item.key} className="grid grid-cols-[minmax(0,1fr)_5rem_auto] gap-2 rounded-xl bg-ink-50 p-2.5 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_5rem_auto]">
                  <Input aria-label={`Item ${n + 1}`} value={item.name} onChange={(e) => updateItem(item.key, { name: e.target.value })} placeholder="e.g. Money bouquet" maxLength={120} className="col-span-3 sm:col-span-1" />
                  <Select aria-label={`Category for item ${n + 1}`} value={item.categoryId || categories[0]?.id || ""} onChange={(e) => updateItem(item.key, { categoryId: e.target.value })}>
                    {categories.map((c) => (<option key={c.id} value={c.id}>{c.emoji} {c.name}</option>))}
                  </Select>
                  <Input aria-label={`Quantity for item ${n + 1}`} type="number" min={1} max={99} value={item.quantity} onChange={(e) => updateItem(item.key, { quantity: e.target.value })} />
                  <button type="button" onClick={() => removeItem(item.key)} className="grid size-10 place-items-center rounded-xl text-ink-500 hover:bg-white hover:text-danger-700" aria-label={`Remove item ${n + 1}`}>
                    <X className="size-4" />
                  </button>
                  <Input aria-label={`Details for item ${n + 1}`} value={item.notes} onChange={(e) => updateItem(item.key, { notes: e.target.value })} placeholder="Details (optional): colour, size, brand…" maxLength={300} className="col-span-3 sm:col-span-4" />
                </li>
              ))}
            </ol>
            <Button variant="secondary" size="sm" icon={Plus} onClick={() => setItems((list) => [...list, newItem()])}>Add another item</Button>
            {errors.items && <p id="items-err" className="text-xs font-medium text-danger-700" role="alert">{errors.items}</p>}
          </fieldset>

          <Field label="Budget from (USD)" required error={errors.budgetMin} hint="For the whole list.">
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
          <Field label="Needed by">{(id) => <Input id={id} type="date" min={new Date().toISOString().slice(0, 10)} value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />}</Field>
          <p className="flex gap-2 self-end rounded-xl bg-plum-50 px-3 py-2.5 text-xs text-plum-800">
            <Info className="mt-px size-4 shrink-0" aria-hidden />
            <span>You&apos;ll add their full name, phone and delivery address at checkout, after you choose a vendor. Only that vendor and the courier see them.</span>
          </p>
          <Field label="Tell vendors about them" className="sm:col-span-2" hint="Tastes, allergies, things to avoid.">
            {(id, d) => <Textarea id={id} aria-describedby={d} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}
          </Field>
          {create.error && <Notice tone="danger" className="sm:col-span-2">{create.error.message}</Notice>}
        </div>
      </Modal>
    </>
  );
}
