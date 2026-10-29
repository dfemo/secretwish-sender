"use client";

import { useState } from "react";
import { CreditCard, Lock, ShieldCheck } from "lucide-react";
import { api, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Badge, Button, Notice } from "@/shared/ui/primitives";
import { Modal } from "@/shared/ui/overlay";

/**
 * SIMULATED payment step. In production this is the payment provider's hosted checkout / inline
 * widget (e.g. Paystack Popup); card data never touches SecretWish servers or this front end,
 * and the order is confirmed only by a server-side webhook.
 */
export function PaymentSheet({ order, method, onClose, onPaid }: { order: { id: string; reference: string; total: number } | null; method: string; onClose: () => void; onPaid: () => void }) {
  const { fmt, currency, meta } = useSession();
  const [failure, setFailure] = useState<string | null>(null);
  const pay = useMutation((outcome: "success" | "fail") => api<{ status: string; reason?: string }>(`/sender/orders/${order!.id}/pay`, { method: "POST", body: { outcome } }));

  const attempt = async (outcome: "success" | "fail") => {
    setFailure(null);
    const r = await pay.run(outcome);
    if (!r) return;
    if (r.status === "PaymentConfirmed") onPaid();
    else setFailure(r.reason ?? "Payment was declined.");
  };

  return (
    <Modal open={!!order} onClose={onClose} size="sm" title="Secure payment" description={order ? `Order ${order.reference}` : undefined}>
      {order && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-plum-800 to-plum-950 p-5 text-ivory-50">
            <div className="flex items-center justify-between">
              <span className="text-xs text-plum-200">Amount due</span>
              <Badge tone="gold">Sandbox</Badge>
            </div>
            <p className="mt-1 font-display text-3xl font-semibold tabular">{fmt(order.total)}</p>
            {currency === "NGN" ? <p className="text-xs text-plum-200">≈ ${order.total.toFixed(2)} USD base</p> : <p className="text-xs text-plum-200">≈ ₦{Math.round(order.total * (meta?.fxRateNgn ?? 1550)).toLocaleString()} at the sample rate</p>}
            <p className="mt-4 flex items-center gap-2 text-xs text-plum-200">
              <CreditCard className="size-4" aria-hidden /> {method} · Paystack (simulated)
            </p>
          </div>
          <Notice tone="gold" icon={ShieldCheck} title="This is a simulated payment">
            No card details are collected and no money moves. Choose an outcome to see how SecretWish handles it.
          </Notice>
          {failure && (
            <Notice tone="danger" title="Payment declined">
              {failure} Your order is saved — you can try again.
            </Notice>
          )}
          {pay.error && <Notice tone="danger">{pay.error.message}</Notice>}
          <div className="grid gap-2">
            <Button size="lg" variant="gold" icon={Lock} loading={pay.pending} onClick={() => attempt("success")}>
              Simulate successful payment
            </Button>
            <Button variant="ghost" disabled={pay.pending} onClick={() => attempt("fail")}>
              Simulate a declined card
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
