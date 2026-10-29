export type Product = {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  stock: number;
  emoji: string;
  tint: string;
  status: string;
  deliveryOptions: string[];
  rating: number;
  sold: number;
  categoryId: string;
  category: string;
  vendor: { id: string; name: string; city: string; rating: number };
};

export type WishlistCard = {
  id: string;
  title: string;
  occasion: string;
  eventDate: string;
  token: string;
  owner: { firstName: string; city: string };
  items: number;
  remaining: number;
  preview: { emoji: string; tint: string }[];
};

export type OrderEvent = { id: string; at: string; type: string; title: string; detail: string; actor: string };

export type SenderOrder = {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  deliveryStatus: string;
  refundStatus: string;
  vendor: { id: string; name: string };
  lines: { productName: string; emoji: string; quantity: number; unitPrice: number; customisation: string; total: number }[];
  money: { subtotal: number; deliveryFee: number; tax: number; discount: number; total: number; fxRateNgn: number };
  recipient: { name: string; address: string; city: string; viaWishlist: boolean };
  gift: { giftMessage: string; personalisation: string; revealSender: boolean; discreetPackaging: boolean; hidePriceFromRecipient: boolean; budgetMin: number; budgetMax: number };
  delivery: { deliveryOption: string; deliveryDate: string | null; trackingReference: string | null; courier: string | null; deliveredAt: string | null };
  events: OrderEvent[];
  actions: { key: string; label: string }[];
};

// Per-viewer convenience only (never business data): products this browser recently viewed.
export function rememberViewed(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem("secretwish.viewed") ?? "[]") as string[];
    localStorage.setItem("secretwish.viewed", JSON.stringify([id, ...list.filter((x) => x !== id)].slice(0, 8)));
  } catch {
    /* storage unavailable */
  }
}

export function recentlyViewed(): string[] {
  try {
    return JSON.parse(localStorage.getItem("secretwish.viewed") ?? "[]");
  } catch {
    return [];
  }
}
