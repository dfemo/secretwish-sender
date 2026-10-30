"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Button, Field, Input, Notice, Select, Switch, Textarea } from "@/shared/ui/primitives";
import { Modal, useToast } from "@/shared/ui/overlay";
import { PaymentSheet } from "@/components/payment-sheet";

export type SharedWish = {
  id: string; kind: "Catalog" | "Custom" | "Cash"; name: string; notes: string; quantity: number; fulfilled: boolean; category: string; categoryId: string | null;
  url: string | null; imageUrl: string | null; estimatedPriceUsd: number | null; cashAmountUsd: number | null;
  product: { id: string; name: string; priceUsd: number; emoji: string; tint: string; available: boolean; vendor: string } | null;
};

/** Amounts are typed in the viewer's currency (₦ or $) and sent to the API in USD. */
function useMoneyInput() {
  const { currency, meta } = useSession();
  const fx = currency === "NGN" ? (meta?.fxRateNgn ?? 1550) : 1;
  return {
    symbol: currency === "NGN" ? "₦" : "$",
    show: (usd: number | null | undefined) => (usd == null ? "" : String(Math.round(usd * fx))),
    toUsd: (v: string) => Math.round((Number(v || 0) / fx) * 100) / 100,
  };
}

/** Asks approved vendors to quote for a custom wish; quotes arrive under Surprises and paying one delivers privately to the owner. */
export function SourceWishModal({ token, wish, ownerName, onClose }: { token: string; wish: SharedWish; ownerName: string; onClose: () => void }) {
  const { meta } = useSession();
  const money = useMoneyInput();
  const router = useRouter();
  const toast = useToast();
  const est = wish.estimatedPriceUsd;
  const [form, setForm] = useState({
    categoryId: wish.categoryId ?? "",
    min: money.show(est ? Math.max(5, est * 0.8) : 20),
    max: money.show(est ? est * 1.25 : 100),
    neededBy: "",
    notes: "",
  });
  const send = useMutation(() =>
    api<{ id: string; reference: string; existing: boolean }>(`/sender/wishlists/shared/${token}/items/${wish.id}/source`, {
      method: "POST",
      body: { categoryId: form.categoryId || null, budgetMin: money.toUsd(form.min), budgetMax: money.toUsd(form.max), neededBy: form.neededBy || null, notes: form.notes },
    }),
  );
  return (
    <Modal
      open
      onClose={onClose}
      title="Ask vendors to source this"
      description={wish.name}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            loading={send.pending}
            onClick={async () => {
              const r = await send.run();
              if (r) {
                toast({ tone: "success", title: r.existing ? `You already asked (${r.reference})` : `Sent to vendors (${r.reference})`, body: "Quotes will appear under Surprises." });
                router.push("/surprises");
              }
            }}
          >
            Ask vendors
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Notice className="sm:col-span-2" tone="info">
          Approved SecretWish vendors quote to find this for {ownerName}. You choose a quote and pay; we deliver to {ownerName} without showing you their address, and keep it a surprise.
        </Notice>
        {wish.url && <p className="text-sm sm:col-span-2">Link they shared: <a className="font-semibold text-plum-700 underline" href={wish.url} target="_blank" rel="noopener noreferrer nofollow">{new URL(wish.url).hostname}</a></p>}
        <Field label={`Budget from (${money.symbol})`}>{(id) => <Input id={id} inputMode="decimal" value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value.replace(/[^\d.]/g, "") })} />}</Field>
        <Field label={`Budget up to (${money.symbol})`}>{(id) => <Input id={id} inputMode="decimal" value={form.max} onChange={(e) => setForm({ ...form, max: e.target.value.replace(/[^\d.]/g, "") })} />}</Field>
        <Field label="Category" hint="So the right vendors see it.">
          {(id, d) => (
            <Select id={id} aria-describedby={d} value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">Choose…</option>
              {meta?.categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </Select>
          )}
        </Field>
        <Field label="Needed by (optional)">{(id) => <Input id={id} type="date" value={form.neededBy} onChange={(e) => setForm({ ...form, neededBy: e.target.value })} />}</Field>
        <Field label="Anything vendors should know? (optional)" className="sm:col-span-2">{(id) => <Textarea id={id} maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />}</Field>
        {send.error && <Notice tone="danger" className="sm:col-span-2">{send.error.message}</Notice>}
      </div>
    </Modal>
  );
}

type CashGift = { id: string; reference: string; amountUsd: number; feeUsd: number; totalUsd: number };

/** Sends money for a "cash instead" wish (or any amount). The sender pays amount + fee; the owner is paid the amount. */
export function SendCashModal({ token, wish, ownerName, onClose }: { token: string; wish: SharedWish | null; ownerName: string; onClose: () => void }) {
  const { fmt } = useSession();
  const money = useMoneyInput();
  const toast = useToast();
  const [form, setForm] = useState({ amount: money.show(wish?.cashAmountUsd ?? 20), message: "", reveal: false });
  const [gift, setGift] = useState<CashGift | null>(null);
  const create = useMutation(() =>
    api<CashGift>("/sender/cash-gifts", {
      method: "POST",
      body: { wishlistToken: token, wishlistItemId: wish?.id ?? null, amountUsd: money.toUsd(form.amount), message: form.message, revealSender: form.reveal },
    }),
  );
  if (gift)
    return (
      <PaymentSheet
        order={{ id: gift.id, reference: gift.reference, total: gift.totalUsd }}
        method="Card"
        payPath={`/sender/cash-gifts/${gift.id}/pay`}
        onClose={onClose}
        onPaid={() => { toast({ tone: "success", title: `Cash sent to ${ownerName}`, body: `${fmt(gift.amountUsd)} is on its way.` }); onClose(); }}
      />
    );
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={`Send cash to ${ownerName}`}
      description={wish?.notes ? `“${wish.notes}”` : "Money instead of a gift, sent through SecretWish."}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button loading={create.pending} onClick={async () => { const g = await create.run(); if (g) setGift(g); }}>Continue to payment</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label={`Amount (${money.symbol})`} hint={wish?.cashAmountUsd ? `${ownerName} asked for ${fmt(wish.cashAmountUsd)}.` : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} />}
        </Field>
        <Field label="Message (optional)">{(id) => <Textarea id={id} maxLength={300} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />}</Field>
        <Switch checked={form.reveal} onChange={(v) => setForm({ ...form, reveal: v })} label="Tell them it's from me" description="Otherwise it arrives from “a secret admirer”." />
        <p className="text-xs text-ink-500">A small SecretWish fee is added at payment; {ownerName} receives the full amount.</p>
        {create.error && <Notice tone="danger">{create.error.message}</Notice>}
      </div>
    </Modal>
  );
}
