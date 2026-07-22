/**
 * Temporary bridge: a link that takes a member into their live match, covered
 * by the slam wipe. The kit's Button has no `asChild`, so this renders a
 * WipeLink styled with the same primary-button face instead of wrapping a
 * Button around it. Board auto-pull and spectate entry replace this later and
 * should carry the wipe treatment over.
 */
import { WipeLink } from "@/components/wipe/WipeLink";

export function EnterMatchLink({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}): React.JSX.Element {
  return (
    <WipeLink
      href={`/t/${tournamentId}/m/${matchId}`}
      wipeLabel="Your match"
      className="slip sticker sticker-hover sticker-press cursor-pointer rounded-r2 bg-accent px-4 py-1.5 text-sec font-bold text-edge"
    >
      Enter your match
    </WipeLink>
  );
}
