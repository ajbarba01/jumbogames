# Jumbogames

Teams join with one code and play a round-robin of short co-operative minigames, scored per player so
team sizes don't matter. Built for JumboCode hacknights. The host runs the game, and any signed-in
user can spectate by link.

**Live app:** https://jumbogames.vercel.app

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth + Realtime) · Prisma ·
Playwright · Vercel

## UI kit

The design system is an npm workspace package, `packages/ui` (`@jumbo/ui`) — tokens, themes, and
components consumed by the app as TypeScript source. Every member renders in every state on the
dev-only `/showcase` route (the living spec).

## Match engine

The pure match core is a second workspace package, `packages/engine` (`@jumbo/engine`) — state types,
the match reducer, normalization, the round draw, and the minigame registry, with no Prisma, no React
and no IO. Both the Next app and the realtime Worker import it, so a match runs through the same code
on either side.

## Realtime worker

`apps/realtime` (`@jumbo/realtime`) is a Cloudflare Worker that hosts one Durable Object per live
match, authoritative for that match's realtime state once a game starts. It runs separately from the
Next app.

## Testing

Playwright E2E tests live in [e2e/](e2e/) and cover auth and CRUD flows.

## Trivia question bank

The `trivia_questions` table backs the Tug O' Lore minigame. Questions come from the
[Open Trivia Database](https://opentdb.com) under CC BY-SA 4.0.
