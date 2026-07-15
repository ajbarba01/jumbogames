/**
 * Tournament page. Guards auth, then renders by phase: the live lobby island
 * while teams form, or the projector round board once the tournament is active.
 * A missing tournament 404s.
 */
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/profile";
import { getTournamentState, toLobbyDTO } from "@/lib/tournament/lobby";
import { getBoardState } from "@/lib/tournament/board";
import { LobbyView } from "./lobby-view";
import { RoundBoard } from "./round-board";
import { BoardRefresher } from "./board-refresher";

export default async function TournamentPage(props: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  const { id } = await props.params;
  const state = await getTournamentState(id);
  if (!state) notFound();

  if (state.phase === "lobby") {
    return (
      <LobbyView
        initialState={toLobbyDTO(state)}
        viewerId={auth.profile.id}
        isHost={state.hostId === auth.profile.id}
      />
    );
  }

  const board = await getBoardState(id);
  if (!board) notFound();
  return (
    <BoardRefresher tournamentId={id}>
      <RoundBoard board={board} />
    </BoardRefresher>
  );
}
