"use client";

/**
 * The kit showcase gallery: every @jumbo/ui member rendered in every state
 * declared by its intent block. This page is the living spec — a state
 * missing here is a state the kit doesn't visibly support.
 */
import { useRef, useState } from "react";
import {
  Button,
  BrandMark,
  type BrandMarkSpec,
  Card,
  cx,
  DialogSearchHead,
  SettingRow,
  TocRail,
  Spinner,
  Select,
  StepSlider,
  TextField,
  Toggle,
  CapsLabel,
  MenuCard,
  MenuItem,
  FloatCard,
  ModalShell,
  PopoverCard,
  Tooltip,
  TooltipProvider,
  Kbd,
  type Keybind,
  ShortcutsOverlay,
} from "@jumbo/ui";
import { MotionDemos } from "./motion-demos";
import { ZoomDemo } from "./zoom-demo";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-sec uppercase tracking-wider text-s11">
        {title}
      </h2>
      <div className="flex flex-wrap items-center gap-4">{children}</div>
    </section>
  );
}

/** A single labeled specimen: the control(s) on top, the state caption below. */
function Specimen({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex items-center gap-3">{children}</div>
      <span className="text-meta font-medium text-s7">{label}</span>
    </div>
  );
}

/* ---------- actions ---------- */

const BUTTON_VARIANTS = [
  "primary",
  "quiet",
  "outline",
  "block",
  "ghost",
  "text",
] as const;

function ActionsSection() {
  return (
    <Section title="Actions">
      {BUTTON_VARIANTS.map((v) => (
        <Specimen key={v} label={`Button — ${v} (default, disabled)`}>
          <Button variant={v} className="capitalize">
            {v}
          </Button>
          <Button variant={v} disabled className="capitalize">
            {v}
          </Button>
        </Specimen>
      ))}
      <Specimen label="Button — icon geometry">
        <Button variant="primary" icon aria-label="send">
          ↑
        </Button>
        <Button variant="ghost" icon aria-label="settings">
          ⚙
        </Button>
        <Button variant="block" icon aria-label="attach">
          ⧉
        </Button>
      </Specimen>
      <Specimen label="Button — loading face (Spinner inside a disabled Button)">
        <Button
          variant="quiet"
          disabled
          className="inline-flex items-center gap-2"
        >
          <Spinner label="Loading" />
          Working…
        </Button>
      </Specimen>
      {/* Spinner has no size prop in this vocabulary — one visual size, "spinning" state.
          "revealing" is a transient 120ms mount state that cannot be held statically. */}
      <Specimen label="Spinner — spinning">
        <Spinner label="Loading specimen" />
      </Specimen>
    </Section>
  );
}

/* ---------- inputs ---------- */

const EFFORT_STOPS = ["low", "medium", "high", "max"] as const;
type Effort = (typeof EFFORT_STOPS)[number];

function InputsSection() {
  const [theme, setTheme] = useState("sand dark");
  const [toggleA, setToggleA] = useState(false);
  const [toggleB, setToggleB] = useState(true);
  const [effort, setEffort] = useState<Effort>("high");

  return (
    <Section title="Inputs">
      <Specimen label="TextField — default">
        <TextField placeholder="Team code" aria-label="textfield default" />
      </Specimen>
      <Specimen label="TextField — hover (hover to see the sticker lift)">
        <TextField placeholder="Hover me" aria-label="textfield hover" />
      </Specimen>
      <Specimen label="TextField — focus (autofocused on load)">
        <TextField placeholder="Focus" aria-label="textfield focus" autoFocus />
      </Specimen>
      <Specimen label="TextField — disabled">
        <TextField
          placeholder="Disabled"
          aria-label="textfield disabled"
          disabled
        />
      </Specimen>
      <Specimen label="TextField — invalid">
        <TextField
          aria-label="textfield invalid"
          invalid
          defaultValue="not-a-code"
        />
      </Specimen>
      {/* Select has no disabled prop — the kit declares no disabled state for it. */}
      <Specimen label="Select — populated">
        <Select
          options={["sand dark", "sand light", "system"]}
          value={theme}
          onChange={setTheme}
          aria-label="select specimen"
        />
      </Specimen>
      <Specimen label="Toggle — off / on / disabled off / disabled on">
        <Toggle on={toggleA} onChange={setToggleA} aria-label="toggle off" />
        <Toggle on={toggleB} onChange={setToggleB} aria-label="toggle on" />
        <Toggle
          on={false}
          onChange={() => {}}
          disabled
          aria-label="toggle disabled off"
        />
        <Toggle
          on
          onChange={() => {}}
          disabled
          aria-label="toggle disabled on"
        />
      </Specimen>
      <Specimen label={`StepSlider — interactive (${effort})`}>
        <div className="w-40">
          <StepSlider
            stops={EFFORT_STOPS}
            value={effort}
            onChange={setEffort}
            aria-label="effort specimen"
          />
        </div>
      </Specimen>
    </Section>
  );
}

/* ---------- overlay ---------- */

function FloatCardSpecimen({
  side,
  label,
}: {
  side: "top" | "bottom";
  label: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<
    { left: number; top: number; width: number; height: number } | undefined
  >(undefined);

  return (
    <Specimen label={label}>
      <button
        ref={ref}
        type="button"
        onMouseEnter={() => setAnchor(ref.current?.getBoundingClientRect())}
        onMouseLeave={() => setAnchor(undefined)}
        className="slip sticker sticker-hover sticker-press cursor-pointer rounded-r2 bg-s4 px-3 py-1.5 text-code font-bold text-s11 hover:bg-s5"
      >
        Hover for {side} card
      </button>
      {anchor !== undefined && (
        <FloatCard anchor={anchor} side={side}>
          <div className="text-code font-semibold">Float card ({side})</div>
        </FloatCard>
      )}
    </Specimen>
  );
}

function OverlaySection() {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Section title="Overlay">
      <Specimen label="Tooltip — hover me">
        <Tooltip label="Search matches" keys={["ctrl", "p"]}>
          <button
            type="button"
            aria-label="Search matches"
            className="slip cursor-pointer rounded-r2 px-2 py-1 text-icon text-s8 hover:bg-s3 hover:text-s10"
          >
            ⌕
          </button>
        </Tooltip>
      </Specimen>
      <Specimen label="PopoverCard — anchored, escape closes topmost-only">
        <PopoverCard
          open={popoverOpen}
          onOpenChange={setPopoverOpen}
          side="bottom"
          align="start"
          trigger={
            <button
              type="button"
              className={cx(
                "slip sticker sticker-hover sticker-press cursor-pointer rounded-r2 px-2 py-1 text-meta font-bold",
                popoverOpen ? "bg-s5 text-s12" : "bg-s4 text-s11 hover:bg-s5",
              )}
            >
              options ▾
            </button>
          }
        >
          <CapsLabel>Team</CapsLabel>
          <MenuItem selected>Selected row</MenuItem>
          <MenuItem>Option row</MenuItem>
          <MenuItem disabled>Disabled row</MenuItem>
        </PopoverCard>
      </Specimen>
      <Specimen label="MenuCard — static, MenuItems + CapsLabel + selection marker">
        <MenuCard className="w-48">
          <CapsLabel>Team</CapsLabel>
          <MenuItem selected>Thunderbirds</MenuItem>
          <MenuItem>Ravens</MenuItem>
          <MenuItem disabled>Locked</MenuItem>
        </MenuCard>
      </Specimen>
      <Specimen label="ModalShell — behind a trigger">
        <Button onClick={() => setModalOpen(true)}>Open modal</Button>
        <ModalShell
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          aria-label="Showcase modal"
          className="w-80 pb-3"
        >
          <div className="border-b-2 border-edge px-4 py-2.5 text-caps font-bold tracking-[0.07em] uppercase">
            Specimen modal
          </div>
          <div className="px-4 py-3 text-sec font-medium">
            Escape or the scrim dismisses this card.
          </div>
        </ModalShell>
      </Specimen>
      <FloatCardSpecimen side="top" label="FloatCard — placement top" />
      <FloatCardSpecimen side="bottom" label="FloatCard — placement bottom" />
    </Section>
  );
}

/* ---------- keys ---------- */

const SAMPLE_KEYBINDS: Keybind[] = [
  {
    id: "command-palette",
    keys: ["ctrl", "k"],
    label: "command palette",
    group: "global",
  },
  {
    id: "start-match",
    keys: ["ctrl", "enter"],
    label: "start match",
    group: "tournament",
    scope: "admin",
  },
  {
    id: "dismiss",
    keys: ["esc"],
    label: "dismiss the topmost layer",
    group: "general",
    fixed: true,
  },
];

function KeysSection() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <Section title="Keys">
      <Specimen label="Kbd — chips, chords render as adjacent chips">
        <div className="flex items-center gap-1">
          <Kbd>ctrl</Kbd>
          <Kbd>k</Kbd>
        </div>
      </Specimen>
      <Specimen label="ShortcutsOverlay — behind a trigger (read-only keybind list)">
        <Button onClick={() => setShortcutsOpen(true)}>shortcuts</Button>
        {shortcutsOpen && (
          <ShortcutsOverlay
            keybinds={SAMPLE_KEYBINDS}
            onClose={() => setShortcutsOpen(false)}
          />
        )}
      </Specimen>
    </Section>
  );
}

/* ---------- frame ---------- */

function FrameSection() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>("appearance");
  const [reduceMotion, setReduceMotion] = useState(false);
  const [density, setDensity] = useState("comfortable");

  return (
    <Section title="Frame">
      <Specimen label="SettingsFrame — DialogSearchHead + TocRail + SettingRow (type to search: activeId goes null)">
        <div className="sticker flex h-64 w-[420px] flex-col overflow-hidden rounded-r3 bg-s12 text-s2 shadow-float">
          <DialogSearchHead
            value={search}
            onChange={(value) => {
              setSearch(value);
              setActiveId(value.trim() === "" ? "appearance" : null);
            }}
            onClose={() => {
              setSearch("");
              setActiveId("appearance");
            }}
            placeholder="search settings…"
          />
          <div className="flex min-h-0 flex-1">
            <TocRail
              entries={[
                { id: "appearance", title: "appearance" },
                { id: "daemon", title: "daemon" },
              ]}
              activeId={activeId}
              onJump={setActiveId}
            />
            <div className="min-h-0 flex-1 overflow-y-auto px-4">
              <SettingRow
                name="Reduce motion"
                desc="Swap slipstream transitions for instant state changes."
              >
                <Toggle
                  on={reduceMotion}
                  onChange={setReduceMotion}
                  aria-label="reduce motion"
                />
              </SettingRow>
              <SettingRow
                name="Density"
                desc="Row spacing for lists and settings."
              >
                <Select
                  options={["comfortable", "compact"]}
                  value={density}
                  onChange={setDensity}
                  aria-label="density"
                />
              </SettingRow>
              <SettingRow
                name="Command palette"
                desc="Open the fuzzy command finder."
              >
                <Kbd>ctrl</Kbd>
              </SettingRow>
            </div>
          </div>
        </div>
      </Specimen>
    </Section>
  );
}

/* ---------- motion ---------- */

function MotionSection() {
  return (
    <Section title="Motion">
      <Specimen label="ZoomDemo — layoutId shared-element zoom (click a preview; escape/click-out returns it)">
        <ZoomDemo />
      </Specimen>
      <MotionDemos />
    </Section>
  );
}

/* ---------- brand ---------- */

const PATHS_MARK: BrandMarkSpec = {
  name: "Sample Mark",
  color: "#6a8fd8",
  paths: [{ d: "M12 2 L22 12 L12 22 L2 12 Z" }],
};

const MONOGRAM_MARK: BrandMarkSpec = {
  name: "Nameless Provider",
  color: "#c65a54",
};

function BrandSection() {
  return (
    <Section title="Brand">
      <Specimen label="BrandMark — monogram fallback (no bundled paths)">
        <BrandMark spec={MONOGRAM_MARK} size={24} />
      </Specimen>
      <Specimen label="BrandMark — paths spec">
        <BrandMark spec={PATHS_MARK} size={24} />
      </Specimen>
      <Specimen label="BrandMark — muted (benched provider)">
        <BrandMark spec={PATHS_MARK} size={24} muted />
      </Specimen>
    </Section>
  );
}

/* ---------- type & tokens ---------- */

const SCALE_SWATCHES = [
  "bg-s1",
  "bg-s2",
  "bg-s3",
  "bg-s4",
  "bg-s5",
  "bg-s6",
  "bg-s7",
  "bg-s8",
  "bg-s9",
  "bg-s10",
  "bg-s11",
  "bg-s12",
] as const;

/** The named colors beyond the scale — accents, edge, and the status set. */
const NAMED_SWATCHES = [
  { cls: "bg-accent", name: "accent" },
  { cls: "bg-accent-2", name: "accent-2" },
  { cls: "bg-edge", name: "edge" },
  { cls: "bg-run", name: "run" },
  { cls: "bg-ok", name: "ok" },
  { cls: "bg-warn", name: "warn" },
  { cls: "bg-crit", name: "crit" },
] as const;

function TypeTokensSection() {
  return (
    <Section title="Type and tokens">
      <Specimen label="Voices — display / sans / hand / mono (code only)">
        <div className="flex flex-col gap-2.5">
          <span className="font-display text-xl uppercase text-s12">
            Round two — display
          </span>
          <span className="text-body font-bold text-s12">
            Sans carries every control and body — bold-leaning
          </span>
          <span className="font-hand text-xl text-accent">
            Hand is for the doodle layer only!!
          </span>
          <span className="font-mono text-code text-s10">
            mono = code literals and team codes — never chrome
          </span>
        </div>
      </Specimen>
      <Specimen label="Team-code treatment — the mockup's HACK42 (sans, bold, tracked caps)">
        <TextField
          aria-label="Team code treatment"
          placeholder="HACK42"
          maxLength={6}
          className="w-44 text-body font-bold tracking-[0.18em] uppercase"
        />
      </Specimen>
      <div className="flex w-full flex-col gap-2.5">
        <div className="flex items-baseline gap-4">
          <span className="text-body text-s12">
            Primary / active — text-body
          </span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-body text-s11">Body — text-body</span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-sec text-s10">Secondary — text-sec</span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="font-mono text-code text-s10">
            mono content — text-code
          </span>
        </div>
        <div className="flex items-baseline gap-4">
          <span className="text-caps tracking-[0.07em] text-s7 uppercase">
            section header — text-caps
          </span>
        </div>
      </div>
      <div className="flex w-full overflow-hidden rounded-r2 border-2 border-s6">
        {SCALE_SWATCHES.map((cls) => (
          <div key={cls} className="flex-1">
            <div className={cx("h-14", cls)} />
            <div className="bg-s2 py-1 text-center text-meta font-medium text-s9">
              {cls.replace("bg-", "")}
            </div>
          </div>
        ))}
      </div>
      <div className="flex w-full overflow-hidden rounded-r2 border-2 border-s6">
        {NAMED_SWATCHES.map((sw) => (
          <div key={sw.name} className="flex-1">
            <div className={cx("h-14", sw.cls)} />
            <div className="bg-s2 py-1 text-center text-meta font-medium text-s9">
              {sw.name}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function SurfaceSection() {
  return (
    <Section title="Surface">
      <Card className="flex w-80 flex-col gap-3 p-5">
        <h3 className="font-display text-sec uppercase text-s12">Card</h3>
        <p className="text-sec text-s10">
          The raised board surface — black edge border, hard offset shadow, and
          a low-contrast grid. Frames a self-contained block of content.
        </p>
        <Button variant="primary">Primary action</Button>
      </Card>
    </Section>
  );
}

/* ---------- page ---------- */

export function ShowcaseGallery(): React.JSX.Element {
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-s1 px-8 py-10">
        <div className="mx-auto flex max-w-[960px] flex-col gap-10">
          <header className="flex flex-col gap-1">
            <h1 className="font-display text-2xl uppercase text-s12">
              @jumbo/ui <span className="text-accent">showcase</span>
            </h1>
            <p className="text-sec text-s9">
              Every kit member, every declared state — the living spec.
            </p>
          </header>
          <SurfaceSection />
          <ActionsSection />
          <InputsSection />
          <OverlaySection />
          <KeysSection />
          <FrameSection />
          <MotionSection />
          <BrandSection />
          <TypeTokensSection />
        </div>
      </div>
    </TooltipProvider>
  );
}
