import { useEffect, useRef, useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { Play, Square as StopIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'
type ChessSquare = `${File}${Rank}`

type PieceCode = 'k' | 'K' | 'Q' | 'R' | 'B' | 'N' | 'r' | 'b' | 'n'
type PieceType = 'k' | 'q' | 'r' | 'b' | 'n'
type PieceColor = 'w' | 'b'

type DrawMessage = '' | 'Draw50' | 'Draw75' | 'Checkmate!' | 'Stalemate' | 'Draw' | 'Stopped'

interface GameTypeOption {
  type: string
  pieces: PieceCode[]
}

const GAME_TYPES: GameTypeOption[] = [
  { type: 'Queen vs King', pieces: ['k', 'K', 'Q'] },
  { type: 'Rook vs King', pieces: ['k', 'K', 'R'] },
  { type: 'Two Rooks vs King', pieces: ['k', 'K', 'R', 'R'] },
  { type: 'Queen vs Rook', pieces: ['k', 'K', 'Q', 'r'] },
  { type: 'Two Bishops vs King', pieces: ['k', 'K', 'B', 'B'] },
  { type: 'Bishop Knight vs King', pieces: ['k', 'K', 'B', 'N'] },
  { type: 'Rook vs Bishop', pieces: ['k', 'K', 'R', 'b'] },
  { type: 'Rook vs Knight', pieces: ['k', 'K', 'R', 'n'] },
  // { type: 'Rook and Knight vs Rook', pieces: ['k', 'K', 'R', 'N', 'r'] },
  // { type: 'Rook and Bishop vs Rook', pieces: ['k', 'K', 'R', 'B', 'r'] },
]

const INITIAL_FEN = new Chess().fen()

function CheckmateTrainer() {
  const stockfishWorker = useRef<Worker | null>(null)

  const [game, setGame] = useState(() => new Chess())
  const [gameType, setGameType] = useState('Queen vs King')
  const [fen, setFen] = useState(INITIAL_FEN)

  const [timer, setTimer] = useState(0)
  const [moveCount, setMoveCount] = useState(0)
  const [drawMessage, setDrawMessage] = useState<DrawMessage>('')
  const [isTimerActive, setIsTimerActive] = useState(false)

  useEffect(() => {
    document.title = 'Checkmate Trainer'
  }, [])

  // Timer logic.
  useEffect(() => {
    if (!isTimerActive) return

    const interval = setInterval(() => {
      setTimer(prev => prev + 0.1)
    }, 100)

    return () => clearInterval(interval)
  }, [isTimerActive])

  // Load Stockfish as a Web Worker.
  useEffect(() => {
    stockfishWorker.current = new Worker('/js/stockfish/stockfish-18-lite-single.js')

    return () => {
      stockfishWorker.current?.terminate()
    }
  }, [])

  const randomSquare = (currentGame: Chess): ChessSquare => {
    const files = 'abcdefgh'
    const ranks = '12345678'

    let square: ChessSquare

    do {
      square = `${files[Math.floor(Math.random() * 8)]}${
        ranks[Math.floor(Math.random() * 8)]
      }` as ChessSquare
    } while (currentGame.get(square))

    return square
  }

  const newGame = () => {
    const selectedType = GAME_TYPES.find(gt => gt.type === gameType)
    const pieces = selectedType?.pieces ?? ['k', 'K']
    const newGameInstance = new Chess()

    let validPosition = false

    while (!validPosition) {
      newGameInstance.clear()

      const bishopSquares: ChessSquare[] = []

      pieces.forEach(piece => {
        let square: ChessSquare

        do {
          square = randomSquare(newGameInstance)

          // Extra validation only for Two Bishops vs King:
          // bishops must be placed on opposite-coloured squares.
          if (
            gameType === 'Two Bishops vs King' &&
            piece.toLowerCase() === 'b' &&
            bishopSquares.length === 1 &&
            (bishopSquares[0].charCodeAt(0) + parseInt(bishopSquares[0][1], 10)) % 2 ===
              (square.charCodeAt(0) + parseInt(square[1], 10)) % 2
          ) {
            continue
          }

          break
        } while (true)

        if (piece.toLowerCase() === 'b') {
          bishopSquares.push(square)
        }

        newGameInstance.put(
          {
            type: piece.toLowerCase() as PieceType,
            color: piece === piece.toUpperCase() ? 'w' : ('b' as PieceColor),
          },
          square
        )
      })

      // Set turn to Black before validation so we can reject positions where
      // Black is already in check, checkmated, or stalemated.
      const currentFen = newGameInstance.fen()
      const fenParts = currentFen.split(' ')
      fenParts[1] = 'b'
      newGameInstance.load(fenParts.join(' '))

      validPosition =
        !newGameInstance.inCheck() &&
        !newGameInstance.isCheckmate() &&
        !newGameInstance.isStalemate()
    }

    // Ensure White moves first after a valid position has been generated.
    const validFen = newGameInstance.fen()
    const fenParts = validFen.split(' ')
    fenParts[1] = 'w'
    newGameInstance.load(fenParts.join(' '))

    setGame(newGameInstance)
    setFen(newGameInstance.fen())
    setTimer(0)
    setMoveCount(0)
    setDrawMessage('')
    setIsTimerActive(true)
  }

  const stopGame = () => {
    setIsTimerActive(false)
    setDrawMessage('Stopped')
  }

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    const previousFen = game.fen()

    try {
      const move = game.move({
        from: sourceSquare as ChessSquare,
        to: targetSquare as ChessSquare,
      })

      if (move === null) {
        return false
      }

      setFen(game.fen())
      setMoveCount(prev => prev + 1)

      if (moveCount + 1 === 50) {
        setDrawMessage('Draw50')
      } else if (moveCount + 1 === 75) {
        setDrawMessage('Draw75')
      }

      if (game.isGameOver()) {
        setIsTimerActive(false)

        if (game.isCheckmate()) {
          setDrawMessage('Checkmate!')
        } else if (game.isStalemate()) {
          setDrawMessage('Stalemate')
        } else if (game.isDraw()) {
          setDrawMessage('Draw')
        }

        return true
      }

      if (stockfishWorker.current) {
        stockfishWorker.current.postMessage(`position fen ${game.fen()}`)
        stockfishWorker.current.postMessage('go depth 12')

        stockfishWorker.current.onmessage = (event: MessageEvent<string>) => {
          const message = event.data

          if (message.startsWith('bestmove')) {
            const bestMove = message.split(' ')[1]

            const engineMove = game.move({
              from: bestMove.substring(0, 2) as ChessSquare,
              to: bestMove.substring(2, 4) as ChessSquare,
            })

            if (engineMove) {
              setFen(game.fen())

              if (game.isGameOver()) {
                setIsTimerActive(false)

                if (game.isCheckmate()) {
                  setDrawMessage('Checkmate!')
                } else if (game.isStalemate()) {
                  setDrawMessage('Stalemate')
                } else if (game.isDraw()) {
                  setDrawMessage('Draw')
                }
              }
            } else {
              game.load(previousFen)
              setFen(previousFen)
            }
          }
        }
      }
    } catch {
      game.load(previousFen)
      setFen(previousFen)
      return false
    }

    return true
  }

  const drawMessageText = (() => {
    if (drawMessage === 'Draw50') return 'Draw by 50-move rule'
    if (drawMessage === 'Draw75') return 'Draw by 75-move rule'
    if (drawMessage === 'Checkmate!') return 'Checkmate!'
    if (drawMessage === 'Stalemate') return 'Stalemate'
    if (drawMessage === 'Draw') return 'Draw'
    if (drawMessage === 'Stopped') return 'Stopped'
    return ''
  })()

  return (
    <div className="page-container">
      <h1 className="heading-1">Checkmate Trainer</h1>

      <div className="w-full mt-6">
        <div id="controls" className="flex items-center gap-2 mb-4 flex-wrap">
          <Select value={gameType} onValueChange={setGameType}>
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GAME_TYPES.map(gt => (
                <SelectItem key={gt.type} value={gt.type}>
                  {gt.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button onClick={newGame}>
            <Play className="mr-2 h-4 w-4" />
            New Game
          </Button>

          <Button onClick={stopGame} disabled={!isTimerActive}>
            <StopIcon className="mr-2 h-4 w-4" />
            Stop
          </Button>
        </div>

        <div id="timer" className="flex justify-start items-center gap-10 mb-4">
          <p>
            Time: <b>{timer.toFixed(1)}s</b>
          </p>
          <p>
            Moves: <b>{moveCount}</b>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="chessboard" className="bg-card text-card-foreground">
            <div className="aspect-square w-full overflow-hidden">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: fen,
                  allowDrawingArrows: false,
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
                }}
              />
            </div>
            {drawMessageText && <p className="pt-2">{drawMessageText}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckmateTrainer
