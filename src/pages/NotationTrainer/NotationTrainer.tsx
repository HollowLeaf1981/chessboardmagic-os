import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  PlayCircle,
  RotateCcw,
  Shuffle,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'
import { worldChampionshipGames } from '@/data/worldChampionship'
import { miniatureGames } from '@/data/miniatureGames'
import { classicGames } from '@/data/classicGames'
import { openings } from '@/data/eco'
import { useNotationTrainerStore } from '@/stores/notationTrainerStore'

// --------------------------------------------------------------------------
// Types
// --------------------------------------------------------------------------

type RawWorldChampionship = (typeof worldChampionshipGames)[number]
type RawWorldGame = RawWorldChampionship['Games'][number]
type RawFlatGame = (typeof classicGames)[number] | (typeof miniatureGames)[number]

type TrainerWorldGame = RawWorldGame & { gameId: string }
type TrainerChampionship = Omit<RawWorldChampionship, 'Games'> & {
  Games: TrainerWorldGame[]
}
type TrainerFlatGame = RawFlatGame & { gameId: string }

type PlayedGames = ReturnType<typeof useNotationTrainerStore.getState>['playedGames']

// react-chessboard v5 expects arrows as objects, not tuples.
type BoardArrow = {
  startSquare: string
  endSquare: string
  color: string
}

type Collection =
  | {
      key: 'world'
      title: string
      subtitle: string
      type: 'world'
      data: TrainerChampionship[]
    }
  | {
      key: 'classics' | 'miniatures'
      title: string
      subtitle: string
      type: 'flat'
      data: TrainerFlatGame[]
    }

interface ReviewSnapshot {
  pgnMoves: string[]
  userMoves: string[]
  wrongGuesses: string[]
}

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// In strict mode the user must type +/# exactly; in lax mode we strip them
// from both sides before comparing. Also normalise zeros to O for castling.
function normaliseSAN(san: string, strictMode: boolean): string {
  const trimmed = san.trim().replace(/0/g, 'O')
  return strictMode ? trimmed : trimmed.replace(/[+#]+$/g, '')
}

// Build the FEN after playing the first `count` moves of the line. Used both
// to seed the board after a correct guess and to drive review navigation.
// Centralising this avoids stale-state bugs from mutating a single Chess
// instance held in state.
function fenAfterMoves(pgnMoves: string[], count: number): string {
  const chess = new Chess()
  for (let i = 0; i < count; i++) {
    chess.move(pgnMoves[i])
  }
  return chess.fen()
}

// Build the arrow object for the move just played to reach the position
// after `count` moves. Returns [] if we're at the starting position.
function arrowForMove(pgnMoves: string[], count: number): BoardArrow[] {
  if (count <= 0) return []
  const chess = new Chess()
  for (let i = 0; i < count; i++) {
    chess.move(pgnMoves[i])
  }
  const last = chess.history({ verbose: true }).slice(-1)[0]
  if (!last) return []
  return [{ startSquare: last.from, endSquare: last.to, color: 'red' }]
}

function getCollectionStats(collection: Collection, playedGames: PlayedGames) {
  if (collection.type === 'world') {
    const allGames = collection.data.flatMap(c => c.Games)
    const total = allGames.length
    const played = allGames.filter(g => {
      const key = g.gameId.split('-')[0]
      return playedGames[key]?.[g.gameId]
    }).length
    return { total, played }
  }
  const total = collection.data.length
  const played = collection.data.filter(g => {
    const key = g.gameId.split('-')[0]
    return playedGames[key]?.[g.gameId]
  }).length
  return { total, played }
}

function getChampionshipStats(championship: TrainerChampionship, playedGames: PlayedGames) {
  const total = championship.Games.length
  const played = championship.Games.filter(g => {
    const key = g.gameId.split('-')[0]
    return playedGames[key]?.[g.gameId]
  }).length
  return { total, played }
}

// --------------------------------------------------------------------------
// CollectionLabel
// --------------------------------------------------------------------------

interface CollectionLabelProps {
  title: string
  subtitle: string
  played: number
  total: number
}

function CollectionLabel({ title, subtitle, played, total }: CollectionLabelProps) {
  const percentage = total > 0 ? (played / total) * 100 : 0

  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        <span>{title}</span>
        <span className="text-muted-foreground">
          ({played}/{total})
        </span>
      </div>
      <div className="mb-1 mt-1 h-2 w-52 bg-muted">
        <div className="h-2 bg-green-600" style={{ width: `${percentage}%` }} />
      </div>
      <div className="text-sm text-muted-foreground">{subtitle}</div>
    </div>
  )
}

// --------------------------------------------------------------------------
// ReviewPanel
// --------------------------------------------------------------------------

interface ReviewPanelProps {
  pgnMoves: string[]
  userMoves: string[]
  wrongGuesses: string[]
  gameName: string
}

function ReviewPanel({ pgnMoves, userMoves, wrongGuesses, gameName }: ReviewPanelProps) {
  // Pre-compute the full FEN sequence once so navigation is instant and
  // doesn't have to replay moves on every render.
  const fenSequence = useMemo(() => {
    const fens: string[] = []
    const chess = new Chess()
    fens.push(chess.fen())
    for (const move of pgnMoves) {
      chess.move(move)
      fens.push(chess.fen())
    }
    return fens
  }, [pgnMoves])

  // Start where the user left off.
  const [reviewIndex, setReviewIndex] = useState<number>(userMoves.length)

  const currentFen = fenSequence[reviewIndex] ?? fenSequence[fenSequence.length - 1]
  const reviewArrow = useMemo(() => arrowForMove(pgnMoves, reviewIndex), [reviewIndex, pgnMoves])

  // ← / → arrow navigation for the review board.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        setReviewIndex(index => Math.min(pgnMoves.length, index + 1))
      } else if (event.key === 'ArrowLeft') {
        setReviewIndex(index => Math.max(0, index - 1))
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [pgnMoves.length])

  const getMoveClassName = (moveIdx: number) => {
    const isSelected = moveIdx === reviewIndex - 1
    const wasReached = moveIdx < userMoves.length
    const wasWrong = wrongGuesses[moveIdx] === 'Y'

    const classes: string[] = []
    if (!wasReached) classes.push('text-muted-foreground opacity-40')
    if (wasWrong) classes.push('text-red-600')
    if (isSelected) classes.push('font-bold outline outline-1 outline-primary bg-primary/10')
    return classes.join(' ')
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <div className="mx-auto w-full max-w-[560px]">
          <Chessboard
            options={{
              ...DEFAULT_CHESSBOARD_OPTIONS,
              position: currentFen,
              allowDragging: false,
              arrows: reviewArrow,
            }}
          />
        </div>

        <div className="mt-4 flex gap-2">
          <Button
            size="icon"
            onClick={() => setReviewIndex(0)}
            disabled={reviewIndex === 0}
            title="Reset"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => setReviewIndex(index => Math.max(0, index - 1))}
            disabled={reviewIndex === 0}
            title="Previous move"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => setReviewIndex(index => Math.min(pgnMoves.length, index + 1))}
            disabled={reviewIndex === pgnMoves.length}
            title="Next move"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            onClick={() => setReviewIndex(pgnMoves.length)}
            disabled={reviewIndex === pgnMoves.length}
            title="Last move"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {gameName && <h2 className="mb-3 font-semibold">{gameName}</h2>}

        <div className="leading-8">
          {pgnMoves.map((san, index) => {
            const moveNumber = Math.floor(index / 2) + 1
            const isWhiteMove = index % 2 === 0

            return (
              <span
                key={`${san}-${index}`}
                onClick={() => setReviewIndex(index + 1)}
                className={`mr-2 inline-block cursor-pointer px-1 py-0.5 text-sm hover:bg-muted ${getMoveClassName(
                  index
                )}`}
              >
                {isWhiteMove ? `${moveNumber}. ${san}` : san}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Main component
// --------------------------------------------------------------------------

function NotationTrainer() {
  // moveIndex == index of the move currently SHOWN on the board, which is
  // also the move the user is being asked to type. After a correct guess
  // we advance moveIndex by 1 and play that move on the board.
  const [moveIndex, setMoveIndex] = useState<number>(0)
  const [pgnMoves, setPgnMoves] = useState<string[]>([])
  const [boardFen, setBoardFen] = useState<string>(new Chess().fen())
  const [arrow, setArrow] = useState<BoardArrow[]>([])
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [userMoves, setUserMoves] = useState<string[]>([])
  const [currentInput, setCurrentInput] = useState<string>('')
  const [openingName, setOpeningName] = useState<string>('')
  const [moveTimes, setMoveTimes] = useState<Date[]>([])
  const [gameName, setGameName] = useState<string>('')
  const [wrongAttempts, setWrongAttempts] = useState<number>(0)
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([])
  const [openSelectDialog, setOpenSelectDialog] = useState<boolean>(false)
  const [searchText, setSearchText] = useState<string>('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [reviewMode, setReviewMode] = useState<boolean>(false)
  const [reviewSnapshot, setReviewSnapshot] = useState<ReviewSnapshot | null>(null)

  const inputRef = useRef<HTMLInputElement | null>(null)

  const playedGames = useNotationTrainerStore(s => s.playedGames)
  const strictMode = useNotationTrainerStore(s => s.strictMode)
  const setStrictMode = useNotationTrainerStore(s => s.setStrictMode)
  const markGamePlayed = useNotationTrainerStore(s => s.markGamePlayed)
  const getGamePlayedInfo = useNotationTrainerStore(s => s.getGamePlayedInfo)

  const allCollections = useMemo<Collection[]>(
    () => [
      {
        key: 'world',
        title: 'World Championship Games',
        subtitle: 'Historic Battles for the Crown',
        type: 'world',
        data: worldChampionshipGames.map((championship, cIdx) => ({
          ...championship,
          Games: championship.Games.map((game, gIdx) => ({
            ...game,
            gameId: `world-${cIdx}-${gIdx}`,
          })),
        })),
      },
      {
        key: 'classics',
        title: 'Classic Games',
        subtitle: 'Timeless Masterpieces',
        type: 'flat',
        data: classicGames.map((game, idx) => ({
          ...game,
          gameId: `classics-${idx}`,
        })),
      },
      {
        key: 'miniatures',
        title: 'Famous Miniatures',
        subtitle: 'Brilliancies in Few Moves',
        type: 'flat',
        data: miniatureGames.map((game, idx) => ({
          ...game,
          gameId: `miniatures-${idx}`,
        })),
      },
    ],
    []
  )

  const isSearching = searchText.trim().length > 0

  const filteredCollections = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return allCollections
      .map(collection => {
        if (collection.type === 'world') {
          const filteredChamps = collection.data
            .map(championship => ({
              ...championship,
              Games: championship.Games.filter(
                g =>
                  !isSearching ||
                  g.White.toLowerCase().includes(query) ||
                  g.Black.toLowerCase().includes(query)
              ),
            }))
            .filter(c => c.Games.length > 0)
          return { ...collection, data: filteredChamps }
        }
        const filteredGames = collection.data.filter(
          g =>
            !isSearching ||
            g.White.toLowerCase().includes(query) ||
            g.Black.toLowerCase().includes(query) ||
            g.Name.toLowerCase().includes(query)
        )
        return { ...collection, data: filteredGames }
      })
      .filter(c => c.data.length > 0)
  }, [allCollections, isSearching, searchText])

  const toggleExpanded = (key: string) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const calculateAverageMoveTime = (times: Date[]) => {
    if (times.length <= 1) return 0
    const total = times.reduce((acc, t, i) => {
      if (i === 0) return acc
      return acc + (t.getTime() - times[i - 1].getTime())
    }, 0)
    return total / (times.length - 1) / 1000
  }

  const updateOpeningName = useCallback((newUserMoves: string[]) => {
    const formatted = newUserMoves
      .map((m, i) => (i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ${m}` : m))
      .join(' ')
    const match = openings.find(o => formatted.toUpperCase() === o.pgn.toUpperCase())
    if (match) setOpeningName(match.name)
  }, [])

  const handleNewGame = useCallback(
    (pgnString: string, gameIdToMark?: string) => {
      try {
        const loaded = new Chess()
        loaded.loadPgn(pgnString)
        const newPgnMoves = loaded.history()

        if (newPgnMoves.length === 0) {
          toast.error('This game has no moves.')
          return
        }

        const eventMatch = pgnString.match(/\[Event "([^"]+)"\]/)
        const whiteMatch = pgnString.match(/\[White "([^"]+)"\]/)
        const blackMatch = pgnString.match(/\[Black "([^"]+)"\]/)
        const roundMatch = pgnString.match(/\[Round "([^"]+)"\]/)

        const displayName =
          eventMatch && whiteMatch && blackMatch
            ? `${eventMatch[1]}${
                roundMatch ? ` (Round ${roundMatch[1]})` : ''
              } - ${whiteMatch[1]} vs ${blackMatch[1]}`
            : ''

        // Show position AFTER move 0 — the user is being asked to type the
        // move that produced this position.
        setPgnMoves(newPgnMoves)
        setGameName(displayName)
        setBoardFen(fenAfterMoves(newPgnMoves, 1))
        setArrow(arrowForMove(newPgnMoves, 1))
        setMoveIndex(0)
        setReviewMode(false)
        setReviewSnapshot(null)
        setUserMoves([])
        setCurrentInput('')
        setOpeningName('')
        setGameStarted(true)
        setMoveTimes([])
        setWrongAttempts(0)
        setWrongGuesses(Array(newPgnMoves.length).fill(''))

        if (gameIdToMark) markGamePlayed(gameIdToMark)

        requestAnimationFrame(() => inputRef.current?.focus())
      } catch (error) {
        console.error(error)
        toast.error('Failed to load game.')
      }
    },
    [markGamePlayed]
  )

  const loadRandomGame = useCallback(() => {
    // Skip any collection that ended up empty (defensive — shouldn't happen
    // with the canned data, but means a misconfigured import won't crash).
    const nonEmpty = allCollections.filter(c =>
      c.type === 'world' ? c.data.some(ch => ch.Games.length > 0) : c.data.length > 0
    )
    if (nonEmpty.length === 0) return

    const collection = nonEmpty[Math.floor(Math.random() * nonEmpty.length)]

    if (collection.type === 'world') {
      const champs = collection.data.filter(c => c.Games.length > 0)
      const championship = champs[Math.floor(Math.random() * champs.length)]
      const g = championship.Games[Math.floor(Math.random() * championship.Games.length)]

      const pgn = `
[Event "${championship.Event}"]
[Site "${championship.Site}"]
[Date "${g.Date}"]
[Round "${g.Round}"]
[White "${g.White}"]
[Black "${g.Black}"]
[Result "${g.Result}"]
[WhiteElo "${g.WhiteElo || ''}"]
[BlackElo "${g.BlackElo || ''}"]

${g.Moves}
      `.trim()

      handleNewGame(pgn, g.gameId)
      return
    }

    const g = collection.data[Math.floor(Math.random() * collection.data.length)]
    const pgn = `
[Event "${g.Name}"]
[Site "${g.Site}"]
[Date "${g.Date}"]
[White "${g.White}"]
[Black "${g.Black}"]
[Result "${g.Result}"]
[WhiteElo "${g.WhiteElo || ''}"]
[BlackElo "${g.BlackElo || ''}"]

${g.Moves}
    `.trim()
    handleNewGame(pgn, g.gameId)
  }, [allCollections, handleNewGame])

  useEffect(() => {
    loadRandomGame()
  }, [loadRandomGame])

  useEffect(() => {
    document.title = 'Notation Trainer'
  }, [])

  const enterReview = useCallback(
    (finalUserMoves: string[], finalWrongGuesses: string[]) => {
      setUserMoves(finalUserMoves)
      setWrongGuesses(finalWrongGuesses)
      setGameStarted(false)
      setReviewMode(true)
      setReviewSnapshot({
        pgnMoves,
        userMoves: finalUserMoves,
        wrongGuesses: finalWrongGuesses,
      })
    },
    [pgnMoves]
  )

  // Advance the board to show position after pgnMoves[nextIndex], i.e. after
  // playing that many moves from the start. Single source of truth — no
  // stale `game` closure dependency.
  const showMoveOnBoard = useCallback(
    (nextIndex: number) => {
      const count = nextIndex + 1
      setBoardFen(fenAfterMoves(pgnMoves, count))
      setArrow(arrowForMove(pgnMoves, count))
      setMoveIndex(nextIndex)
    },
    [pgnMoves]
  )

  const handleInputSubmit = useCallback(() => {
    if (!gameStarted) return

    const currentTime = new Date()
    const expectedSAN = pgnMoves[moveIndex]
    if (!expectedSAN) return

    const normExpected = normaliseSAN(expectedSAN, strictMode)
    const normInput = normaliseSAN(currentInput, strictMode)

    if (normInput === normExpected) {
      const newUserMoves = [...userMoves, expectedSAN]

      // Game complete?
      if (newUserMoves.length === pgnMoves.length) {
        enterReview(newUserMoves, wrongGuesses)
        toast.success('Completed.')
        return
      }

      // Advance.
      setUserMoves(newUserMoves)
      setCurrentInput('')
      setWrongAttempts(0)
      setMoveTimes(t => [...t, currentTime])
      updateOpeningName(newUserMoves)
      showMoveOnBoard(moveIndex + 1)
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }

    // Wrong guess.
    const nextWrongAttempts = wrongAttempts + 1
    setCurrentInput('')
    setWrongAttempts(nextWrongAttempts)

    if (nextWrongAttempts >= 3) {
      // Reveal answer, mark as wrong, advance or finish.
      const newUserMoves = [...userMoves, expectedSAN]
      const newWrongGuesses = [...wrongGuesses]
      newWrongGuesses[moveIndex] = 'Y'

      if (newUserMoves.length === pgnMoves.length) {
        enterReview(newUserMoves, newWrongGuesses)
        toast.info(`Wrong three times. The move was ${expectedSAN}.`)
        return
      }

      setUserMoves(newUserMoves)
      setWrongGuesses(newWrongGuesses)
      setWrongAttempts(0)
      updateOpeningName(newUserMoves)
      showMoveOnBoard(moveIndex + 1)
      toast.info(`Wrong three times. The move was ${expectedSAN}.`)
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }

    toast.error('Wrong move.')
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [
    currentInput,
    enterReview,
    gameStarted,
    moveIndex,
    pgnMoves,
    showMoveOnBoard,
    strictMode,
    updateOpeningName,
    userMoves,
    wrongAttempts,
    wrongGuesses,
  ])

  const handleEndGame = () => {
    enterReview(userMoves, wrongGuesses)
  }

  // Enter key handled on the input itself, not a global listener — avoids
  // submitting moves when the user is typing in the dialog's search box.
  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleInputSubmit()
    }
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Notation Trainer</h1>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={() => setOpenSelectDialog(true)}>
          <PlayCircle className="mr-2 h-4 w-4" />
          Select Game
        </Button>
        <Button onClick={loadRandomGame}>
          <Shuffle className="mr-2 h-4 w-4" />
          Random Game
        </Button>
        {gameStarted && !reviewMode && (
          <Button variant="secondary" onClick={handleEndGame}>
            End Game
          </Button>
        )}
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={strictMode}
            onChange={e => setStrictMode(e.target.checked)}
          />
          Strict
        </label>
      </div>

      {reviewMode && reviewSnapshot ? (
        <div className="mt-6">
          <ReviewPanel
            pgnMoves={reviewSnapshot.pgnMoves}
            userMoves={reviewSnapshot.userMoves}
            wrongGuesses={reviewSnapshot.wrongGuesses}
            gameName={gameName}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <div className="mx-auto w-full max-w-[560px]">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: boardFen,
                  allowDragging: false,
                  arrows: arrow,
                }}
              />
            </div>

            {gameName && <div className="mt-4 font-medium">{gameName}</div>}
            {openingName && (
              <div className="mt-2 text-sm">
                Opening: <strong>{openingName}</strong>
              </div>
            )}
            {moveTimes.length > 1 && (
              <div className="mt-2 text-sm">
                Average move time:{' '}
                <strong>{calculateAverageMoveTime(moveTimes).toFixed(2)} seconds</strong>
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 flex items-center gap-2">
              <Input
                ref={inputRef}
                value={currentInput}
                onChange={e => setCurrentInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                name="chess-notation-input"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-24 text-center"
              />
              <Button onClick={handleInputSubmit} disabled={!gameStarted}>
                Notate
              </Button>
            </div>

            <div className="leading-8">
              {userMoves.map((move, index) => {
                const moveNumber = Math.floor(index / 2) + 1
                const isWhiteMove = index % 2 === 0
                const isWrongGuess = wrongGuesses[index] === 'Y'
                return (
                  <span
                    key={`${move}-${index}`}
                    className={`mr-2 inline-block whitespace-nowrap ${
                      isWrongGuess ? 'text-red-600' : ''
                    }`}
                  >
                    {isWhiteMove ? `${moveNumber}. ${move}` : move}
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <Dialog open={openSelectDialog} onOpenChange={setOpenSelectDialog}>
        <DialogContent className="max-h-[85vh] min-w-[50vw] max-w-[90vw] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Select Game</DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            {filteredCollections.length === 0 ? (
              <div className="text-sm text-muted-foreground">No matching games found.</div>
            ) : (
              filteredCollections.map(collection => (
                <div key={collection.key} className="border">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(collection.key)}
                    className="flex w-full items-center justify-between p-3 text-left"
                  >
                    <CollectionLabel
                      title={collection.title}
                      subtitle={collection.subtitle}
                      {...getCollectionStats(collection, playedGames)}
                    />
                    {expanded[collection.key] ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </button>

                  {expanded[collection.key] && (
                    <div className="border-t p-2">
                      {collection.type === 'world'
                        ? collection.data.map((championship, cIdx) => {
                            const champKey = `${collection.key}-${cIdx}`
                            return (
                              <div key={champKey} className="mb-2 border">
                                <button
                                  type="button"
                                  onClick={() => toggleExpanded(champKey)}
                                  className="flex w-full items-center justify-between p-3 text-left"
                                >
                                  <CollectionLabel
                                    title={championship.Event}
                                    subtitle={championship.Type}
                                    {...getChampionshipStats(championship, playedGames)}
                                  />
                                  {expanded[champKey] ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>

                                {expanded[champKey] && (
                                  <div className="border-t">
                                    {championship.Games.map(g => {
                                      const info = getGamePlayedInfo(g.gameId)
                                      return (
                                        <button
                                          key={g.gameId}
                                          type="button"
                                          onClick={() => {
                                            const pgn = `
[Event "${championship.Event}"]
[Site "${championship.Site}"]
[Date "${g.Date}"]
[Round "${g.Round}"]
[White "${g.White}"]
[Black "${g.Black}"]
[Result "${g.Result}"]
[WhiteElo "${g.WhiteElo || ''}"]
[BlackElo "${g.BlackElo || ''}"]

${g.Moves}
                                            `.trim()
                                            handleNewGame(pgn, g.gameId)
                                            setOpenSelectDialog(false)
                                          }}
                                          className="block w-full px-6 py-2 text-left text-sm hover:bg-muted"
                                        >
                                          <div>
                                            Round {g.Round}: {g.White} vs {g.Black} ({g.Result})
                                          </div>
                                          {info && (
                                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                              <CheckCircle className="h-3 w-3 text-green-600" />
                                              {new Date(info.lastPlayed).toLocaleDateString()}
                                            </div>
                                          )}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        : collection.data.map(g => {
                            const info = getGamePlayedInfo(g.gameId)
                            return (
                              <button
                                key={g.gameId}
                                type="button"
                                onClick={() => {
                                  const pgn = `
[Event "${g.Name}"]
[Site "${g.Site}"]
[Date "${g.Date}"]
[White "${g.White}"]
[Black "${g.Black}"]
[Result "${g.Result}"]
[WhiteElo "${g.WhiteElo || ''}"]
[BlackElo "${g.BlackElo || ''}"]

${g.Moves}
                                  `.trim()
                                  handleNewGame(pgn, g.gameId)
                                  setOpenSelectDialog(false)
                                }}
                                className="block w-full px-4 py-2 text-left text-sm hover:bg-muted"
                              >
                                <div className="font-medium">{g.Name}</div>
                                <div className="text-muted-foreground">
                                  {g.White} vs {g.Black} ({g.Result})
                                </div>
                                {info && (
                                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                    <CheckCircle className="h-3 w-3 text-green-600" />
                                    {new Date(info.lastPlayed).toLocaleDateString()}
                                  </div>
                                )}
                              </button>
                            )
                          })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <DialogFooter className="gap-2">
            <Input
              placeholder="Search player or game"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
            <Button variant="secondary" onClick={() => setOpenSelectDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default NotationTrainer
