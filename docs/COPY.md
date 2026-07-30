# Copy — Words on the screen

> Authority for **user-facing prose**: the terminology register, the
> error-string contract, and point of view per surface. Visual and
> kit-authoring law is [UI.md](UI.md)'s; this doc owns only the words.
> Drafting technique is not here — use the `writing-in-voice` skill.

Scope is anything a player, host, or admin reads: labels, headings, empty
states, error strings, minigame instructions, and the README. Code comments
and the rest of `docs/` are outside it.

## Terminology register

One name per thing, everywhere a person reads it. Identifiers, route paths
(`/t/[id]`), API paths (`/api/tournaments/*`), Prisma models, and channel
names keep their existing names — renaming those carries migration risk and
is a separate change.

| Thing                                   | Say       | Never                      |
| --------------------------------------- | --------- | -------------------------- |
| The whole event teams join with a code  | game      | tournament, event, session |
| One round-robin pairing inside it       | match     | round, contest, bout       |
| A single scored activity inside a match | minigame  | game, mode                 |
| The person who created the game         | host      | admin, organizer, owner    |
| A user with the elevated site role      | admin     | host, moderator            |
| The code teams join with                | join code | game code, short code, PIN |

**"Tournament" is banned as a synonym for game, not as a word.** A game with
enough teams to be worth calling a tournament can be described that way in
prose about the product, as [../AGENTS.md](../AGENTS.md) does. What it can
never do is name the entity a user acts on: no label, error, or heading calls
a game a tournament.

**Host and admin are different people.** Hosting is gated by `isGameHost`;
the admin role gates the question bank and other admin-only pages. Copy that
uses one for the other is a factual error, not a style choice.

Minigames are referred to by their registry `title` — Tug O' Lore, Word Lock
— not by a description of what they do.

## Error strings

The contract, in order of precedence:

1. **No terminal period.** Errors are short statements, not paragraphs. One
   sentence, one line, no full stop.
2. **Authorization errors name the role that could act:** "Only the host can
   end this game." State errors name the state: "This game isn't running."
   Don't convert a state into an accusation, and don't use an agentless
   passive when a role was available.
3. **Stop at the state.** If the control the reader needs is already on
   screen, naming it is padding — "Not all teams are ready" is finished.
   Name a next step only when the reader would otherwise have to hunt for it.
4. **Never disclose whether an account exists.** Sign-in and sign-up failures
   stay indistinguishable regardless of cause; the security floor in
   [../AGENTS.md](../AGENTS.md) outranks the diagnostic.

## Point of view

- **Player surfaces** — second person, present tense. "Your cards lock for
  three seconds." A fragment on a label or an empty state reads as an implied
  "you," so don't restore the subject.
- **Host and admin surfaces** — same second person, lower volume. The host
  acts on the game, so name the object: "Deletes every round, match and
  score."
- **Minigame `instructions`** — imperative for what the player does, present
  indicative for what the system does. Every player reads this at the gate,
  so it states rules only. No encouragement, and no clause that isn't a rule.
- **Minigame `tagline`** — one sentence with a terminal period.
- **README and product metadata** — third person about the app, second person
  about the reader's actions.

## Demo captions

`src/components/minigames/*/Demo.tsx` narrates one beat at a time and the
registry `instructions` state the rules. They are allowed to differ in shape,
but not in fact: when a mechanic changes, both change, and the `aria-label`
covering the whole demo mirrors its captions.

---

_Last reviewed: 2026-07-30_
