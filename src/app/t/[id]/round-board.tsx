/**
 * Projector round board: the standings table as the hero, with the round-robin
 * schedule beneath it. Read off a screen from meters away, so type steps up and
 * state reads at a glance. Presentational and server-rendered; it takes a board
 * snapshot and renders it. Movement arrows and live match status fill in as
 * results arrive in later milestones.
 */
import { Card } from "@jumbo/ui";
import type { BoardDTO, BoardTeamRef } from "@/lib/tournament/board";
import { BoardHostControls } from "./board-host-controls";

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
}: {
  board: BoardDTO;
  isHost: boolean;
}) {
  const ended = board.phase === "complete";
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
          {isHost && !ended ? (
            <BoardHostControls tournamentId={board.id} />
          ) : null}
        </div>
      </header>

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
