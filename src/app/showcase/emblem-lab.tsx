/**
 * Emblem lab: every registered minigame's emblem at the three sizes it has to
 * survive — the create-form chip, the match-home slot card, and the gate
 * screen — plus each one inside the two frames that actually carry it.
 *
 * This started as a bake-off between four candidate marks for Tug O' Lore and
 * became the emblem register's living spec: a mark that stops reading at 20px
 * is a mark that fails on the create form, and there is nowhere else in the app
 * where all three sizes sit on one screen to be compared.
 *
 * Emblems are monochrome by law (docs/UI.md): shape carries identity, colour is
 * already spent on the accent pair, the status hues, and the team palette.
 */
"use client";

import { useState } from "react";
import { Card, OptionCard, Toggle } from "@jumbo/ui";
import { MINIGAMES } from "@jumbo/engine";
import type { MinigameKind } from "@jumbo/engine";
import { MinigameEmblem } from "@/components/minigames/registry";

/** The three sizes an emblem ships at, smallest first. */
const SIZES = [
  { label: "Chip (create form)", box: "h-6 w-6" },
  { label: "Slot card (match home)", box: "h-12 w-12" },
  { label: "Gate screen", box: "h-32 w-32" },
] as const;

const KINDS = Object.keys(MINIGAMES) as MinigameKind[];

/** One emblem across every size it has to survive. */
function SizeRow({ kind }: { kind: MinigameKind }): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-sec font-bold text-s12">
        {MINIGAMES[kind].title}
      </span>
      <div className="flex flex-wrap items-end gap-8">
        {SIZES.map((size) => (
          <div key={size.label} className="flex flex-col items-center gap-2">
            <MinigameEmblem kind={kind} className={`${size.box} text-s12`} />
            <span className="text-meta text-s9">{size.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The real slot card's face, at the size K=2 gives it. */
function SlotSpecimen({ kind }: { kind: MinigameKind }): React.JSX.Element {
  return (
    <div className="sticker flex aspect-5/4 w-52 flex-col items-center justify-center gap-2 rounded-r2 border-s11 bg-s2 p-4">
      <MinigameEmblem kind={kind} className="w-1/3 text-s12" />
      <span className="font-display text-xl text-s12">
        {MINIGAMES[kind].title}
      </span>
    </div>
  );
}

export function EmblemLab(): React.JSX.Element {
  const [inFrame, setInFrame] = useState(false);

  return (
    <div className="flex w-full flex-col gap-6">
      <label className="flex items-center gap-3 text-s10">
        <Toggle
          on={inFrame}
          onChange={setInFrame}
          aria-label="Show emblems in their real frames"
        />
        In their frames (chip + slot card)
      </label>

      <div className="flex flex-col gap-8">
        {KINDS.map((kind) =>
          inFrame ? (
            <div key={kind} className="flex flex-wrap items-start gap-6">
              <Card className="w-72 p-4">
                <OptionCard
                  title={MINIGAMES[kind].title}
                  description={MINIGAMES[kind].tagline}
                  icon={<MinigameEmblem kind={kind} />}
                  selected
                  onToggle={() => {}}
                />
              </Card>
              <SlotSpecimen kind={kind} />
            </div>
          ) : (
            <SizeRow key={kind} kind={kind} />
          ),
        )}
      </div>
    </div>
  );
}
