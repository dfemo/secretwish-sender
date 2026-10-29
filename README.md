# SecretWish — Sender

The gifting experience: discover gifts, open wishlists, brief custom surprises within a budget, check out discreetly and track every gift.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Recharts · lucide-react. All data comes from the SecretWish .NET API (`../Backend`).

## Run

```bash
npm install
cp .env.example .env.local   # optional — defaults point at http://localhost:5080
npm run dev                  # http://localhost:3002
```

Start the API first (`dotnet run --project ../Backend/src/SecretWish.Api --launch-profile http`). Production build: `npm run build && npm start`. Type check: `npm run typecheck`.

## Screens

| Screen | What you can do |
|---|---|
| Home | Search, categories, gifts in motion, recommended and recently viewed gifts, public wishlists |
| Discover / Product | Search, filter by category and price, sort; compare similar gifts from other approved vendors |
| Wishlists | Discover public lists or open a private link; gift an item without ever seeing the recipient's address |
| Checkout (6 steps) | Review gift (qty, personalisation, optional budget range) → recipient & delivery → message → privacy choices → payment method → review; simulated payment success/decline; confirmation |
| My gifts / tracking | Timeline of real events with next steps; complete a failed payment; cancel or report a problem |
| Surprise requests | Create a brief with a budget range; compare vendor quotes (out-of-range quotes flagged); check out a quote |
| Account | Plan (free first gift ≤ $100, monthly/yearly — simulated), discreet notifications, support |

Demo persona with the richest data: **Femi Adeyemi**.

## Shared design system

`src/shared` is identical in Admin, Sender, Recipient and Vendor (tokens, components, API client, app shells). Edit it in one app, then run `sync-shared.ps1` from the workspace root to copy it to the others. A later step is to publish it as a private `@secretwish/ui` package.

## Prototype notes

- **Demo sign-in:** pick a synthetic persona; the API trusts the `X-Demo-User` header. Not real authentication.
- **Sample data only.** Figures are generated, not production analytics.
- Browser storage holds only per-viewer conveniences (chosen persona, currency, sidebar state, recently viewed).
- Prices are stored in USD and shown in USD or NGN at the recorded sample FX rate (toggle in the header).
