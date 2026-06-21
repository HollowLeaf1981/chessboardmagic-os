import { useCallback, useEffect, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, PositionDataType } from 'react-chessboard'
import { Chess } from 'chess.js'
import type { Move } from 'chess.js'
import { toast } from 'sonner'
import type { DragEvent, ReactNode } from 'react'
import {
  PlayCircle,
  Check,
  XCircle,
  Trash2,
  RotateCcw,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  SkipForward,
  Copy,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent } from '@/components/ui/card'

import { DEFAULT_CHESSBOARD_OPTIONS, getPieceImageSrc } from '@/config/chessboard'
import { worldChampionshipGames } from '@/data/worldChampionship'

type PieceCode = 'wP' | 'wN' | 'wB' | 'wR' | 'wQ' | 'wK' | 'bP' | 'bN' | 'bB' | 'bR' | 'bQ' | 'bK'

// Picker selection: a real piece, the "remove" tool, or nothing.
type SelectedPiece = { type: PieceCode } | { type: 'D' } | null

type WorldChampionshipMatch = (typeof worldChampionshipGames)[number]
type WorldChampionshipGame = WorldChampionshipMatch['Games'][number]

const DRAG_PIECE_TYPE = 'application/x-chess-piece'

const BLACK_PIECES: PieceCode[] = ['bP', 'bN', 'bB', 'bR', 'bQ', 'bK']
const WHITE_PIECES: PieceCode[] = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK']
const ALL_PIECES: PieceCode[] = [...BLACK_PIECES, ...WHITE_PIECES]

function isPieceCode(value: string): value is PieceCode {
  return ALL_PIECES.includes(value as PieceCode)
}

/**
 * Converts a FEN board field into v5's position-object format.
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

function convertNameFormat(name: string): string {
  const [lastName, firstName] = name.split(',').map(part => part.trim())
  return firstName ? `${firstName} ${lastName}` : lastName
}

function convertDateToReadableFormat(dateString: string): string {
  const [year, month, day] = dateString.split('.')
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]
  const monthName = monthNames[parseInt(month, 10) - 1] ?? ''
  const dayInt = parseInt(day, 10)

  const suffix = (d: number): string => {
    if (d >= 11 && d <= 13) return `${d}th`
    switch (d % 10) {
      case 1:
        return `${d}st`
      case 2:
        return `${d}nd`
      case 3:
        return `${d}rd`
      default:
        return `${d}th`
    }
  }

  return `${suffix(dayInt)} ${monthName} ${year}`
}

// Spare-piece picker tile. Supports both click-to-select (sets the
// active piece for click-to-place on a square) and HTML5 drag (drop
// directly onto a board square).
function SparePieceButton({
  piece,
  selected,
  onSelect,
}: {
  piece: PieceCode
  selected: boolean
  onSelect: (piece: PieceCode) => void
}) {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(DRAG_PIECE_TYPE, piece)
    event.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <button
      type="button"
      draggable
      onClick={() => onSelect(piece)}
      onDragStart={handleDragStart}
      className={`flex h-10 w-10 cursor-grab items-center justify-center rounded-md border bg-white transition hover:bg-slate-100 ${
        selected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <img src={getPieceImageSrc(piece)} alt={piece} className="h-full w-full" draggable={false} />
    </button>
  )
}

/**
 * Where Are My Pieces?
 * ---------------
 * A puzzle from real World Championship games: the board shows colored
 * circles on every square that holds a piece, but doesn't tell you
 * which piece. The player reconstructs the position by dragging or
 * clicking pieces from the picker onto the marked squares.
 *
 * Check verifies each square: correct → green glow, incorrect → red.
 * Quit reveals the answer. After completion, the player can step
 * through the rest of the game with arrow keys or nav buttons.
 */
function WhereAreMyPieces() {
  // The board state the user is editing. Empty during play, becomes
  // the actual game position after completion.
  const [position, setPosition] = useState<PositionDataType>({})
  // The "answer" position — what the player is trying to recreate.
  const [targetPosition, setTargetPosition] = useState<PositionDataType>({})

  const [toPlay, setToPlay] = useState<'w' | 'b'>('w')
  const [orientation, setOrientation] = useState<'white' | 'black'>('black')
  const [selectedPiece, setSelectedPiece] = useState<SelectedPiece>(null)

  const [selectedGame, setSelectedGame] = useState<WorldChampionshipGame | null>(null)
  const [selectedMatch, setSelectedMatch] = useState<WorldChampionshipMatch | null>(null)
  const [checkResults, setCheckResults] = useState<Record<string, boolean>>({})
  const [completed, setCompleted] = useState<boolean>(false)
  const [gameStarted, setGameStarted] = useState<boolean>(false)

  const [moves, setMoves] = useState<Move[]>([])
  const [game, setGame] = useState<Chess>(new Chess())
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1)

  // Set the browser tab title once on mount.
  useEffect(() => {
    document.title = 'Where Are My Pieces?'
  }, [])

  /**
   * Picks a random match → game → move count between 20 and (PlyCount/2
   * capped at 50). Replays that many moves, then exposes the position
   * as the puzzle target.
   */
  const handleNewGame = useCallback(() => {
    setCompleted(false)
    setCheckResults({})
    setGameStarted(true)
    setOrientation('white')
    setSelectedPiece(null)

    const randomMatch =
      worldChampionshipGames[Math.floor(Math.random() * worldChampionshipGames.length)]
    setSelectedMatch(randomMatch)

    const randomGame = randomMatch.Games[Math.floor(Math.random() * randomMatch.Games.length)]
    setSelectedGame(randomGame)

    const newGame = new Chess()
    newGame.loadPgn(randomGame.Moves)

    const history = newGame.history({ verbose: true })

    const maxMoveCount = Math.min(Math.floor(history.length / 2), 50)
    const minMoveCount = Math.min(20, maxMoveCount)
    const randomMoveCount =
      Math.floor(Math.random() * (maxMoveCount - minMoveCount + 1)) + minMoveCount

    newGame.reset()
    for (let i = 0; i < randomMoveCount; i++) {
      newGame.move(history[i])
    }

    const fenBoard = newGame.fen().split(' ')[0]
    const target = fenToPositionObject(fenBoard)

    setTargetPosition(target)
    setPosition({}) // Board starts empty for the player.
    setGame(newGame)
    setToPlay(newGame.turn())
    setMoves(history)
    setCurrentMoveIndex(randomMoveCount)
  }, [])

  // Auto-start on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  // Click-to-place: if a picker piece (or the delete tool) is
  // selected, clicking a square applies it.
  const handleSquareClick = (square: string) => {
    if (!selectedPiece || completed) return

    if (selectedPiece.type === 'D') {
      setPosition(prev => {
        const updated = { ...prev }
        delete updated[square]
        return updated
      })
    } else {
      setPosition(prev => ({
        ...prev,
        [square]: { pieceType: selectedPiece.type },
      }))
    }
  }

  // Drop a spare piece onto a board square (drag-from-picker path).
  const handleSparePieceDrop = (piece: PieceCode, targetSquare: string) => {
    if (completed) return
    setPosition(prev => ({
      ...prev,
      [targetSquare]: { pieceType: piece },
    }))
  }

  // Handles in-board piece drags. Drop on another square → move.
  // Drop off the board → delete.
  const handlePieceDrop = ({
    piece,
    sourceSquare,
    targetSquare,
  }: PieceDropHandlerArgs): boolean => {
    if (completed) return false

    setPosition(prev => {
      const updated = { ...prev }
      delete updated[sourceSquare]
      if (targetSquare) {
        updated[targetSquare] = { pieceType: piece.pieceType }
      }
      return updated
    })

    return true
  }

  /**
   * Compares the user's position against the answer, square by square.
   * Every square gets a true/false result; if all 64 match, the puzzle
   * is solved.
   */
  const handleCheck = () => {
    if (!selectedGame) return

    const results: Record<string, boolean> = {}
    let allCorrect = true

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const square = `${String.fromCharCode(97 + col)}${8 - row}`
        const currentPiece = position[square]?.pieceType
        const correctPiece = targetPosition[square]?.pieceType

        if (currentPiece === correctPiece) {
          results[square] = true
        } else {
          results[square] = false
          allCorrect = false
        }
      }
    }

    setCheckResults(results)

    if (allCorrect) {
      setCompleted(true)
      setGameStarted(false)
      setSelectedPiece(null)
      // The original decrements once so that handleNextMove's
      // off-by-one (`moves[currentMoveIndex + 1]`) lands on the right
      // move after completion. Preserved for behaviour parity.
      setCurrentMoveIndex(prev => prev - 1)
    }
  }

  // Give up — reveal the answer position and switch to navigation mode.
  const handleGiveUp = () => {
    if (!selectedGame) return
    setCompleted(true)
    setGameStarted(false)
    setSelectedPiece(null)
    setPosition(targetPosition)
    setCheckResults({})
    setCurrentMoveIndex(prev => prev - 1)
  }

  // Move navigation — these only do anything after completion.
  const handleNextMove = useCallback(() => {
    if (currentMoveIndex < moves.length - 1) {
      const newGame = new Chess(game.fen())
      newGame.move(moves[currentMoveIndex + 1].san)
      setGame(newGame)
      setPosition(fenToPositionObject(newGame.fen().split(' ')[0]))
      setCurrentMoveIndex(currentMoveIndex + 1)
    }
  }, [currentMoveIndex, moves, game])

  const handlePreviousMove = useCallback(() => {
    if (currentMoveIndex > -1) {
      const newGame = new Chess()
      for (let i = 0; i < currentMoveIndex; i++) {
        newGame.move(moves[i].san)
      }
      setGame(newGame)
      setPosition(fenToPositionObject(newGame.fen().split(' ')[0]))
      setCurrentMoveIndex(currentMoveIndex - 1)
    }
  }, [currentMoveIndex, moves])

  const goToMove = useCallback(
    (moveIndex: number) => {
      const newGame = new Chess()
      for (let i = 0; i <= moveIndex; i++) {
        newGame.move(moves[i].san)
      }
      setGame(newGame)
      setPosition(fenToPositionObject(newGame.fen().split(' ')[0]))
      setCurrentMoveIndex(moveIndex)
    },
    [moves]
  )

  const handleResetGame = useCallback(() => {
    if (moves.length > 0) {
      const newGame = new Chess()
      setGame(newGame)
      setPosition(fenToPositionObject(newGame.fen().split(' ')[0]))
      setCurrentMoveIndex(-1)
    }
  }, [moves])

  const handleLastMove = useCallback(() => {
    goToMove(moves.length - 1)
  }, [goToMove, moves.length])

  const toggleOrientation = () => {
    setOrientation(prev => (prev === 'white' ? 'black' : 'white'))
  }

  // Arrow-key navigation (only when completed).
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!completed) return
      if (event.key === 'ArrowLeft') handlePreviousMove()
      else if (event.key === 'ArrowRight') handleNextMove()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [completed, handleNextMove, handlePreviousMove])

  // Generates the full PGN text — headers + moves + result.
  const generatePgn = (): string => {
    if (!selectedGame) return ''

    const headers = [
      `[Event "${selectedMatch?.Event ?? 'Unknown Event'}"]`,
      `[Site "${selectedMatch?.Site ?? 'Unknown Site'}"]`,
      `[Date "${selectedGame.Date ?? '????.??.??'}"]`,
      `[Round "${selectedGame.Round ?? '?'}"]`,
      `[White "${selectedGame.White ?? 'Unknown White'}"]`,
      `[Black "${selectedGame.Black ?? 'Unknown Black'}"]`,
      `[Result "${selectedGame.Result ?? '*'}"]`,
    ]

    const moveText =
      moves
        .map((move, index) => {
          if (['1-0', '0-1', '1/2-1/2', '*'].includes(move.san)) return move.san
          return index % 2 === 0 ? `${Math.floor(index / 2) + 1}. ${move.san}` : move.san
        })
        .join(' ') +
      ' ' +
      selectedGame.Result

    return `${headers.join('\n')}\n\n${moveText}`
  }

  const copyPgnToClipboard = async () => {
    const pgn = generatePgn()
    if (!pgn) return
    try {
      await navigator.clipboard.writeText(pgn)
      toast.success('PGN copied to clipboard')
    } catch {
      toast.error('Failed to copy PGN')
    }
  }

  // Square renderer for the board. Draws:
  //   - the circle hint (which squares hold pieces in the target,
  //     coloured to match the piece colour), during the play phase
  //   - the green/red glow once Check has been run
  //   - the children (the actual placed piece, if any), on top
  //   - HTML5 drop handling for spare-piece drops
  const renderSquare = ({ square, children }: { square: string; children?: ReactNode }) => {
    const targetPiece = targetPosition[square]
    const showCircle = !completed && targetPiece
    const isWhitePiece = targetPiece?.pieceType?.[0] === 'w'
    const checkResult = checkResults[square]

    const boxShadow =
      checkResult === true
        ? '0 0 10px 2px rgba(0, 255, 0, 0.8)'
        : checkResult === false
          ? '0 0 10px 2px rgba(255, 0, 0, 0.8)'
          : '0 0 10px 2px rgba(0, 0, 0, 0.5)'

    return (
      <div
        className="relative h-full w-full"
        onDragOver={event => {
          if (!completed && event.dataTransfer.types.includes(DRAG_PIECE_TYPE)) {
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
        {showCircle && (
          <div
            className="pointer-events-none absolute inset-[5%] z-0 rounded-full"
            style={{
              backgroundColor: isWhitePiece ? 'white' : '#666666',
              boxShadow,
            }}
          />
        )}

        <div className="relative z-10 h-full w-full">{children}</div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="page-container">
        <h1 className="heading-1">Where Are My Pieces</h1>
        <div className="w-full mt-6">
          {/* Top control row: Play, Check, Quit. */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button onClick={handleNewGame}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Play
            </Button>
            <Button onClick={handleCheck} disabled={completed || !gameStarted}>
              <Check className="mr-2 h-4 w-4" />
              Check
            </Button>
            <Button onClick={handleGiveUp} disabled={!gameStarted} variant="destructive">
              <XCircle className="mr-2 h-4 w-4" />
              Quit
            </Button>
          </div>

          {gameStarted && (
            <p className="mb-2 text-sm">{toPlay === 'b' ? 'Black' : 'White'} to play</p>
          )}

          {(gameStarted || completed) && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,600px)_minmax(280px,1fr)] lg:items-start">
              {/* Board column */}
              <div className="flex w-full flex-col gap-4">
                <div className="w-full overflow-hidden">
                  <Chessboard
                    options={{
                      ...DEFAULT_CHESSBOARD_OPTIONS,
                      position,
                      boardOrientation: orientation,
                      allowDragging: !completed,
                      allowDragOffBoard: true,
                      allowDrawingArrows: false,
                      onPieceDrop: handlePieceDrop,
                      onSquareClick: ({ square }: { square: string }) => handleSquareClick(square),
                      squareRenderer: renderSquare,
                    }}
                  />
                </div>
                {/* Post-completion navigation buttons. */}
                {completed && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleResetGame}
                          disabled={currentMoveIndex === -1}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Reset to start</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handlePreviousMove}
                          disabled={currentMoveIndex === -1}
                        >
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Previous move</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleNextMove}
                          disabled={currentMoveIndex >= moves.length - 1}
                        >
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Next move</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={handleLastMove}
                          disabled={currentMoveIndex >= moves.length - 1}
                        >
                          <SkipForward className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Last move</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="icon" onClick={toggleOrientation}>
                          <ArrowUpDown className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Flip board</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="secondary" size="icon" onClick={copyPgnToClipboard}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy PGN</TooltipContent>
                    </Tooltip>
                  </div>
                )}
              </div>

              {/* Right column: picker during play, moves list after. */}
              <Card className="w-full">
                <CardContent className="flex flex-col gap-4">
                  {completed && selectedGame && selectedMatch ? (
                    <div className="flex flex-wrap">
                      <p className="w-full font-medium">
                        {convertNameFormat(selectedGame.White ?? 'Unknown White')} vs{' '}
                        {convertNameFormat(selectedGame.Black ?? 'Unknown Black')}
                      </p>

                      <p className="mb-3 w-full text-sm text-muted-foreground">
                        {selectedMatch.Site ?? 'Unknown Site'}
                        {selectedGame.Date
                          ? `, ${convertDateToReadableFormat(selectedGame.Date)}`
                          : ''}
                        {selectedGame.Round ? `, Round ${selectedGame.Round}` : ''}
                      </p>

                      {moves.map((move, index) => {
                        const isResult = ['1-0', '0-1', '1/2-1/2', '*'].includes(move.san)
                        const isCurrent = index === currentMoveIndex

                        return (
                          <span
                            key={`move-${index}`}
                            onClick={() => !isResult && goToMove(index)}
                            className={`mr-2 inline ${isResult ? 'cursor-default' : 'cursor-pointer'} ${
                              isCurrent ? 'font-bold' : ''
                            }`}
                          >
                            {isResult
                              ? move.san
                              : index % 2 === 0
                                ? `${Math.floor(index / 2) + 1}. ${move.san}`
                                : move.san}
                          </span>
                        )
                      })}

                      <span>{selectedGame.Result ?? '*'}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <p className="text-sm text-muted-foreground">
                        Click a piece then click a square to place it, or drag a piece directly onto
                        the board. Drag a placed piece off the board to remove it.
                      </p>

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-wrap gap-2">
                          {BLACK_PIECES.map(piece => (
                            <SparePieceButton
                              key={piece}
                              piece={piece}
                              selected={
                                selectedPiece?.type !== 'D' && selectedPiece?.type === piece
                              }
                              onSelect={p => setSelectedPiece({ type: p })}
                            />
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {WHITE_PIECES.map(piece => (
                            <SparePieceButton
                              key={piece}
                              piece={piece}
                              selected={
                                selectedPiece?.type !== 'D' && selectedPiece?.type === piece
                              }
                              onSelect={p => setSelectedPiece({ type: p })}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={selectedPiece?.type === 'D' ? 'default' : 'secondary'}
                          onClick={() => setSelectedPiece({ type: 'D' })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove pieces
                        </Button>

                        <Button
                          variant="secondary"
                          onClick={() => {
                            setPosition({})
                            setCheckResults({})
                          }}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Clear board
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

export default WhereAreMyPieces
