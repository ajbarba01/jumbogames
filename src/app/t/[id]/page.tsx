/**
 * Tournament lobby page. Guards auth, loads the shared tournament state, and
 * hands a serializable snapshot to the live lobby island. A missing tournament
 * 404s. Once the tournament starts, the island shows the started placeholder
 * until the round board (next milestone) replaces it.
 */
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/profile";
import { getTournamentState, toLobbyDTO } from "@/lib/tournament/lobby";
import { LobbyView } from "./lobby-view";

export default async function LobbyPage(props: {
  params: Promise<{ id: string }>;
}) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  const { id } = await props.params;
  const state = await getTournamentState(id);
  if (!state) notFound();

  return (
    <LobbyView
      initialState={toLobbyDTO(state)}
      viewerId={auth.profile.id}
      isHost={state.hostId === auth.profile.id}
    />
  );
}
