import { useState, useEffect, useRef, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import type { Square } from 'chessops'
import { Chess } from 'chessops/chess'
import { parseFen, makeFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import { parseUci } from 'chessops/util'
import { toast } from 'sonner'

import { Shuffle, Hash, Cpu, ArrowDownUp, Copy, X, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { DEFAULT_CHESSBOARD_OPTIONS, getPieceImageSrc } from '@/config/chessboard'

import { fischerrandom } from '@/data/fischerrandom'

// Depth Stockfish uses when actually choosing its own moves. The
// recommendation depth (used for the engine's piece hint to the user) is
// hardcoded at 15 in getPieceRecommendation below — deeper so the hint is
// trustworthy without slowing the engine's own play.
const ENGINE_PLAY_DEPTH = 10

type Color = 'white' | 'black'
type PromotionRole = 'queen' | 'rook' | 'bishop' | 'knight'

interface PendingPromotion {
  from: string
  to: string
  color: Color
}

interface LastMoveSquares {
  from?: string
  to?: string
}

/**
 * Pick a random integer in [0, n). Used for selecting a random Chess960
 * starting position from the 960-entry table.
 */
export const getRandomNumber = (n: number): number => Math.floor(Math.random() * n)

/**
 * Convert algebraic notation (e.g. "e4") into a chessops square index (0-63).
 * Returns undefined for malformed input.
 */
export const parseSquare = (square: string): Square | undefined => {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1], 10) - 1
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return undefined
  return (rank * 8 + file) as Square
}

/**
 * Convert a chessops square index (0-63) back to algebraic notation.
 */
export const squareToNotation = (index: number): string => {
  const file = String.fromCharCode(97 + (index % 8))
  const rank = Math.floor(index / 8) + 1
  return `${file}${rank}`
}

/**
 * Human-readable piece names indexed by chessops piece role. Used when
 * displaying the engine's piece recommendation to the user.
 */
export const PIECE_NAMES: Record<string, string> = {
  pawn: 'Pawn',
  knight: 'Knight',
  bishop: 'Bishop',
  rook: 'Rook',
  queen: 'Queen',
  king: 'King',
}

/**
 * Fischer Random Trainer (Chess960).
 *
 * Engine recommends WHICH piece the user should move; the user picks the
 * destination. Each move is graded against Stockfish's full SAN
 * recommendation (depth 15) and statistics are tallied. The engine plays
 * the other side at depth 10.
 */
function FischerRandomTrainer() {
  const chessboardRef = useRef<HTMLDivElement | null>(null)
  const stockfishWorker = useRef<Worker | null>(null)

  // Refs that gate engine work — kept out of state so they don't trigger renders.
  const isCalculating = useRef(false)
  const chess960Enabled = useRef(false)

  const [game, setGame] = useState<Chess | null>(null)
  const [fen, setFen] = useState('')
  const [color, setColor] = useState<Color>('white')
  const [boardOrientation, setBoardOrientation] = useState<Color>('white')

  const [positionInput, setPositionInput] = useState('')
  const [positionNumber, setPositionNumber] = useState(1)

  const [movesHistory, setMovesHistory] = useState<string[]>([])
  const [lastMoveSquares, setLastMoveSquares] = useState<LastMoveSquares>({})
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  // Three-state: false (idle), "starting" (worker spinning up), true (running).
  const [isEngineStarted, setIsEngineStarted] = useState<false | 'starting' | true>(false)

  const [recommendedPiece, setRecommendedPiece] = useState<string | null>(null)
  const [recommendedMove, setRecommendedMove] = useState<string | null>(null)
  // Snapshot of recommendedMove at the moment the user moved — shown in the
  // alert so the user can see what was recommended without it being overwritten
  // by the next recommendation.
  const [previousRecommendedMove, setPreviousRecommendedMove] = useState<string | null>(null)

  const [alertOpen, setAlertOpen] = useState(false)
  const [alertColor, setAlertColor] = useState<'success' | 'error'>('success')

  const [gameOver, setGameOver] = useState(false)
  const [gameResult, setGameResult] = useState('')
  const [gameReset, setGameReset] = useState(false)

  const [squareSize, setSquareSize] = useState(45)

  const [statistics, setStatistics] = useState({
    correctMoves: 0,
    incorrectMoves: 0,
  })

  useEffect(() => {
    document.title = 'Fischer Random Trainer'
  }, [])

  // ===== ENGINE PLUMBING =====

  /**
   * Send the Chess960 UCI option exactly once per worker lifetime. Stockfish
   * needs this to legal-check castling under Fischer Random rules.
   */
  const enableChess960 = useCallback(() => {
    if (stockfishWorker.current && !chess960Enabled.current) {
      stockfishWorker.current.postMessage('setoption name UCI_Chess960 value true')
      chess960Enabled.current = true
    }
  }, [])

  const handleGameOver = useCallback((gameState: Chess) => {
    const outcome = gameState.outcome()
    if (outcome?.winner === 'white') {
      setGameResult('Checkmate — White wins')
    } else if (outcome?.winner === 'black') {
      setGameResult('Checkmate — Black wins')
    } else {
      setGameResult('Draw')
    }
    setGameOver(true)
  }, [])

  /**
   * Ask Stockfish for the best move from the current FEN and surface only
   * the *piece* to the user (the destination square is hidden — finding it
   * is the user's job). The full SAN is stashed in `recommendedMove` so we
   * can grade the user's move when they make it.
   */
  const getPieceRecommendation = useCallback(
    (currentFen: string) => {
      if (!game || game.isEnd() || isCalculating.current) return
      if (!stockfishWorker.current) return

      isCalculating.current = true
      enableChess960()
      stockfishWorker.current.postMessage('stop')

      setTimeout(() => {
        if (!stockfishWorker.current) return
        stockfishWorker.current.postMessage(`position fen ${currentFen}`)
        stockfishWorker.current.postMessage(`go depth 15`)

        stockfishWorker.current.onmessage = (event: MessageEvent<string>) => {
          const message = event.data
          if (message.startsWith('bestmove')) {
            isCalculating.current = false
            const moveUci = message.split(' ')[1]
            try {
              const move = parseUci(moveUci)
              if (!move || !('from' in move)) return

              // Reconstruct the position from the FEN we sent Stockfish so
              // makeSan and board.get see the exact position Stockfish
              // analyzed. Using `game` from the closure would be wrong here:
              // after makeEngineMove calls setGame(newGame), the closure
              // still points at the pre-engine-move position, so captures
              // (e.g. Bxd3 against a freshly-moved pawn) render without the
              // "x" and disambiguations can be off.
              const positionGame = Chess.fromSetup(parseFen(currentFen).unwrap()).unwrap()

              const piece = positionGame.board.get(move.from)
              if (piece) {
                setRecommendedPiece(PIECE_NAMES[piece.role] ?? piece.role)
                setRecommendedMove(makeSan(positionGame, move))
              }
            } catch (e) {
              console.error('Error parsing recommendation:', e)
            }
          }
        }
      }, 50)
    },
    [game, enableChess960]
  )

  const makeEngineMove = useCallback(() => {
    if (!stockfishWorker.current || isCalculating.current || !game) return

    isCalculating.current = true
    enableChess960()
    stockfishWorker.current.postMessage('stop')

    setTimeout(() => {
      if (!stockfishWorker.current || !game) return
      const currentFen = makeFen(game.toSetup())
      stockfishWorker.current.postMessage(`position fen ${currentFen}`)
      stockfishWorker.current.postMessage(`go depth ${ENGINE_PLAY_DEPTH}`)

      stockfishWorker.current.onmessage = (event: MessageEvent<string>) => {
        const message = event.data
        if (message.startsWith('bestmove')) {
          isCalculating.current = false
          const moveUci = message.split(' ')[1]
          try {
            const move = parseUci(moveUci)
            if (!move || !('from' in move) || !('to' in move)) return

            const newGame = game.clone()
            newGame.play(move)

            const sanMove = makeSan(game, move)
            const fromSquare = squareToNotation(move.from)
            const toSquare = squareToNotation(move.to)

            setGame(newGame)
            setFen(makeFen(newGame.toSetup()))
            setMovesHistory(prev => [...prev, sanMove])
            setLastMoveSquares({ from: fromSquare, to: toSquare })

            // Engine just moved → it's the user's turn → fetch a recommendation.
            if (newGame.turn === color) {
              setTimeout(() => getPieceRecommendation(makeFen(newGame.toSetup())), 200)
            }
            if (newGame.isEnd()) handleGameOver(newGame)
          } catch (e) {
            console.error('Error making engine move:', e)
            isCalculating.current = false
          }
        }
      }
    }, 50)
  }, [game, color, getPieceRecommendation, enableChess960, handleGameOver])

  // ===== POSITION SETUP =====

  /**
   * Reset all per-game state. Called by both handleGenerate and
   * handleSelectPosition so the UI doesn't bleed state across games.
   */
  const resetGameState = () => {
    setMovesHistory([])
    setRecommendedPiece(null)
    setRecommendedMove(null)
    setPreviousRecommendedMove(null)
    setGameOver(false)
    setGameResult('')
    setLastMoveSquares({})
    setIsEngineStarted(false)
    setAlertOpen(false)
    isCalculating.current = false
    chess960Enabled.current = false
    setStatistics({ correctMoves: 0, incorrectMoves: 0 })
  }

  const loadPosition = (positionFen: string) => {
    const setup = parseFen(positionFen).unwrap()
    const newGame = Chess.fromSetup(setup).unwrap()
    setGame(newGame)
    setFen(makeFen(newGame.toSetup()))
  }

  const handleGenerate = () => {
    const randomNumber = getRandomNumber(fischerrandom.length)
    loadPosition(fischerrandom[randomNumber])
    setPositionNumber(randomNumber)
    setPositionInput(randomNumber.toString())
    resetGameState()
  }

  const handleInputBlur = () => {
    let num = parseInt(positionInput, 10)
    if (isNaN(num) || num < 0 || num > 959) num = 0
    setPositionNumber(num)
    setPositionInput(num.toString())
  }

  const handleSelectPosition = () => {
    loadPosition(fischerrandom[positionNumber])
    resetGameState()
  }

  const copyFenToClipboard = async () => {
    if (!fen) return
    try {
      await navigator.clipboard.writeText(fen)
      toast.success('FEN copied to clipboard')
    } catch {
      toast.error('Failed to copy FEN')
    }
  }

  const startEngine = async () => {
    if (isEngineStarted || !game) return
    setIsEngineStarted('starting')
    try {
      await new Promise(resolve => setTimeout(resolve, 100))
      enableChess960()
      setIsEngineStarted(true)
      setBoardOrientation(color)
      setStatistics({ correctMoves: 0, incorrectMoves: 0 })

      if (game.turn === color) {
        getPieceRecommendation(makeFen(game.toSetup()))
      } else {
        setTimeout(() => makeEngineMove(), 500)
      }
    } catch (e) {
      console.error('Engine start failed', e)
      setIsEngineStarted(false)
    }
  }

  const toggleOrientation = () => {
    setBoardOrientation(prev => (prev === 'white' ? 'black' : 'white'))
  }

  // ===== USER MOVE HANDLING =====

  const handleSquareClick = (square: string) => {
    if (pendingPromotion || !game) {
      setPendingPromotion(null)
      return
    }

    const squareIndex = parseSquare(square)
    if (squareIndex === undefined) return

    const piece = game.board.get(squareIndex)
    const currentTurn = game.turn

    // Click-to-move: first click selects, second click attempts the move.
    if (!selectedSquare || selectedSquare === square) {
      if (piece && piece.color === currentTurn) {
        setSelectedSquare(prev => (prev === square ? null : square))
      }
      return
    }

    onDrop(selectedSquare, square)
    setSelectedSquare(null)
  }

  /**
   * Apply a user move. Validates legality, captures the previously-recommended
   * SAN for the alert, plays the move, then either grades it (engine running)
   * or just records it (engine idle). Returns false for promotions so the
   * piece visually snaps back while the promotion overlay opens.
   */
  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!game) return false

    const fromIndex = parseSquare(sourceSquare)
    const toIndex = parseSquare(targetSquare)
    if (fromIndex === undefined || toIndex === undefined) return false

    const piece = game.board.get(fromIndex)
    setSelectedSquare(null)

    // Defer promotion to the overlay (handlePromotionChoice applies the move).
    const isPromotion =
      piece?.role === 'pawn' &&
      ((piece.color === 'white' && targetSquare[1] === '8') ||
        (piece.color === 'black' && targetSquare[1] === '1'))

    if (isPromotion) {
      setPendingPromotion({
        from: sourceSquare,
        to: targetSquare,
        color: piece.color,
      })
      return false
    }

    try {
      const move = { from: fromIndex, to: toIndex }
      if (!game.isLegal(move)) return false

      // SAN must be computed BEFORE play() because makeSan inspects the
      // pre-move position to disambiguate notation.
      const sanMove = makeSan(game, move)

      // Mutate `game` directly rather than cloning. The setTimeout below
      // schedules makeEngineMove, whose useCallback closure captured this
      // `game` reference. If we replaced it with a clone, the engine would
      // run against the stale pre-move position, recommend a move for the
      // user's side, and overwrite the user's move.
      game.play(move)

      setLastMoveSquares({ from: sourceSquare, to: targetSquare })
      setPreviousRecommendedMove(recommendedMove)
      setFen(makeFen(game.toSetup()))
      setGame(game)
      setMovesHistory(prev => [...prev, sanMove])

      if (isEngineStarted !== true) return true

      setAlertOpen(true)
      const isCorrect = sanMove === recommendedMove
      setAlertColor(isCorrect ? 'success' : 'error')
      setStatistics(prev => ({
        correctMoves: prev.correctMoves + (isCorrect ? 1 : 0),
        incorrectMoves: prev.incorrectMoves + (isCorrect ? 0 : 1),
      }))

      // It's now the engine's turn — let it move.
      if (
        (color === 'white' && game.turn === 'black') ||
        (color === 'black' && game.turn === 'white')
      ) {
        setTimeout(makeEngineMove, 500)
      }
      if (game.isEnd()) handleGameOver(game)

      return true
    } catch (e) {
      console.error('Move failed:', e)
      return false
    }
  }

  /**
   * Apply a chosen promotion piece. Mirrors onDrop's bookkeeping (alert,
   * stats, engine reply) so the post-move flow is identical.
   */
  const handlePromotionChoice = (promotionRole: PromotionRole) => {
    if (!pendingPromotion || !game) return
    const { from, to } = pendingPromotion
    const fromIndex = parseSquare(from)
    const toIndex = parseSquare(to)
    if (fromIndex === undefined || toIndex === undefined) return

    try {
      const move = {
        from: fromIndex,
        to: toIndex,
        promotion: promotionRole,
      }
      const sanMove = makeSan(game, move)

      // Same reasoning as onDrop: mutate directly so the engine closure sees
      // the post-move position when its setTimeout fires.
      game.play(move)

      setLastMoveSquares({ from, to })
      setPreviousRecommendedMove(recommendedMove)
      setGame(game)
      setFen(makeFen(game.toSetup()))
      setMovesHistory(prev => [...prev, sanMove])
      setPendingPromotion(null)
      setSelectedSquare(null)

      if (isEngineStarted !== true) return

      setAlertOpen(true)
      const isCorrect = sanMove === recommendedMove
      setAlertColor(isCorrect ? 'success' : 'error')
      setStatistics(prev => ({
        correctMoves: prev.correctMoves + (isCorrect ? 1 : 0),
        incorrectMoves: prev.incorrectMoves + (isCorrect ? 0 : 1),
      }))

      if (
        (color === 'white' && game.turn === 'black') ||
        (color === 'black' && game.turn === 'white')
      ) {
        setTimeout(makeEngineMove, 500)
      }
      if (game.isEnd()) handleGameOver(game)
    } catch (e) {
      console.error('Promotion failed:', e)
      setPendingPromotion(null)
      setSelectedSquare(null)
    }
  }

  // ===== EFFECTS =====

  // Spin up the Stockfish worker once; tear it down on unmount.
  useEffect(() => {
    stockfishWorker.current = new Worker(`/js/stockfish/stockfish-18-lite-single.js`)
    return () => {
      stockfishWorker.current?.terminate()
    }
  }, [])

  // Load an initial random position so the page isn't empty on mount.
  useEffect(() => {
    const randomNumber = getRandomNumber(fischerrandom.length)
    loadPosition(fischerrandom[randomNumber])
    setPositionNumber(randomNumber)
    setPositionInput(randomNumber.toString())
  }, [])

  // Keep the promotion overlay sized correctly when the board resizes.
  useEffect(() => {
    if (!chessboardRef.current) return
    const updateSize = () => {
      if (!chessboardRef.current) return
      const rect = chessboardRef.current.getBoundingClientRect()
      if (rect.width > 0) setSquareSize(rect.width / 8)
    }
    const timeoutId = setTimeout(updateSize, 0)
    const ro = new ResizeObserver(() => updateSize())
    ro.observe(chessboardRef.current)
    return () => {
      clearTimeout(timeoutId)
      ro.disconnect()
    }
  }, [])

  // After a fresh game where the user picked Black, kick off the engine's first move.
  useEffect(() => {
    if (gameReset && color === 'black') {
      setTimeout(() => {
        makeEngineMove()
        setGameReset(false)
      }, 500)
    }
  }, [gameReset, color, makeEngineMove])

  // ===== DERIVED VALUES =====

  const currentBoardWidth = chessboardRef.current?.getBoundingClientRect()?.width ?? squareSize * 8
  const currentSquareSize = currentBoardWidth / 8

  const totalMoves = statistics.correctMoves + statistics.incorrectMoves
  const correctRate =
    totalMoves > 0 ? ((statistics.correctMoves / totalMoves) * 100).toFixed(1) : '0'

  const engineLocked = isEngineStarted === true || isEngineStarted === 'starting'

  // ===== RENDER =====

  return (
    <TooltipProvider>
      <div className="page-container">
        <h1 className="heading-1">Fischer Random Trainer</h1>

        <div className="w-full mt-6">
          {/* Top controls — generate / pick by number / colour / start / flip */}
          <div id="controls" className="flex items-center gap-2 mb-4 flex-wrap">
            <Button onClick={handleGenerate}>
              <Shuffle className="mr-2 h-4 w-4" />
              Generate
            </Button>

            {/* Position input + Select form a single segmented control */}
            <div className="flex">
              <Input
                value={positionInput}
                onChange={e => setPositionInput(e.target.value)}
                onBlur={handleInputBlur}
                placeholder="0-959"
                disabled={engineLocked}
                autoComplete="off"
                className="w-20 text-center rounded-r-none"
              />
              <Button
                onClick={handleSelectPosition}
                disabled={engineLocked}
                className="rounded-l-none"
              >
                <Hash className="mr-2 h-4 w-4" />
                Select
              </Button>
            </div>

            <Select
              value={color}
              onValueChange={v => {
                const newColor = v as Color
                setColor(newColor)
                setBoardOrientation(newColor)
              }}
              disabled={engineLocked}
            >
              <SelectTrigger className="w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="white">White</SelectItem>
                <SelectItem value="black">Black</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={startEngine} disabled={engineLocked}>
              {isEngineStarted === 'starting' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Cpu className="mr-2 h-4 w-4" />
              )}
              {isEngineStarted === 'starting' ? 'Starting engine…' : 'Start Engine'}
            </Button>

            <Button variant="secondary" size="icon" onClick={toggleOrientation}>
              <ArrowDownUp className="h-4 w-4" />
            </Button>
          </div>

          {/* Main 2-column layout: chessboard on the left, status/moves on the right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chessboard column */}
            <div id="chessboard" className="bg-card text-card-foreground">
              <div ref={chessboardRef} className="relative">
                {fen && (
                  <Chessboard
                    options={{
                      ...DEFAULT_CHESSBOARD_OPTIONS,
                      position: fen,
                      onPieceDrop: ({
                        sourceSquare,
                        targetSquare,
                      }: {
                        sourceSquare: string
                        targetSquare: string | null
                      }) => {
                        if (!targetSquare) return false
                        return onDrop(sourceSquare, targetSquare)
                      },
                      onSquareClick: ({ square }: { square: string }) => handleSquareClick(square),
                      boardOrientation,
                      allowDrawingArrows: false,
                      squareStyles: {
                        ...(lastMoveSquares.from && {
                          [lastMoveSquares.from]: {
                            backgroundColor: 'rgba(173, 216, 230, 0.6)',
                          },
                        }),
                        ...(lastMoveSquares.to && {
                          [lastMoveSquares.to]: {
                            backgroundColor: 'rgba(173, 216, 230, 0.6)',
                          },
                        }),
                        ...(selectedSquare && {
                          [selectedSquare]: {
                            backgroundColor: 'rgba(255, 245, 157, 0.5)',
                          },
                        }),
                      },
                    }}
                  />
                )}

                {/* Custom promotion overlay — anchored over the target square,
                    kept inside the board bounds. Uses the piece images from
                    the chessboard config so the chosen piece matches. */}
                {pendingPromotion &&
                  currentSquareSize > 0 &&
                  (() => {
                    const popupFileIndex = pendingPromotion.to.charCodeAt(0) - 'a'.charCodeAt(0)
                    const popupRankIndex = 8 - parseInt(pendingPromotion.to[1], 10)
                    const boardSize = currentSquareSize * 8

                    const col = boardOrientation === 'white' ? popupFileIndex : 7 - popupFileIndex
                    const row = boardOrientation === 'white' ? popupRankIndex : 7 - popupRankIndex

                    const popupWidth = currentSquareSize * 2 + 16
                    const popupHeight = currentSquareSize * 2 + 16

                    let top = row * currentSquareSize + currentSquareSize / 2
                    let left = col * currentSquareSize + currentSquareSize / 2
                    top = Math.min(Math.max(top, popupHeight / 2), boardSize - popupHeight / 2)
                    left = Math.min(Math.max(left, popupWidth / 2), boardSize - popupWidth / 2)

                    const choices: PromotionRole[] = ['queen', 'rook', 'bishop', 'knight']

                    return (
                      <div
                        className="absolute z-50 grid grid-cols-2 gap-1 bg-white border border-gray-300 p-1 rounded shadow-md"
                        style={{
                          top: `${top}px`,
                          left: `${left}px`,
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'auto',
                        }}
                      >
                        {choices.map(role => {
                          const pieceKey = `${
                            pendingPromotion.color === 'white' ? 'w' : 'b'
                          }${role[0].toUpperCase()}`
                          return (
                            <button
                              key={role}
                              type="button"
                              onClick={() => handlePromotionChoice(role)}
                              className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded"
                              style={{
                                width: currentSquareSize * 0.8,
                                height: currentSquareSize * 0.8,
                              }}
                            >
                              <img
                                src={getPieceImageSrc(pieceKey)}
                                alt={role}
                                style={{
                                  width: currentSquareSize * 0.75,
                                  height: currentSquareSize * 0.75,
                                }}
                                draggable={false}
                              />
                            </button>
                          )
                        })}
                      </div>
                    )
                  })()}
              </div>

              {/* FEN display + copy */}
              <div className="flex items-center mt-4">
                <Input value={fen} readOnly className="flex-1 rounded-r-none text-xs" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={copyFenToClipboard} className="rounded-l-none">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy FEN</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Status column — recommendation, stats, alert, moves history */}
            <div id="moves" className="bg-card text-card-foreground p-4">
              <div className="pb-2">
                {gameOver ? (
                  <>
                    Game over: <b>{gameResult}</b>
                  </>
                ) : isEngineStarted ? (
                  recommendedPiece && (
                    <>
                      Recommended piece: <b>{recommendedPiece}</b>
                    </>
                  )
                ) : (
                  <>Engine not started</>
                )}
              </div>

              {isEngineStarted && totalMoves > 0 && (
                <div className="pb-2">
                  <div className="h-px bg-border mb-4" />
                  <div className="flex justify-between items-center gap-4 text-sm">
                    <span>
                      ✓ <b>{statistics.correctMoves}</b>
                    </span>
                    <span>
                      ✗ <b>{statistics.incorrectMoves}</b>
                    </span>
                    <span>
                      Accuracy: <b>{correctRate}%</b>
                    </span>
                  </div>
                  <div className="h-px bg-border mt-4" />
                </div>
              )}

              {/* Inline alert showing what the engine had recommended for the
                  user's last move. Stays visible until dismissed. */}
              {alertOpen && (
                <div
                  className={`flex items-start justify-between gap-2 px-3 py-2 rounded text-sm border ${
                    alertColor === 'success'
                      ? 'bg-green-50 border-green-200 text-green-900'
                      : 'bg-red-50 border-red-200 text-red-900'
                  }`}
                >
                  <span>
                    {recommendedMove
                      ? `Recommended move was: ${previousRecommendedMove}`
                      : 'Waiting for recommendation…'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlertOpen(false)}
                    className="flex-shrink-0"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Moves history as a numbered SAN paragraph */}
              <p className="pb-1 pt-4">
                {movesHistory
                  .reduce((acc, move, index) => {
                    const moveNumber = Math.floor(index / 2) + 1
                    return index % 2 === 0 ? `${acc} ${moveNumber}. ${move}` : `${acc} ${move}`
                  }, '')
                  .trim()}
              </p>

              {gameOver && <h3 className="text-lg font-semibold mt-2">Game over: {gameResult}</h3>}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default FischerRandomTrainer
