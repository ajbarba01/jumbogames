/**
 * The board itself: the standings table as the hero, the round-robin schedule
 * beneath it, and a Spectate link into every live match. Read off a screen from
 * meters away, so type steps up and state reads at a glance. Presentational and
 * server-rendered — it takes a board snapshot and renders it; the page frame,
 * the heading and every control belong to the surface that hosts it.
 */
import { Card, cx } from "@jumbo/ui";
import type {
  BoardDTO,
  BoardRound,
  BoardStandingRow,
  BoardTeamRef,
} from "@/lib/tournament/board";
import { WipeLink } from "@/components/wipe/WipeLink";

// The live round is the one worth watching, so it is pinned above the rounds
// still to come, with the finished ones last.
const ROUND_STATE_ORDER: Record<BoardRound["state"], number> = {
  active: 0,
  pending: 1,
  complete: 2,
};

function TeamName({
  team,
  align = "left",
}: {
  team: BoardTeamRef;
  align?: "left" | "right";
}) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center gap-2.5",
        align === "right" && "justify-end",
      )}
    >
      <span
        className="h-4 w-4 flex-none rounded-r1"
        style={{ background: `var(--color-team-${team.colorIndex})` }}
        aria-hidden
      />
      <span className="truncate">{team.name}</span>
    </span>
  );
}

function Movement({ movement }: { movement: number }) {
  if (movement > 0) {
    return <span className="text-ok">▲{movement}</span>;
  }
  if (movement < 0) {
    return <span className="text-crit">▼{Math.abs(movement)}</span>;
  }
  return <span className="text-s6">—</span>;
}

function StandingRow({ row }: { row: BoardStandingRow }) {
  return (
    <li className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] items-center gap-3 px-4 py-3">
      <span className="font-display text-xl text-s10">{row.rank}</span>
      <span className="flex min-w-0 items-center gap-2.5 text-lg font-bold text-s12">
        <TeamName team={row} />
        {row.forfeited ? (
          <span className="shrink-0 text-caps uppercase tracking-widest text-warn">
            forfeited
          </span>
        ) : null}
      </span>
      <span className="text-right font-mono text-xl text-s12">
        {row.minigamesWon}
      </span>
      <span className="text-right font-mono text-lg text-s9">
        {row.cumulativeNormalized.toFixed(1)}
      </span>
      <span className="text-right font-mono text-lg">
        <Movement movement={row.movement} />
      </span>
    </li>
  );
}

export function RoundBoard({ board }: { board: BoardDTO }) {
  const ended = board.phase === "complete";
  const schedule = [...board.rounds].sort(
    (a, b) =>
      ROUND_STATE_ORDER[a.state] - ROUND_STATE_ORDER[b.state] ||
      a.ordinal - b.ordinal,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {ended ? (
          <span className="text-caps uppercase tracking-widest text-ok">
            Ended · final standings
          </span>
        ) : (
          <span aria-hidden />
        )}
        <span className="text-caps uppercase tracking-widest text-s7">
          {board.roundCount ?? board.rounds.length} rounds · round-robin
        </span>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Standings
        </h2>
        {/* A ranking table is inherently wide: its columns carry meaning that
            squeezing destroys, so it browses sideways in its own container
            rather than making the page scroll (docs/UI.md fluid law). */}
        <div className="overflow-x-auto border-2 border-s6 bg-s2">
          <div className="min-w-lg">
            <div className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] items-center gap-3 border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
              <span>#</span>
              <span>Team</span>
              <span className="text-right">Games</span>
              <span className="text-right">Score</span>
              <span className="text-right">+/−</span>
            </div>
            <ul className="divide-y-2 divide-s6">
              {board.standings.map((row) => (
                <StandingRow key={row.id} row={row} />
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Schedule
        </h2>
        <div className="flex flex-col gap-3">
          {schedule.map((round) => (
            <Card
              key={round.ordinal}
              className={cx(
                "flex flex-col gap-2 p-4",
                // Status hue on live state (docs/UI.md): the running round
                // lifts out of the schedule instead of being hunted for.
                round.state === "active" && "ring-2 ring-run",
              )}
            >
              <span className="flex items-center gap-2 text-caps uppercase tracking-widest text-s7">
                Round {round.ordinal}
                {round.state === "complete" ? (
                  <span className="text-ok">done</span>
                ) : null}
                {round.state === "active" ? (
                  <span className="rounded-r1 bg-run px-1.5 py-0.5 text-edge">
                    live
                  </span>
                ) : null}
              </span>
              <ul className="flex flex-col gap-2">
                {round.matches.map((match) => (
                  <li
                    key={match.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-s11"
                  >
                    {/* Equal side tracks keep `vs` on the matchup's center
                        line. The matchup claims a basis wider than the floor
                        card, so Spectate drops to its own line there rather
                        than squeezing both names out of the row. */}
                    <span className="grid min-w-0 flex-1 basis-48 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3">
                      <TeamName team={match.teamA} align="right" />
                      <span className="text-s7">{match.teamB ? "vs" : ""}</span>
                      {match.teamB ? (
                        <TeamName team={match.teamB} />
                      ) : (
                        <span className="text-caps uppercase tracking-widest text-s7">
                          bye
                        </span>
                      )}
                    </span>
                    {match.live ? (
                      <WipeLink
                        href={`/t/${board.id}/m/${match.id}`}
                        wipeLabel="Spectate"
                        className="slip ml-auto shrink-0 cursor-pointer text-sec font-bold text-accent"
                      >
                        Spectate
                      </WipeLink>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
