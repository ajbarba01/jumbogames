/**
 * Game page. Guards auth, admits any signed-in viewer (DESIGN decision 16),
 * then renders the one tabbed surface that serves every phase. The game code is
 * a join credential, not page furniture: it reaches the client only for someone
 * who already holds it — a member, the host, or a link that carried it — so an
 * open board never hands a spectator the write key.
 */
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/profile";
import { codeCookieName, presentedCode } from "@/lib/tournament/code-grant";
import { gateTournamentRead, toLobbyDTO } from "@/lib/tournament/lobby";
import { holdsGameCode } from "@/lib/tournament/viewer";
import { getBoardState } from "@/lib/tournament/board";
import { GameView } from "./game-view";

export default async function GamePage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ c?: string }>;
}) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  const { id } = await props.params;
  const gated = await gateTournamentRead(id, {
    viewerId: auth.profile.id,
    viewerRole: auth.profile.role,
  });
  if (!gated) notFound();
  const { state, relation } = gated;

  // The link's `?c=` is scrubbed from the address bar as soon as it has been
  // honored, so the code a viewer presented earlier is read back from the
  // per-game cookie the exchange route set. Same predicate either way: the
  // cookie is checked against the real code, never trusted as a flag.
  const { c } = await props.searchParams;
  const cookieCode = (await cookies()).get(codeCookieName(id))?.value ?? null;
  const presented = presentedCode(c ?? null, cookieCode);
  const holdsCode = holdsGameCode(relation, state.code, presented);
  // The client scrubs ?c= out of the address bar once it has been honored
  // (decision 16), which also drops it from the router's URL — so tell the
  // client which grant came from the link itself. That grant belongs to the tab
  // for its lifetime; a grant that came from membership is re-derived on every
  // render and must lapse when the membership does. Asking the same predicate
  // with a bare guest relation is what isolates "the URL alone would grant it".
  const urlGrantsCode = holdsGameCode(
    { as: "guest", canHost: false },
    state.code,
    presented,
  );

  const board =
    state.phase === "lobby" ? null : await getBoardState(id, auth.profile.id);
  if (state.phase !== "lobby" && !board) notFound();

  return (
    <GameView
      tournament={toLobbyDTO(state, holdsCode)}
      board={board}
      viewerId={auth.profile.id}
      viewerDisplayName={auth.profile.displayName}
      code={holdsCode ? state.code : null}
      linkCode={urlGrantsCode ? state.code : null}
      canHost={relation.canHost}
    />
  );
}
