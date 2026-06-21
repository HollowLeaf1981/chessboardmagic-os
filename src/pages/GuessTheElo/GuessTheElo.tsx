import { ChangeEvent, useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import {
  PlayCircle,
  RotateCcw,
  ArrowUpDown,
  ChevronsLeft,
  ChevronsRight,
  Clock,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { usergames } from '@/data/usergames'
import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

// A single anonymised game from the Lichess database. Derived from the
// dataset so the type stays accurate if columns change. Fields used:
//   P → PGN string
//   T → time control as "secondsPlayer+secondsIncrement" (e.g. "180+2")
//   W → White's Elo rating
//   B → Black's Elo rating
type UserGame = (typeof usergames)[number]

type BoardOrientation = 'white' | 'black'

/**
 * Guess The Elo
 * ---------------
 * Estimate the ratings of both players based on the game they played.
 * A random anonymised game from a Lichess dataset is loaded, the player
 * steps through the moves on the board (click, arrow keys, or click a
 * move in the move list), then enters a guess for each side's Elo.
 *
 * The win condition is permissive: both guesses within ±100 of the
 * actual rating counts as success. The reveal shows the true Elos
 * alongside the player's deltas so they can see how far off they were.
 */
function GuessTheElo() {
  // The chess.js instance currently rendered on the board. Steps
  // forward/back through the game's move list.
  const [game, setGame] = useState<Chess>(new Chess())
  // The full game data for this round — PGN, time control, both Elos.
  // Null until the first round loads.
  const [loadedGameData, setLoadedGameData] = useState<UserGame | null>(null)
  // Where we are in the move list. 0 = starting position, N = after
  // move N has been played.
  const [moveIndex, setMoveIndex] = useState<number>(0)
  // The game's moves in SAN, derived from chess.js's history() after
  // loading the PGN. Drives the clickable move list.
  const [pgnMoves, setPgnMoves] = useState<string[]>([])
  // True once the player has submitted their guess. Drives the Elo
  // reveal panel.
  const [check, setCheck] = useState<boolean>(false)
  // True while a round is in progress — controls the Guess button and
  // the prev/next navigation buttons.
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  // The player's two Elo guesses, as strings so we can preserve the
  // empty state and validate them as numeric-only.
  const [whiteInput, setWhiteInput] = useState<string>('')
  const [blackInput, setBlackInput] = useState<string>('')
  // Pretty-printed time control like "3 minutes + 2 sec". Derived from
  // the game's raw "180+2" T field.
  const [timecontrol, setTimecontrol] = useState<string>('')
  // Board orientation, toggleable via the swap button.
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white')

  const getRandomNumber = (n: number): number => Math.floor(Math.random() * n)

  /**
   * Starts a new round: picks a random game from the dataset, loads
   * its PGN into chess.js to derive the move list, parses the time
   * control into a human-readable string, and resets per-round state.
   */
  const handleNewGame = useCallback(() => {
    const games = usergames as UserGame[]
    const randomNumber = getRandomNumber(games.length)
    const selected = games[randomNumber]

    setLoadedGameData(selected)
    const newGame = new Chess()
    newGame.loadPgn(selected.P)
    const newPgnMoves = newGame.history()
    setPgnMoves(newPgnMoves)

    // T is stored as "totalSeconds+incrementSeconds". Convert the total
    // to minutes for the display string.
    const parts = selected.T.split('+')
    const tc = `${parseInt(parts[0]) / 60} minutes + ${parts[1]} sec`
    setTimecontrol(tc)

    newGame.reset()
    setGame(newGame)
    setMoveIndex(0)

    setCheck(false)
    setGameStarted(true)

    setWhiteInput('')
    setBlackInput('')
  }, [])

  // Reset the board to the starting position without picking a new
  // game. Same game, fresh attempt at stepping through it.
  const handleResetBoard = () => {
    const newGame = new Chess()
    setGame(newGame)
    setMoveIndex(0)
  }

  // Numeric-only input handlers. The text-mode regex lets us preserve
  // empty state cleanly (which `type="number"` doesn't).
  const handleWhiteInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (/^\d*$/.test(newValue)) {
      setWhiteInput(newValue)
    }
  }

  const handleBlackInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    if (/^\d*$/.test(newValue)) {
      setBlackInput(newValue)
    }
  }

  // Step back one move by undoing the last move on the chess.js
  // instance. Cheaper than rebuilding from scratch each time.
  const handlePrevMove = useCallback(() => {
    if (moveIndex > 0) {
      game.undo()
      setMoveIndex(moveIndex - 1)
    }
  }, [moveIndex, game])

  // Step forward by playing the next move from the PGN list.
  const handleNextMove = useCallback(() => {
    if (moveIndex < pgnMoves.length) {
      game.move(pgnMoves[moveIndex])
      setMoveIndex(prev => prev + 1)
    }
  }, [moveIndex, pgnMoves, game])

  // Jump directly to a move by rebuilding from scratch and replaying
  // up to that index. Used by clicks on the move list.
  const jumpToMove = (index: number) => {
    const newGame = new Chess()
    for (let i = 0; i < index; i++) {
      newGame.move(pgnMoves[i])
    }
    setGame(newGame)
    setMoveIndex(index)
  }

  // Builds the clickable move list: "1. e4 e5 2. Nf3 ..." with each
  // half-move clickable and the currently-displayed move underlined.
  const renderFormattedPGN = () => {
    const movePairIndexes = Array.from(
      { length: Math.ceil(pgnMoves.length / 2) },
      (_, movePairIndex) => movePairIndex * 2
    )

    return movePairIndexes.map(i => {
      const moveNumber = Math.floor(i / 2) + 1
      const whiteMove = pgnMoves[i]
      const blackMove = pgnMoves[i + 1]

      const isWhiteSelected = moveIndex === i + 1
      const isBlackSelected = moveIndex === i + 2

      return (
        <span key={`move-${i}`} className="mr-2 inline-block">
          {moveNumber}.{' '}
          <span
            onClick={() => jumpToMove(i + 1)}
            className={`cursor-pointer mr-2 ${isWhiteSelected ? 'underline font-bold' : ''}`}
          >
            {whiteMove}
          </span>
          {blackMove && (
            <span
              onClick={() => jumpToMove(i + 2)}
              className={`cursor-pointer ${isBlackSelected ? 'underline font-bold' : ''}`}
            >
              {blackMove}
            </span>
          )}
        </span>
      )
    })
  }

  // Arrow-key navigation through the game's moves.
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevMove()
      } else if (e.key === 'ArrowRight') {
        handleNextMove()
      }
    }
    window.addEventListener('keydown', handleKeyPress)
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [moveIndex, gameStarted, handleNextMove, handlePrevMove])

  /**
   * Submits the player's Elo guesses. The win bar is ±100 for both
   * sides — the round counts as a success if the player got within
   * 100 points of each rating. Either way, the actual Elos are
   * revealed in the panel below.
   */
  const handleGuessElo = () => {
    if (!loadedGameData) return
    setGameStarted(false)
    setCheck(true)
    // Behaviour preserved — the success/failure split is just for
    // tracking, which we've stripped. The reveal happens regardless.
  }

  // Auto-start a game on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  return (
    <div className="page-container">
      <h1 className="heading-1">Guess The Elo</h1>
      <div className="w-full mt-6">
        {/* Controls row: Play (new game), Reset (rewind same game),
          and the orientation flip. */}
        <div id="newGame" className="inline-flex flex-wrap items-center gap-2 mb-4">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>
          <Button variant="secondary" onClick={handleResetBoard}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            variant="secondary"
            onClick={() => setBoardOrientation(prev => (prev === 'white' ? 'black' : 'white'))}
            className="h-9 w-9 p-0"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Board column with prev/next navigation underneath. */}
          <div className="w-full">
            <div className="w-full max-w-[560px] mx-auto">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: game.fen(),
                  boardOrientation: boardOrientation,
                  allowDragging: false,
                  allowDrawingArrows: false,
                }}
              />
            </div>

            <div className="flex items-center mt-4">
              <Button
                disabled={!gameStarted}
                variant="secondary"
                onClick={handlePrevMove}
                className="mr-2"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                disabled={!gameStarted}
                variant="secondary"
                onClick={handleNextMove}
                className="mr-2"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                Use the left and right arrow keys to navigate
              </span>
            </div>
          </div>

          {/* Guess panel: time control, move list, Elo inputs, and the
            reveal once the player guesses. */}
          <div className="w-full">
            {timecontrol && (
              <p className="flex items-center mb-2">
                <Clock className="mr-1 h-4 w-4 text-muted-foreground" />
                {timecontrol}
              </p>
            )}

            <p id="pgn" className="mb-4 text-sm leading-6">
              {renderFormattedPGN()}
            </p>

            {/* Guess inputs + submit. Numeric-only via regex (the inputs
              are text-mode rather than number-mode so we can keep
              empty-state semantics). */}
            <div id="guesses" className="inline-flex flex-wrap items-end gap-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="whiteInput" className="text-xs">
                  White Elo
                </Label>
                <Input
                  id="whiteInput"
                  type="text"
                  inputMode="numeric"
                  value={whiteInput}
                  onChange={handleWhiteInputChange}
                  autoComplete="off"
                  className="w-[100px]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="blackInput" className="text-xs">
                  Black Elo
                </Label>
                <Input
                  id="blackInput"
                  type="text"
                  inputMode="numeric"
                  value={blackInput}
                  onChange={handleBlackInputChange}
                  autoComplete="off"
                  className="w-[100px]"
                />
              </div>
              <Button
                onClick={handleGuessElo}
                disabled={!gameStarted || whiteInput.length === 0 || blackInput.length === 0}
              >
                Guess
              </Button>
            </div>

            {/* Reveal panel — only renders after the player guesses.
              Shows the real Elos alongside the player's deltas so they
              can see how far off they were. */}
            {check && loadedGameData && (
              <>
                <p className="text-sm mt-2">
                  White Elo: {loadedGameData.W}
                  {whiteInput !== '' && (
                    <span> ({parseInt(whiteInput) - parseInt(loadedGameData.W)})</span>
                  )}
                </p>
                <p className="text-sm mt-1">
                  Black Elo: {loadedGameData.B}
                  {blackInput !== '' && (
                    <span> ({parseInt(blackInput) - parseInt(loadedGameData.B)})</span>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuessTheElo
