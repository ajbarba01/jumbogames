/**
 * Showcase spec previews for the register's motion vocabulary (docs/UI.md):
 * the Thunk baseline every piece of chrome rides (via the SLIP constants),
 * plus the five moment choreographies — wipe, stamp, odometer, pop, shake —
 * that game surfaces will graduate into kit members. Curves and durations
 * beyond the SLIP constants are spec values recorded here until they land.
 */
"use client";

import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { Button, SLIP_DUR, SLIP_EASE, cx } from "@jumbo/ui";

/** One replayable demo: a bordered stage whose contents remount on replay. */
function Stage({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const [run, setRun] = useState(0);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div
        key={run}
        className={cx(
          "relative flex h-36 items-center justify-center overflow-hidden border-2 border-s6 bg-s2",
          wide ? "w-96" : "w-64",
        )}
      >
        {children}
      </div>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="text-meta font-medium text-s7">{label}</span>
        <Button variant="text" onClick={() => setRun(run + 1)}>
          Replay
        </Button>
      </div>
    </div>
  );
}

/** Baseline mount: the slip-enter grammar (fade + rise) at SLIP timing. */
function MountDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: SLIP_DUR.enter, ease: SLIP_EASE, delay: 0.25 }}
      className="sticker bg-s12 px-5 py-3 text-sec font-bold text-s2 shadow-float"
    >
      A paper sticker mounts
    </motion.div>
  );
}

/** Baseline move: the Thunk settle, felt on a position change. */
function MoveDemo() {
  const [side, setSide] = useState<"left" | "right">("left");
  return (
    <div
      className={cx(
        "flex h-full w-full cursor-pointer items-center px-6",
        side === "left" ? "justify-start" : "justify-end",
      )}
      onClick={() => setSide(side === "left" ? "right" : "left")}
    >
      <motion.div
        layout
        transition={{ duration: SLIP_DUR.move, ease: SLIP_EASE }}
        className="sticker flex h-12 w-12 items-center justify-center bg-accent font-display text-edge"
      >
        ↔
      </motion.div>
    </div>
  );
}

/** Moment: the slam wipe between rounds — a solid panel slaps across. */
function WipeDemo() {
  const frames = { duration: 0.85, times: [0, 0.42, 0.58, 1], delay: 0.3 };
  return (
    <>
      <motion.span
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={frames}
        className="absolute font-display text-xl uppercase text-s8"
      >
        Lobby
      </motion.span>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 1] }}
        transition={frames}
        className="absolute font-display text-xl uppercase text-accent"
      >
        Round 1
      </motion.span>
      <motion.div
        initial={{ x: "-102%" }}
        animate={{ x: ["-102%", "0%", "0%", "102%"] }}
        transition={{ ...frames, ease: [0.83, 0, 0.17, 1] }}
        className="absolute inset-0 bg-accent-2"
      />
    </>
  );
}

/** Moment: the verdict stamp — slams down crooked, the card jolts. */
function StampDemo() {
  return (
    <>
      <motion.div
        animate={{
          x: [0, 3, -2, 0],
          y: [0, 2, -1, 0],
          rotate: [0, 0.5, -0.4, 0],
        }}
        transition={{ duration: 0.24, delay: 0.55 }}
        className="sticker border-s11 bg-s2 px-6 py-4 text-sec font-bold text-s11"
      >
        Segfault Squad
      </motion.div>
      <motion.div
        initial={{ scale: 2.6, rotate: -16, opacity: 0 }}
        animate={{
          scale: [2.6, 0.94, 1.07, 1],
          rotate: [-16, -9, -9, -9],
          opacity: [0, 1, 1, 1],
        }}
        transition={{
          duration: 0.32,
          times: [0, 0.55, 0.75, 1],
          delay: 0.35,
          ease: "easeIn",
        }}
        className="absolute border-4 border-crit px-3 py-0.5 font-display text-xl uppercase text-crit"
      >
        Winner
      </motion.div>
    </>
  );
}

/** Moment: scores roll like a mechanical counter — digits are events. */
function OdometerDemo() {
  const reel = (digits: string[], to: number, duration: number) => (
    <span className="block h-[1em] overflow-hidden">
      <motion.span
        initial={{ y: "0em" }}
        animate={{ y: `-${to}em` }}
        transition={{ duration, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        className="flex flex-col"
      >
        {digits.map((d) => (
          <span key={d} className="block h-[1em]">
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-caps font-bold tracking-[0.07em] text-s8 uppercase">
        Team score
      </span>
      <div className="flex font-display text-4xl leading-none text-accent">
        {reel(["1", "2"], 1, 0.9)}
        {reel(["8", "9", "0", "1", "2", "3", "4"], 6, 1.15)}
      </div>
    </div>
  );
}

/** Moment: the springy pop — a point lands with overshoot, as a reward. */
function PopDemo() {
  return (
    <>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{
          duration: 0.48,
          ease: [0.34, 1.56, 0.64, 1],
          delay: 0.35,
        }}
        className="sticker bg-accent px-5 py-2 font-display text-2xl text-edge"
      >
        2–1
      </motion.div>
      <motion.span
        initial={{ opacity: 0, y: 16, rotate: -8 }}
        animate={{ opacity: [0, 1, 1], y: -34, rotate: 4 }}
        transition={{ duration: 0.7, ease: SLIP_EASE, delay: 0.8 }}
        className="absolute font-hand text-2xl text-ok"
      >
        +1!!
      </motion.span>
    </>
  );
}

/** Moment: the rejection shake — wrong answer, invalid code, illegal move. */
function ShakeDemo() {
  return (
    <motion.div
      animate={{ x: [0, -9, 8, -6, 5, -3, 0] }}
      transition={{ duration: 0.4, delay: 0.4 }}
      className="border-2 border-crit px-6 py-4 text-sec font-bold text-crit"
    >
      ✗ Try again
    </motion.div>
  );
}

/** The motion vocabulary, each on a replayable stage. */
export function MotionDemos(): React.JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      <Stage label="Baseline — mount (SLIP enter: fade + rise)">
        <MountDemo />
      </Stage>
      <Stage label="Baseline — move (SLIP move: the Thunk settle; click the square)">
        <MoveDemo />
      </Stage>
      <Stage label="Moment — slam wipe (between rounds)" wide>
        <WipeDemo />
      </Stage>
      <Stage label="Moment — verdict stamp (round end)" wide>
        <StampDemo />
      </Stage>
      <Stage label="Moment — odometer roll (score changes)">
        <OdometerDemo />
      </Stage>
      <Stage label="Moment — springy pop (a point lands)">
        <PopDemo />
      </Stage>
      <Stage label="Moment — rejection shake (invalid input)">
        <ShakeDemo />
      </Stage>
    </MotionConfig>
  );
}
