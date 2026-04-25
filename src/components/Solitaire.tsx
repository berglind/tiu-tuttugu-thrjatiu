import { useMemo, useReducer, type CSSProperties } from 'react'

type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades'
type PlayingCard = {
  suit: Suit
  rank: number
  id: string
  instanceId: number
  dealOrder: number
}

type State = {
  deck: PlayingCard[]
  columns: PlayingCard[][]
  activeColumnIndex: number
  selected: number[]
  shouldAdvance: boolean
  history: Snapshot[]
  message: string
  won: boolean
}

type Snapshot = Omit<State, 'history'>

type Action =
  | { type: 'DEAL' }
  | { type: 'SELECT'; cardIndex: number }
  | { type: 'UNDO' }
  | { type: 'NEW_GAME' }

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades']
const INITIAL_COLUMNS = 7

let nextInstanceId = 1
const makeInstanceId = () => nextInstanceId++

function buildDeck(): PlayingCard[] {
  const deck: PlayingCard[] = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`,
        instanceId: 0,
        dealOrder: 0,
      })
    }
  }
  return deck
}

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice()
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function cardValue(card: PlayingCard): number {
  if (card.rank === 1) return 1
  if (card.rank >= 11) return 10
  return card.rank
}

function createInitialState(): State {
  const full = shuffle(buildDeck())
  const columns: PlayingCard[][] = Array.from({ length: INITIAL_COLUMNS }, () => [])
  let order = 0
  for (let round = 0; round < 2; round++) {
    for (let col = 0; col < INITIAL_COLUMNS; col++) {
      const card = full.pop()!
      card.instanceId = makeInstanceId()
      card.dealOrder = order++
      columns[col].push(card)
    }
  }
  return {
    deck: full,
    columns,
    activeColumnIndex: 0,
    selected: [],
    shouldAdvance: false,
    history: [],
    message: 'Click Deal (or the deck) to place a card in the highlighted column.',
    won: false,
  }
}

function snapshot(state: State): Snapshot {
  return {
    deck: state.deck,
    columns: state.columns,
    activeColumnIndex: state.activeColumnIndex,
    selected: state.selected,
    shouldAdvance: state.shouldAdvance,
    message: state.message,
    won: state.won,
  }
}

function pushHistory(state: State): Snapshot[] {
  const h = state.history.slice(-49)
  h.push(snapshot(state))
  return h
}

function validPatterns(columnLength: number): number[][] {
  if (columnLength < 3) return []
  const last = columnLength - 1
  const patterns = [
    [0, 1, 2],
    [0, last - 1, last],
    [0, 1, last],
    [last - 2, last - 1, last],
  ]
  const seen = new Set<string>()
  const unique: number[][] = []
  for (const p of patterns) {
    const sorted = p.slice().sort((a, b) => a - b)
    if (sorted[0] < 0) continue
    if (new Set(sorted).size !== 3) continue
    const key = sorted.join(',')
    if (!seen.has(key)) {
      seen.add(key)
      unique.push(sorted)
    }
  }
  return unique
}

function selectableIndices(columnLength: number): Set<number> {
  const set = new Set<number>()
  for (const p of validPatterns(columnLength)) {
    for (const i of p) set.add(i)
  }
  return set
}

function checkRemoval(
  column: PlayingCard[],
  selected: number[],
): number[] | null {
  if (selected.length !== 3) return null
  const sorted = selected.slice().sort((a, b) => a - b)
  const patterns = validPatterns(column.length)
  const matchesPattern = patterns.some(
    (p) => p[0] === sorted[0] && p[1] === sorted[1] && p[2] === sorted[2],
  )
  if (!matchesPattern) return null
  const sum = sorted.reduce((acc, i) => acc + cardValue(column[i]), 0)
  if (sum !== 10 && sum !== 20 && sum !== 30) return null
  return sorted
}

function reducer(state: State, action: Action): State {
  if (state.won && action.type !== 'NEW_GAME' && action.type !== 'UNDO') {
    return state
  }

  switch (action.type) {
    case 'NEW_GAME':
      return createInitialState()

    case 'UNDO': {
      if (state.history.length === 0) return state
      const prev = state.history[state.history.length - 1]
      return {
        ...prev,
        history: state.history.slice(0, -1),
      }
    }

    case 'DEAL': {
      if (state.deck.length === 0) {
        return { ...state, message: 'The deck is empty.' }
      }
      const history = pushHistory(state)
      const columns = state.columns.map((c) => c.slice())
      let activeColumnIndex = state.activeColumnIndex
      if (state.shouldAdvance && columns.length > 0) {
        activeColumnIndex = (activeColumnIndex + 1) % columns.length
      }
      if (activeColumnIndex >= columns.length) activeColumnIndex = 0

      const deck = state.deck.slice()
      const raw = deck.pop()!
      const drawn: PlayingCard = {
        ...raw,
        instanceId: makeInstanceId(),
        dealOrder: 0,
      }
      columns[activeColumnIndex] = [...columns[activeColumnIndex], drawn]

      const won = deck.length === 0 && columns.length === 0
      return {
        ...state,
        deck,
        columns,
        activeColumnIndex,
        selected: [],
        shouldAdvance: true,
        history,
        message: `Dealt ${cardLabel(drawn)} to column ${activeColumnIndex + 1}.`,
        won,
      }
    }

    case 'SELECT': {
      const col = state.columns[state.activeColumnIndex]
      if (!col) return state
      const idx = action.cardIndex
      if (idx < 0 || idx >= col.length) return state

      const isSelected = state.selected.includes(idx)
      let nextSelected: number[]
      if (isSelected) {
        nextSelected = state.selected.filter((i) => i !== idx)
      } else {
        if (state.selected.length >= 3) return state
        nextSelected = [...state.selected, idx]
      }

      if (nextSelected.length < 3) {
        return { ...state, selected: nextSelected }
      }

      const removalIndices = checkRemoval(col, nextSelected)
      if (!removalIndices) {
        return {
          ...state,
          selected: [],
          message: 'No match — selection must sum to 10, 20, or 30 in a valid pattern.',
        }
      }

      const history = pushHistory(state)
      const removedCards = removalIndices.map((i) => col[i])
      const remaining = col.filter((_, i) => !removalIndices.includes(i))
      let columns = state.columns.map((c, i) =>
        i === state.activeColumnIndex ? remaining : c,
      )
      let activeColumnIndex = state.activeColumnIndex
      const wasLastColumn = activeColumnIndex === columns.length - 1

      if (remaining.length === 0) {
        columns = columns.filter((_, i) => i !== state.activeColumnIndex)
        if (columns.length === 0) {
          activeColumnIndex = 0
        } else if (wasLastColumn) {
          activeColumnIndex = 0
        }
      }

      const deck = [...removedCards, ...state.deck]
      const won = columns.length === 0 && deck.length === 52

      return {
        ...state,
        deck,
        columns,
        activeColumnIndex,
        selected: [],
        shouldAdvance: false,
        history,
        message: won
          ? 'You won! All columns cleared.'
          : `Removed ${removedCards.map(cardLabel).join(', ')} to the bottom of the deck.`,
        won,
      }
    }

    default:
      return state
  }
}

function cardLabel(card: PlayingCard): string {
  const r = card.rank
  const label = r === 1 ? 'A' : r === 11 ? 'J' : r === 12 ? 'Q' : r === 13 ? 'K' : String(r)
  const suitChar = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[card.suit]
  return `${label}${suitChar}`
}

function rankText(rank: number): string {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function suitSymbol(suit: Suit): string {
  return { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' }[suit]
}

function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds'
}

const CARD_HEIGHT_PX = 168
const STANDARD_OVERLAP_PX = -132
const COLLAPSED_OVERLAP_PX = -(CARD_HEIGHT_PX - 5)
const COLLAPSE_THRESHOLD = 9
const DEAL_STAGGER_MS = 85

function getCardOffset(cardIdx: number, colLength: number): number {
  if (cardIdx === 0) return 0
  if (colLength <= COLLAPSE_THRESHOLD) return STANDARD_OVERLAP_PX
  if (cardIdx <= 2 || cardIdx >= colLength - 2) return STANDARD_OVERLAP_PX
  return COLLAPSED_OVERLAP_PX
}

type PipPos = { x: number; y: number; flip: boolean }

function pipLayout(rank: number): PipPos[] {
  const p = (x: number, y: number): PipPos => ({ x, y, flip: y > 50 })
  switch (rank) {
    case 2:
      return [p(50, 18), p(50, 82)]
    case 3:
      return [p(50, 18), p(50, 50), p(50, 82)]
    case 4:
      return [p(30, 22), p(70, 22), p(30, 78), p(70, 78)]
    case 5:
      return [p(30, 22), p(70, 22), p(50, 50), p(30, 78), p(70, 78)]
    case 6:
      return [p(30, 20), p(70, 20), p(30, 50), p(70, 50), p(30, 80), p(70, 80)]
    case 7:
      return [
        p(30, 18), p(70, 18),
        p(50, 33),
        p(30, 50), p(70, 50),
        p(30, 82), p(70, 82),
      ]
    case 8:
      return [
        p(30, 18), p(70, 18),
        p(50, 33),
        p(30, 50), p(70, 50),
        p(50, 67),
        p(30, 82), p(70, 82),
      ]
    case 9:
      return [
        p(30, 18), p(70, 18),
        p(30, 38), p(70, 38),
        p(50, 50),
        p(30, 62), p(70, 62),
        p(30, 82), p(70, 82),
      ]
    case 10:
      return [
        p(30, 16), p(70, 16),
        p(50, 28),
        p(30, 40), p(70, 40),
        p(30, 60), p(70, 60),
        p(50, 72),
        p(30, 84), p(70, 84),
      ]
    default:
      return []
  }
}

function PipGrid({ card }: { card: PlayingCard }) {
  const pips = pipLayout(card.rank)
  const symbol = suitSymbol(card.suit)
  return (
    <div className="absolute inset-x-6 top-7 bottom-7 pointer-events-none">
      {pips.map((pip, i) => (
        <span
          key={i}
          className="absolute text-[1.05rem] leading-none"
          style={{
            left: `${pip.x}%`,
            top: `${pip.y}%`,
            transform: `translate(-50%, -50%)${pip.flip ? ' rotate(180deg)' : ''}`,
          }}
        >
          {symbol}
        </span>
      ))}
    </div>
  )
}

function AceCenter({ card }: { card: PlayingCard }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <span className="text-[3.5rem] leading-none">{suitSymbol(card.suit)}</span>
    </div>
  )
}

function FaceCenter({ card }: { card: PlayingCard }) {
  const rank = rankText(card.rank)
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-90">
      <span
        className="font-serif font-bold leading-none text-center"
        style={{ fontSize: '4.5rem', letterSpacing: '-0.05em' }}
      >
        {rank}
      </span>
      <span className="text-[2.5rem] leading-none mt-1">
        {suitSymbol(card.suit)}
      </span>
    </div>
  )
}

type CardViewProps = {
  card: PlayingCard
  selected?: boolean
  selectable?: boolean
  onClick?: () => void
  marginTop: number
  zIndex: number
}

function CardView({ card, selected, selectable, onClick, marginTop, zIndex }: CardViewProps) {
  const red = isRed(card.suit)
  const rank = rankText(card.rank)
  const sym = suitSymbol(card.suit)
  const isFace = card.rank >= 11
  const isAce = card.rank === 1

  const wrapperStyle: CSSProperties = {
    marginTop,
    zIndex,
    animationDelay: `${card.dealOrder * DEAL_STAGGER_MS}ms`,
    animationName: 'dealFlight',
    animationDuration: '0.6s',
    animationTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)', // This makes it "snap" into place
    animationFillMode: 'backwards',
    // These variables tell the card to start from the top-left area
    '--startX': '-350px', 
    '--startY': '-250px'
  } as any;

  return (
    <div
      className="card-deal-wrap"
      style={wrapperStyle}
    >
    <style>{` @keyframes dealFlight {
          0% { 
            opacity: 0;
            /* This moves the card to roughly where your deck sits at the top left */
            transform: translate(var(--startX), var(--startY)) rotate(-15deg) scale(0.5); 
          }
          10% { opacity: 1; }
          100% { 
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1); 
          }
        }`}
      </style>
      <button
        type="button"
        onClick={selectable ? onClick : undefined}
        disabled={!selectable}
        aria-disabled={!selectable}
        className={[
          'relative w-[7.5rem] h-[10.5rem] rounded-xl shadow-md border bg-white block',
          'select-none overflow-hidden',
          selectable
            ? 'cursor-pointer hover:-translate-y-2 hover:shadow-xl hover:ring-2 hover:ring-amber-200/80'
            : 'cursor-default',
          selected
            ? 'border-amber-400 ring-4 ring-amber-300/80 -translate-y-3 shadow-xl'
            : 'border-slate-300',
          red ? 'text-red-600' : 'text-slate-900',
        ].join(' ')}
      >
        <div className="absolute top-1 left-2 flex flex-col items-center leading-none">
          <span
            className="font-serif font-bold text-lg"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {rank}
          </span>
          <span className="text-[0.95rem] leading-none mt-0.5">{sym}</span>
        </div>
        <div className="absolute bottom-1 right-2 flex flex-col items-center leading-none rotate-180">
          <span
            className="font-serif font-bold text-lg"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {rank}
          </span>
          <span className="text-[0.95rem] leading-none mt-0.5">{sym}</span>
        </div>

        {isAce ? (
          <AceCenter card={card} />
        ) : isFace ? (
          <FaceCenter card={card} />
        ) : (
          <PipGrid card={card} />
        )}
      </button>
    </div>
  )
}

function DeckView({
  count,
  onClick,
  disabled,
}: {
  count: number
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        'relative w-[7.5rem] h-[10.5rem] rounded-xl border-2 shadow-xl',
        disabled
          ? 'bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed'
          : 'bg-gradient-to-br from-indigo-600 via-purple-700 to-indigo-900 border-indigo-400 hover:scale-105 cursor-pointer',
        'transition-transform flex items-center justify-center',
      ].join(' ')}
      aria-label="Deal from deck"
    >
      <div className="absolute inset-1 rounded-md border border-indigo-300/40 flex flex-col items-center justify-center text-white">
        <div className="text-4xl">✦</div>
        <div className="text-xs tracking-widest mt-2 opacity-80">DECK</div>
        <div className="text-base font-bold mt-1">{count}</div>
      </div>
    </button>
  )
}

export default function Solitaire() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  const activeColumn = state.columns[state.activeColumnIndex]
  const patterns = useMemo(
    () => (activeColumn ? validPatterns(activeColumn.length) : []),
    [activeColumn],
  )

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 text-white">
      <header className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Tíu, tuttugu, þrjátíu
          </h1>
          <p className="text-sm text-indigo-200 mt-1">
            Icelandic Solitaire — remove trios summing to 10, 20, or 30.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => dispatch({ type: 'UNDO' })}
            disabled={state.history.length === 0}
            className="px-4 py-2 rounded-lg bg-slate-800/70 border border-slate-600 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur"
          >
            Undo
          </button>
          <button
            onClick={() => dispatch({ type: 'NEW_GAME' })}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 border border-indigo-400"
          >
            New Game
          </button>
        </div>
      </header>

      <section className="flex items-center gap-4 mb-8">
        <DeckView
          count={state.deck.length}
          onClick={() => dispatch({ type: 'DEAL' })}
          disabled={state.deck.length === 0 || state.won}
        />
        <button
          onClick={() => dispatch({ type: 'DEAL' })}
          disabled={state.deck.length === 0 || state.won}
          className="px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Deal
        </button>
        <div className="text-sm text-indigo-100 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 flex-1 backdrop-blur">
          {state.won ? (
            <span className="text-amber-300 font-semibold">
              You won! Every column has been cleared.
            </span>
          ) : (
            state.message
          )}
        </div>
      </section>

      <section className="relative overflow-x-auto pb-4">
        <div className="flex justify-center gap-2 md:gap-4 pt-1 px-1">
          {state.columns.map((col, colIdx) => {
            const isActive = colIdx === state.activeColumnIndex
            const selectable = isActive ? selectableIndices(col.length) : null
            return (
              <div
                key={colIdx}
                className={[
                  'flex-shrink-0 rounded-xl pt-4 px-2 pb-4 border-2 transition-colors w-[8.5rem]',
                  isActive
                    ? 'border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(251,191,36,0.35)]'
                    : 'border-slate-700/60 bg-slate-900/40',
                ].join(' ')}
              >
                <div className="flex flex-col items-center">
                  {col.map((card, cardIdx) => {
                    const isCardSelected =
                      isActive && state.selected.includes(cardIdx)
                    const isSelectable =
                      isActive && !state.won && (selectable?.has(cardIdx) ?? false)
                    return (
                      <CardView
                        key={card.instanceId}
                        card={card}
                        selected={isCardSelected}
                        selectable={isSelectable}
                        marginTop={getCardOffset(cardIdx, col.length)}
                        zIndex={cardIdx}
                        onClick={() =>
                          dispatch({ type: 'SELECT', cardIndex: cardIdx })
                        }
                      />
                    )
                  })}
                </div>
              </div>
            )
          })}
          {state.columns.length === 0 && (
            <div className="text-indigo-200 italic px-3 py-6">
              All columns cleared.
            </div>
          )}
        </div>
      </section>

      <section className="mt-6 text-xs text-indigo-200/80 bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 backdrop-blur">
        <div className="font-semibold text-indigo-100 mb-1">How to play</div>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Click Deal (or the deck) to place a card in the highlighted column.</li>
          <li>
            Pick exactly 3 cards from the active column whose values sum to
            10, 20, or 30.
          </li>
          <li>
           Available cards with the last card are the top 2 cards (only the second on top if the top one matched) and the last two cards.
          </li>
          <li>
             Aces = 1, Numbers = Face Value, Face Cards (J, Q, K) = 10.
          </li>
          <li>Clear every column to win.</li>
        </ul>
      </section>
    </div>
  )
}
