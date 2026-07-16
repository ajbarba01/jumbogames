/**
 * Match page: resolves the viewer's role from membership server-side, seeds the
 * audience-filtered snapshot, and hands it to the client view. A match the
 * viewer cannot see (or a bye) 404s. Every consumer mounts the same tree.
 */
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/profile";
import { getMatchView } from "@/lib/match/server/read";
import { MatchClientView } from "./match-client-view";

export default async function MatchPage(props: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  const { id, matchId } = await props.params;
  const view = await getMatchView(matchId, auth.profile.id);
  if (!view) notFound();

  return (
    <MatchClientView
      key={`${id}:${matchId}`}
      initialView={view}
      tournamentId={id}
      matchId={matchId}
    />
  );
}
