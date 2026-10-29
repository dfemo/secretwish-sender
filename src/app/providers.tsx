"use client";

import type { ReactNode } from "react";
import { Compass, Gift, Home, PackageCheck, Sparkles, UserRound } from "lucide-react";
import { SessionProvider } from "@/shared/lib/session";
import { ConsumerShell, type NavItem } from "@/shared/layout/shell";
import { ToastProvider } from "@/shared/ui/overlay";

const items: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/browse", label: "Discover", icon: Compass },
  { href: "/wishlists", label: "Wishlists", icon: Gift },
  { href: "/surprises", label: "Surprises", icon: Sparkles },
  { href: "/orders", label: "My gifts", icon: PackageCheck },
  { href: "/account", label: "Account", icon: UserRound },
];

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <SessionProvider
        app="sender"
        intro={
          <>
            <h1 className="font-display text-4xl leading-tight font-semibold md:text-5xl">
              Make someone&apos;s day — <span className="text-gold-400">secretly</span>.
            </h1>
            <p className="mt-4 max-w-md text-plum-200">Gift from a loved one&apos;s wishlist or brief our approved vendors on a surprise within your budget. We keep the secret until it arrives.</p>
          </>
        }
      >
        <ConsumerShell items={items}>{children}</ConsumerShell>
      </SessionProvider>
    </ToastProvider>
  );
}
