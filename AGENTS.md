# AGENTS.md

Guidance for AI agents and developers working on this codebase.

## Project overview

A React/Tailwind implementation of the Icelandic solitaire variant
*Tíu, tuttugu, þrjátíu* ("Ten, twenty, thirty"), built on TanStack Start and
deployed to Netlify.

### Tech stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Framework  | TanStack Start (React 19, TanStack Router v1)       |
| Build      | Vite 7                                              |
| Styling    | Tailwind CSS 4                                      |
| Language   | TypeScript 5.7 (strict mode, `@/*` → `src/*`)       |
| Deployment | Netlify (`@netlify/vite-plugin-tanstack-start`)     |

## Directory layout

```
src/
├── components/
│   └── Solitaire.tsx    # Entire game: state + rendering
├── routes/
│   ├── __root.tsx       # HTML shell + <title>
│   └── index.tsx        # Home route; wraps Solitaire in the space background
├── router.tsx           # TanStack Router setup
└── styles.css           # Tailwind import + space/star background effects
```

## Game architecture (`Solitaire.tsx`)

All state lives in a single `useReducer`. Nothing is persisted between sessions.

### State shape

```ts
type State = {
  deck: PlayingCard[]          // cards not yet dealt; removed trios land at the FRONT
                               //   (so `.pop()` deals from the top, and removed cards
                               //   are placed at the bottom of the draw pile)
  columns: PlayingCard[][]     // 0–7 active columns; empties are spliced out
  activeColumnIndex: number    // index of the highlighted column
  selected: number[]           // card indices within the active column, up to 3
  shouldAdvance: boolean       // true iff the next Deal should advance activeColumnIndex
  history: Snapshot[]          // undo stack (capped at 50 entries)
  message: string              // status line shown under the deck
  won: boolean
}
```

### Key rules encoded

- **Card values:** A = 1, 2–10 = pip value, J/Q/K = 10 (`cardValue`).
- **Valid removal patterns** (by zero-based position within the active column):
  `[0,1,2]`, `[0,last-1,last]`, `[0,1,last]`, `[last-2,last-1,last]`.
  Computed by `validPatterns(columnLength)`, which deduplicates overlapping
  patterns for short columns (e.g. length 3 collapses all four into `[0,1,2]`).
- **Removal:** requires exactly 3 cards matching a pattern whose values sum to
  10, 20, or 30. Removed cards are placed at the bottom of the deck — which
  in this implementation means the front of the `deck` array (since `.pop()`
  draws from the end).
- **`shouldAdvance`:** set to `true` after every deal, set to `false` after a
  successful removal. On the next DEAL action, if `shouldAdvance` is true the
  `activeColumnIndex` increments (mod `columns.length`) before the card is
  placed.
- **Empty columns:** removed from the array. If the removed column was the last
  in the array, `activeColumnIndex` resets to `0`; otherwise it stays put
  (which causes the column that shifts into that index to become active).
- **Undo:** each DEAL and each successful SELECT push a snapshot onto
  `history`. UNDO pops it. Failed selections (no match) do **not** consume an
  undo slot — they only clear the selection and update the message.

### UI conventions

- The active column gets an amber ring, glow shadow, and a `▼ ACTIVE ▼`
  label. Non-active columns are labeled `COL N`.
- Cards in the active column are clickable; cards in other columns are
  disabled. Selected cards lift up and gain an amber ring.
- Cards stack with a negative `margin-top` to create a fanned/overlap effect.
  The deck and Deal button are rendered side by side above the columns.
- The space background is implemented in `styles.css` via layered radial
  gradients (`.space-bg`) plus two pseudo-element star fields (`.stars-layer`)
  that alternate a `twinkle` animation. The stars layer is `position: fixed`
  so scrolling does not reveal seams.

## Coding conventions

- Components: PascalCase filenames in `src/components/`.
- TypeScript strict; prefer `type` imports where possible.
- Tailwind utility classes; hand-written CSS is limited to the background and
  star layers in `styles.css`.
- No global state library is in use; add Zustand only if game state needs to
  outgrow `useReducer`.
- Routes are file-based under `src/routes/`. API routes would live at
  `src/routes/api.*.ts`.

## Non-obvious decisions

- **Deck as array with `pop()` to deal, `[...removed, ...deck]` to return:**
  treating the array's end as the top of the draw pile is convenient for
  `pop()` but means "bottom of the deck" is index 0. Handled explicitly in the
  DEAL and SELECT reducer cases.
- **Sorted selection vs. sorted patterns:** the spec describes patterns as
  positional, not temporal. Click order is irrelevant — the reducer sorts both
  the selection and the patterns before comparing.
- **Validation on the third click:** selections 1 and 2 are toggleable. On
  the third click the reducer either executes the removal or clears the
  selection and surfaces a "no match" message. There is no separate confirm
  button.
- **History cap of 50:** prevents unbounded memory use on long games. Older
  snapshots are dropped silently.
- **Calculator template removed:** this project was scaffolded from the
  Calculator starter. The Calculator component and its references have been
  replaced by the solitaire implementation.

## Development commands

```bash
npm run dev      # Vite dev server on :3000
npm run build    # Production build
npm run preview  # Serve the production build locally
netlify dev      # Full Netlify emulation on :8888
```

Do **not** run build commands as part of agent tasks — the Netlify build
system validates builds automatically.
