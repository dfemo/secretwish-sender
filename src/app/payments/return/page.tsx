"use client";

import { Suspense } from "react";
import { PageSkeleton } from "@/shared/ui/primitives";
import { PaymentReturn } from "@/shared/ui/payment-return";

/** Where Paystack, Flutterwave and Stripe send senders back after paying for a gift, a cash gift or a plan. */
export default function PaymentReturnPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentReturn />
    </Suspense>
  );
}
