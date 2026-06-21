import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceRenderObject } from 'react-chessboard'
import { ArrowDownUp, Cpu, Eye, PlayCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { DEFAULT_CHESSBOARD_OPTIONS, getPieceImageSrc } from '@/config/chessboard'

type BoardOrientation = 'white' | 'black'
type EngineSide = 'w' | 'b'
type HiddenMode =
  | 'showWhite'
  | 'showBlack'
  | 'blindChess'
  | 'whitePiecesWithBlackCircles'
  | 'blackPiecesWithWhiteCircles'
  | 'circles'
  | 'circlesWhite'
  | 'showAllPieces'

type PieceRendererProps = {
  fill?: string
  svgStyle?: CSSProperties
}

interface MoveHistoryItem {
  san: string
}

const HIDDEN_MODES: { value: HiddenMode; label: string }[] = [
  { value: 'showWhite', label: 'Show White' },
  { value: 'showBlack', label: 'Show Black' },
  { value: 'blindChess', label: 'Blind Chess' },
  { value: 'whitePiecesWithBlackCircles', label: 'White Pieces / Black Circles' },
  { value: 'blackPiecesWithWhiteCircles', label: 'Black Pieces / White Circles' },
  { value: 'circles', label: 'Circles' },
  { value: 'circlesWhite', label: 'White Circles' },
  { value: 'showAllPieces', label: 'Show All Pieces' },
]

const PIECE_KEYS = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']

function HiddenPiece({ svgStyle }: PieceRendererProps = {}) {
  return (
    <svg
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        ...svgStyle,
      }}
    />
  )
}

function CirclePiece({ color, svgStyle }: PieceRendererProps & { color: 'white' | 'black' }) {
  return (
    <svg
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        ...svgStyle,
      }}
    >
      <circle
        cx="22.5"
        cy="22.5"
        r="18"
        fill={color}
        style={{
          filter: 'drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.5))',
        }}
      />
    </svg>
  )
}

function HiddenChess() {
  const stockfishWorker = useRef<Worker | null>(null)

  const [game, setGame] = useState(() => new Chess())
  const [fen, setFen] = useState(() => new Chess().fen())
  const [mode, setMode] = useState<HiddenMode>('circles')
  const [revealPieces, setRevealPieces] = useState(false)
  const [movesHistory, setMovesHistory] = useState<MoveHistoryItem[]>([])
  const [isEngineStarted, setIsEngineStarted] = useState(false)
  const [engineSide, setEngineSide] = useState<EngineSide | null>(null)
  const [isButtonDisabled, setIsButtonDisabled] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [orientation, setOrientation] = useState<BoardOrientation>('white')

  useEffect(() => {
    document.title = 'Hidden Chess'
  }, [])

  useEffect(() => {
    stockfishWorker.current = new Worker('/js/stockfish/stockfish-18-lite-single.js')

    return () => {
      stockfishWorker.current?.terminate()
    }
  }, [])

  const toggleOrientation = () => {
    setOrientation(prevOrientation => (prevOrientation === 'white' ? 'black' : 'white'))
  }

  const newGame = () => {
    const newGameInstance = new Chess()

    setIsEngineStarted(false)
    setEngineSide(null)
    setGame(newGameInstance)
    setFen(newGameInstance.fen())
    setMovesHistory([])
  }

  const makeEngineMove = useCallback(() => {
    if (stockfishWorker.current && game.turn() === engineSide) {
      stockfishWorker.current.postMessage(`position fen ${game.fen()}`)
      stockfishWorker.current.postMessage('go depth 12')

      stockfishWorker.current.onmessage = (event: MessageEvent<string>) => {
        const message = event.data

        if (message.startsWith('bestmove')) {
          const move = message.split(' ')[1]
          const from = move.substring(0, 2)
          const to = move.substring(2, 4)

          const engineMove = game.move({
            from,
            to,
            promotion: 'q',
          })

          if (engineMove) {
            setFen(game.fen())
            setGame(game)
            setMovesHistory(prevHistory => [...prevHistory, engineMove])

            if (game.turn() === engineSide) {
              setTimeout(makeEngineMove, 500)
            }
          }
        }
      }
    }
  }, [game, engineSide])

  useEffect(() => {
    if (isEngineStarted && game.turn() === engineSide) {
      setTimeout(makeEngineMove, 500)
    }
  }, [isEngineStarted, game, engineSide, makeEngineMove])

  const startEngine = () => {
    setIsEngineStarted(true)
    setEngineSide(game.turn())
    setOrientation(game.turn() === 'w' ? 'black' : 'white')
  }

  const normalPieces = useMemo<PieceRenderObject>(() => {
    return Object.fromEntries(
      PIECE_KEYS.map(pieceKey => [
        pieceKey,
        ({ svgStyle }: PieceRendererProps = {}) => (
          <img
            src={getPieceImageSrc(pieceKey)}
            alt={pieceKey}
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              ...svgStyle,
            }}
          />
        ),
      ])
    ) as PieceRenderObject
  }, [])

  const customPieces = useMemo<PieceRenderObject>(() => {
    const pieces: PieceRenderObject = { ...normalPieces }

    if (mode !== 'showAllPieces' && !revealPieces) {
      Object.keys(pieces).forEach(key => {
        if (mode === 'showWhite' && key.startsWith('b')) {
          pieces[key] = props => <HiddenPiece {...props} />
        } else if (mode === 'showBlack' && key.startsWith('w')) {
          pieces[key] = props => <HiddenPiece {...props} />
        } else if (mode === 'blindChess') {
          pieces[key] = props => <HiddenPiece {...props} />
        } else if (mode === 'whitePiecesWithBlackCircles' && key.startsWith('b')) {
          pieces[key] = props => <CirclePiece color="black" {...props} />
        } else if (mode === 'blackPiecesWithWhiteCircles' && key.startsWith('w')) {
          pieces[key] = props => <CirclePiece color="white" {...props} />
        } else if (mode === 'circles') {
          if (key.startsWith('w')) {
            pieces[key] = props => <CirclePiece color="white" {...props} />
          } else if (key.startsWith('b')) {
            pieces[key] = props => <CirclePiece color="black" {...props} />
          }
        } else if (mode === 'circlesWhite') {
          pieces[key] = props => <CirclePiece color="white" {...props} />
        }
      })
    }

    return pieces
  }, [mode, normalPieces, revealPieces])

  const handleShowPieces = () => {
    setRevealPieces(true)
    setIsButtonDisabled(true)
    setCountdown(3)

    const intervalId = window.setInterval(() => {
      setCountdown(prevCountdown => {
        if (prevCountdown === null) return null

        if (prevCountdown === 1) {
          clearInterval(intervalId)
          setRevealPieces(false)
          setIsButtonDisabled(false)
          return null
        }

        return prevCountdown - 1
      })
    }, 1000)
  }

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      })

      if (move === null) {
        throw new Error('Illegal move')
      }

      setFen(game.fen())
      setGame(game)
      setMovesHistory(prevHistory => [...prevHistory, move])

      if (isEngineStarted && game.turn() === engineSide) {
        setTimeout(makeEngineMove, 500)
      }

      return true
    } catch {
      setFen(game.fen())
      return false
    }
  }

  return (
    <div className="page-container">
      <h1 className="heading-1">Hidden Chess</h1>

      <div className="w-full mt-6">
        <div id="controls" className="flex items-center gap-2 mb-4 flex-wrap">
          <Button onClick={newGame}>
            <PlayCircle className="mr-2 h-4 w-4" />
            New Game
          </Button>

          <Button onClick={startEngine}>
            <Cpu className="mr-2 h-4 w-4" />
            Start Engine
          </Button>

          <Select value={mode} onValueChange={value => setMode(value as HiddenMode)}>
            <SelectTrigger className="w-[260px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HIDDEN_MODES.map(hiddenMode => (
                <SelectItem key={hiddenMode.value} value={hiddenMode.value}>
                  {hiddenMode.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div id="chessboard" className="bg-card text-card-foreground">
            <div className="aspect-square w-full overflow-hidden">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: fen,
                  boardOrientation: orientation,
                  pieces: customPieces,
                  allowDrawingArrows: false,
                  boardStyle: {
                    ...DEFAULT_CHESSBOARD_OPTIONS.boardStyle,
                    width: '100%',
                    height: '100%',
                  },
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

            <div className="mt-4 flex items-center gap-2">
              <Button id="show" onClick={handleShowPieces} disabled={isButtonDisabled}>
                <Eye className="mr-2 h-4 w-4" />
                Show Pieces {countdown && `(${countdown})`}
              </Button>

              <Button variant="secondary" size="icon" onClick={toggleOrientation}>
                <ArrowDownUp className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div id="moves" className="bg-card text-card-foreground p-4">
            <p className="pb-2">
              {movesHistory.map((move, index) => {
                const moveNumber = Math.floor(index / 2) + 1

                if (index % 2 === 0) {
                  return (
                    <span key={`${move.san}-${index}`}>
                      <strong>{moveNumber}.</strong> {move.san}{' '}
                    </span>
                  )
                }

                return <span key={`${move.san}-${index}`}>{move.san} </span>
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HiddenChess
