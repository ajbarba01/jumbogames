/**
 * Board tab body. Renders the round board once a board snapshot exists and
 * nothing before the game starts — the tab bar's disabled Board tab and its
 * status line already say why the board is empty, so this panel stays silent
 * rather than repeating it.
 */
import type { BoardDTO } from "@/lib/tournament/board";
import { RoundBoard } from "./round-board";

export function BoardPanel({
  board,
}: {
  board: BoardDTO | null;
}): React.JSX.Element | null {
  if (board === null) return null;
  return <RoundBoard board={board} />;
}
