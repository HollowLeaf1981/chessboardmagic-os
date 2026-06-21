import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Arrow, PieceDropHandlerArgs } from 'react-chessboard'
import { PlayCircle, StopCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

const BOARD_SIZE = 8
const FRUITS_PER_LEVEL = 5
const INITIAL_TIME_LEFT = 600

const MODES = {
  TIMER: 'timer',
  FEWEST_MOVES: 'fewest_moves',
} as const

const PIECES = ['Q', 'R', 'B', 'N', 'K'] as const

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const

type Mode = (typeof MODES)[keyof typeof MODES]
type TrainerPiece = (typeof PIECES)[number]
type BoardFile = (typeof FILES)[number]
type BoardRank = (typeof RANKS)[number]
type SquareName = `${BoardFile}${BoardRank}`
type SquareColor = 'dark' | 'light'

const MODE_LABELS: Record<Mode, string> = {
  [MODES.TIMER]: 'Timer',
  [MODES.FEWEST_MOVES]: 'Fewest Moves',
}

const PIECE_LABELS: Record<TrainerPiece, string> = {
  Q: 'Queen',
  R: 'Rook',
  B: 'Bishop',
  N: 'Knight',
  K: 'King',
}

function getRandomSquare(): SquareName {
  const file = FILES[Math.floor(Math.random() * BOARD_SIZE)]
  const rank = RANKS[Math.floor(Math.random() * BOARD_SIZE)]

  return `${file}${rank}`
}

function isBoardSquare(square: string | null | undefined): square is SquareName {
  return /^[a-h][1-8]$/.test(square ?? '')
}

function getSquareColor(square: SquareName): SquareColor {
  const fileIndex = square.charCodeAt(0) - 'a'.charCodeAt(0)
  const rankIndex = Number(square[1]) - 1

  return (fileIndex + rankIndex) % 2 === 0 ? 'dark' : 'light'
}

function isValidMove(piece: TrainerPiece, from: SquareName, to: SquareName): boolean {
  const fromFile = from.charCodeAt(0)
  const fromRank = Number(from[1])
  const toFile = to.charCodeAt(0)
  const toRank = Number(to[1])

  const fileDiff = Math.abs(toFile - fromFile)
  const rankDiff = Math.abs(toRank - fromRank)

  switch (piece) {
    case 'Q':
      return fileDiff === rankDiff || fromFile === toFile || fromRank === toRank
    case 'R':
      return fromFile === toFile || fromRank === toRank
    case 'B':
      return fileDiff === rankDiff
    case 'N':
      return (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2)
    case 'K':
      return fileDiff <= 1 && rankDiff <= 1
    default:
      return false
  }
}

function buildFen(piece: TrainerPiece, piecePosition: SquareName, fruits: SquareName[]): string {
  const board = Array.from({ length: 8 }, () => Array<string>(8).fill('1'))

  const pieceFile = piecePosition.charCodeAt(0) - 'a'.charCodeAt(0)
  const pieceRank = 8 - Number(piecePosition[1])
  board[pieceRank][pieceFile] = piece

  fruits.forEach(fruit => {
    const fruitFile = fruit.charCodeAt(0) - 'a'.charCodeAt(0)
    const fruitRank = 8 - Number(fruit[1])
    board[fruitRank][fruitFile] = 'p'
  })

  return board.map(row => row.join('').replace(/1+/g, match => String(match.length))).join('/')
}

function PieceTrainer() {
  const chessboardRef = useRef<HTMLDivElement | null>(null)

  const [mode, setMode] = useState<Mode>(MODES.TIMER)
  const [piece, setPiece] = useState<TrainerPiece>('Q')
  const [piecePosition, setPiecePosition] = useState<SquareName>(getRandomSquare())
  const [fruits, setFruits] = useState<SquareName[]>([])
  const [score, setScore] = useState<number>(0)
  const [level, setLevel] = useState<number>(1)
  const [gameOver, setGameOver] = useState<boolean>(false)
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [timeLeft, setTimeLeft] = useState<number>(INITIAL_TIME_LEFT)
  const [arrows, setArrows] = useState<Arrow[]>([])
  const [touchStartSquare, setTouchStartSquare] = useState<SquareName | null>(null)

  const generateFruits = useCallback(
    (amount: number, piecePos: SquareName, selectedPiece: TrainerPiece = piece): SquareName[] => {
      const newFruits = new Set<SquareName>()

      // Bishops can only ever reach one colour complex, so fruit targets
      // are restricted to the same colour as the bishop's current square.
      const targetColor = selectedPiece === 'B' ? getSquareColor(piecePos) : null

      while (newFruits.size < amount) {
        const square = getRandomSquare()

        if (
          square !== piecePos &&
          (targetColor === null || getSquareColor(square) === targetColor)
        ) {
          newFruits.add(square)
        }
      }

      return Array.from(newFruits)
    },
    [piece]
  )

  const getSquareFromCoords = (x: number, y: number): SquareName | null => {
    if (!chessboardRef.current) return null

    const rect = chessboardRef.current.getBoundingClientRect()
    const squareSize = rect.width / BOARD_SIZE

    const fileIndex = Math.floor((x - rect.left) / squareSize)
    const rankIndex = 7 - Math.floor((y - rect.top) / squareSize)

    if (fileIndex < 0 || fileIndex > 7 || rankIndex < 0 || rankIndex > 7) {
      return null
    }

    return `${FILES[fileIndex]}${RANKS[rankIndex]}`
  }

  const getFen = (): string => {
    if (!gameStarted && !gameOver) return '8/8/8/8/8/8/8/8'

    return buildFen(piece, piecePosition, fruits)
  }

  const handlePointerStart = (event: PointerEvent<HTMLDivElement>) => {
    if (mode !== MODES.FEWEST_MOVES) return

    const square = getSquareFromCoords(event.clientX, event.clientY)
    setTouchStartSquare(square)
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!touchStartSquare || mode !== MODES.FEWEST_MOVES) return

    const endSquare = getSquareFromCoords(event.clientX, event.clientY)

    if (!endSquare || touchStartSquare === endSquare) {
      setTouchStartSquare(null)
      return
    }

    if (!isValidMove(piece, touchStartSquare, endSquare)) {
      setTouchStartSquare(null)
      return
    }

    setArrows(previousArrows => {
      const existingIndex = previousArrows.findIndex(
        arrow => arrow.startSquare === touchStartSquare && arrow.endSquare === endSquare
      )

      if (existingIndex !== -1) {
        return previousArrows.filter((_, index) => index !== existingIndex)
      }

      return [
        ...previousArrows,
        {
          startSquare: touchStartSquare,
          endSquare,
          color: 'rgba(255, 170, 0, 0.8)',
        },
      ]
    })

    setTouchStartSquare(null)
  }

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (mode !== MODES.TIMER || !gameStarted) return false
    if (!isBoardSquare(sourceSquare) || !isBoardSquare(targetSquare)) return false
    if (sourceSquare !== piecePosition) return false
    if (!isValidMove(piece, sourceSquare, targetSquare)) return false

    setPiecePosition(targetSquare)

    if (fruits.includes(targetSquare)) {
      const remainingFruits = fruits.filter(fruit => fruit !== targetSquare)
      setScore(previousScore => previousScore + 1)

      if (remainingFruits.length === 0) {
        setLevel(previousLevel => previousLevel + 1)
        setFruits(generateFruits(FRUITS_PER_LEVEL, targetSquare, piece))
      } else {
        setFruits(remainingFruits)
      }
    }

    return true
  }

  const handleNewGame = () => {
    const newPiecePosition = getRandomSquare()
    const newFruits = generateFruits(FRUITS_PER_LEVEL, newPiecePosition, piece)

    setFruits(newFruits)
    setPiecePosition(newPiecePosition)
    setScore(0)
    setLevel(1)
    setArrows([])
    setTimeLeft(INITIAL_TIME_LEFT)
    setGameStarted(true)
    setGameOver(false)
  }

  const handleStop = () => {
    setGameStarted(false)
    setGameOver(true)
  }

  // The original timer stores tenths of a second, so 600 displays as 60.0s.
  useEffect(() => {
    if (!gameStarted) return

    let animationFrameId = 0
    let lastUpdate = performance.now()

    const updateTimer = (now: number) => {
      const elapsed = now - lastUpdate
      lastUpdate = now

      setTimeLeft(previousTime => Math.max(0, previousTime - elapsed / 100))
      animationFrameId = requestAnimationFrame(updateTimer)
    }

    animationFrameId = requestAnimationFrame(updateTimer)

    return () => cancelAnimationFrame(animationFrameId)
  }, [gameStarted])

  useEffect(() => {
    if (!gameStarted || timeLeft > 0) return

    setGameStarted(false)
    setGameOver(true)
  }, [gameStarted, timeLeft])

  useEffect(() => {
    document.title = 'Piece Trainer'
  }, [])

  return (
    <div className="page-container">
      <h1 className="heading-1">Piece Trainer</h1>
      <div className="w-full mt-6">
        <div className="flex w-fit flex-wrap items-center gap-2 mb-3">
          <Select value={mode} onValueChange={value => setMode(value as Mode)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={MODES.TIMER}>{MODE_LABELS[MODES.TIMER]}</SelectItem>
              <SelectItem value={MODES.FEWEST_MOVES}>{MODE_LABELS[MODES.FEWEST_MOVES]}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={piece} onValueChange={value => setPiece(value as TrainerPiece)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIECES.map(pieceOption => (
                <SelectItem key={pieceOption} value={pieceOption}>
                  {PIECE_LABELS[pieceOption]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={handleNewGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            New Game
          </Button>

          {mode === MODES.TIMER && (
            <Button onClick={handleStop} disabled={!gameStarted} variant="secondary">
              <StopCircle className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>

        <div className="w-full max-w-[600px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            {mode === MODES.TIMER ? (
              <>
                <div>
                  Time Left: <b>{(timeLeft / 10).toFixed(1)}s</b>
                </div>
                <div>
                  Level: <b>{level}</b>
                </div>
                <div>
                  Score: <b>{score}</b>
                </div>
              </>
            ) : (
              <>
                <div>
                  Your Moves: <b>{arrows.length}</b>
                </div>
                <button
                  type="button"
                  onClick={() => setArrows([])}
                  className="text-sm underline-offset-4 hover:underline"
                >
                  Clear Arrows
                </button>
              </>
            )}
          </div>

          <div
            ref={chessboardRef}
            className="touch-none select-none"
            onPointerDown={handlePointerStart}
            onPointerUp={handlePointerEnd}
            onDragStart={event => {
              if (mode === MODES.FEWEST_MOVES) event.preventDefault()
            }}
          >
            <div className="aspect-square w-full overflow-hidden">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: getFen(),
                  allowDragging: gameStarted && mode === MODES.TIMER,
                  allowDrawingArrows: false,
                  arrows,
                  onPieceDrop,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PieceTrainer
