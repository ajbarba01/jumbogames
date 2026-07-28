/**
 * The board itself: the live round pinned at the top where the room looks
 * first, the standings beneath it, then the rest of the schedule, and a
 * Spectate link into every live match. The live round appears once — it is
 * lifted out of the schedule, not duplicated above it. Read off a screen from
 * meters away, so type steps up and state reads at a glance. Presentational
 * and server-rendered — it takes a board snapshot and renders it; the page
 * frame, the heading and every control belong to the surface that hosts it.
 */
import { Card, cx } from "@jumbo/ui";
import type {
  BoardDTO,
  BoardRound,
  BoardStandingRow,
  BoardTeamRef,
} from "@/lib/tournament/board";
import { WipeLink } from "@/components/wipe/WipeLink";

// The live round is lifted above the standings and never reaches the schedule
// below, so only these two orderings are ever exercised; `active` stays keyed
// because the record is typed over every round state.
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

function MatchRow({
  match,
  boardId,
}: {
  match: BoardRound["matches"][number];
  boardId: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-s11">
      {/* Equal side tracks keep `vs` on the matchup's center line. The matchup
          claims a basis wider than the floor card, so Spectate drops to its own
          line there rather than squeezing both names out of the row. */}
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
          href={`/t/${boardId}/m/${match.id}`}
          className="slip ml-auto shrink-0 cursor-pointer text-sec font-bold text-accent"
        >
          Spectate
        </WipeLink>
      ) : null}
    </li>
  );
}

function StandingRow({
  row,
  champion,
}: {
  row: BoardStandingRow;
  champion: boolean;
}) {
  return (
    <li className="grid grid-cols-[3rem_1fr_5rem_4rem] items-center gap-3 px-4 py-3">
      <span
        className={cx(
          "flex self-stretch items-center font-display text-xl text-s10",
          // Tied teams share a rank number, joined by a structure line down
          // the rank column. UI.md rules out the alternatives: markers are
          // icons never words (no "T2"), and status hues belong to live state.
          // The negative vertical margin extends the cell past the <li>'s
          // own py-3 padding to the row's full height, so consecutive rails
          // meet edge-to-edge instead of rendering as separate inset dashes.
          // Do not remove it as stray styling.
          row.tied && "-my-3 border-l-2 border-s6 pl-2",
        )}
      >
        {row.rank}
        {row.tied ? <span className="sr-only"> (tied)</span> : null}
      </span>
      <span
        className={cx(
          "flex min-w-0 items-center gap-2.5 text-s12",
          champion ? "font-display text-2xl" : "text-lg font-bold",
        )}
      >
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
      <span className="text-right font-mono text-lg">
        <Movement movement={row.movement} />
      </span>
    </li>
  );
}

export function RoundBoard({ board }: { board: BoardDTO }) {
  const ended = board.phase === "complete";
  const liveRound = ended
    ? null
    : (board.rounds.find((round) => round.state === "active") ?? null);
  // Excluded by identity, not by state: once the game is ended there is no
  // live region, and a round still running when the host called it must
  // still appear here rather than vanish from the board entirely.
  const schedule = board.rounds
    .filter((round) => round !== liveRound)
    .sort(
      (a, b) =>
        ROUND_STATE_ORDER[a.state] - ROUND_STATE_ORDER[b.state] ||
        a.ordinal - b.ordinal,
    );
  // Rank 1 is crowned only on a finished game, and only when it is not shared:
  // crowning two teams would claim a winner the game did not produce, which is
  // exactly the case the room settles itself (DESIGN decision 24). Checked by
  // rank, not `tied` — a shared rank 1 at zero wins (e.g. every match tied)
  // isn't marked `tied` anymore, but it still must not be crowned.
  const rank1Count = board.standings.filter((s) => s.rank === 1).length;
  const championTeamId =
    ended && board.standings[0]?.rank === 1 && rank1Count === 1
      ? board.standings[0].id
      : null;

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

      {liveRound ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-caps uppercase tracking-widest text-s7">
            Now playing
          </h2>
          {/* Status hue on live state (docs/UI.md): the running round is the
              thing the room is watching, so it sits above the table. */}
          <Card className="flex flex-col gap-2 p-4 ring-2 ring-run">
            <span className="flex items-center gap-2 text-caps uppercase tracking-widest text-s7">
              Round {liveRound.ordinal}
              <span className="rounded-r1 bg-run px-1.5 py-0.5 text-edge">
                live
              </span>
            </span>
            <ul className="flex flex-col gap-2">
              {liveRound.matches.map((match) => (
                <MatchRow key={match.id} match={match} boardId={board.id} />
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Standings
        </h2>
        {/* A ranking table is inherently wide: its columns carry meaning that
            squeezing destroys, so it browses sideways in its own container
            rather than making the page scroll (docs/UI.md fluid law). */}
        <div className="overflow-x-auto border-2 border-s6 bg-s2">
          <div className="min-w-lg">
            <div className="grid grid-cols-[3rem_1fr_5rem_4rem] items-center gap-3 border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
              <span>#</span>
              <span>Team</span>
              <span className="text-right">Games</span>
              <span className="text-right">+/−</span>
            </div>
            <ul className="divide-y-2 divide-s6">
              {board.standings.map((row) => (
                <StandingRow
                  key={row.id}
                  row={row}
                  champion={row.id === championTeamId}
                />
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
            <Card key={round.ordinal} className="flex flex-col gap-2 p-4">
              <span className="flex items-center gap-2 text-caps uppercase tracking-widest text-s7">
                Round {round.ordinal}
                {round.state === "complete" ? (
                  <span className="text-ok">done</span>
                ) : null}
              </span>
              <ul className="flex flex-col gap-2">
                {round.matches.map((match) => (
                  <MatchRow key={match.id} match={match} boardId={board.id} />
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
