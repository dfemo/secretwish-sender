"use client";

import { MyLeaderboard } from "@/shared/ui/leaderboard";

const gifts = (n: number) => `${n.toLocaleString()} gift${n === 1 ? "" : "s"} sent`;

/** Where this sender stands by gifts sent (orders and cash gifts); other senders stay anonymous. */
export default function LeaderboardPage() {
  return (
    <MyLeaderboard
      path="/sender/leaderboard"
      title="Leaderboard"
      description="How many gifts you've sent compared with other SecretWish senders. Nobody else's name or details are shown."
      score={gifts}
      next={(n) => `Send ${n} more gift${n === 1 ? "" : "s"} to move up a place.`}
      empty="Send your first gift to join the leaderboard."
    />
  );
}
