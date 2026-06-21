import { useEffect, useState } from 'react'
import type { DragEvent, ReactNode } from 'react'
import { Chessboard } from 'react-chessboard'
import type { ChessboardOptions, PieceDropHandlerArgs, PositionDataType } from 'react-chessboard'
import { Chess } from 'chess.js'
import { Brain, CheckCircle, PlayCircle, XCircle } from 'lucide-react'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DEFAULT_CHESSBOARD_OPTIONS, getPieceImageSrc } from '@/config/chessboard'
import { usergames } from '@/data/usergames'

type PieceCode = 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK' | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK'

type FeedbackSeverity = 'info' | 'success' | 'error'
type SquareHighlights = Record<string, 'green' | 'red'>

const MEMORY_TIMES = [60, 30, 15, 10, 5] as const
const PIECE_COUNTS = Array.from({ length: 17 }, (_, index) => index + 10)
const DRAG_PIECE_TYPE = 'application/x-chess-piece'

const BLACK_PIECES: PieceCode[] = ['bP', 'bN', 'bB', 'bR', 'bQ', 'bK']
const WHITE_PIECES: PieceCode[] = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK']
const ALL_PIECES: PieceCode[] = [...BLACK_PIECES, ...WHITE_PIECES]

function isPieceCode(value: string): value is PieceCode {
  return ALL_PIECES.includes(value as PieceCode)
}

/**
 * Converts the board section of a FEN string into the position object used by
 * react-chessboard v5.
 */
function fenToPositionObject(fenBoard: string): PositionDataType {
  const rows = fenBoard.split('/')
  const position: PositionDataType = {}
  let currentRank = 8

  rows.forEach(row => {
    let currentFile = 'a'

    row.split('').forEach(char => {
      if (Number.isNaN(Number(char))) {
        const pieceType = char === char.toUpperCase() ? `w${char}` : `b${char.toUpperCase()}`
        position[`${currentFile}${currentRank}`] = { pieceType }

        currentFile = String.fromCharCode(currentFile.charCodeAt(0) + 1)
      } else {
        currentFile = String.fromCharCode(currentFile.charCodeAt(0) + Number(char))
      }
    })

    currentRank--
  })

  return position
}

function getPieceCount(fenBoard: string): number {
  return fenBoard.replace(/\d/g, '').replace(/\//g, '').length
}

interface SparePieceProps {
  piece: PieceCode
  disabled: boolean
  selected: boolean
  onSelect: (piece: PieceCode) => void
}

function SparePieceButton({ piece, disabled, selected, onSelect }: SparePieceProps) {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault()
      return
    }

    event.dataTransfer.setData(DRAG_PIECE_TYPE, piece)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      type="button"
      draggable={!disabled}
      onClick={() => {
        if (!disabled) onSelect(piece)
      }}
      onDragStart={handleDragStart}
      className={`flex h-10 w-10 items-center justify-center rounded-md border bg-white transition ${
        disabled ? 'cursor-not-allowed opacity-40' : 'cursor-grab hover:bg-slate-100'
      } ${selected ? 'ring-2 ring-primary' : ''}`}
    >
      <img src={getPieceImageSrc(piece)} alt={piece} className="h-full w-full" draggable={false} />
    </button>
  )
}

function MemoryTrainer() {
  const [memoryTime, setMemoryTime] = useState<number>(30)
  const [desiredPieceCount, setDesiredPieceCount] = useState<number>(20)

  const [position, setPosition] = useState<PositionDataType>(() => {
    const chess = new Chess()
    return fenToPositionObject(chess.fen().split(' ')[0])
  })

  const [targetPosition, setTargetPosition] = useState<PositionDataType>({})
  const [squareHighlights, setSquareHighlights] = useState<SquareHighlights>({})
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)
  const [feedbackSeverity, setFeedbackSeverity] = useState<FeedbackSeverity>('info')

  const [countdownValue, setCountdownValue] = useState<number>(memoryTime)
  const [countdownRunning, setCountdownRunning] = useState<boolean>(false)
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [selectedSparePiece, setSelectedSparePiece] = useState<PieceCode | null>(null)

  const handleSparePieceDrop = (piece: PieceCode, targetSquare: string) => {
    if (!gameStarted) return

    setPosition(previousPosition => ({
      ...previousPosition,
      [targetSquare]: { pieceType: piece },
    }))

    setSquareHighlights({})
  }

  /**
   * Handles pieces already on the board.
   * Dragging to another square moves the piece; dragging off the board removes it.
   */
  const handlePieceDrop = ({
    piece,
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean => {
    if (!gameStarted) return false

    setPosition(previousPosition => {
      const updatedPosition = { ...previousPosition }

      delete updatedPosition[sourceSquare]

      if (targetSquare) {
        updatedPosition[targetSquare] = { pieceType: piece.pieceType }
      }

      return updatedPosition
    })

    setSquareHighlights({})
    return true
  }

  const handleNewGame = () => {
    const pickValidPosition = () => {
      while (true) {
        const randomGame = usergames[Math.floor(Math.random() * usergames.length)]

        if (!randomGame.P) continue

        const chess = new Chess()
        chess.loadPgn(randomGame.P)

        const moves = chess.history()
        const partial = new Chess()

        for (const move of moves) {
          partial.move(move)

          const fenBoard = partial.fen().split(' ')[0]
          const pieceCount = getPieceCount(fenBoard)

          if (pieceCount === desiredPieceCount) {
            return partial
          }
        }
      }
    }

    const selected = pickValidPosition()
    const fenBoard = selected.fen().split(' ')[0]
    const board = fenToPositionObject(fenBoard)

    setPosition(board)
    setTargetPosition(board)
    setCountdownValue(memoryTime)
    setCountdownRunning(true)
    setGameStarted(false)
    setSelectedSparePiece(null)
    setSquareHighlights({})
    setFeedbackMessage(null)
    setFeedbackSeverity('info')
  }

  const handleStartEarly = () => {
    setCountdownRunning(false)
    setCountdownValue(0)
    setPosition({})
    setGameStarted(true)
    setSelectedSparePiece(null)
    setSquareHighlights({})
    setFeedbackMessage(null)
    setFeedbackSeverity('info')
  }

  const handleQuitGame = () => {
    setCountdownRunning(false)
    setCountdownValue(0)
    setPosition(targetPosition)
    setTargetPosition({})
    setGameStarted(false)
    setSelectedSparePiece(null)
    setSquareHighlights({})
    setFeedbackMessage(null)
    setFeedbackSeverity('info')
  }

  const handleCheck = () => {
    const highlights: SquareHighlights = {}
    let success = true
    let hasMoved = false

    // Only user-placed squares are highlighted, matching the original app.
    Object.entries(position).forEach(([square, piece]) => {
      hasMoved = true

      if (targetPosition[square]?.pieceType === piece.pieceType) {
        highlights[square] = 'green'
      } else {
        highlights[square] = 'red'
        success = false
      }
    })

    // Missing pieces make the answer incorrect, but are not highlighted.
    Object.keys(targetPosition).forEach(square => {
      if (!(square in position)) {
        success = false
      }
    })

    setSquareHighlights(highlights)

    if (!hasMoved) {
      setFeedbackSeverity('error')
      setFeedbackMessage('Place at least one piece before checking.')
    } else if (success) {
      setFeedbackSeverity('success')
      setFeedbackMessage('Correct — you rebuilt the position.')
      setGameStarted(false)
      setTargetPosition({})
      setSelectedSparePiece(null)
    } else {
      setFeedbackSeverity('error')
      setFeedbackMessage('Incorrect — Either a missing or misplaced piece.')
    }
  }

  const handleClear = () => {
    setPosition({})
    setSquareHighlights({})
    setSelectedSparePiece(null)
  }

  useEffect(() => {
    if (!countdownRunning) return

    if (countdownValue > 0) {
      const timer = window.setTimeout(() => {
        setCountdownValue(previousValue => previousValue - 1)
      }, 1000)

      return () => window.clearTimeout(timer)
    }

    setCountdownRunning(false)
    setPosition({})
    setSquareHighlights({})
    setFeedbackMessage(null)
    setFeedbackSeverity('info')
    setGameStarted(true)
  }, [countdownValue, countdownRunning])

  const alertIcon =
    countdownRunning || feedbackSeverity === 'info' ? (
      <Brain className="h-5 w-5" />
    ) : feedbackSeverity === 'success' ? (
      <CheckCircle className="h-5 w-5" />
    ) : (
      <XCircle className="h-5 w-5" />
    )

  const chessboardOptions: ChessboardOptions = {
    ...DEFAULT_CHESSBOARD_OPTIONS,
    position,
    allowDragging: gameStarted,
    allowDragOffBoard: true,
    allowDrawingArrows: false,
    onPieceDrop: handlePieceDrop,
    onSquareClick: ({ square }) => {
      if (selectedSparePiece) {
        handleSparePieceDrop(selectedSparePiece, square)
      }
    },
    squareRenderer: ({ square, children }: { square: string; children?: ReactNode }) => {
      const highlight = squareHighlights[square]

      return (
        <div
          className="relative h-full w-full"
          onDragOver={event => {
            if (gameStarted && event.dataTransfer.types.includes(DRAG_PIECE_TYPE)) {
              event.preventDefault()
            }
          }}
          onDrop={event => {
            const piece = event.dataTransfer.getData(DRAG_PIECE_TYPE)

            if (!isPieceCode(piece)) return

            event.preventDefault()
            handleSparePieceDrop(piece, square)
          }}
        >
          {children}

          {highlight && (
            <div
              className={`pointer-events-none absolute inset-0 z-20 ${
                highlight === 'green' ? 'bg-green-500/40' : 'bg-red-500/40'
              }`}
            />
          )}
        </div>
      )
    },
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Memory Trainer</h1>
      <div className="w-full mt-6">
        <main className="flex w-full flex-col gap-4">
          <div className="flex w-fit flex-wrap items-center gap-2">
            {!gameStarted ? (
              <Button onClick={handleNewGame}>
                <PlayCircle className="mr-2 h-4 w-4" />
                New Game
              </Button>
            ) : (
              <Button onClick={handleQuitGame} variant="destructive">
                <XCircle className="mr-2 h-4 w-4" />
                Quit
              </Button>
            )}

            <Select
              value={String(memoryTime)}
              onValueChange={value => setMemoryTime(Number(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Memory Time" />
              </SelectTrigger>
              <SelectContent>
                {MEMORY_TIMES.map(time => (
                  <SelectItem key={time} value={String(time)}>
                    {time} seconds
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={String(desiredPieceCount)}
              onValueChange={value => setDesiredPieceCount(Number(value))}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Pieces" />
              </SelectTrigger>
              <SelectContent>
                {PIECE_COUNTS.map(count => (
                  <SelectItem key={count} value={String(count)}>
                    {count} pieces
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,600px)_minmax(280px,1fr)] lg:items-start">
            <div className="flex w-full flex-col gap-4">
              {(countdownRunning || feedbackMessage) && (
                <Alert
                  className={
                    feedbackSeverity === 'success'
                      ? 'border-green-600'
                      : feedbackSeverity === 'error'
                        ? 'border-red-600'
                        : ''
                  }
                >
                  {alertIcon}
                  <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                    <span>
                      {countdownRunning ? (
                        <>
                          Memorize the position.
                          <br />
                          <strong>{countdownValue}</strong> seconds remaining.
                        </>
                      ) : (
                        feedbackMessage
                      )}
                    </span>

                    {countdownRunning && (
                      <Button size="sm" variant="secondary" onClick={handleStartEarly}>
                        Start Now
                      </Button>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="w-full overflow-hidden">
                <Chessboard options={chessboardOptions} />
              </div>
            </div>
            <Card className="w-full">
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Click a piece then click a square to place it, or drag a piece directly onto the
                  board. Drag a placed piece off the board to remove it.
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap gap-2">
                    {BLACK_PIECES.map(piece => (
                      <SparePieceButton
                        key={piece}
                        piece={piece}
                        disabled={!gameStarted}
                        selected={selectedSparePiece === piece}
                        onSelect={setSelectedSparePiece}
                      />
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {WHITE_PIECES.map(piece => (
                      <SparePieceButton
                        key={piece}
                        piece={piece}
                        disabled={!gameStarted}
                        selected={selectedSparePiece === piece}
                        onSelect={setSelectedSparePiece}
                      />
                    ))}
                  </div>
                </div>

                {gameStarted && (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={handleCheck} className="whitespace-nowrap">
                      Check
                    </Button>

                    <Button onClick={handleClear} variant="secondary" className="whitespace-nowrap">
                      Clear
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

export default MemoryTrainer
