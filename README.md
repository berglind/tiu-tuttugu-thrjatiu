# Tíu, tuttugu, þrjátíu — Icelandic Solitaire

A single-player, browser-based implementation of the Icelandic solitaire variant
*Tíu, tuttugu, þrjátíu* ("Ten, twenty, thirty"). The game deals cards from a
standard 52-card deck into seven columns; the player removes trios of cards
whose face values sum to 10, 20, or 30 in specific positional patterns, until
every column has been cleared.

## Tech stack

- [TanStack Start](https://tanstack.com/start) (React 19 + TanStack Router)
- Vite 7
- Tailwind CSS 4
- TypeScript 5 (strict)
- Netlify (deployment)

## Running locally

```bash
npm install
npm run dev
```

The dev server runs on <http://localhost:3000>. For full Netlify emulation
(including edge + functions if they are added later) use:

```bash
netlify dev
```

which serves the site on port 8888.

## Production build

```bash
npm run build
npm run preview
```

## How to play

1. Click **Deal** (or the deck itself) to place a card in the highlighted
   "active" column.
2. In the active column, click exactly three cards. They must:
   - Sum to **10**, **20**, or **30** (Aces = 1, face cards = 10).
   - Occupy one of these positional patterns:
     `[0,1,2]`, `[0,last-1,last]`, `[0,1,last]`, or `[last-2,last-1,last]`.
3. A valid trio is sent to the bottom of the deck and the active column stays
   where it is. If it empties, that column is removed from play entirely.
4. If you deal again without having removed anything, the active column
   advances by one.
5. Clear every column to win.

The **Undo** button reverses the last deal or removal; **New Game** reshuffles
and deals a fresh round.
