/**
 * Projector round board: the standings table as the hero, with the round-robin
 * schedule beneath it. Staff can spectate any live match; a rostered viewer sees
 * a link into their own live match or a card for their own bye, and auto-pull
 * carries them into a newly started match without a click. Read off a screen
 * from meters away, so type steps up and state reads at a glance. Presentational
 * and server-rendered; it takes a board snapshot and renders it.
 */
import { Card, CapsLabel } from "@jumbo/ui";
import type { BoardDTO, BoardTeamRef } from "@/lib/tournament/board";
import { WipeLink } from "@/components/wipe/WipeLink";
import { BoardAutoPull } from "./board-auto-pull";
import { BoardHostControls } from "./board-host-controls";
import { BoardRoundStart } from "./board-round-start";
import { EnterMatchLink } from "./enter-match-link";

function TeamName({ team }: { team: BoardTeamRef }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
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

export function RoundBoard({
  board,
  isHost,
  canSpectate,
}: {
  board: BoardDTO;
  isHost: boolean;
  canSpectate: boolean;
}) {
  const ended = board.phase === "complete";
  const earliestPendingOrdinal = board.rounds.find(
    (round) => round.state === "pending",
  )?.ordinal;
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-4xl uppercase text-s12">
            {board.name}
          </h1>
          {ended ? (
            <span className="text-caps uppercase tracking-widest text-ok">
              Ended · final standings
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-caps uppercase tracking-widest text-s7">
            {board.roundCount ?? board.rounds.length} rounds · round-robin
          </span>
          {/* ConfirmDialog portals to document.body via ModalShell, outside the
              wipe's inert wrapper, so a live overlay here would stay clickable
              underneath an auto-pull wipe. Withholding host controls while the
              viewer has their own match is what keeps that from happening; the
              wipe still doesn't inert portaled overlays in general, so any
              future portaled surface on this page needs the same treatment. */}
          {isHost && !ended && !board.viewerMatchId ? (
            <BoardHostControls tournamentId={board.id} />
          ) : null}
        </div>
      </header>

      <BoardAutoPull
        tournamentId={board.id}
        viewerMatchId={board.viewerMatchId}
      />

      {board.viewerMatchId ? (
        <EnterMatchLink tournamentId={board.id} matchId={board.viewerMatchId} />
      ) : null}

      {board.viewerBye ? (
        <Card className="flex flex-col gap-1 p-4">
          <CapsLabel>Round {board.viewerBye.ordinal}</CapsLabel>
          <span className="text-lg font-bold text-s12">
            Bye round · worth {board.viewerBye.minigames} minigames once the
            round ends
          </span>
        </Card>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Standings
        </h2>
        <div className="overflow-hidden border-2 border-s6 bg-s2">
          <div className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] items-center gap-3 border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
            <span>#</span>
            <span>Team</span>
            <span className="text-right">Games</span>
            <span className="text-right">Score</span>
            <span className="text-right">+/−</span>
          </div>
          <ul className="divide-y-2 divide-s6">
            {board.standings.map((row) => (
              <li
                key={row.id}
                className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] items-center gap-3 px-4 py-3"
              >
                <span className="font-display text-xl text-s10">
                  {row.rank}
                </span>
                <span className="min-w-0 text-lg font-bold text-s12">
                  <TeamName team={row} />
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
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Schedule
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {board.rounds.map((round) => (
            <Card key={round.ordinal} className="flex flex-col gap-2 p-4">
              <span className="text-caps uppercase tracking-widest text-s7">
                Round {round.ordinal}
              </span>
              {isHost && !ended && round.ordinal === earliestPendingOrdinal ? (
                <BoardRoundStart
                  tournamentId={board.id}
                  ordinal={round.ordinal}
                />
              ) : null}
              <ul className="flex flex-col gap-2">
                {round.matches.map((match) => (
                  <li
                    key={match.id}
                    className="flex items-center gap-2 text-body text-s11"
                  >
                    <TeamName team={match.teamA} />
                    {match.teamB ? (
                      <>
                        <span className="text-s7">vs</span>
                        <TeamName team={match.teamB} />
                      </>
                    ) : (
                      <span className="text-caps uppercase tracking-widest text-s7">
                        bye
                      </span>
                    )}
                    {canSpectate && match.live ? (
                      <WipeLink
                        href={`/t/${board.id}/m/${match.id}`}
                        wipeLabel="Spectate"
                        className="slip ml-auto cursor-pointer text-sec font-bold text-accent"
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
    </main>
  );
}
