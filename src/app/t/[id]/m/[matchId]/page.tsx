/**
 * Match page: resolves the viewer's role from membership server-side, seeds the
 * audience-filtered snapshot, and hands it to the client view. A match the
 * viewer cannot see (or a bye) 404s. Every consumer mounts the same tree.
 */
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/profile";
import { gateMatchView } from "@/lib/match/server/read";
import { issueTicket, socketUrlFor } from "@/lib/realtime/ticket";
import { MatchClientView } from "./match-client-view";

export default async function MatchPage(props: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const auth = await requireUser();
  if (!auth.ok) redirect("/login");

  const { id, matchId } = await props.params;
  const gated = await gateMatchView(id, matchId, {
    viewerId: auth.profile.id,
    viewerRole: auth.profile.role,
  });
  if (!gated) notFound();

  // Server components render once per request, so this is the request-time
  // server clock the client seeds its offset from. The react-hooks purity rule
  // targets client render; this server-side read is intentional.
  // eslint-disable-next-line react-hooks/purity
  const serverNow = Date.now();

  // Seeded with the page so the socket client can connect on mount without a
  // round trip. Only minted when the socket transport is the one that will
  // actually run — on the Supabase path these would be unused, and minting
  // would make the page depend on realtime config it does not need.
  const useSocket = process.env.NEXT_PUBLIC_REALTIME_WS === "1";
  const ticket = useSocket ? await issueTicket(matchId, auth.profile.id) : "";
  const socketUrl = useSocket ? socketUrlFor(matchId) : "";

  return (
    <MatchClientView
      key={`${id}:${matchId}`}
      initialView={gated.view}
      serverNow={serverNow}
      tournamentId={id}
      matchId={matchId}
      ticket={ticket}
      socketUrl={socketUrl}
    />
  );
}
