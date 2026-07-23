/**
 * Manual counterpart to board auto-pull: a link that takes a member back into
 * their live match, covered by the slam wipe, for anyone who navigated away
 * mid-match. The kit's Button has no `asChild`, so this renders a WipeLink
 * styled with the same primary-button face instead of wrapping a Button
 * around it.
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
