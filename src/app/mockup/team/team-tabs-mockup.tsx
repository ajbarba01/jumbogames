/**
 * Post-start tab surface mockup: Board/My team for members (Board/Join a team
 * un-teamed), the team room — roster with leader star, kick, leave, matchup
 * line, amber roster lock — and the persistent picker whose Join collects the
 * game code inline on first tap. The game code is a join credential: the
 * header shows it only when the viewer is on a team or their link carried it;
 * a code-less spectator types it at the picker instead. The board tab renders
 * a full-width fake of the projector board (standings + schedule). Debug panel
 * drives viewer role, lock state, link code, and join failure.
 */
"use client";

import { useRef, useState } from "react";
import { motion, MotionConfig } from "motion/react";
import {
  Button,
  Card,
  CodeInput,
  ConfirmDialog,
  CopyCode,
  Select,
  Spinner,
  Toggle,
  cx,
} from "@jumbo/ui";

const CODE_LENGTH = 6;
const FAKE_REQUEST_MS = 700;
const SHAKE_KEYFRAMES = [0, -9, 8, -6, 5, -3, 0];
const LOCK_LINE = "In a match — opens after this round";

type Viewer = "member" | "leader" | "un-teamed";
const VIEWERS = ["member", "leader", "un-teamed"] as const;

interface MockMember {
  id: string;
  name: string;
}

interface MockTeam {
  id: string;
  name: string;
  colorIndex: number;
  members: MockMember[];
  locked: boolean;
}

const MY_TEAM_MEMBERS: MockMember[] = [
  { id: "p1", name: "Ada" },
  { id: "p2", name: "Grace" },
  { id: "p3", name: "Linus" },
  { id: "p4", name: "June" },
  { id: "p5", name: "Ravi" },
  { id: "p6", name: "Sana" },
];

const OTHER_TEAMS: MockTeam[] = [
  {
    id: "t2",
    name: "Segfaults",
    colorIndex: 2,
    members: [
      { id: "p10", name: "Marco" },
      { id: "p11", name: "Priya" },
      { id: "p12", name: "Sam" },
    ],
    locked: true,
  },
  {
    id: "t3",
    name: "Byte club",
    colorIndex: 3,
    members: [
      { id: "p13", name: "Noor" },
      { id: "p14", name: "Theo" },
    ],
    locked: false,
  },
  {
    id: "t4",
    name: "Stack traces",
    colorIndex: 4,
    members: [
      { id: "p15", name: "Wei" },
      { id: "p16", name: "Dana" },
      { id: "p17", name: "Omar" },
    ],
    locked: false,
  },
  {
    id: "t5",
    name: "Null pointers",
    colorIndex: 5,
    members: [
      { id: "p18", name: "Ivy" },
      { id: "p19", name: "Kofi" },
    ],
    locked: true,
  },
  {
    id: "t6",
    name: "Merge conflicts",
    colorIndex: 6,
    members: [
      { id: "p20", name: "Lena" },
      { id: "p21", name: "Raj" },
      { id: "p22", name: "Tom" },
      { id: "p23", name: "Uma" },
    ],
    locked: false,
  },
  {
    id: "t7",
    name: "Kernel panic",
    colorIndex: 7,
    members: [
      { id: "p24", name: "Zed" },
      { id: "p25", name: "Mira" },
    ],
    locked: false,
  },
  {
    id: "t8",
    name: "Race conditions",
    colorIndex: 8,
    members: [
      { id: "p26", name: "Finn" },
      { id: "p27", name: "Cleo" },
      { id: "p28", name: "Bo" },
    ],
    locked: false,
  },
  {
    id: "t9",
    name: "Syntax terrors",
    colorIndex: 9,
    members: [
      { id: "p29", name: "Yuki" },
      { id: "p30", name: "Pia" },
    ],
    locked: true,
  },
  {
    id: "t10",
    name: "Heap overflow",
    colorIndex: 10,
    members: [
      { id: "p31", name: "Gus" },
      { id: "p32", name: "Nia" },
    ],
    locked: false,
  },
];

interface BoardRow {
  rank: number;
  name: string;
  colorIndex: number;
  games: number;
  score: string;
  movement: number;
}

const BOARD_STANDINGS: BoardRow[] = [
  {
    rank: 1,
    name: "Rocketeers",
    colorIndex: 1,
    games: 5,
    score: "4.2",
    movement: 1,
  },
  {
    rank: 2,
    name: "Segfaults",
    colorIndex: 2,
    games: 5,
    score: "3.9",
    movement: -1,
  },
  {
    rank: 3,
    name: "Merge conflicts",
    colorIndex: 6,
    games: 5,
    score: "3.7",
    movement: 2,
  },
  {
    rank: 4,
    name: "Stack traces",
    colorIndex: 4,
    games: 4,
    score: "3.3",
    movement: -1,
  },
  {
    rank: 5,
    name: "Null pointers",
    colorIndex: 5,
    games: 4,
    score: "3.0",
    movement: 1,
  },
  {
    rank: 6,
    name: "Byte club",
    colorIndex: 3,
    games: 4,
    score: "2.8",
    movement: -2,
  },
  {
    rank: 7,
    name: "Kernel panic",
    colorIndex: 7,
    games: 3,
    score: "2.4",
    movement: 1,
  },
  {
    rank: 8,
    name: "Race conditions",
    colorIndex: 8,
    games: 3,
    score: "2.1",
    movement: 0,
  },
  {
    rank: 9,
    name: "Syntax terrors",
    colorIndex: 9,
    games: 2,
    score: "1.6",
    movement: 1,
  },
  {
    rank: 10,
    name: "Heap overflow",
    colorIndex: 10,
    games: 2,
    score: "1.2",
    movement: -1,
  },
];

interface BoardMatch {
  a: string;
  b?: string;
  live?: boolean;
}

const BOARD_ROUNDS: {
  ordinal: number;
  state: "done" | "live" | "pending";
  matches: BoardMatch[];
}[] = [
  {
    ordinal: 1,
    state: "done",
    matches: [
      { a: "Rocketeers", b: "Heap overflow" },
      { a: "Segfaults", b: "Syntax terrors" },
      { a: "Merge conflicts", b: "Race conditions" },
      { a: "Stack traces", b: "Kernel panic" },
      { a: "Null pointers", b: "Byte club" },
    ],
  },
  {
    ordinal: 2,
    state: "live",
    matches: [
      { a: "Rocketeers", b: "Segfaults", live: true },
      { a: "Merge conflicts", b: "Stack traces", live: true },
      { a: "Null pointers", b: "Kernel panic", live: true },
      { a: "Byte club", b: "Race conditions", live: true },
      { a: "Syntax terrors", b: "Heap overflow", live: true },
    ],
  },
  {
    ordinal: 3,
    state: "pending",
    matches: [
      { a: "Rocketeers", b: "Merge conflicts" },
      { a: "Segfaults", b: "Null pointers" },
      { a: "Stack traces", b: "Byte club" },
      { a: "Kernel panic", b: "Syntax terrors" },
      { a: "Race conditions", b: "Heap overflow" },
    ],
  },
];

const BOARD_COLOR_BY_NAME = new Map(
  BOARD_STANDINGS.map((row) => [row.name, row.colorIndex]),
);

// Schedule order: the live round is pinned to the top (the action worth
// watching), then upcoming rounds, then finished ones.
const ROUND_STATE_ORDER: Record<
  (typeof BOARD_ROUNDS)[number]["state"],
  number
> = { live: 0, pending: 1, done: 2 };
const SCHEDULE_ROUNDS = [...BOARD_ROUNDS].sort(
  (a, b) =>
    ROUND_STATE_ORDER[a.state] - ROUND_STATE_ORDER[b.state] ||
    a.ordinal - b.ordinal,
);

function TeamChip({ colorIndex }: { colorIndex: number }): React.JSX.Element {
  return (
    <span
      className="h-4 w-4 flex-none rounded-r1"
      style={{ background: `var(--color-team-${colorIndex})` }}
      aria-hidden
    />
  );
}

function LockLine(): React.JSX.Element {
  return (
    <p className="flex items-center gap-2 text-meta font-bold text-warn">
      <span aria-hidden>●</span>
      {LOCK_LINE}
    </p>
  );
}

/** Composed segmented tab pair — a kit-member gap; sticker faces here. */
function TabBar({
  tabs,
  active,
  onSelect,
}: {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
}): React.JSX.Element {
  return (
    <div role="tablist" aria-label="Game views" className="flex gap-3">
      {tabs.map((tab) => {
        const selected = tab === active;
        return (
          <button
            key={tab}
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect(tab)}
            className={cx(
              "slip sticker cursor-pointer rounded-r2 px-6 py-2 text-sec font-bold",
              selected
                ? "sticker-pressed bg-s4 text-s12"
                : "sticker-hover sticker-press bg-s2 text-s9",
            )}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
}

function BoardTeamName({
  name,
  align = "left",
}: {
  name: string;
  align?: "left" | "right";
}): React.JSX.Element {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center gap-2.5",
        align === "right" && "justify-end",
      )}
    >
      <TeamChip colorIndex={BOARD_COLOR_BY_NAME.get(name) ?? 1} />
      <span className="truncate">{name}</span>
    </span>
  );
}

function Movement({ movement }: { movement: number }): React.JSX.Element {
  if (movement > 0) return <span className="text-ok">▲{movement}</span>;
  if (movement < 0)
    return <span className="text-crit">▼{Math.abs(movement)}</span>;
  return <span className="text-s6">—</span>;
}

/** A full-width fake of the real projector board (round-board.tsx): the
 *  standings table as the hero, the round-robin schedule beneath it. */
function BoardExample(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Standings
        </h2>
        <div className="overflow-hidden border-2 border-s6 bg-s2">
          <div className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] items-center gap-3 border-b-2 border-s6 px-4 py-2 text-caps uppercase tracking-widest text-s7">
            <span>#</span>
            <span>Team</span>
            <span className="text-right">Games</span>
            <span className="text-right">Score</span>
            <span className="text-right">+/−</span>
          </div>
          <ul className="divide-y-2 divide-s6">
            {BOARD_STANDINGS.map((row) => (
              <li
                key={row.name}
                className="grid grid-cols-[3rem_1fr_5rem_6rem_4rem] items-center gap-3 px-4 py-3"
              >
                <span className="font-display text-xl text-s10">
                  {row.rank}
                </span>
                <span className="min-w-0 text-lg font-bold text-s12">
                  <BoardTeamName name={row.name} />
                </span>
                <span className="text-right font-mono text-xl text-s12">
                  {row.games}
                </span>
                <span className="text-right font-mono text-lg text-s9">
                  {row.score}
                </span>
                <span className="text-right font-mono text-lg">
                  <Movement movement={row.movement} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-caps uppercase tracking-widest text-s7">
          Schedule
        </h2>
        {/* Live round pinned to the top, then upcoming, then finished. */}
        <div className="flex flex-col gap-3">
          {SCHEDULE_ROUNDS.map((round) => (
            <Card
              key={round.ordinal}
              className={cx(
                "flex flex-col gap-2 p-4",
                // The live round is the one worth watching — a run-hued ring
                // and badge lift it out of the schedule (status hue on live
                // state, per UI.md).
                round.state === "live" && "ring-2 ring-run",
              )}
            >
              <span className="flex items-center gap-2 text-caps uppercase tracking-widest text-s7">
                Round {round.ordinal}
                {round.state === "done" && (
                  <span className="text-ok">done</span>
                )}
                {round.state === "live" && (
                  <span className="rounded-r1 bg-run px-1.5 py-0.5 text-edge">
                    live
                  </span>
                )}
              </span>
              <ul className="flex flex-col gap-2">
                {round.matches.map((match) => (
                  <li
                    key={`${match.a}-${match.b}`}
                    // Symmetric spacer (col 1) balances the Spectate slot
                    // (col 5) so `vs` lands on the true row center.
                    className="grid grid-cols-[7rem_1fr_auto_1fr_7rem] items-center gap-x-3 text-body text-s11"
                  >
                    <span aria-hidden />
                    <BoardTeamName name={match.a} align="right" />
                    {match.b ? (
                      <>
                        <span className="text-s7">vs</span>
                        <BoardTeamName name={match.b} />
                      </>
                    ) : (
                      <span className="col-span-2 text-caps uppercase tracking-widest text-s7">
                        bye
                      </span>
                    )}
                    {match.live ? (
                      <Button variant="text" className="justify-self-end">
                        Spectate
                      </Button>
                    ) : (
                      <span aria-hidden />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

function TeamRoom({
  isLeader,
  locked,
  onGone,
}: {
  isLeader: boolean;
  locked: boolean;
  onGone: () => void;
}): React.JSX.Element {
  const viewerId = isLeader ? "p1" : "p2";
  const [members, setMembers] = useState(MY_TEAM_MEMBERS);
  const [kickTarget, setKickTarget] = useState<MockMember | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const finish = (after: () => void) => {
    setBusy(true);
    timer.current = setTimeout(() => {
      setBusy(false);
      after();
    }, FAKE_REQUEST_MS);
  };

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <TeamChip colorIndex={1} />
          <span className="truncate font-display text-2xl uppercase text-s12">
            Rocketeers
          </span>
        </div>
        <span className="text-caps uppercase tracking-widest text-s7">
          {members.length} players
        </span>
      </div>

      <p className="text-sec text-s10">
        {locked
          ? "In a match vs Segfaults."
          : "Next round: vs Merge conflicts."}
      </p>

      {locked && <LockLine />}

      {/* Roster flows into two columns so a full team fills the width instead
          of running as one narrow strip. */}
      <ul className="grid gap-x-10 sm:grid-cols-2">
        {members.map((member) => {
          const isSelf = member.id === viewerId;
          const memberIsLeader = member.id === "p1";
          return (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 border-t-2 border-s6 py-2.5"
            >
              <span
                className={cx(
                  "min-w-0 truncate text-sec",
                  isSelf ? "font-bold text-s12" : "text-s10",
                )}
              >
                {member.name}
                {memberIsLeader && (
                  <span
                    aria-label="Team leader"
                    role="img"
                    className="ml-2 text-accent"
                  >
                    ★
                  </span>
                )}
              </span>
              {isLeader && !isSelf && (
                <Button
                  variant="ghost"
                  icon
                  aria-label={`Remove ${member.name} from the team`}
                  disabled={locked || busy}
                  onClick={() => setKickTarget(member)}
                >
                  ✕
                </Button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t-2 border-s6 pt-3">
        <Button
          variant="ghost"
          disabled={locked || busy}
          onClick={() => setConfirmLeave(true)}
        >
          Leave team
        </Button>
        {busy && <Spinner label="Working" />}
      </div>

      <ConfirmDialog
        open={kickTarget !== null}
        title={`Remove ${kickTarget?.name ?? ""}?`}
        description="They can rejoin with the game code between rounds."
        confirmLabel="Remove"
        busy={busy}
        onConfirm={() =>
          finish(() => {
            setMembers((prev) => prev.filter((m) => m.id !== kickTarget?.id));
            setKickTarget(null);
          })
        }
        onClose={() => setKickTarget(null)}
      />
      <ConfirmDialog
        open={confirmLeave}
        title="Leave the team?"
        description="You can rejoin with the game code between rounds."
        confirmLabel="Leave"
        busy={busy}
        onConfirm={() =>
          finish(() => {
            setConfirmLeave(false);
            onGone();
          })
        }
        onClose={() => setConfirmLeave(false)}
      />
    </Card>
  );
}

function PickerRow({
  team,
  expanded,
  hasCode,
  failJoins,
  busy,
  onTap,
  onCancel,
  onJoined,
  onBusy,
}: {
  team: MockTeam;
  expanded: boolean;
  hasCode: boolean;
  failJoins: boolean;
  busy: boolean;
  onTap: () => void;
  onCancel: () => void;
  onJoined: (team: MockTeam) => void;
  onBusy: (busy: boolean) => void;
}): React.JSX.Element {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shakes, setShakes] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const join = () => {
    onBusy(true);
    setError(null);
    timer.current = setTimeout(() => {
      onBusy(false);
      if (failJoins) {
        setError("That code doesn’t match this game.");
        setShakes((n) => n + 1);
        return;
      }
      onJoined(team);
    }, FAKE_REQUEST_MS);
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamChip colorIndex={team.colorIndex} />
          <span className="truncate font-display text-lg uppercase text-s12">
            {team.name}
          </span>
        </div>
        <Button
          variant="outline"
          disabled={team.locked || busy || expanded}
          onClick={() => (hasCode ? join() : onTap())}
        >
          Join
        </Button>
      </div>
      <p className="truncate text-meta text-s7">
        {team.members.length} players ·{" "}
        {team.members.map((m) => m.name).join(" · ")}
      </p>
      {team.locked && <LockLine />}
      {expanded && !team.locked && (
        <motion.form
          key={shakes}
          animate={shakes > 0 ? { x: SHAKE_KEYFRAMES } : undefined}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-3 border-t-2 border-s6 pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (code.length === CODE_LENGTH) join();
          }}
        >
          <span className="text-caps font-bold uppercase tracking-widest text-s8">
            Enter the game code to join
          </span>
          <CodeInput
            aria-label="Game code"
            value={code}
            onChange={(value) => {
              setCode(value);
              setError(null);
            }}
            placeholder="JUMBOS"
            invalid={error !== null}
          />
          {error && <p className="text-meta font-bold text-crit">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="primary"
              disabled={busy || code.length < CODE_LENGTH}
            >
              {busy ? "Joining…" : "Confirm"}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </motion.form>
      )}
    </Card>
  );
}

function TeamPicker({
  hasCode,
  failJoins,
  onJoined,
}: {
  hasCode: boolean;
  failJoins: boolean;
  onJoined: (team: MockTeam) => void;
}): React.JSX.Element {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sec text-s9">
        Pick a team to play. Teams in a live match open after their round.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {OTHER_TEAMS.map((team) => (
          <PickerRow
            key={team.id}
            team={team}
            expanded={expandedId === team.id}
            hasCode={hasCode}
            failJoins={failJoins}
            busy={busy}
            onTap={() => setExpandedId(team.id)}
            onCancel={() => setExpandedId(null)}
            onJoined={onJoined}
            onBusy={setBusy}
          />
        ))}
      </div>
    </div>
  );
}

export function TeamTabsMockup(): React.JSX.Element {
  const [viewer, setViewer] = useState<Viewer>("member");
  const [locked, setLocked] = useState(false);
  const [hasCode, setHasCode] = useState(true);
  const [failJoins, setFailJoins] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [joined, setJoined] = useState<MockTeam | null>(null);
  const [left, setLeft] = useState(false);

  const teamed = (viewer !== "un-teamed" && !left) || joined !== null;
  const roomTab = teamed ? "My team" : "Join a team";
  const [tab, setTab] = useState("Board");
  const activeTab = tab === "Board" ? "Board" : roomTab;

  const reset = () => {
    setJoined(null);
    setLeft(false);
    setTab("Board");
    setResetKey((n) => n + 1);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh bg-s1">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6">
          <span className="text-meta font-bold uppercase tracking-widest text-s7">
            Mockup · /t/[id] after start
          </span>
          <header className="flex flex-wrap items-end justify-between gap-3">
            <h1 className="font-display text-3xl uppercase text-s12">
              Thursday hacknight
            </h1>
            {(teamed || hasCode) && (
              <CopyCode value="H7K2QF" aria-label="Copy game code" />
            )}
          </header>

          <TabBar
            tabs={["Board", roomTab]}
            active={activeTab}
            onSelect={setTab}
          />

          {activeTab === "Board" ? (
            <BoardExample />
          ) : teamed ? (
            joined !== null ? (
              <Card className="flex max-w-md flex-col gap-2 p-5">
                <div className="flex items-center gap-2.5">
                  <TeamChip colorIndex={joined.colorIndex} />
                  <span className="font-display text-lg uppercase text-s12">
                    {joined.name}
                  </span>
                </div>
                <p className="text-sec text-s9">
                  You’re on the roster — next round pulls you in automatically.
                </p>
              </Card>
            ) : (
              <TeamRoom
                key={`${viewer}-${locked}-${resetKey}`}
                isLeader={viewer === "leader"}
                locked={locked}
                onGone={() => setLeft(true)}
              />
            )
          ) : (
            <TeamPicker
              key={`${hasCode}-${failJoins}-${resetKey}`}
              hasCode={hasCode}
              failJoins={failJoins}
              onJoined={setJoined}
            />
          )}
        </main>

        <Card className="fixed bottom-4 left-4 z-(--z-sticky) flex w-64 flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-s10">
            Viewer
            <Select
              options={VIEWERS}
              value={viewer}
              onChange={(v) => {
                setViewer(v as Viewer);
                reset();
              }}
              aria-label="Viewer"
            />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            My team in a live match
            <Toggle on={locked} onChange={setLocked} aria-label="Team locked" />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            Link carries the code
            <Toggle
              on={hasCode}
              onChange={setHasCode}
              aria-label="Link carries the code"
            />
          </label>
          <label className="flex flex-col gap-1 text-s10">
            Fail joins
            <Toggle
              on={failJoins}
              onChange={setFailJoins}
              aria-label="Fail joins"
            />
          </label>
          <Button onClick={reset}>Reset</Button>
        </Card>
      </div>
    </MotionConfig>
  );
}
