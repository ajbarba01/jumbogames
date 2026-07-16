/**
 * Temporary phase-3 bridge: a link that takes a member into their live match.
 * The kit's Button has no `asChild`, so this renders a Next Link styled with
 * the same primary-button face instead of wrapping a Button around it. Phase 4
 * replaces this with round-start auto-pull and board spectate entry.
 */
import Link from "next/link";

export function EnterMatchLink({
  tournamentId,
  matchId,
}: {
  tournamentId: string;
  matchId: string;
}): React.JSX.Element {
  return (
    <Link
      href={`/t/${tournamentId}/m/${matchId}`}
      className="slip sticker sticker-hover sticker-press cursor-pointer rounded-r2 bg-accent px-4 py-1.5 text-sec font-bold text-edge"
    >
      Enter your match
    </Link>
  );
}
