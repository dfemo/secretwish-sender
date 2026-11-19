"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Lock, ShieldCheck } from "lucide-react";
import { api, useApi, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Badge, Button, cx, Notice, Spinner } from "@/shared/ui/primitives";
import { Modal } from "@/shared/ui/overlay";

type Option = { provider: "Simulated" | "Paystack" | "Flutterwave" | "Stripe"; label: string; mode: "Test" | "Live"; currency: string };

const blurb: Record<Option["provider"], string> = {
  Paystack: "Cards, bank transfer and USSD in Nigeria.",
  Flutterwave: "Cards, bank transfer and mobile money across Africa.",
  Stripe: "Cards from anywhere in the world.",
  Simulated: "Pretend payment for trying SecretWish out. No money moves.",
};

/**
 * Pay for an order or a cash gift. The sender picks one of the payment engines SecretWish has switched on and pays on that
 * provider's own secure page (card details never reach SecretWish); they come back to /payments/return, where the payment is checked
 * with the provider. The Simulated engine, while it's on, pays in place with test buttons.
 */
export function PaymentSheet({ order, method, onClose, onPaid, payPath }: { order: { id: string; reference: string; total: number } | null; method: string; onClose: () => void; onPaid: () => void; /** Defaults to the order's pay endpoint; cash gifts pass their own. */ payPath?: string }) {
  const { fmt, currency } = useSession();
  const kind = payPath?.includes("/cash-gifts/") ? "cashGift" : "order";
  const { data: options, error: optionsError } = useApi<Option[]>(order ? `/payments/options?currency=${currency}` : null);
  const [chosen, setChosen] = useState<Option["provider"] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const start = useMutation((provider: string) =>
    api<{ redirectUrl: string | null; reference: string; simulated: boolean }>("/payments/checkout", { method: "POST", body: { kind, id: order!.id, provider, currency } }));
  const simulate = useMutation((outcome: "success" | "fail") => api<{ status: string; reason?: string }>(payPath ?? `/sender/orders/${order!.id}/pay`, { method: "POST", body: { outcome } }));
  const pick = options?.find((o) => o.provider === chosen) ?? options?.[0];

  const attempt = async (outcome: "success" | "fail") => {
    setFailure(null);
    const r = await simulate.run(outcome);
    if (!r) return;
    if (r.status !== "PaymentFailed") onPaid();
    else setFailure(r.reason ?? "Payment was declined.");
  };

  return (
    <Modal open={!!order} onClose={onClose} size="sm" title="Secure payment" description={order ? `Order ${order.reference}` : undefined}>
      {order && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-plum-800 to-plum-950 p-5 text-ivory-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-plum-200">Amount due</span>
              {pick?.mode === "Test" && <Badge tone="gold">Test mode</Badge>}
            </div>
            <p className="mt-1 font-display text-3xl font-semibold tabular">{fmt(order.total)}</p>
            {pick && pick.provider !== "Simulated" && pick.currency !== currency && (
              <p className="text-xs text-plum-200">{pick.label} charges in {pick.currency}, at today&apos;s rate.</p>
            )}
            <p className="mt-4 flex items-center gap-2 text-xs text-plum-200"><CreditCard className="size-4" aria-hidden /> {method}</p>
          </div>

          {optionsError && <Notice tone="danger">{optionsError.message}</Notice>}
          {!options && !optionsError && <Spinner label="Loading payment options" />}
          {options?.length === 0 && <Notice tone="warning">Payments aren&apos;t available right now. Please try again later.</Notice>}

          {options && options.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink-900">Pay with</legend>
              <div className="grid gap-2">
                {options.map((o) => (
                  <label key={o.provider} className={cx("flex cursor-pointer items-start gap-3 rounded-2xl border p-3", pick?.provider === o.provider ? "border-plum-500 bg-plum-50" : "border-ink-200 hover:border-plum-300")}>
                    <input type="radio" name="engine" className="mt-1 accent-plum-700" checked={pick?.provider === o.provider} onChange={() => { setChosen(o.provider); setFailure(null); start.setError(null); }} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{o.label}</span>
                      <span className="block text-xs text-ink-500">{blurb[o.provider]}{o.provider !== "Simulated" ? ` Pays in ${o.currency}.` : ""}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {failure && <Notice tone="danger" title="Payment declined">{failure} Your order is saved — you can try again.</Notice>}
          {(start.error ?? simulate.error) && <Notice tone="danger">{(start.error ?? simulate.error)!.message}</Notice>}

          {pick?.provider === "Simulated" ? (
            <>
              <Notice tone="gold" icon={ShieldCheck} title="This is a simulated payment">No card details are collected and no money moves.</Notice>
              <div className="grid gap-2">
                <Button size="lg" variant="gold" icon={Lock} loading={simulate.pending} onClick={() => attempt("success")}>Simulate successful payment</Button>
                <Button variant="ghost" disabled={simulate.pending} onClick={() => attempt("fail")}>Simulate a declined card</Button>
              </div>
            </>
          ) : pick ? (
            <>
              <Button size="lg" variant="gold" icon={ExternalLink} className="w-full" loading={start.pending}
                onClick={async () => {
                  const r = await start.run(pick.provider);
                  if (r?.redirectUrl) window.location.assign(r.redirectUrl);
                }}>
                Continue to {pick.provider}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-500">
                <Lock className="size-3.5" aria-hidden /> You&apos;ll pay on {pick.provider}&apos;s secure page; SecretWish never sees your card.
              </p>
            </>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
