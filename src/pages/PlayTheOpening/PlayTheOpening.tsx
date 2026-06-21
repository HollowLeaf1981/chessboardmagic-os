import { Fragment, useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { PlayCircle, CheckCircle, AlertCircle, ArrowUpDown, XCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

import { openings } from '@/data/eco'
import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

// A single ECO opening entry: name + PGN string + length (move count).
type Opening = (typeof openings)[number]

// Per-move feedback colour: green for right-move-right-slot, yellow for
// right-move-wrong-slot, empty string for wrong. Stored as raw colour
// strings because they're used as inline background-color.
type MoveColor = string

// A single previous attempt — the moves the player submitted plus the
// per-move feedback colours for them.
interface Attempt {
  moves: string[]
  colors: MoveColor[]
}

type BoardOrientation = 'white' | 'black'

const CORRECT_COLOR = '#22c55e'
const MISPLACED_COLOR = '#E0C879'

/**
 * Play The Opening
 * ---------------
 * Wordle-style training drill: the player is told the name of a chess
 * opening up front (e.g. "Ruy López: Berlin Defense") and has six
 * attempts to play out the exact move sequence. Each attempt gets
 * per-move feedback — green for right move at right index, yellow for
 * right move at wrong index, blank for not in the line.
 *
 * Differs from "Guess The Opening" in one way: the name is visible from
 * the start, so this is a recall drill rather than a deduction puzzle.
 * Use it to test how well you actually know the lines you've studied.
 */
function PlayTheOpening() {
  // The chess.js instance currently rendered on the board.
  const [game, setGame] = useState<Chess>(new Chess())
  // The target move sequence — what the player is trying to play out.
  const [moves, setMoves] = useState<string[]>([])
  // The moves the player has played so far this attempt, in SAN.
  const [playerMoves, setPlayerMoves] = useState<string[]>([])
  // Feedback colours for the current attempt, populated by Guess.
  const [moveColors, setMoveColors] = useState<MoveColor[]>([])
  // How many moves the player has played this attempt. Drives Guess
  // button enable state and clamps further drops once the line is full.
  const [moveCounter, setMoveCounter] = useState<number>(0)
  // History of all completed attempts, rendered above the current row.
  const [attempts, setAttempts] = useState<Attempt[]>([])
  // Max attempts before the round is lost. Six matches Wordle convention.
  const maxAttempts = 6
  // Total attempts submitted this round.
  const [totalAttempts, setTotalAttempts] = useState<number>(0)
  // Configurable move count, 6–12. Filters the opening pool to lines of
  // exactly this length.
  const [selectedNumberOfMoves, setSelectedNumberOfMoves] = useState<number>(8)
  // Round status: "COMPLETED" (win), "FAILED" (loss or quit), or "".
  const [status, setStatus] = useState<string>('')
  // Locks all action buttons once the round ends.
  const [gameOver, setGameOver] = useState<boolean>(true)
  // The full opening entry being played — name shown from the start,
  // PGN revealed in the post-round banner.
  const [selectedLine, setSelectedLine] = useState<Opening | null>(null)
  // Moves the player has correctly placed across all attempts. Drives
  // the auto-complete button.
  const [correctGuesses, setCorrectGuesses] = useState<string[]>([])
  // Board orientation, toggleable via the flip button.
  const [boardOrientation, setBoardOrientation] = useState<BoardOrientation>('white')
  // Which move in the target line is currently shown on the board after
  // the round ends. -1 = starting position. Drives click/key navigation.
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1)

  // Resets the board back to the starting position and clears the
  // current-attempt state. Used both between attempts and on new game.
  const handleResetBoard = () => {
    const newGame = new Chess()
    setGame(newGame)
    setPlayerMoves([])
    setMoveColors([])
    setMoveCounter(0)
    setStatus('')
  }

  // Auto-complete: replays the locked-in correct moves so the player
  // doesn't have to re-enter them at the start of each attempt.
  const handleFillCorrect = () => {
    const newGame = new Chess()
    let correctMoves = 0
    for (let i = 0; i < correctGuesses.length; i++) {
      if (correctGuesses[i] === '') {
        break
      }
      newGame.move(correctGuesses[i])
      correctMoves = correctMoves + 1
    }

    setGame(newGame)
    setPlayerMoves(correctGuesses)
    setMoveCounter(correctMoves)
  }

  function extractMovesFromString(inputString: string): string[] {
    const splitArray = inputString.split(' ')
    const filteredArray = splitArray.filter(item => !item.includes('.'))
    return filteredArray
  }

  /**
   * Starts a new round: picks a random opening of the configured length,
   * captures its target moves, and clears all per-round state.
   */
  const handleNewGame = useCallback(() => {
    handleResetBoard()

    const filteredOpenings = (openings as Opening[]).filter(
      opening => opening.length === selectedNumberOfMoves
    )
    const randomIndex = Math.floor(Math.random() * filteredOpenings.length)
    const eco = filteredOpenings[randomIndex]

    setSelectedLine(eco)
    setMoves(extractMovesFromString(eco.pgn))
    setCorrectGuesses([])
    setPlayerMoves([])
    setMoveColors([])
    setMoveCounter(0)
    setAttempts([])
    setGameOver(false)
    setStatus('')
    setTotalAttempts(0)
    setCurrentMoveIndex(-1)
  }, [selectedNumberOfMoves])

  // Concedes the round. Same end-state as running out of attempts —
  // reveals the full opening so the player can review it.
  const handleQuit = () => {
    setStatus('FAILED')
    setGameOver(true)
  }

  /**
   * Drag-drop handler from react-chessboard. Returns false to reject the
   * move (illegal moves, off-board drops, or moves past the line length).
   */
  function onDrop({
    sourceSquare,
    targetSquare,
  }: {
    sourceSquare: string
    targetSquare: string | null
  }): boolean {
    if (targetSquare === null) return false
    if (moveCounter === moves.length) {
      return false
    }

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
      })

      if (move === null) {
        return false
      }

      const newPlayerMoves = [...playerMoves]
      newPlayerMoves[moveCounter] = move.san
      setPlayerMoves(newPlayerMoves)

      setMoveCounter(moveCounter + 1)

      return true
    } catch {
      return false
    }
  }

  /**
   * Submits the current attempt: per-move comparison, Wordle colours,
   * locked-in correct guesses, and either ends the round or resets for
   * another go.
   */
  const handleCompareMoves = () => {
    setTotalAttempts(totalAttempts + 1)

    const newMoveColors = playerMoves.map((move, index) => {
      if (move.toLowerCase() === moves[index].toLowerCase()) {
        return CORRECT_COLOR
      } else if (moves.map(m => m.toLowerCase()).includes(move.toLowerCase())) {
        return MISPLACED_COLOR
      } else {
        return ''
      }
    })

    const newCorrectGuesses = playerMoves.map((move, index) => {
      if (move.toLowerCase() === moves[index].toLowerCase()) {
        return move
      } else {
        return ''
      }
    })

    // Only auto-fill a contiguous prefix — once we hit a wrong/missing
    // move, blank everything after it too, because the wrong move would
    // put chess.js in the wrong position for the subsequent locked-ins.
    if (newCorrectGuesses[0] === '') {
      newCorrectGuesses.fill('')
    } else {
      const firstBlankIndex = newCorrectGuesses.indexOf('')
      if (firstBlankIndex !== -1) {
        for (let i = firstBlankIndex; i < newCorrectGuesses.length; i++) {
          newCorrectGuesses[i] = ''
        }
      }
    }

    setCorrectGuesses(newCorrectGuesses)
    setMoveColors(newMoveColors)

    const correctCount = newMoveColors.filter(color => color === CORRECT_COLOR).length

    if (correctCount === moves.length) {
      setStatus('COMPLETED')
      setGameOver(true)
    } else if (totalAttempts === maxAttempts - 1) {
      setStatus('FAILED')
      setGameOver(true)
    } else {
      setStatus('')
      const attempt: Attempt = {
        moves: [...playerMoves],
        colors: [...newMoveColors],
      }
      setAttempts([...attempts, attempt])
      handleResetBoard()
    }
  }

  // Auto-start a game on mount, and any time the move count changes.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  useEffect(() => {
    document.title = 'Play The Opening'
  }, [])

  // Once the round is over, sync the board to whichever move index is
  // currently selected. Always rebuilds from a fresh chess.js instance
  // and replays up to the target index. Disabled during play so the
  // live board isn't disturbed.
  useEffect(() => {
    if (!gameOver || moves.length === 0) return
    const newGame = new Chess()
    for (let i = 0; i <= currentMoveIndex; i++) {
      if (moves[i]) newGame.move(moves[i])
    }
    setGame(newGame)
  }, [currentMoveIndex, gameOver, moves])

  // Arrow-key navigation through the target line, active only after
  // the round ends.
  useEffect(() => {
    if (!gameOver || moves.length === 0) return
    const maxIndex = moves.length - 1
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentMoveIndex(prev => Math.max(-1, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentMoveIndex(prev => Math.min(maxIndex, prev + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [gameOver, moves.length])

  return (
    <div className="page-container">
      <h1 className="heading-1">Play The Opening</h1>
      <div className="w-full mt-6">
        <div className="flex items-end flex-wrap gap-2 mb-4">
          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            Play
          </Button>

          <div className="flex flex-col gap-1">
            <Label className="text-xs">Number of moves</Label>
            <Select
              value={selectedNumberOfMoves.toString()}
              onValueChange={(value: string) => setSelectedNumberOfMoves(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[12, 11, 10, 9, 8, 7, 6].map(length => (
                  <SelectItem key={length} value={length.toString()}>
                    {length}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="secondary"
            onClick={() => setBoardOrientation(prev => (prev === 'white' ? 'black' : 'white'))}
            className="h-9 w-9 p-0"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>

          <Button variant="secondary" onClick={handleQuit} disabled={gameOver}>
            <XCircle className="mr-2 h-4 w-4" />
            Quit
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          <div className="w-full">
            <div className="w-full max-w-[560px] mx-auto">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: game.fen(),
                  onPieceDrop: onDrop,
                  boardOrientation: boardOrientation,
                  allowDrawingArrows: false,
                }}
              />
            </div>
          </div>

          <div className="w-full">
            {/* The opening name + guess counter. The name is the whole
              point of this game — the player is told what to play. */}
            {selectedLine && (
              <div className="mb-2">
                <p>
                  <b>{selectedLine.name}</b>
                </p>
                <p>
                  <b>{totalAttempts}</b> guesses
                </p>
              </div>
            )}

            {/* Previous attempts history. */}
            <div>
              <div className="flex flex-row flex-wrap">
                {attempts.map((attempt, attemptIndex) => (
                  <div
                    key={`attempt-${attemptIndex}`}
                    className="flex items-center justify-start w-full"
                  >
                    {attempt.moves.map((move, moveIndex) => (
                      <Fragment key={`attempt-${attemptIndex}-move-${moveIndex}`}>
                        <div
                          style={{
                            backgroundColor: attempt.colors[moveIndex],
                            width: '40px',
                            height: '40px',
                            margin: '2px 4px 2px 0px',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            border: '1px solid #999999',
                            borderRadius: '4px',
                          }}
                        >
                          {move}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Current attempt row. */}
            <div className="flex flex-row">
              {moves.map((_, index) => (
                <Fragment key={`move-${index}`}>
                  <div
                    style={{
                      backgroundColor: moveColors[index],
                      width: '40px',
                      height: '40px',
                      margin: '2px 4px 2px 0px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      border: '1px solid #999999',
                      borderRadius: '4px',
                    }}
                  >
                    {playerMoves[index]}
                  </div>
                </Fragment>
              ))}
            </div>

            <div className="flex mt-5 gap-2 flex-wrap">
              <Button
                onClick={handleCompareMoves}
                disabled={
                  moveCounter !== moves.length || attempts.length >= maxAttempts || gameOver
                }
              >
                Guess
              </Button>
              <Button
                variant="secondary"
                onClick={handleResetBoard}
                disabled={moveCounter === 0 || gameOver}
              >
                Clear
              </Button>
              <Button
                variant="secondary"
                onClick={handleFillCorrect}
                disabled={correctGuesses.length === 0 || gameOver}
              >
                Auto-complete
              </Button>
            </div>

            {/* Post-round banner with the full PGN and clickable move
              list for traversal. Arrow keys also navigate. */}
            {status && selectedLine && (
              <div className="pt-5">
                <div className="flex items-center">
                  {status === 'COMPLETED' ? (
                    <CheckCircle className="text-green-600 mr-2 h-8 w-8 shrink-0" />
                  ) : status === 'FAILED' ? (
                    <AlertCircle className="text-red-600 mr-2 h-8 w-8 shrink-0" />
                  ) : null}
                  <span className="flex flex-wrap items-center">
                    <span
                      onClick={() => setCurrentMoveIndex(-1)}
                      className={`cursor-pointer mr-2 mb-1 ${
                        currentMoveIndex === -1 ? 'underline' : ''
                      }`}
                    >
                      Start
                    </span>
                    {moves.map((move, index) => (
                      <span
                        key={index}
                        onClick={() => setCurrentMoveIndex(index)}
                        className={`cursor-pointer mr-2 mb-1 ${
                          currentMoveIndex === index ? 'underline' : ''
                        }`}
                      >
                        {move}
                      </span>
                    ))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlayTheOpening
