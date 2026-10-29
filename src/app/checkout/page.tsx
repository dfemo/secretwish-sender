"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, CreditCard, Eye, EyeOff, Landmark, Lock, MapPin, Package } from "lucide-react";
import { api, ApiError, useApi, useMutation } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { date } from "@/shared/lib/format";
import { Badge, Button, ButtonLink, Card, cx, ErrorState, Field, Input, Notice, PageSkeleton, ProductArt, Select, Switch, Textarea } from "@/shared/ui/primitives";
import { useToast } from "@/shared/ui/overlay";
import { PaymentSheet } from "@/components/payment-sheet";
import type { Product } from "@/lib/types";

type Pricing = { unit: number; qty: number; subtotal: number; deliveryFee: number; discount: number; tax: number; total: number; freeSample: boolean; planRequired: boolean; promoMessage?: string };
type SharedWl = { title: string; token: string; owner: { firstName: string; city: string }; items: { id: string; notes: string; quantity: number }[] };
type Surprise = { id: string; title: string; budgetMin: number; budgetMax: number; recipientName: string; deliveryCity: string; quotes: { id: string; description: string; priceUsd: number; overBudget: boolean; status: string; vendor: { name: string } }[] };

const steps = ["Gift", "Recipient", "Message", "Privacy", "Payment", "Review"] as const;
const cities = ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Enugu", "Kano"];

function CheckoutInner() {
  const params = useSearchParams();
  const productId = params.get("product");
  const quoteId = params.get("quote");
  const wlToken = params.get("wl");
  const itemId = params.get("item");
  const { fmt, meta } = useSession();
  const toast = useToast();

  const product = useApi<{ product: Product }>(productId ? `/catalog/products/${productId}` : null);
  const wishlist = useApi<SharedWl>(wlToken ? `/sender/wishlists/shared/${wlToken}` : null);
  const surprises = useApi<Surprise[]>(quoteId ? `/sender/surprises` : null);
  const request = surprises.data?.find((s) => s.quotes.some((q) => q.id === quoteId));
  const quote = request?.quotes.find((q) => q.id === quoteId);
  const p = product.data?.product;
  const wlItem = wishlist.data?.items.find((i) => i.id === itemId);

  const [step, setStep] = useState(0);
  const [f, setF] = useState({
    quantity: 1, personalisation: "", budgetMin: "", budgetMax: "",
    recipientName: "", recipientPhone: "", deliveryAddress: "", deliveryCity: "Lagos", deliveryOption: "Standard", deliveryDate: "",
    giftMessage: "", revealSender: false, hidePrice: true, discreetPackaging: true, method: "Card", promoCode: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [order, setOrder] = useState<{ id: string; reference: string; total: number } | null>(null);
  const [paid, setPaid] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [planVersion, setPlanVersion] = useState(0);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    if (wlItem) set("quantity", wlItem.quantity);
  }, [wlItem]);
  useEffect(() => {
    if (request) setF((x) => ({ ...x, recipientName: request.recipientName, deliveryCity: request.deliveryCity }));
  }, [request]);
  const options = useMemo(() => (p ? p.deliveryOptions : ["Standard", "Express"]), [p]);
  useEffect(() => {
    if (!options.includes(f.deliveryOption)) set("deliveryOption", options[0]);
  }, [options, f.deliveryOption]);

  // Live price from the API: product + delivery − discount + VAT, and free-first-gift eligibility.
  useEffect(() => {
    if (!productId && !quoteId) return;
    const t = setTimeout(() => {
      api<{ pricing: Pricing }>("/sender/checkout/quote", { method: "POST", body: { productId, quoteId, quantity: f.quantity, deliveryOption: f.deliveryOption, promoCode: f.promoCode } })
        .then((r) => setPricing(r.pricing))
        .catch(() => {});
    }, 200);
    return () => clearTimeout(t);
  }, [productId, quoteId, f.quantity, f.deliveryOption, f.promoCode, planVersion]);

  const activatePlan = useMutation((plan: string) => api("/sender/plan", { method: "POST", body: { plan } }));
  const create = useMutation(() =>
    api<{ id: string; reference: string; total: number }>("/sender/orders", {
      method: "POST",
      body: {
        productId: quoteId ? null : productId, quoteId, quantity: f.quantity, wishlistToken: wlToken, wishlistItemId: itemId,
        recipientName: f.recipientName, recipientPhone: f.recipientPhone, deliveryAddress: f.deliveryAddress, deliveryCity: f.deliveryCity,
        deliveryDate: f.deliveryDate || null, deliveryOption: f.deliveryOption, giftMessage: f.giftMessage, personalisation: f.personalisation,
        revealSender: f.revealSender, discreetPackaging: f.discreetPackaging, hidePrice: f.hidePrice, promoCode: f.promoCode,
        budgetMin: f.budgetMin ? Number(f.budgetMin) : null, budgetMax: f.budgetMax ? Number(f.budgetMax) : null,
      },
    }),
  );

  if ((productId && product.loading) || (wlToken && wishlist.loading) || (quoteId && surprises.loading)) return <PageSkeleton />;
  if (!productId && !quoteId) return <ErrorState error={{ message: "Choose a gift first." }} />;
  if (product.error) return <ErrorState error={product.error.status === 404 ? { message: "This gift is no longer available." } : product.error} onRetry={product.reload} />;
  if (quoteId && !quote) return <ErrorState error={{ message: "That quote is no longer available." }} />;

  const title = quote ? `Custom surprise: ${request!.title}` : p!.name;
  const emoji = quote ? "🎁" : p!.emoji;
  const vendor = quote ? quote.vendor.name : p!.vendor.name;
  const unit = quote ? quote.priceUsd : p!.priceUsd;
  const viaWishlist = !!wishlist.data;
  const today = new Date().toISOString().slice(0, 10);

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (f.quantity < 1 || f.quantity > 10) e.quantity = "Choose 1 to 10.";
      if (f.budgetMin && f.budgetMax && Number(f.budgetMin) > Number(f.budgetMax)) e.budget = "Minimum can't exceed maximum.";
      if (!quote && f.budgetMax && unit * f.quantity > Number(f.budgetMax)) e.budget = "This gift is above your maximum budget.";
    }
    if (s === 1 && !viaWishlist) {
      if (!f.recipientName.trim()) e.recipientName = "Who is the gift for?";
      if (f.recipientPhone.replace(/\D/g, "").length < 10) e.recipientPhone = "Enter a phone number the courier can call.";
      if (f.deliveryAddress.trim().length < 8) e.deliveryAddress = "Enter the full street address.";
    }
    if (s === 1 && f.deliveryDate && f.deliveryDate < today) e.deliveryDate = "Pick today or a future date.";
    if (s === 2 && f.giftMessage.length > 300) e.giftMessage = "Keep it to 300 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const next = () => validate(step) && setStep((s) => Math.min(s + 1, steps.length - 1));

  const placeOrder = async () => {
    for (let s = 0; s < steps.length; s++) if (!validate(s)) return setStep(s);
    // Re-use the saved order if the payment sheet was closed, so we never create duplicates.
    if (order) return setSheetOpen(true);
    const r = await create.run();
    if (r) {
      setOrder(r);
      setSheetOpen(true);
    }
  };
  const serverErrors = create.error instanceof ApiError ? create.error.errors : undefined;

  if (paid && order)
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <span className="mx-auto grid size-28 place-items-center rounded-full bg-plum-100/70">
          <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-gold-400 to-plum-700 text-white shadow-lg">
            <Check className="size-10" strokeWidth={3} aria-hidden />
          </span>
        </span>
        <h1 className="mt-6 font-display text-4xl font-semibold text-plum-900">Order placed</h1>
        <p className="mt-3 text-ink-700">
          Your order <b>{order.reference}</b> was placed with success. {vendor} has been asked to accept it — you can follow every step from your gifts.
        </p>
        <p className="mt-2 text-sm text-ink-500">{viaWishlist ? `${wishlist.data!.owner.firstName} won't see what it is until it arrives.` : "The surprise stays a secret until it arrives."}</p>
        <div className="mx-auto mt-8 grid max-w-xs gap-2">
          <ButtonLink href={`/orders/${order.id}`} size="lg">
            See order status
          </ButtonLink>
          <ButtonLink href="/" variant="ghost">
            Close
          </ButtonLink>
        </div>
      </div>
    );

  return (
    <>
      <Link href={viaWishlist ? `/w/${wlToken}` : quote ? "/surprises" : `/products/${productId}`} className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-plum-700">
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <h1 className="font-display text-3xl font-semibold text-plum-900">Discreet checkout</h1>
      <ol className="mt-5 mb-8 flex gap-1 overflow-x-auto pb-1 scrollbar-thin" aria-label="Checkout progress">
        {steps.map((s, i) => (
          <li key={s} className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={i > step}
              onClick={() => setStep(i)}
              aria-current={i === step ? "step" : undefined}
              className={cx("flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold", i === step ? "bg-plum-800 text-ivory-50" : i < step ? "bg-plum-100 text-plum-800" : "bg-ink-100 text-ink-400")}
            >
              <span className={cx("grid size-5 place-items-center rounded-full text-[10px]", i === step ? "bg-gold-500 text-plum-950" : i < step ? "bg-plum-700 text-white" : "bg-white")}>{i < step ? <Check className="size-3" aria-hidden /> : i + 1}</span>
              {s}
              {i < step && <span className="sr-only">(completed)</span>}
            </button>
            {i < steps.length - 1 && <span className="h-px w-3 bg-ink-200" aria-hidden />}
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-5 md:p-7">
          {step === 0 && (
            <section className="space-y-5" aria-labelledby="s0">
              <h2 id="s0" className="font-display text-xl font-semibold">Review your gift</h2>
              <div className="flex items-center gap-4 rounded-2xl bg-ivory-100 p-4">
                <ProductArt emoji={emoji} tint={p?.tint} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{title}</p>
                  <p className="text-xs text-ink-500">{quote ? quote.description : `by ${vendor}`}</p>
                  {wlItem?.notes && <p className="mt-1 text-xs text-plum-700 italic">Their note: “{wlItem.notes}”</p>}
                </div>
                <p className="font-display text-xl font-semibold tabular">{fmt(unit)}</p>
              </div>
              {!quote && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Quantity" error={errors.quantity}>
                    {(id, d) => <Input id={id} aria-describedby={d} type="number" min={1} max={Math.min(10, p!.stock)} value={f.quantity} onChange={(e) => set("quantity", Math.max(1, Number(e.target.value)))} />}
                  </Field>
                  <Field label="Personalisation / variant" hint="Colour, size, engraving… (optional)">
                    {(id, d) => <Input id={id} aria-describedby={d} maxLength={120} value={f.personalisation} onChange={(e) => set("personalisation", e.target.value)} placeholder="e.g. Engrave “A.N.”, size M" />}
                  </Field>
                </div>
              )}
              {!quote && (
                <fieldset className="rounded-2xl border border-ink-200 p-4">
                  <legend className="px-1 text-[13px] font-semibold text-ink-700">Your budget range (optional)</legend>
                  <p className="mb-3 text-xs text-ink-500">Kept private from the recipient. If a vendor substitutes an item, they must stay within this range.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Min (USD)" error={errors.budget}>
                      {(id, d) => <Input id={id} aria-describedby={d} type="number" min={0} value={f.budgetMin} onChange={(e) => set("budgetMin", e.target.value)} />}
                    </Field>
                    <Field label="Max (USD)">{(id) => <Input id={id} type="number" min={0} value={f.budgetMax} onChange={(e) => set("budgetMax", e.target.value)} />}</Field>
                  </div>
                </fieldset>
              )}
              {quote && (
                <Notice tone={quote.overBudget ? "warning" : "success"} title={quote.overBudget ? "This quote is outside your budget" : "Within your budget"}>
                  Your range: {fmt(request!.budgetMin)} – {fmt(request!.budgetMax)}
                </Notice>
              )}
            </section>
          )}

          {step === 1 && (
            <section className="space-y-5" aria-labelledby="s1">
              <h2 id="s1" className="font-display text-xl font-semibold">Recipient & delivery</h2>
              {viaWishlist ? (
                <div className="flex gap-3 rounded-2xl bg-plum-50 p-4 text-sm text-plum-900">
                  <MapPin className="mt-0.5 size-5 shrink-0" aria-hidden />
                  <div>
                    <p className="font-semibold">Delivering to {wishlist.data!.owner.firstName}&apos;s saved address · {wishlist.data!.owner.city}</p>
                    <p className="text-[13px] text-plum-700">Their full address is never shown to you — only to the vendor and courier.</p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Recipient's name" required error={errors.recipientName ?? serverErrors?.recipientName?.[0]}>
                    {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.recipientName} autoComplete="off" value={f.recipientName} onChange={(e) => set("recipientName", e.target.value)} />}
                  </Field>
                  <Field label="Recipient's phone" required hint="Only shared with the vendor and courier." error={errors.recipientPhone ?? serverErrors?.recipientPhone?.[0]}>
                    {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.recipientPhone} type="tel" autoComplete="off" value={f.recipientPhone} onChange={(e) => set("recipientPhone", e.target.value)} placeholder="+234 …" />}
                  </Field>
                  <Field label="Delivery address" required className="sm:col-span-2" error={errors.deliveryAddress ?? serverErrors?.deliveryAddress?.[0]}>
                    {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.deliveryAddress} autoComplete="off" value={f.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} placeholder="House number, street, area" />}
                  </Field>
                  <Field label="City" required>
                    {(id) => (
                      <Select id={id} value={f.deliveryCity} onChange={(e) => set("deliveryCity", e.target.value)}>
                        {cities.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </Select>
                    )}
                  </Field>
                </div>
              )}
              <fieldset>
                <legend className="mb-2 text-[13px] font-semibold text-ink-700">Delivery option</legend>
                <div className="space-y-2">
                  {options.map((o) => (
                    <label key={o} className={cx("flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-sm", f.deliveryOption === o ? "border-plum-500 bg-plum-50" : "border-ink-200 hover:border-plum-200")}>
                      <span className="flex items-center gap-3">
                        <input type="radio" name="delivery" value={o} checked={f.deliveryOption === o} onChange={() => set("deliveryOption", o)} className="accent-plum-700" />
                        {o} {o === "Standard" ? "(3–5 days)" : o === "Express" ? "(1–2 days)" : o === "Same-day" ? "(today, Lagos)" : "(sent by email)"}
                      </span>
                      <span className="font-semibold tabular">{meta?.deliveryFees[o] ? fmt(meta.deliveryFees[o]) : "Free"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <Field label="Deliver on or before (optional)" error={errors.deliveryDate}>
                {(id, d) => <Input id={id} aria-describedby={d} type="date" min={today} value={f.deliveryDate} onChange={(e) => set("deliveryDate", e.target.value)} className="w-52" />}
              </Field>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4" aria-labelledby="s2">
              <h2 id="s2" className="font-display text-xl font-semibold">Add a gift message</h2>
              <Field label="Message on the card (optional)" error={errors.giftMessage} hint={`${300 - f.giftMessage.length} characters left`}>
                {(id, d) => <Textarea id={id} aria-describedby={d} maxLength={300} value={f.giftMessage} onChange={(e) => set("giftMessage", e.target.value)} className="min-h-[140px] font-display text-lg" placeholder="Happy birthday! You deserve all the good things." />}
              </Field>
              <div className="flex flex-wrap gap-2">
                {["Happy birthday! 🎉", "Thinking of you.", "Congratulations!", "Just because you're wonderful."].map((m) => (
                  <button key={m} type="button" onClick={() => set("giftMessage", m)} className="rounded-full bg-ivory-200 px-3 py-1.5 text-xs font-semibold text-ink-700 hover:bg-gold-100">
                    {m}
                  </button>
                ))}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-2" aria-labelledby="s3">
              <h2 id="s3" className="mb-2 font-display text-xl font-semibold">Privacy choices</h2>
              <Switch checked={f.revealSender} onChange={(v) => set("revealSender", v)} label="Reveal my name after delivery" description="Off: the card says “from a secret admirer”. Your name is never shown before the gift arrives." />
              <Switch checked={f.hidePrice} onChange={(v) => set("hidePrice", v)} label="Hide the price from the recipient" description="No prices on the packing slip, card or their SecretWish account." />
              <Switch checked={f.discreetPackaging} onChange={(v) => set("discreetPackaging", v)} label="Discreet outer packaging" description="Plain box with no product branding visible." />
              <Notice className="mt-3" tone="plum" icon={f.revealSender ? Eye : EyeOff}>
                Delivery notifications to the recipient say only that “something special is on its way”.
              </Notice>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-4" aria-labelledby="s4">
              <h2 id="s4" className="font-display text-xl font-semibold">Payment method</h2>
              <Notice tone="gold" icon={Lock} title="Prototype: simulated payments only">
                You won&apos;t be asked for card details. In production, payment happens in the provider&apos;s secure checkout (e.g. Paystack) and SecretWish never sees your card.
              </Notice>
              <fieldset className="space-y-2">
                <legend className="sr-only">Payment method</legend>
                {[
                  { v: "Card", label: "Debit or credit card", icon: CreditCard },
                  { v: "Bank transfer", label: "Bank transfer", icon: Landmark },
                ].map((m) => (
                  <label key={m.v} className={cx("flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm", f.method === m.v ? "border-plum-500 bg-plum-50" : "border-ink-200")}>
                    <input type="radio" name="method" checked={f.method === m.v} onChange={() => set("method", m.v)} className="accent-plum-700" />
                    <m.icon className="size-4 text-plum-600" aria-hidden /> {m.label}
                    <Badge tone="gold" className="ml-auto">
                      Sandbox
                    </Badge>
                  </label>
                ))}
              </fieldset>
              <Field label="Promo code" hint={pricing?.promoMessage ?? "Try WELCOME5"}>
                {(id, d) => <Input id={id} aria-describedby={d} value={f.promoCode} onChange={(e) => set("promoCode", e.target.value.toUpperCase())} className="w-48 uppercase" />}
              </Field>
            </section>
          )}

          {step === 5 && (
            <section className="space-y-4" aria-labelledby="s5">
              <h2 id="s5" className="font-display text-xl font-semibold">Review & confirm</h2>
              <dl className="divide-y divide-ink-100 text-sm">
                {[
                  ["Gift", `${f.quantity} × ${title}${f.personalisation ? ` · ${f.personalisation}` : ""}`],
                  ["For", viaWishlist ? `${wishlist.data!.owner.firstName} (wishlist “${wishlist.data!.title}”)` : `${f.recipientName}, ${f.deliveryCity}`],
                  ["Delivery", `${f.deliveryOption}${f.deliveryDate ? ` · by ${date(f.deliveryDate)}` : ""}`],
                  ["Message", f.giftMessage || "No message"],
                  ["Privacy", `${f.revealSender ? "Name revealed after delivery" : "Anonymous"} · ${f.hidePrice ? "price hidden" : "price shown"} · ${f.discreetPackaging ? "discreet packaging" : "standard packaging"}`],
                  ["Payment", `${f.method} (simulated)`],
                ].map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
                    <dt className="text-ink-500">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              {pricing?.planRequired && (
                <Notice tone="warning" title="A SecretWish plan is needed for this gift">
                  Your free first gift has been used (or this gift is over {fmt(meta?.freeSampleLimitUsd ?? 100)}). Plan prices are still being finalised.
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" loading={activatePlan.pending} onClick={async () => { if ((await activatePlan.run("Customer Monthly")) !== undefined) { toast({ tone: "success", title: "Monthly plan activated (simulated)" }); setPlanVersion((v) => v + 1); } }}>
                      Activate monthly (simulated)
                    </Button>
                    <Button size="sm" variant="secondary" onClick={async () => { if ((await activatePlan.run("Customer Yearly")) !== undefined) { toast({ tone: "success", title: "Yearly plan activated (simulated)" }); setPlanVersion((v) => v + 1); } }}>
                      Yearly (reduced price)
                    </Button>
                  </div>
                </Notice>
              )}
              {create.error && <Notice tone="danger">{create.error.message}</Notice>}
            </section>
          )}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-ink-100 pt-5">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button variant="gold" size="lg" icon={Lock} loading={create.pending} disabled={pricing?.planRequired} onClick={placeOrder}>
                {order ? "Complete payment" : "Confirm & pay"} {pricing ? fmt(pricing.total) : ""}
              </Button>
            )}
          </div>
        </Card>

        <aside aria-label="Order summary" className="overflow-hidden rounded-3xl bg-gradient-to-b from-plum-800 to-plum-950 text-ivory-50 shadow-[var(--shadow-pop)] lg:sticky lg:top-24">
          <div className="p-6">
            <p className="text-xs font-semibold tracking-[0.14em] text-gold-300 uppercase">Order summary</p>
            <div className="mt-4 flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-xl bg-white/10 text-2xl" aria-hidden>
                {emoji}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{title}</p>
                <p className="text-xs text-plum-200">{vendor}</p>
              </div>
            </div>
            <dl className="mt-6 space-y-2 text-sm">
              <Row k={`Subtotal (${pricing?.qty ?? f.quantity})`} v={fmt(pricing?.subtotal ?? unit * f.quantity)} />
              <Row k={`Delivery · ${f.deliveryOption}`} v={pricing ? (pricing.deliveryFee ? fmt(pricing.deliveryFee) : "Free") : "—"} />
              {!!pricing?.discount && <Row k="Discount" v={`−${fmt(pricing.discount)}`} />}
              <Row k="VAT (7.5%)" v={pricing ? fmt(pricing.tax) : "—"} />
              <Row k="SecretWish fee" v={pricing?.freeSample ? "Free first gift" : "Included in plan"} />
            </dl>
            <div className="mt-5 flex items-baseline justify-between border-t border-white/15 pt-4">
              <span className="font-display text-lg">Total to pay</span>
              <span className="font-display text-2xl font-semibold tabular">{pricing ? fmt(pricing.total) : "—"}</span>
            </div>
            <p className="mt-1 text-right text-[11px] text-plum-300">Prices in USD base · shown at the recorded sample rate</p>
          </div>
          <p className="flex items-center gap-2 bg-black/20 px-6 py-3 text-xs text-plum-200">
            <Package className="size-4 text-gold-300" aria-hidden /> Wrapped discreetly · tracked end to end
          </p>
        </aside>
      </div>

      <PaymentSheet
        order={sheetOpen && !paid ? order : null}
        method={f.method}
        onClose={() => {
          toast({ tone: "info", title: "Payment not completed", body: `Order ${order?.reference} is saved. Finish payment here or from My gifts.` });
          setSheetOpen(false);
        }}
        onPaid={() => setPaid(true)}
      />
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-plum-200">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CheckoutInner />
    </Suspense>
  );
}
