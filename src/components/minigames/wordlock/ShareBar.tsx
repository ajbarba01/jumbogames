/**
 * The one bar that says who holds more ground per player: two segments split
 * at teamShares' normalized a/b, each end labelled with the team's raw tile
 * count, and the viewer's own held tiles picked out as a lighter inset within
 * their own team's segment. The split is per-player on purpose (share.ts) —
 * this bar never lets a raw tile count read as the lead.
 */
"use client";
import { motion } from "motion/react";
import { SLIP_DUR, SLIP_EASE, cx } from "@jumbo/ui";
import type { MatchTeam } from "@jumbo/engine";
import type { Shares } from "./share";

export function ShareBar({
  shares,
  teamA,
  teamB,
  mineSide,
}: {
  shares: Shares;
  teamA: MatchTeam;
  teamB: MatchTeam;
  /** Which side the viewer plays on, so their inset lands in the right
   *  segment; null for a spectator, who has no segment to highlight. */
  mineSide: "A" | "B" | null;
}): React.JSX.Element {
  const mineFraction =
    mineSide === "A" && shares.tilesA > 0
      ? shares.mine / shares.tilesA
      : mineSide === "B" && shares.tilesB > 0
        ? shares.mine / shares.tilesB
        : 0;

  return (
    <div className="flex flex-col gap-1 px-2" data-testid="wordlock-share-bar">
      <div className="flex items-center justify-between text-sec font-bold text-s11">
        <span>{shares.tilesA}</span>
        <span>{shares.tilesB}</span>
      </div>
      <div className="relative flex h-4 w-full overflow-hidden border-2 border-s6">
        <motion.div
          className="relative h-full"
          style={{ background: `var(--color-team-${teamA.colorIndex})` }}
          animate={{ width: `${shares.a * 100}%` }}
          transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
        >
          {mineSide === "A" && (
            <div
              className={cx("absolute inset-y-0 right-0 bg-s12/40")}
              style={{ width: `${mineFraction * 100}%` }}
            />
          )}
        </motion.div>
        <motion.div
          className="relative h-full"
          style={{ background: `var(--color-team-${teamB.colorIndex})` }}
          animate={{ width: `${shares.b * 100}%` }}
          transition={{ ease: SLIP_EASE, duration: SLIP_DUR.move }}
        >
          {mineSide === "B" && (
            <div
              className={cx("absolute inset-y-0 left-0 bg-s12/40")}
              style={{ width: `${mineFraction * 100}%` }}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}
