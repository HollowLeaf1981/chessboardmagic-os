import { useCallback, useEffect, useState } from 'react'
import { LocateFixed, PlayCircle, StopCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { getSquareStyle } from '@/config/chessboard'

type SquareName = `${string}${number}`

const BOARD_ROWS = ['8', '7', '6', '5', '4', '3', '2', '1'] as const
const BOARD_COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const
const GAME_LENGTH_SECONDS = 60
const HIGH_SCORE_STORAGE_KEY = 'coordinate-trainer-high-score'

const BOARD_SQUARES: SquareName[] = BOARD_ROWS.flatMap(row =>
  BOARD_COLUMNS.map(file => `${file}${row}` as SquareName)
)

function CoordinateTrainer() {
  const [isGameActive, setIsGameActive] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(GAME_LENGTH_SECONDS)
  const [score, setScore] = useState<number>(0)
  const [highScore, setHighScore] = useState<number>(0)
  const [currentTarget, setCurrentTarget] = useState<SquareName | ''>('')
  const [preGameCountdown, setPreGameCountdown] = useState<number | null>(null)

  // Load the local high score once. This replaces the original user-profile
  // high score without bringing Firebase or account state into the open-source app.
  useEffect(() => {
    const savedHighScore = Number(localStorage.getItem(HIGH_SCORE_STORAGE_KEY) || 0)
    setHighScore(savedHighScore)
  }, [])

  const updateHighScore = useCallback((newScore: number) => {
    setHighScore(previousHighScore => {
      if (newScore <= previousHighScore) return previousHighScore

      localStorage.setItem(HIGH_SCORE_STORAGE_KEY, String(newScore))
      return newScore
    })
  }, [])

  // Picks a new target coordinate, avoiding an immediate repeat where possible.
  const setNewTarget = useCallback(() => {
    let newTarget: SquareName

    do {
      const randomIndex = Math.floor(Math.random() * BOARD_SQUARES.length)
      newTarget = BOARD_SQUARES[randomIndex]
    } while (newTarget === currentTarget && BOARD_SQUARES.length > 1)

    setCurrentTarget(newTarget)
  }, [currentTarget])

  const startMainGame = useCallback(() => {
    setIsGameActive(true)
    setNewTarget()
  }, [setNewTarget])

  // Runs the 3-2-1 pre-game countdown before enabling square clicks.
  useEffect(() => {
    if (preGameCountdown === null) return

    if (preGameCountdown > 0) {
      const timer = window.setTimeout(() => {
        setPreGameCountdown(preGameCountdown - 1)
      }, 1000)

      return () => window.clearTimeout(timer)
    }

    setPreGameCountdown(null)
    startMainGame()
  }, [preGameCountdown, startMainGame])

  // Runs the main 60-second timer in tenths of a second.
  useEffect(() => {
    if (!isGameActive) return

    if (timeLeft <= 0) {
      setIsGameActive(false)
      updateHighScore(score)
      return
    }

    const timer = window.setTimeout(() => {
      setTimeLeft(previousTime => Number(Math.max(0, previousTime - 0.1).toFixed(1)))
    }, 100)

    return () => window.clearTimeout(timer)
  }, [isGameActive, timeLeft, score, updateHighScore])

  useEffect(() => {
    document.title = 'Coordinate Trainer'
  }, [])

  const startGame = () => {
    setScore(0)
    setTimeLeft(GAME_LENGTH_SECONDS)
    setPreGameCountdown(3)
    setIsGameActive(false)
  }

  const stopGame = () => {
    setIsGameActive(false)
    setPreGameCountdown(null)
    updateHighScore(score)
  }

  const handleSquareClick = (square: SquareName) => {
    if (!isGameActive) return

    if (square === currentTarget) {
      setScore(previousScore => previousScore + 1)
    }

    setNewTarget()
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Coordinate Trainer</h1>
      <div className="w-full mt-6">
        <div className="w-full max-w-[600px] mb-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Button onClick={startGame} disabled={preGameCountdown !== null || isGameActive}>
              <PlayCircle className="mr-2 h-4 w-4" />
              New Game
            </Button>

            <Button onClick={stopGame} disabled={!isGameActive} variant="secondary">
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div>
              Time Left: <b>{timeLeft.toFixed(1)}s</b>
            </div>
            <div>
              Score: <b>{score}</b>
            </div>
            <div>
              High Score: <b>{highScore}</b>
            </div>
          </div>

          <div className="relative aspect-square w-full overflow-hidden">
            {preGameCountdown !== null && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center text-[30vw] font-bold text-black/50 md:text-[180px]">
                {preGameCountdown}
              </div>
            )}

            {preGameCountdown === null && currentTarget && (
              <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-[30vw] font-bold text-black/50 md:text-[180px]">
                {currentTarget}
              </div>
            )}

            <div
              className={`grid h-full w-full grid-cols-8 grid-rows-8 ${
                isGameActive ? 'pointer-events-auto' : 'pointer-events-none'
              }`}
            >
              {BOARD_ROWS.map((row, rowIndex) =>
                BOARD_COLUMNS.map((file, columnIndex) => {
                  const square = `${file}${row}` as SquareName
                  const isDark = (rowIndex + columnIndex) % 2 === 1

                  return (
                    <button
                      key={square}
                      type="button"
                      aria-label={`Select ${square}`}
                      onClick={() => handleSquareClick(square)}
                      className="flex items-center justify-center"
                      style={getSquareStyle(isDark)}
                    />
                  )
                })
              )}
            </div>
          </div>
        </div>
        <div className="flex max-w-[600px] items-start gap-2 text-sm text-muted-foreground">
          <LocateFixed className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Click the square shown in the middle of the board before the timer runs out.</p>
        </div>
      </div>
    </div>
  )
}

export default CoordinateTrainer
