import { useState, useEffect, useCallback } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import { CheckCircle, AlertCircle, Cpu, Copy, PlayCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { evaluations } from '@/data/evaluations'
import { DEFAULT_CHESSBOARD_OPTIONS } from '@/config/chessboard'

type GuessGame = (typeof evaluations)[number]
type EvalValue = GuessGame['EVAL']

type GuessLabel =
  | 'White is winning'
  | 'White is better'
  | 'Position is equal'
  | 'Black is better'
  | 'Black is winning'

type Highlight = 'correct' | 'incorrect' | undefined
type Orientation = 'white' | 'black'

interface GuessButtonProps {
  mainText: string
  onClick: () => void
  disabled: boolean
  highlight: Highlight
}

// One of the five verdict buttons. Uses the shadcn secondary variant so it
// picks up theme colours (light grey in light mode, dark in dark mode) and
// adds a coloured ring as right/wrong feedback after the player guesses.
const GuessButton = ({ mainText, onClick, disabled, highlight }: GuessButtonProps) => {
  const ring =
    highlight === 'correct'
      ? 'ring-2 ring-green-600'
      : highlight === 'incorrect'
        ? 'ring-2 ring-red-600'
        : ''

  return (
    <Button
      variant="secondary"
      onClick={onClick}
      disabled={disabled}
      className={`w-[90px] h-auto min-h-[50px] whitespace-normal text-xs leading-tight mr-2 mb-2 ${ring}`}
    >
      {mainText}
    </Button>
  )
}

function GuessTheEval() {
  const [game, setGame] = useState<Chess>(new Chess())
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [gameEval, setGameEval] = useState<EvalValue>(0)
  const [toPlay, setToPlay] = useState<string>('')
  const [evalDescription, setEvalDescription] = useState<string>('')
  const [resultMessage, setResultMessage] = useState<string>('')
  const [modernMoves, setModernMoves] = useState<string[]>([])
  const [fen, setFen] = useState<string>('')
  const [orientation, setOrientation] = useState<Orientation>('white')
  const [selectedGuess, setSelectedGuess] = useState<string>('')
  const [guessCorrect, setGuessCorrect] = useState<boolean | null>(null)
  // Which move in the follow-up line is currently shown on the board. -1
  // means the starting position ("Reset"); 0..N-1 means after that move.
  // Drives both the board sync effect and the underline on the move list.
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(-1)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(fen)
    toast.success('FEN copied to clipboard')
  }

  const countPiecesNotOnHomeSquares = (fen: string): number => {
    const homeSquares: Record<string, string[]> = {
      r: ['a8', 'h8'],
      n: ['b8', 'g8'],
      b: ['c8', 'f8'],
      q: ['d8'],
      k: ['e8'],
      p: ['a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7'],
      R: ['a1', 'h1'],
      N: ['b1', 'g1'],
      B: ['c1', 'f1'],
      Q: ['d1'],
      K: ['e1'],
      P: ['a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2'],
    }

    const fenParts = fen.split(' ')[0]
    const board = fenParts.split('/')
    let piecesNotOnHome = 0

    board.forEach((rank, rowIdx) => {
      let colIdx = 0
      for (let i = 0; i < rank.length; i++) {
        const square = rank[i]
        if (isNaN(Number(square))) {
          const file = 'abcdefgh'[colIdx]
          const piecePosition = `${file}${8 - rowIdx}`
          if (!homeSquares[square]?.includes(piecePosition)) {
            piecesNotOnHome++
          }
          colIdx++
        } else {
          colIdx += parseInt(square)
        }
      }
    })

    return piecesNotOnHome
  }

  const getRandomNumber = (n: number): number => Math.floor(Math.random() * n)

  const getEvalDescription = (evaluation: EvalValue): string => {
    if (typeof evaluation === 'string') return evaluation
    if (evaluation / 100 > 2.0) return 'White is winning'
    else if (evaluation / 100 > 0.5) return 'White is better'
    else if (evaluation / 100 >= -0.5) return 'Position is equal'
    else if (evaluation / 100 > -2.0) return 'Black is better'
    else return 'Black is winning'
  }

  const handleNewGame = useCallback((): void => {
    setSelectedGuess('')
    setGuessCorrect(null)
    setCurrentMoveIndex(-1)

    const filteredGames = (evaluations as GuessGame[]).filter(
      g => countPiecesNotOnHomeSquares(g.FEN) >= 10
    )

    const randomNumber = getRandomNumber(filteredGames.length)
    const selected = filteredGames[randomNumber]

    setFen(selected.FEN)
    const newGame = new Chess(selected.FEN)
    const moves = selected.MOVES.split(' ')
    const newModernMoves: string[] = []

    moves.forEach((move: string) => {
      if (move === 'e1h1' || move === 'e8h8') {
        newModernMoves.push('O-O')
        newGame.move('O-O')
      } else if (move === 'e1a1' || move === 'e8a8') {
        newModernMoves.push('O-O-O')
        newGame.move('O-O-O')
      } else {
        const result = newGame.move(move)
        if (result) newModernMoves.push(result.san)
      }
    })

    setModernMoves(newModernMoves)

    const parts = selected.FEN.split(' ')
    const firstLetterAfterSpace = parts[1]
    const toPlayLabel = firstLetterAfterSpace === 'b' ? 'Black' : 'White'
    setToPlay(toPlayLabel)
    setOrientation(firstLetterAfterSpace === 'b' ? 'black' : 'white')

    setGameEval(typeof selected.EVAL === 'number' ? selected.EVAL / 100 : selected.EVAL)
    setEvalDescription(getEvalDescription(selected.EVAL))

    setGame(new Chess(selected.FEN))
    setGameStarted(true)
    setResultMessage('')
  }, [])

  // Auto-start a game on mount.
  useEffect(() => {
    handleNewGame()
  }, [handleNewGame])

  useEffect(() => {
    document.title = 'Guess The Eval'
  }, [])

  // Sync the board to whatever move index is currently selected. Always
  // rebuilds from the starting FEN and replays up to the target index so
  // forwards and backwards navigation share one code path.
  useEffect(() => {
    if (!fen) return
    const newGame = new Chess(fen)
    for (let i = 0; i <= currentMoveIndex; i++) {
      if (modernMoves[i]) newGame.move(modernMoves[i])
    }
    setGame(newGame)
  }, [currentMoveIndex, fen, modernMoves])

  // Arrow-key navigation through the follow-up line. Only active once the
  // player has guessed (resultMessage is set), so arrow keys can still be
  // used normally elsewhere in the page beforehand.
  useEffect(() => {
    if (!resultMessage) return
    const maxIndex = Math.min(modernMoves.length, 8) - 1
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCurrentMoveIndex(prev => Math.max(-1, prev - 1))
      } else if (e.key === 'ArrowRight') {
        setCurrentMoveIndex(prev => Math.min(maxIndex, prev + 1))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [resultMessage, modernMoves.length])

  const handleGuess = (guess: GuessLabel) => {
    setSelectedGuess(guess)
    const isMateInPositive =
      evalDescription.includes('M') && parseInt(evalDescription.split('M')[1]) > 0
    const isMateInNegative =
      evalDescription.includes('M') && parseInt(evalDescription.split('M')[1]) < 0

    if (
      guess === evalDescription ||
      (guess === 'White is winning' && isMateInPositive) ||
      (guess === 'Black is winning' && isMateInNegative)
    ) {
      setGuessCorrect(true)
      setResultMessage('Correct')
    } else {
      setGuessCorrect(false)
      setResultMessage('Incorrect')
    }

    setGameStarted(false)
  }

  // Click-to-jump in the move list. The board-sync effect handles actually
  // updating the position when currentMoveIndex changes.
  const handleMoveClickReset = () => setCurrentMoveIndex(-1)
  const handleMoveClick = (moveIndex: number) => setCurrentMoveIndex(moveIndex)

  const highlightFor = (label: GuessLabel): Highlight =>
    selectedGuess === label ? (guessCorrect === true ? 'correct' : 'incorrect') : undefined

  return (
    <div className="page-container">
      <h1 className="heading-1">Guess The Eval</h1>
      <div className="w-full mt-6">
        <Button onClick={handleNewGame} className="mb-4">
          <PlayCircle className="mr-2 h-4 w-4" />
          Play
        </Button>

        {/* Two equal columns at md+, stacked on mobile. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {/* Board column. Wrapped in a max-width container so the board
            doesn't stretch absurdly wide on large screens. */}
          <div className="w-full">
            <div className="w-full max-w-[560px] mx-auto">
              <Chessboard
                options={{
                  ...DEFAULT_CHESSBOARD_OPTIONS,
                  position: game.fen(),
                  allowDragging: false,
                  boardOrientation: orientation,
                }}
              />
            </div>
          </div>

          {/* Guess panel. */}
          <div className="w-full">
            {toPlay && (
              <div className="mb-2">
                <span>
                  <strong>{toPlay}</strong> to play
                </span>
              </div>
            )}

            <div className="flex flex-wrap">
              <GuessButton
                mainText="White is winning"
                onClick={() => handleGuess('White is winning')}
                disabled={!gameStarted}
                highlight={highlightFor('White is winning')}
              />
              <GuessButton
                mainText="White is better"
                onClick={() => handleGuess('White is better')}
                disabled={!gameStarted}
                highlight={highlightFor('White is better')}
              />
              <GuessButton
                mainText="Position is equal"
                onClick={() => handleGuess('Position is equal')}
                disabled={!gameStarted}
                highlight={highlightFor('Position is equal')}
              />
              <GuessButton
                mainText="Black is better"
                onClick={() => handleGuess('Black is better')}
                disabled={!gameStarted}
                highlight={highlightFor('Black is better')}
              />
              <GuessButton
                mainText="Black is winning"
                onClick={() => handleGuess('Black is winning')}
                disabled={!gameStarted}
                highlight={highlightFor('Black is winning')}
              />
            </div>

            {resultMessage && (
              <div className="flex flex-col items-start mt-2">
                <div className="flex items-center">
                  {resultMessage === 'Correct' ? (
                    <CheckCircle className="text-green-600 mr-1 h-8 w-8" />
                  ) : resultMessage === 'Incorrect' ? (
                    <AlertCircle className="text-red-600 mr-1 h-8 w-8" />
                  ) : null}
                  <span>
                    {resultMessage}! The evaluation is <b>{String(gameEval)}</b> ({evalDescription})
                  </span>
                </div>

                {/* Move list. Only the currently-displayed move (or "Reset"
                  when at the starting position) is underlined; everything
                  else is plain text so the focus is on where you are. */}
                <div className="flex items-center flex-wrap mt-2">
                  <Cpu className="text-muted-foreground mr-1 h-8 w-8" />
                  <span className="flex flex-wrap items-center">
                    <span
                      onClick={handleMoveClickReset}
                      className={`cursor-pointer mr-2 mb-1 ${
                        currentMoveIndex === -1 ? 'underline' : ''
                      }`}
                    >
                      Reset
                    </span>
                    {modernMoves
                      .filter((_, index) => index < 8)
                      .map((move, index) => (
                        <span
                          key={index}
                          onClick={() => handleMoveClick(index)}
                          className={`cursor-pointer mr-2 mb-1 ${
                            currentMoveIndex === index ? 'underline' : ''
                          }`}
                        >
                          {move}
                        </span>
                      ))}
                  </span>
                </div>

                <div className="mt-4 flex w-full">
                  <Input value={fen} readOnly className="text-xs rounded-r-none" />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button onClick={copyToClipboard} className="rounded-l-none">
                          <Copy className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy FEN</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default GuessTheEval
