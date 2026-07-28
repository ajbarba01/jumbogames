/**
 * The single client surface for a game, serving every phase: the header, the
 * viewer-personal match/bye strip, a two-tab body (the board, and either the
 * team room over a name-only list of the other teams, or the team picker), and
 * the host's floating dock. It owns the
 * page's one Realtime subscription, the tab state, the roster-lock set derived
 * from the board, and the mutation seam every panel writes through — the panels
 * themselves render the state handed to them and never fetch on their own. It
 * also scrubs the join code out of the address bar once the server has admitted
 * a code-bearing link, so the URL a viewer shares onward carries read access
 * only (DESIGN decision 16).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CopyCode, StatusLine, Tabs, cx, type TabSpec } from "@jumbo/ui";
import { useWipeNav } from "@/components/wipe/use-wipe-nav";
import { subscribeToTournament } from "@/lib/realtime/subscribe";
import {
  subscribeToLobbyPresence,
  type LobbyPresence,
} from "@/lib/realtime/presence";
import type { BoardDTO, BoardMatch } from "@/lib/tournament/board";
import type { LobbyDTO } from "@/lib/tournament/lobby";
import type { PlacementMatch } from "@/lib/tournament/placement";
import { isTeamLocked } from "@/lib/tournament/roster-lock";
import { useRefreshOnRestore } from "./use-refresh-on-restore";
import { BoardAutoPull } from "./board-auto-pull";
import { BoardPanel } from "./board-panel";
import { EnterMatchLink } from "./enter-match-link";
import { HostDock } from "./host-dock";
import { TeamPicker } from "./team-picker";
import { TeamRoom } from "./team-room";
import { OtherTeams } from "./other-teams";

export interface GameViewProps {
  tournament: LobbyDTO;
  board: BoardDTO | null;
  viewerId: string;
  viewerDisplayName: string;
  /** null when the viewer holds no code — the header hides CopyCode. */
  code: string | null;
  /** The code when the `?c=` link alone granted it; null otherwise. */
  linkCode: string | null;
  canHost: boolean;
}

/**
 * Runs one mutation through its route handler. Resolves null when the route
 * accepted it, or the route's error string when it did not. A caller whose
 * success is a game beat rather than an ordinary state change passes
 * `onSuccess` to take over from the default bare refresh.
 */
export type GameAction = (
  request: () => Promise<Response>,
  onSuccess?: () => void,
) => Promise<string | null>;

function toPlacementMatches(board: BoardDTO | null): PlacementMatch[] {
  if (board === null) return [];
  return board.rounds.flatMap((round) =>
    round.matches.map((match) => ({
      id: match.id,
      teamAId: match.teamA.id,
      teamBId: match.teamB?.id ?? null,
      live: match.live,
    })),
  );
}

// A bye has no opponent, so it yields no line at all rather than a half
// sentence: the bye card above the tab bar is where that state is told.
function describeMatchup(
  board: BoardDTO | null,
  teamId: string,
  locked: boolean,
): string | null {
  if (board === null) return null;
  const holds = (match: BoardMatch): boolean =>
    match.teamA.id === teamId || match.teamB?.id === teamId;
  const opponent = (match: BoardMatch): string | null =>
    (match.teamA.id === teamId ? match.teamB : match.teamA)?.name ?? null;

  if (locked) {
    const live = board.rounds
      .flatMap((round) => round.matches)
      .find((match) => match.live && holds(match));
    const name = live ? opponent(live) : null;
    return name === null ? null : `In a match vs ${name}.`;
  }

  const next = board.rounds
    .filter((round) => round.state === "pending")
    .flatMap((round) => round.matches)
    .find(holds);
  const name = next ? opponent(next) : null;
  return name === null ? null : `Next round: vs ${name}.`;
}

export function GameView({
  tournament,
  board,
  viewerId,
  viewerDisplayName,
  code,
  linkCode,
  canHost,
}: GameViewProps): React.JSX.Element {
  const router = useRouter();
  const { cover } = useWipeNav();
  const [active, setActive] = useState(
    tournament.phase === "lobby" ? "team" : "board",
  );
  const [present, setPresent] = useState<LobbyPresence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // The start slam is one beat per page life, but the things that can trigger
  // it — the host's own start, and every broadcast that arrives before
  // router.refresh() has landed the new server render — can each fire more than
  // once. The old phase effect was structurally once-per-mount; this ref is
  // what replaces that guarantee, so two racing broadcasts can't stack two
  // cover() calls on top of each other.
  const slammed = useRef(false);
  const slam = useCallback(() => {
    if (slammed.current) return;
    slammed.current = true;
    setActive("board");
    cover(() => router.refresh());
  }, [cover, router]);

  // The code rides in on ?c= so the server can admit a link-borne joiner, but
  // it is a write credential: leaving it in the address bar turns the natural
  // "come spectate, here's the link" gesture into handing over the key (DESIGN
  // decision 16). The server already read searchParams.c on the initial
  // request, so dropping it now costs nothing. replaceState only — Next patches
  // it to sync the router's canonical URL without refetching, whereas
  // router.replace would re-navigate.
  useEffect(() => {
    const url = new URL(window.location.href);
    const carried = url.searchParams.get("c");
    if (carried === null) return;
    const scrub = () => {
      url.searchParams.delete("c");
      window.history.replaceState(null, "", url.toString());
    };
    // Hand the code to the server for an httpOnly cookie before dropping it
    // from the URL. Until this lands the grant exists only in this mount's
    // state, and anything that remounts the tree loses it — which is exactly
    // how a fresh joiner ended up back at a code prompt. Scrub either way:
    // leaving a write credential in a shared address bar is the worse failure.
    void fetch(`/api/tournaments/${tournament.id}/code-grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: carried }),
    })
      .catch(() => null)
      .finally(scrub);
  }, [tournament.id]);

  // The strip also drops ?c= from the router's URL, so every later
  // router.refresh() re-renders with linkCode null — which would revoke, mid
  // session, a grant the server already honored and leave a link-borne viewer
  // staring at a code prompt. Freezing the mount-time value keeps the link's
  // grant for the tab's lifetime, exactly as the un-stripped URL used to. A
  // grant that came from membership is deliberately NOT frozen: it rides `code`
  // and lapses the moment the viewer leaves their team.
  const [linkGrantedCode] = useState(linkCode);
  const heldCode = code ?? linkGrantedCode;

  useEffect(() => {
    return subscribeToTournament(tournament.id, () => {
      if (tournament.phase !== "lobby") {
        router.refresh();
        return;
      }
      // Pre-start the cheap DTO fetch is what tells a phase flip apart from a
      // roster change, so the slam only fires on the beat that earns it. A
      // probe that fails — non-ok or a dropped request — must still re-read
      // server truth rather than swallow the broadcast, so it falls through to
      // the bare refresh.
      void fetch(`/api/tournaments/${tournament.id}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)
        .then((data: { tournament: LobbyDTO } | null) => {
          if (data && data.tournament.phase !== "lobby") {
            slam();
          } else {
            router.refresh();
          }
        });
    });
  }, [tournament.id, tournament.phase, router, slam]);

  useRefreshOnRestore(useCallback(() => router.refresh(), [router]));

  const inLobby = tournament.phase === "lobby";
  useEffect(() => {
    if (!inLobby) return;
    return subscribeToLobbyPresence(
      tournament.id,
      { profileId: viewerId, displayName: viewerDisplayName },
      setPresent,
    );
  }, [inLobby, tournament.id, viewerId, viewerDisplayName]);

  const act = useCallback<GameAction>(
    async (request, onSuccess) => {
      setBusy(true);
      setError(null);
      const res = await request();
      setBusy(false);
      if (res.ok) {
        // onSuccess is dispatched synchronously here, never awaited: a caller
        // that covers its refresh needs the update scheduled before its action
        // returns or React drops it out of the wipe's transition.
        if (onSuccess) onSuccess();
        else router.refresh();
        return null;
      }
      const data = await res.json().catch(() => null);
      const message =
        typeof data?.error === "string" ? data.error : "Something went wrong.";
      setError(message);
      return message;
    },
    [router],
  );

  // The start beat is the same one the subscription's phase-flip branch plays
  // for every other client: the host who pressed the button must land on the
  // board under the wipe too, not on the picker behind an uncovered swap. Same
  // slam, so it shares the same once-only guard — the host also receives the
  // broadcast their own start emitted.
  const onStarted = slam;

  const myTeam = tournament.teams.find((team) =>
    team.members.some((member) => member.profileId === viewerId),
  );
  const placements = toPlacementMatches(board);
  const lockedTeamIds = new Set(
    tournament.teams
      .filter((team) => isTeamLocked(placements, team.id))
      .map((team) => team.id),
  );
  const myTeamLocked = myTeam !== undefined && lockedTeamIds.has(myTeam.id);

  const tabs: TabSpec[] = [
    { id: "board", label: "Board", disabled: inLobby },
    { id: "team", label: myTeam ? "My team" : "Join a team" },
  ];

  // ConfirmDialog portals to document.body via ModalShell, outside the wipe's
  // inert wrapper, so a live overlay here would stay clickable underneath an
  // auto-pull wipe. Withholding host controls while the viewer has their own
  // match is what keeps that from happening; the wipe still doesn't inert
  // portaled overlays in general, so any future portaled surface on this page
  // needs the same treatment.
  const showDock = canHost && !board?.viewerMatchId;

  return (
    <>
      <main
        className={cx(
          "mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-8 pt-8",
          // The dock is fixed, so it sits outside flow and would otherwise
          // cover the last row of the panel it belongs to.
          showDock ? "pb-32" : "pb-8",
        )}
      >
        <header className="flex flex-col gap-2">
          <Link
            href="/"
            className="slip text-meta font-bold uppercase tracking-widest text-s7 hover:text-s10"
          >
            ← Home
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="min-w-0 font-display text-3xl uppercase text-s12">
              {tournament.name}
            </h1>
            {heldCode !== null ? (
              <div className="flex flex-col items-end">
                <span className="text-caps uppercase tracking-widest text-s7">
                  Game code
                </span>
                <CopyCode
                  value={heldCode}
                  size="display"
                  aria-label="Copy game code"
                  data-testid="game-code"
                />
              </div>
            ) : null}
          </div>
        </header>

        <BoardAutoPull
          tournamentId={tournament.id}
          viewerMatchId={board?.viewerMatchId ?? null}
        />

        {/* Personal to the viewer rather than shared with the board, so both
            live above the tabs: a player reading the team tab must still see
            that their own match is running. */}
        {board?.viewerMatchId ? (
          <div className="flex">
            <EnterMatchLink
              tournamentId={tournament.id}
              matchId={board.viewerMatchId}
            />
          </div>
        ) : null}

        {board?.viewerBye ? (
          <Card className="flex flex-col gap-1 p-4">
            <span className="text-caps uppercase tracking-widest text-s7">
              Round {board.viewerBye.ordinal}
            </span>
            <span className="text-lg font-bold text-s12">
              Bye round · worth {board.viewerBye.minigames} minigames once the
              round ends
            </span>
          </Card>
        ) : null}

        <Tabs
          tabs={tabs}
          active={active}
          onSelect={setActive}
          label="Game views"
        />

        {inLobby ? (
          <StatusLine>Board opens when the host starts the game</StatusLine>
        ) : null}

        {error !== null ? (
          <StatusLine tone="crit" live>
            {error}
          </StatusLine>
        ) : null}

        <div
          role="tabpanel"
          id={`panel-${active}`}
          aria-labelledby={`tab-${active}`}
        >
          {active === "board" ? (
            <BoardPanel board={board} />
          ) : myTeam ? (
            <>
              <TeamRoom
                tournamentId={tournament.id}
                team={myTeam}
                viewerId={viewerId}
                locked={myTeamLocked}
                matchupLine={describeMatchup(board, myTeam.id, myTeamLocked)}
                inLobby={inLobby}
                busy={busy}
                act={act}
              />
              <OtherTeams
                teams={tournament.teams}
                myTeamId={myTeam.id}
                inLobby={inLobby}
              />
            </>
          ) : (
            <TeamPicker
              tournamentId={tournament.id}
              teams={tournament.teams}
              hostId={tournament.hostId}
              lockedTeamIds={lockedTeamIds}
              code={heldCode}
              inLobby={inLobby}
              canHost={canHost}
              present={present}
              busy={busy}
              act={act}
            />
          )}
        </div>
      </main>

      {showDock ? (
        <HostDock
          tournamentId={tournament.id}
          phase={tournament.phase}
          teams={tournament.teams}
          rounds={board?.rounds ?? []}
          busy={busy}
          act={act}
          onStarted={onStarted}
        />
      ) : null}
    </>
  );
}
